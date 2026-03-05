package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
	dbpostgres "github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres"
	bootstraprepo "github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres/bootstrap"
	designerrepo "github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres/taskdesigner"
)

type Repository struct {
	client *dbpostgres.Client
}

func New(client *dbpostgres.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) FetchTasks(ctx context.Context) ([]contracts.Task, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
SELECT
  t.id,
  COALESCE(t.node_id, ''),
  t.instance_id,
  t.definition_name,
  t.name,
  t.assignee_name,
  t.role_key,
  t.status,
  t.priority,
  t.created_at,
  t.due_at,
  t.sla_minutes,
  t.minutes_remaining,
  t.patient_name,
  t.patient_id,
  t.form_fields,
  t.form_values,
  t.updated_at,
  COALESCE(t.triage_category, ''),
  COALESCE(t.triage_color, '')
FROM tasks t
ORDER BY t.created_at DESC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]contracts.Task, 0)
	for rows.Next() {
		var item contracts.Task
		var assigneeName *string
		var createdAt, dueAt time.Time
		var updatedAt *time.Time
		var triageCategory string
		var triageColor string
		if err := rows.Scan(
			&item.ID,
			&item.NodeID,
			&item.InstanceID,
			&item.DefinitionName,
			&item.Name,
			&assigneeName,
			&item.Role,
			&item.Status,
			&item.Priority,
			&createdAt,
			&dueAt,
			&item.SLAMinutes,
			&item.MinutesRemaining,
			&item.PatientName,
			&item.PatientID,
			&item.FormFields,
			&item.FormValues,
			&updatedAt,
			&triageCategory,
			&triageColor,
		); err != nil {
			return nil, err
		}

		if assigneeName == nil || *assigneeName == "" {
			item.Assignee = nil
		} else {
			item.Assignee = *assigneeName
		}
		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		item.DueAt = dueAt.UTC().Format(time.RFC3339)
		if updatedAt != nil {
			item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		}
		if triageCategory != "" {
			item.TriageCategory = triageCategory
		}
		if triageColor != "" {
			item.TriageColor = triageColor
		}
		if item.FormFields == nil {
			item.FormFields = json.RawMessage("[]")
		}
		if item.FormValues == nil {
			item.FormValues = json.RawMessage("{}")
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) FetchPatientMedicalRecord(ctx context.Context, taskID string) (contracts.PatientMedicalRecordPayload, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return contracts.PatientMedicalRecordPayload{}, err
	}

	taskID = strings.TrimSpace(taskID)
	if taskID == "" {
		return contracts.PatientMedicalRecordPayload{}, errors.New("taskId is required")
	}

	var (
		snapshotRaw    json.RawMessage
		processStatus  string
		startedAt      time.Time
		instanceRecord contracts.ProcessInstance
	)
	err = pool.QueryRow(ctx, `
SELECT
  st.snapshot,
  st.process_status,
  i.id,
  i.definition_id,
  COALESCE(d.name, '') AS definition_name,
  i.status,
  i.started_at,
  COALESCE(u.name, 'System') AS started_by,
  i.current_node,
  i.priority,
  COALESCE(i.patient_id, ''),
  COALESCE(i.patient_name, '')
FROM saved_tasks st
JOIN process_instances i ON i.id = st.instance_id
LEFT JOIN process_definitions d ON d.id = i.definition_id
LEFT JOIN users u ON u.id = i.started_by_user_id
WHERE st.task_id = $1
`, taskID).Scan(
		&snapshotRaw,
		&processStatus,
		&instanceRecord.ID,
		&instanceRecord.DefinitionID,
		&instanceRecord.DefinitionName,
		&instanceRecord.Status,
		&startedAt,
		&instanceRecord.StartedBy,
		&instanceRecord.CurrentNode,
		&instanceRecord.Priority,
		&instanceRecord.PatientID,
		&instanceRecord.PatientName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return contracts.PatientMedicalRecordPayload{}, errors.New("patient medical record not found")
		}
		return contracts.PatientMedicalRecordPayload{}, err
	}
	instanceRecord.StartedAt = startedAt.UTC().Format(time.RFC3339)

	taskRecord := contracts.SavedTaskRecord{}
	if len(snapshotRaw) > 0 {
		if err := json.Unmarshal(snapshotRaw, &taskRecord); err != nil {
			return contracts.PatientMedicalRecordPayload{}, fmt.Errorf("decode task snapshot: %w", err)
		}
	}
	taskRecord["processStatus"] = processStatus

	auditRows, err := pool.Query(ctx, `
SELECT
  id,
  instance_id,
  event_time,
  actor,
  COALESCE(role_key, 'admin') AS role_key,
  event_type,
  node_id,
  node_name,
  payload
FROM audit_events
WHERE instance_id = $1
ORDER BY event_time DESC
LIMIT 200
`, instanceRecord.ID)
	if err != nil {
		return contracts.PatientMedicalRecordPayload{}, err
	}
	defer auditRows.Close()

	audit := make([]contracts.AuditEvent, 0, 32)
	for auditRows.Next() {
		var (
			item      contracts.AuditEvent
			eventTime time.Time
		)
		if err := auditRows.Scan(
			&item.ID,
			&item.InstanceID,
			&eventTime,
			&item.Actor,
			&item.Role,
			&item.EventType,
			&item.NodeID,
			&item.NodeName,
			&item.Payload,
		); err != nil {
			return contracts.PatientMedicalRecordPayload{}, err
		}
		item.Timestamp = eventTime.UTC().Format(time.RFC3339)
		if item.Payload == nil {
			item.Payload = json.RawMessage("{}")
		}
		audit = append(audit, item)
	}
	if err := auditRows.Err(); err != nil {
		return contracts.PatientMedicalRecordPayload{}, err
	}

	return contracts.PatientMedicalRecordPayload{
		Task:     taskRecord,
		Instance: instanceRecord,
		Audit:    audit,
	}, nil
}

func (r *Repository) FetchTaskDesignerGraph(ctx context.Context, taskID string) (contracts.DesignerGraphPayload, error) {
	return designerrepo.FetchTaskDesignerGraph(ctx, r.client.Pool, func(ctx context.Context) (contracts.DesignerGraphPayload, error) {
		return bootstraprepo.FetchDesignerGraph(ctx, r.client.Pool)
	}, taskID)
}

func (r *Repository) ClaimTask(ctx context.Context, taskID, assigneeName string) (contracts.TaskMutationResponse, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	if taskID == "" {
		return contracts.TaskMutationResponse{}, errors.New("taskId is required")
	}
	if assigneeName == "" {
		return contracts.TaskMutationResponse{}, errors.New("assigneeName is required")
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var (
		instanceID string
		nodeID     string
		nodeName   string
		roleKey    string
	)

	err = r.client.QueryRowTx(ctx, tx, "task.claim.update", `
UPDATE tasks
SET
  status = 'claimed',
  assignee_name = $2,
  updated_at = NOW()
WHERE id = $1
RETURNING instance_id, COALESCE(node_id, id), name, role_key
`, taskID, assigneeName).Scan(&instanceID, &nodeID, &nodeName, &roleKey)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return contracts.TaskMutationResponse{}, errors.New("task not found")
		}
		return contracts.TaskMutationResponse{}, err
	}

	auditID := fmt.Sprintf("ae-%d", time.Now().UnixNano())
	err = r.client.ExecTx(ctx, tx, "task.claim.audit_insert", `
INSERT INTO audit_events (
  id,
  instance_id,
  task_id,
  event_time,
  actor,
  role_key,
  event_type,
  node_id,
  node_name,
  payload
)
VALUES ($1, $2, $3, NOW(), $4, $5, 'task_claimed', $6, $7, $8)
`, auditID, instanceID, taskID, assigneeName, roleKey, nodeID, nodeName, json.RawMessage(`{"source":"task_console"}`))
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	taskSnapshot, err := r.client.BuildTaskSnapshot(ctx, tx, taskID)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	err = r.client.UpsertSavedTaskSnapshot(ctx, tx, taskID, instanceID, "open", taskSnapshot)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	_ = r.client.ExecTx(ctx, tx, "task.claim.instance_update", `
UPDATE process_instances
SET current_node = $2, updated_at = NOW()
WHERE id = $1
`, instanceID, nodeName)

	if err := tx.Commit(ctx); err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	return r.fetchTaskMutationResponse(ctx)
}

func (r *Repository) SaveTaskEdits(ctx context.Context, taskID string, req contracts.SaveTaskEditsRequest) (contracts.TaskMutationResponse, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	if strings.TrimSpace(taskID) == "" {
		return contracts.TaskMutationResponse{}, errors.New("taskId is required")
	}
	if req.FormValues == nil {
		req.FormValues = map[string]interface{}{}
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var (
		instanceID       string
		nodeID           string
		nodeName         string
		roleKey          string
		currentLabel     string
		currentTriage    string
		currentPatient   string
		currentPatientID string
	)
	err = r.client.QueryRowTx(ctx, tx, "task.save.select_for_update", `
SELECT instance_id, COALESCE(node_id, id), name, role_key, name, COALESCE(triage_color, 'yellow'), patient_name, patient_id
FROM tasks
WHERE id = $1
FOR UPDATE
`, taskID).Scan(&instanceID, &nodeID, &nodeName, &roleKey, &currentLabel, &currentTriage, &currentPatient, &currentPatientID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return contracts.TaskMutationResponse{}, errors.New("task not found")
		}
		return contracts.TaskMutationResponse{}, err
	}

	nextLabel := currentLabel
	if req.Label != nil && strings.TrimSpace(*req.Label) != "" {
		nextLabel = strings.TrimSpace(*req.Label)
	}
	nextPatientName := currentPatient
	if req.PatientName != nil && strings.TrimSpace(*req.PatientName) != "" {
		nextPatientName = strings.TrimSpace(*req.PatientName)
	}
	nextPatientID := currentPatientID
	if req.PatientID != nil && strings.TrimSpace(*req.PatientID) != "" {
		nextPatientID = strings.TrimSpace(*req.PatientID)
	}
	nextTriage := currentTriage
	if req.TriageColor != nil && strings.TrimSpace(*req.TriageColor) != "" {
		nextTriage = strings.TrimSpace(*req.TriageColor)
	}
	nextPriority, nextCategory, nextSla := triageMeta(nextTriage)
	nextDueAt := time.Now().UTC().Add(time.Duration(nextSla) * time.Minute)

	formValuesRaw, err := json.Marshal(req.FormValues)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	err = r.client.ExecTx(ctx, tx, "task.save.update", `
UPDATE tasks
SET
  name = $2,
  form_values = $3,
  triage_color = $4,
  triage_category = $5,
  priority = $6,
  sla_minutes = $7,
  minutes_remaining = $7,
  due_at = $8,
  patient_name = $9,
  patient_id = $10,
  updated_at = NOW()
WHERE id = $1
`, taskID, nextLabel, formValuesRaw, nextTriage, nextCategory, nextPriority, nextSla, nextDueAt, nextPatientName, nextPatientID)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	taskSnapshot, err := r.client.BuildTaskSnapshot(ctx, tx, taskID)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	err = r.client.UpsertSavedTaskSnapshot(ctx, tx, taskID, instanceID, "open", taskSnapshot)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	_ = r.client.ExecTx(ctx, tx, "task.save.instance_update", `
UPDATE process_instances
SET patient_name = $2, patient_id = $3, priority = $4, current_node = $5, updated_at = NOW()
WHERE id = $1
`, instanceID, nextPatientName, nextPatientID, nextPriority, nextLabel)

	if err := tx.Commit(ctx); err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	return r.fetchTaskMutationResponse(ctx)
}

func (r *Repository) CompleteTask(ctx context.Context, taskID string, req contracts.CompleteTaskRequest) (contracts.TaskMutationResponse, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	if strings.TrimSpace(taskID) == "" {
		return contracts.TaskMutationResponse{}, errors.New("taskId is required")
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var (
		instanceID  string
		nodeID      string
		nodeName    string
		roleKey     string
		patientName string
		patientID   string
	)
	err = r.client.QueryRowTx(ctx, tx, "task.complete.update", `
UPDATE tasks
SET
  status = 'completed',
  patient_name = COALESCE(NULLIF($2, ''), patient_name),
  patient_id = COALESCE(NULLIF($3, ''), patient_id),
  updated_at = NOW()
WHERE id = $1
RETURNING instance_id, COALESCE(node_id, id), name, role_key, patient_name, patient_id
`, taskID, strings.TrimSpace(req.PatientName), strings.TrimSpace(req.PatientID)).Scan(
		&instanceID, &nodeID, &nodeName, &roleKey, &patientName, &patientID,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return contracts.TaskMutationResponse{}, errors.New("task not found")
		}
		return contracts.TaskMutationResponse{}, err
	}

	actor := strings.TrimSpace(req.Actor)
	if actor == "" {
		actor = "System"
	}
	err = r.client.ExecTx(ctx, tx, "task.complete.audit_insert", `
INSERT INTO audit_events (
  id, instance_id, task_id, event_time, actor, role_key, event_type, node_id, node_name, payload
)
VALUES ($1, $2, $3, NOW(), $4, $5, 'task_completed', $6, $7, $8)
`, fmt.Sprintf("ae-%d", time.Now().UnixNano()), instanceID, taskID, actor, roleKey, nodeID, nodeName, json.RawMessage(`{"source":"task_console"}`))
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	taskSnapshot, err := r.client.BuildTaskSnapshot(ctx, tx, taskID)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	err = r.client.UpsertSavedTaskSnapshot(ctx, tx, taskID, instanceID, "open", taskSnapshot)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	if err := r.refreshInstanceCurrentNode(ctx, tx, instanceID, patientName, patientID); err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	return r.fetchTaskMutationResponse(ctx)
}

func (r *Repository) DeleteTask(ctx context.Context, taskID string) (contracts.TaskMutationResponse, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	if strings.TrimSpace(taskID) == "" {
		return contracts.TaskMutationResponse{}, errors.New("taskId is required")
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var (
		instanceID   string
		definitionID string
		hasEndEvent  bool
	)
	err = r.client.QueryRowTx(ctx, tx, "task.delete.guard", `
SELECT
  t.instance_id,
  i.definition_id,
  EXISTS (
    SELECT 1
    FROM audit_events ae
    WHERE ae.instance_id = t.instance_id
      AND ae.event_type = 'task_created'
      AND COALESCE(ae.payload->>'nodeType', '') = 'endEvent'
  ) AS has_end_event
FROM tasks t
JOIN process_instances i ON i.id = t.instance_id
WHERE t.id = $1
FOR UPDATE OF t, i
`, taskID).Scan(&instanceID, &definitionID, &hasEndEvent)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return contracts.TaskMutationResponse{}, errors.New("task not found")
		}
		return contracts.TaskMutationResponse{}, err
	}

	if !hasEndEvent {
		return contracts.TaskMutationResponse{}, errors.New("task can be deleted only after END is reached and process is closed")
	}

	if err := r.removeInstanceFromDefinitionGraph(ctx, tx, definitionID, instanceID); err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	if err := r.client.ExecTx(ctx, tx, "task.delete.instance", `
DELETE FROM process_instances
WHERE id = $1
`, instanceID); err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	return r.fetchTaskMutationResponse(ctx)
}

func (r *Repository) fetchTaskMutationResponse(ctx context.Context) (contracts.TaskMutationResponse, error) {
	tasks, err := r.FetchTasks(ctx)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	savedTasks, err := bootstraprepo.FetchSavedTasks(ctx, r.client.Pool)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	graph, err := bootstraprepo.FetchDesignerGraph(ctx, r.client.Pool)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	instances, err := bootstraprepo.FetchInstances(ctx, r.client.Pool)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}
	audit, err := bootstraprepo.FetchAudit(ctx, r.client.Pool)
	if err != nil {
		return contracts.TaskMutationResponse{}, err
	}

	return contracts.TaskMutationResponse{
		Tasks:      tasks,
		SavedTasks: savedTasks,
		Graph:      graph,
		Instances:  instances,
		Audit:      audit,
	}, nil
}

func (r *Repository) refreshInstanceCurrentNode(ctx context.Context, tx pgx.Tx, instanceID, patientName, patientID string) error {
	var currentNode string
	err := r.client.QueryRowTx(ctx, tx, "instance.current_node.select_open_task", `
SELECT name
FROM tasks
WHERE instance_id = $1 AND status <> 'completed'
ORDER BY updated_at DESC NULLS LAST, created_at DESC
LIMIT 1
`, instanceID).Scan(&currentNode)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			currentNode = "Awaiting Next Step"
		} else {
			return err
		}
	}

	return r.client.ExecTx(ctx, tx, "instance.current_node.update", `
UPDATE process_instances
SET current_node = $2, status = $3, patient_name = $4, patient_id = $5, updated_at = NOW()
WHERE id = $1
`, instanceID, currentNode, "active", patientName, patientID)
}

func triageMeta(color string) (priority string, category string, slaMinutes int) {
	switch strings.ToLower(strings.TrimSpace(color)) {
	case "red":
		return "critical", "urgent", 5
	case "orange":
		return "high", "urgent", 15
	case "green":
		return "low", "non_urgent", 60
	case "blue":
		return "low", "non_urgent", 120
	default:
		return "medium", "urgent", 30
	}
}

func (r *Repository) removeInstanceFromDefinitionGraph(ctx context.Context, tx pgx.Tx, definitionID, instanceID string) error {
	if strings.TrimSpace(definitionID) == "" || strings.TrimSpace(instanceID) == "" {
		return nil
	}

	var graphRaw json.RawMessage
	err := r.client.QueryRowTx(ctx, tx, "task.delete.select_graph_for_update", `
SELECT graph_payload
FROM definition_graphs
WHERE definition_id = $1
FOR UPDATE
`, definitionID).Scan(&graphRaw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}

	graph := contracts.DesignerGraphPayload{
		Nodes: []map[string]any{},
		Edges: []map[string]any{},
	}
	if len(graphRaw) > 0 {
		if err := json.Unmarshal(graphRaw, &graph); err != nil {
			return fmt.Errorf("decode graph payload: %w", err)
		}
	}
	if graph.Nodes == nil {
		graph.Nodes = []map[string]any{}
	}
	if graph.Edges == nil {
		graph.Edges = []map[string]any{}
	}

	runtimeNodeIDs, err := r.fetchInstanceRuntimeNodeIDs(ctx, tx, instanceID)
	if err != nil {
		return err
	}

	nodeByID := make(map[string]map[string]any, len(graph.Nodes))
	for _, node := range graph.Nodes {
		if nodeID, _ := node["id"].(string); nodeID != "" {
			nodeByID[nodeID] = node
		}
	}

	removedNodeIDs := make(map[string]struct{})
	for _, node := range graph.Nodes {
		nodeID, _ := node["id"].(string)
		if designerrepo.NodeBelongsToInstance(node, instanceID) {
			if nodeID != "" {
				removedNodeIDs[nodeID] = struct{}{}
			}
			continue
		}
		if _, trackedRuntimeNode := runtimeNodeIDs[nodeID]; trackedRuntimeNode {
			if nodeID, _ := node["id"].(string); nodeID != "" {
				removedNodeIDs[nodeID] = struct{}{}
			}
			continue
		}
	}

	changed := true
	for changed {
		changed = false
		for _, edge := range graph.Edges {
			sourceID, _ := edge["source"].(string)
			targetID, _ := edge["target"].(string)
			_, sourceRemoved := removedNodeIDs[sourceID]
			_, targetRemoved := removedNodeIDs[targetID]

			if sourceRemoved && !targetRemoved && nodeIsUnscoped(nodeByID[targetID]) {
				removedNodeIDs[targetID] = struct{}{}
				changed = true
				continue
			}
			if targetRemoved && !sourceRemoved && nodeIsUnscoped(nodeByID[sourceID]) {
				removedNodeIDs[sourceID] = struct{}{}
				changed = true
			}
		}
	}

	keptNodes := make([]map[string]any, 0, len(graph.Nodes))
	for _, node := range graph.Nodes {
		nodeID, _ := node["id"].(string)
		if _, removed := removedNodeIDs[nodeID]; removed {
			continue
		}
		keptNodes = append(keptNodes, node)
	}

	keptEdges := make([]map[string]any, 0, len(graph.Edges))
	for _, edge := range graph.Edges {
		sourceID, _ := edge["source"].(string)
		targetID, _ := edge["target"].(string)
		if _, sourceRemoved := removedNodeIDs[sourceID]; sourceRemoved {
			continue
		}
		if _, targetRemoved := removedNodeIDs[targetID]; targetRemoved {
			continue
		}
		keptEdges = append(keptEdges, edge)
	}

	nextGraphRaw, err := json.Marshal(contracts.DesignerGraphPayload{
		Nodes: keptNodes,
		Edges: keptEdges,
	})
	if err != nil {
		return fmt.Errorf("encode graph payload: %w", err)
	}

	return r.client.ExecTx(ctx, tx, "task.delete.update_graph", `
UPDATE definition_graphs
SET graph_payload = $2, updated_at = NOW()
WHERE definition_id = $1
`, definitionID, nextGraphRaw)
}

func (r *Repository) fetchInstanceRuntimeNodeIDs(ctx context.Context, tx pgx.Tx, instanceID string) (map[string]struct{}, error) {
	var nodeIDs []string
	err := r.client.QueryRowTx(ctx, tx, "task.delete.runtime_node_ids", `
SELECT COALESCE(
  ARRAY_AGG(DISTINCT node_id) FILTER (WHERE node_id <> ''),
  ARRAY[]::TEXT[]
)
FROM (
  SELECT COALESCE(node_id, '') AS node_id
  FROM tasks
  WHERE instance_id = $1
  UNION ALL
  SELECT COALESCE(node_id, '') AS node_id
  FROM audit_events
  WHERE instance_id = $1
) runtime_nodes
`, instanceID).Scan(&nodeIDs)
	if err != nil {
		return nil, err
	}

	result := make(map[string]struct{}, len(nodeIDs))
	for _, nodeID := range nodeIDs {
		nodeID = strings.TrimSpace(nodeID)
		if nodeID == "" {
			continue
		}
		result[nodeID] = struct{}{}
	}
	return result, nil
}

func nodeIsUnscoped(node map[string]any) bool {
	if node == nil {
		return false
	}
	data, _ := node["data"].(map[string]any)
	if data == nil {
		return true
	}
	instanceID, _ := data["instanceId"].(string)
	return strings.TrimSpace(instanceID) == ""
}
