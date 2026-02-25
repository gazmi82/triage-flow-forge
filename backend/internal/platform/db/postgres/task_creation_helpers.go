package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const defaultAssigneeName = "Unassigned"

type designerGraph struct {
	Nodes []map[string]any `json:"nodes"`
	Edges []map[string]any `json:"edges"`
}

func validateCreateTaskFromConsoleRequest(req CreateTaskFromConsoleRequest) error {
	if strings.TrimSpace(req.NodeType) == "" {
		return errors.New("nodeType is required")
	}
	if strings.TrimSpace(req.Label) == "" {
		return errors.New("label is required")
	}
	if strings.TrimSpace(string(req.AssignedRole)) == "" {
		return errors.New("assignedRole is required")
	}
	if strings.TrimSpace(string(req.CreatedByRole)) == "" {
		return errors.New("createdByRole is required")
	}
	return nil
}

func resolveInstanceID(req CreateTaskFromConsoleRequest, ts int64) string {
	instanceID := fmt.Sprintf("pi-flow-%d", ts)
	if req.InstanceID != nil && strings.TrimSpace(*req.InstanceID) != "" {
		instanceID = strings.TrimSpace(*req.InstanceID)
	}
	return instanceID
}

func resolvePatient(req CreateTaskFromConsoleRequest) (string, string) {
	patientName := "Unknown Patient"
	if req.PatientName != nil && strings.TrimSpace(*req.PatientName) != "" {
		patientName = strings.TrimSpace(*req.PatientName)
	}
	patientID := "P-UNSET"
	if req.PatientID != nil && strings.TrimSpace(*req.PatientID) != "" {
		patientID = strings.TrimSpace(*req.PatientID)
	}
	return patientName, patientID
}

func resolveTriage(req CreateTaskFromConsoleRequest) (color, priority, category string, slaMinutes int) {
	color = "yellow"
	if req.TriageColor != nil && strings.TrimSpace(*req.TriageColor) != "" {
		color = strings.TrimSpace(*req.TriageColor)
	}
	priority, category, slaMinutes = triageMeta(color)
	return color, priority, category, slaMinutes
}

func (c *Client) loadDefinitionAndGraph(ctx context.Context, tx pgx.Tx) (string, string, designerGraph, error) {
	var (
		definitionID   string
		definitionName string
	)
	err := c.queryRowTx(ctx, tx, "task.create.select_definition_for_update", `
SELECT d.id, d.name
FROM process_definitions d
ORDER BY d.updated_at DESC
LIMIT 1
FOR UPDATE
`).Scan(&definitionID, &definitionName)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", designerGraph{}, errors.New("no process definition found")
		}
		return "", "", designerGraph{}, err
	}

	var graphRaw json.RawMessage
	err = c.queryRowTx(ctx, tx, "task.create.select_graph", `
SELECT graph_payload
FROM definition_graphs
WHERE definition_id = $1
`, definitionID).Scan(&graphRaw)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", "", designerGraph{}, err
	}

	graph := designerGraph{Nodes: []map[string]any{}, Edges: []map[string]any{}}
	if len(graphRaw) > 0 {
		if err := json.Unmarshal(graphRaw, &graph); err != nil {
			graph = designerGraph{Nodes: []map[string]any{}, Edges: []map[string]any{}}
		}
	}
	if graph.Nodes == nil {
		graph.Nodes = []map[string]any{}
	}
	if graph.Edges == nil {
		graph.Edges = []map[string]any{}
	}
	return definitionID, definitionName, graph, nil
}

func appendNodeToGraph(graph *designerGraph, req CreateTaskFromConsoleRequest, instanceID, normalizedNodeType string, ts int64) string {
	targetNodeID := fmt.Sprintf("node-%d", ts)
	if normalizedNodeType == "startEvent" {
		targetNodeID = fmt.Sprintf("start-%s", instanceID)
	}

	newNode := map[string]any{
		"id":   targetNodeID,
		"type": normalizedNodeType,
		"position": map[string]any{
			"x": 220,
			"y": 180,
		},
		"width":  220,
		"height": 110,
		"style": map[string]any{
			"width":  220,
			"height": 110,
		},
		"data": map[string]any{
			"label":      req.Label,
			"instanceId": instanceID,
			"role":       roleLabel(req.AssignedRole),
		},
	}
	if normalizedNodeType == "userTask" {
		newNode["data"].(map[string]any)["taskStatus"] = "pending"
	}
	if req.AssignedRole != "admin" {
		newNode["data"].(map[string]any)["laneRef"] = string(req.AssignedRole)
	}
	if normalizedNodeType == "xorGateway" || normalizedNodeType == "andGateway" {
		newNode["width"] = 64
		newNode["height"] = 64
		newNode["style"] = map[string]any{"width": 64, "height": 64}
	}
	if normalizedNodeType == "startEvent" || normalizedNodeType == "endEvent" || normalizedNodeType == "timerEvent" || normalizedNodeType == "messageEvent" || normalizedNodeType == "signalEvent" {
		newNode["width"] = 40
		newNode["height"] = 40
		newNode["style"] = map[string]any{"width": 40, "height": 40}
	}
	if req.TriageColor != nil && strings.TrimSpace(*req.TriageColor) != "" {
		newNode["data"].(map[string]any)["triageColor"] = strings.TrimSpace(*req.TriageColor)
	}
	if req.ConditionExpression != nil && strings.TrimSpace(*req.ConditionExpression) != "" {
		newNode["data"].(map[string]any)["conditionExpression"] = strings.TrimSpace(*req.ConditionExpression)
	}
	if req.CorrelationKey != nil && strings.TrimSpace(*req.CorrelationKey) != "" {
		newNode["data"].(map[string]any)["correlationKey"] = strings.TrimSpace(*req.CorrelationKey)
	}

	instanceHasNode := false
	for _, n := range graph.Nodes {
		if nodeInstanceID(n) == instanceID {
			instanceHasNode = true
			break
		}
	}
	if !instanceHasNode && normalizedNodeType != "startEvent" {
		graph.Nodes = append(graph.Nodes, map[string]any{
			"id":     fmt.Sprintf("start-%s", instanceID),
			"type":   "startEvent",
			"width":  40,
			"height": 40,
			"style": map[string]any{
				"width":  40,
				"height": 40,
			},
			"position": map[string]any{"x": 80, "y": 200},
			"data": map[string]any{
				"label":      "Start",
				"instanceId": instanceID,
			},
		})
	}
	graph.Nodes = append(graph.Nodes, newNode)

	if req.FromNodeID != nil && strings.TrimSpace(*req.FromNodeID) != "" {
		sourceID := strings.TrimSpace(*req.FromNodeID)
		edgeID := fmt.Sprintf("edge-%d", ts)
		edge := map[string]any{
			"id":     edgeID,
			"source": sourceID,
			"target": targetNodeID,
			"type":   "sequenceFlow",
			"markerEnd": map[string]any{
				"type": "arrowclosed",
			},
			"style": map[string]any{"stroke": "hsl(220,68%,30%)"},
		}
		if req.ConditionExpression != nil && strings.TrimSpace(*req.ConditionExpression) != "" {
			edge["label"] = strings.TrimSpace(*req.ConditionExpression)
		}
		graph.Edges = append(graph.Edges, edge)
	}

	return targetNodeID
}

func (c *Client) upsertDefinitionGraph(ctx context.Context, tx pgx.Tx, definitionID string, graph designerGraph) error {
	graphPayload, err := json.Marshal(graph)
	if err != nil {
		return err
	}
	return c.execTx(ctx, tx, "task.create.upsert_graph", `
INSERT INTO definition_graphs (definition_id, graph_payload, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (definition_id) DO UPDATE
SET graph_payload = EXCLUDED.graph_payload, updated_at = NOW()
`, definitionID, graphPayload)
}

func (c *Client) upsertProcessInstance(ctx context.Context, tx pgx.Tx, instanceID, definitionID, label, patientID, patientName string) error {
	var instanceExists bool
	err := c.queryRowTx(ctx, tx, "task.create.instance_exists", `SELECT EXISTS(SELECT 1 FROM process_instances WHERE id = $1)`, instanceID).Scan(&instanceExists)
	if err != nil {
		return err
	}
	if !instanceExists {
		return c.execTx(ctx, tx, "task.create.insert_instance", `
INSERT INTO process_instances (
  id, definition_id, status, started_at, started_by_user_id, current_node,
  priority, patient_id, patient_name, created_at, updated_at
)
VALUES ($1, $2, 'active', NOW(), NULL, $3, 'medium', $4, $5, NOW(), NOW())
`, instanceID, definitionID, label, patientID, patientName)
	}
	return c.execTx(ctx, tx, "task.create.update_instance", `
UPDATE process_instances
SET current_node = $2, patient_id = $3, patient_name = $4, updated_at = NOW()
WHERE id = $1
`, instanceID, label, patientID, patientName)
}

func (c *Client) upsertUserTaskForNode(
	ctx context.Context,
	tx pgx.Tx,
	req CreateTaskFromConsoleRequest,
	instanceID, targetNodeID, definitionID, definitionName, priority string,
	slaMinutes int,
	patientName, patientID, triageCategory, triageColor string,
	now time.Time,
) error {
	var existingTaskID string
	err := c.queryRowTx(ctx, tx, "task.create.lookup_existing_by_node", `
SELECT id
FROM tasks
WHERE instance_id = $1 AND node_id = $2
LIMIT 1
`, instanceID, targetNodeID).Scan(&existingTaskID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	taskAlreadyExists := err == nil

	assigneeName := defaultAssigneeName
	err = c.queryRowTx(ctx, tx, "task.create.lookup_default_assignee", `
SELECT name
FROM users
WHERE primary_role_key = $1 AND active = TRUE
ORDER BY id
LIMIT 1
`, string(req.AssignedRole)).Scan(&assigneeName)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	formValues := req.FormValues
	if formValues == nil {
		formValues = map[string]any{}
	}
	if _, ok := formValues["patient_name"]; !ok && patientName != "" {
		formValues["patient_name"] = patientName
	}
	if _, ok := formValues["patient_id"]; !ok && patientID != "" {
		formValues["patient_id"] = patientID
	}
	formValuesRaw, err := json.Marshal(formValues)
	if err != nil {
		return err
	}
	formFieldsRaw := defaultTaskFormFields(req.AssignedRole)

	taskID := existingTaskID
	createdTask := false
	if !taskAlreadyExists {
		taskID = fmt.Sprintf("t-%s", targetNodeID)
		createdTask = true
		err = c.execTx(ctx, tx, "task.create.insert_task", `
INSERT INTO tasks (
  id, node_id, instance_id, definition_id, definition_name, name,
  assignee_name, role_key, status, priority, created_at, due_at,
  sla_minutes, minutes_remaining, patient_name, patient_id,
  form_fields, form_values, updated_at, triage_category, triage_color
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'claimed',$9,$10,$11,$12,$12,$13,$14,$15,$16,$10,$17,$18)
`, taskID, targetNodeID, instanceID, definitionID, definitionName, req.Label,
			assigneeName, string(req.AssignedRole), priority, now, now.Add(time.Duration(slaMinutes)*time.Minute),
			slaMinutes, patientName, patientID, formFieldsRaw, formValuesRaw, triageCategory, triageColor)
	} else {
		err = c.execTx(ctx, tx, "task.create.update_task", `
UPDATE tasks
SET
  name = $2,
  assignee_name = COALESCE(NULLIF(assignee_name,''), $3),
  role_key = $4,
  status = 'claimed',
  priority = $5,
  due_at = $6,
  minutes_remaining = $7,
  patient_name = $8,
  patient_id = $9,
  form_values = $10,
  updated_at = NOW(),
  triage_category = $11,
  triage_color = $12
WHERE id = $1
`, taskID, req.Label, assigneeName, string(req.AssignedRole), priority, now.Add(time.Duration(slaMinutes)*time.Minute), slaMinutes, patientName, patientID, formValuesRaw, triageCategory, triageColor)
	}
	if err != nil {
		return err
	}

	taskSnapshot, err := c.buildTaskSnapshot(ctx, tx, taskID)
	if err != nil {
		return err
	}
	if err := c.upsertSavedTaskSnapshot(ctx, tx, taskID, instanceID, "open", taskSnapshot); err != nil {
		return err
	}

	eventType := "task_created"
	if !createdTask {
		eventType = "task_claimed"
	}
	return c.execTx(ctx, tx, "task.create.audit_task_event", `
INSERT INTO audit_events (
  id, instance_id, task_id, event_time, actor, role_key, event_type, node_id, node_name, payload
)
VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9)
`, fmt.Sprintf("ae-%d", time.Now().UnixNano()), instanceID, taskID, "System", string(req.CreatedByRole), eventType, targetNodeID, req.Label, json.RawMessage(`{"source":"api"}`))
}

func (c *Client) insertNonTaskAuditEvent(ctx context.Context, tx pgx.Tx, req CreateTaskFromConsoleRequest, instanceID, targetNodeID, normalizedNodeType string) error {
	eventType := "gateway_passed"
	switch normalizedNodeType {
	case "timerEvent":
		eventType = "timer_fired"
	case "messageEvent":
		eventType = "message_received"
	case "signalEvent":
		eventType = "signal_received"
	case "startEvent", "endEvent":
		eventType = "task_created"
	}
	payload := map[string]any{"source": "api", "nodeType": normalizedNodeType}
	if req.CorrelationKey != nil {
		payload["correlationKey"] = strings.TrimSpace(*req.CorrelationKey)
	}
	if req.ConditionExpression != nil {
		payload["conditionExpression"] = strings.TrimSpace(*req.ConditionExpression)
	}
	payloadRaw, _ := json.Marshal(payload)
	return c.execTx(ctx, tx, "task.create.audit_non_task_event", `
INSERT INTO audit_events (
  id, instance_id, event_time, actor, role_key, event_type, node_id, node_name, payload
)
VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)
`, fmt.Sprintf("ae-%d", time.Now().UnixNano()), instanceID, "System", string(req.CreatedByRole), eventType, targetNodeID, req.Label, payloadRaw)
}

func (c *Client) fetchCreateTaskFromConsoleResponse(ctx context.Context, createdNodeID, instanceID string) (CreateTaskFromConsoleResponse, error) {
	tasks, err := c.fetchTasks(ctx)
	if err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}
	savedTasks, err := c.fetchSavedTasks(ctx)
	if err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}
	latestGraph, err := c.fetchDesignerGraph(ctx)
	if err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}
	instances, err := c.fetchInstances(ctx)
	if err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}
	audit, err := c.fetchAudit(ctx)
	if err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}

	return CreateTaskFromConsoleResponse{
		Tasks:         tasks,
		SavedTasks:    savedTasks,
		Graph:         latestGraph,
		Instances:     instances,
		Audit:         audit,
		CreatedNodeID: createdNodeID,
		InstanceID:    instanceID,
	}, nil
}

func roleLabel(role Role) string {
	switch role {
	case "reception":
		return "Reception"
	case "triage_nurse":
		return "Triage Nurse"
	case "physician":
		return "Physician"
	case "lab":
		return "Laboratory"
	case "radiology":
		return "Radiology"
	default:
		return "Admin"
	}
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

func nodeInstanceID(node map[string]any) string {
	data, ok := node["data"].(map[string]any)
	if !ok {
		return ""
	}
	value, ok := data["instanceId"].(string)
	if !ok {
		return ""
	}
	return value
}

func defaultTaskFormFields(role Role) json.RawMessage {
	fields := []map[string]any{
		{"id": "patient_name", "label": "Patient Name", "type": "text", "required": true},
		{"id": "patient_id", "label": "Patient ID", "type": "text", "required": true},
		{"id": "notes", "label": "Notes", "type": "textarea", "required": false},
	}

	if role == "triage_nurse" {
		fields = append(fields, map[string]any{
			"id":       "urgency",
			"label":    "Urgency",
			"type":     "select",
			"required": false,
			"options":  []string{"Immediate", "Very urgent", "Urgent", "Standard", "Non-urgent"},
		})
	}

	raw, err := json.Marshal(fields)
	if err != nil {
		return json.RawMessage(`[]`)
	}
	return raw
}
