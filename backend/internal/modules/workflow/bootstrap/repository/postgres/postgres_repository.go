package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"triage-flow-forge/backend/internal/modules/contracts"
	dbpostgres "triage-flow-forge/backend/internal/platform/db/postgres"
	"triage-flow-forge/backend/internal/platform/db/postgres/taskcreation"
	"triage-flow-forge/backend/internal/platform/db/postgres/taskdesigner"
)

type Repository struct {
	client *dbpostgres.Client
}

func New(client *dbpostgres.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) FetchWorkflowBootstrap(ctx context.Context) (contracts.WorkflowBootstrapPayload, error) {
	users, err := r.fetchUsers(ctx)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	definitions, err := r.fetchDefinitions(ctx)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	instances, err := r.fetchInstances(ctx)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	tasks, err := r.fetchTasks(ctx)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	savedTasks, err := r.fetchSavedTasks(ctx)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	auditEvents, err := r.fetchAudit(ctx)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	graph, err := r.fetchDesignerGraph(ctx)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	drafts, err := r.fetchDrafts(ctx)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	return contracts.WorkflowBootstrapPayload{
		Users:       users,
		Definitions: definitions,
		Instances:   instances,
		Tasks:       tasks,
		SavedTasks:  savedTasks,
		Audit:       auditEvents,
		Graph:       graph,
		Drafts:      drafts,
	}, nil
}

func (r *Repository) fetchUsers(ctx context.Context) ([]contracts.User, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
SELECT id, name, email, primary_role_key, department, active
FROM users
ORDER BY id
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]contracts.User, 0)
	for rows.Next() {
		var u contracts.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Department, &u.Active); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *Repository) fetchDefinitions(ctx context.Context) ([]contracts.ProcessDefinition, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
SELECT
  d.id,
  d.definition_key,
  d.name,
  d.version,
  d.status,
  COALESCE(u.name, 'System') AS created_by,
  d.created_at,
  d.updated_at,
  d.description,
  d.lanes,
  d.instance_count
FROM process_definitions d
LEFT JOIN users u ON u.id = d.created_by_user_id
ORDER BY d.id
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]contracts.ProcessDefinition, 0)
	for rows.Next() {
		var item contracts.ProcessDefinition
		var createdAt, updatedAt time.Time
		if err := rows.Scan(
			&item.ID,
			&item.Key,
			&item.Name,
			&item.Version,
			&item.Status,
			&item.CreatedBy,
			&createdAt,
			&updatedAt,
			&item.Description,
			&item.Lanes,
			&item.InstanceCount,
		); err != nil {
			return nil, err
		}
		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) fetchInstances(ctx context.Context) ([]contracts.ProcessInstance, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
SELECT
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
FROM process_instances i
LEFT JOIN process_definitions d ON d.id = i.definition_id
LEFT JOIN users u ON u.id = i.started_by_user_id
ORDER BY i.started_at DESC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]contracts.ProcessInstance, 0)
	for rows.Next() {
		var item contracts.ProcessInstance
		var startedAt time.Time
		if err := rows.Scan(
			&item.ID,
			&item.DefinitionID,
			&item.DefinitionName,
			&item.Status,
			&startedAt,
			&item.StartedBy,
			&item.CurrentNode,
			&item.Priority,
			&item.PatientID,
			&item.PatientName,
		); err != nil {
			return nil, err
		}
		item.StartedAt = startedAt.UTC().Format(time.RFC3339)
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) fetchTasks(ctx context.Context) ([]contracts.Task, error) {
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

func (r *Repository) fetchSavedTasks(ctx context.Context) ([]contracts.SavedTaskRecord, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
SELECT snapshot, process_status
FROM saved_tasks
ORDER BY updated_at DESC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]contracts.SavedTaskRecord, 0)
	for rows.Next() {
		var raw json.RawMessage
		var processStatus string
		if err := rows.Scan(&raw, &processStatus); err != nil {
			return nil, err
		}
		record := contracts.SavedTaskRecord{}
		if len(raw) > 0 {
			if err := json.Unmarshal(raw, &record); err != nil {
				return nil, err
			}
		}
		record["processStatus"] = processStatus
		items = append(items, record)
	}

	return items, rows.Err()
}

func (r *Repository) fetchAudit(ctx context.Context) ([]contracts.AuditEvent, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
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
ORDER BY event_time DESC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]contracts.AuditEvent, 0)
	for rows.Next() {
		var item contracts.AuditEvent
		var eventTime time.Time
		if err := rows.Scan(
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
			return nil, err
		}
		item.Timestamp = eventTime.UTC().Format(time.RFC3339)
		if item.Payload == nil {
			item.Payload = json.RawMessage("{}")
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) fetchDesignerGraph(ctx context.Context) (contracts.DesignerGraphPayload, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return contracts.DesignerGraphPayload{}, err
	}

	var raw json.RawMessage
	err = pool.QueryRow(ctx, `
SELECT graph_payload
FROM definition_graphs
ORDER BY updated_at DESC
LIMIT 1
`).Scan(&raw)
	if err != nil {
		return contracts.DesignerGraphPayload{Nodes: []map[string]any{}, Edges: []map[string]any{}}, nil
	}

	graph := contracts.DesignerGraphPayload{Nodes: []map[string]any{}, Edges: []map[string]any{}}
	if len(raw) == 0 {
		return graph, nil
	}
	if err := json.Unmarshal(raw, &graph); err != nil {
		return contracts.DesignerGraphPayload{Nodes: []map[string]any{}, Edges: []map[string]any{}}, nil
	}
	if graph.Nodes == nil {
		graph.Nodes = []map[string]any{}
	}
	if graph.Edges == nil {
		graph.Edges = []map[string]any{}
	}

	graph, err = r.hydrateBootstrapGraphRuntime(ctx, graph)
	if err != nil {
		return contracts.DesignerGraphPayload{}, err
	}
	return graph, nil
}

type taskRuntimeSnapshot struct {
	InstanceID  string
	NodeID      string
	Status      string
	TriageColor string
	UpdatedAt   time.Time
}

func (r *Repository) hydrateBootstrapGraphRuntime(ctx context.Context, graph contracts.DesignerGraphPayload) (contracts.DesignerGraphPayload, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return graph, err
	}

	rows, err := pool.Query(ctx, `
SELECT instance_id, COALESCE(node_id, ''), status, COALESCE(triage_color, ''), updated_at
FROM tasks
WHERE COALESCE(node_id, '') <> ''
ORDER BY updated_at DESC
`)
	if err != nil {
		return graph, err
	}
	defer rows.Close()

	latestByInstanceNode := map[string]taskRuntimeSnapshot{}
	for rows.Next() {
		var item taskRuntimeSnapshot
		if err := rows.Scan(&item.InstanceID, &item.NodeID, &item.Status, &item.TriageColor, &item.UpdatedAt); err != nil {
			return graph, err
		}
		key := item.InstanceID + "::" + item.NodeID
		if _, exists := latestByInstanceNode[key]; !exists {
			latestByInstanceNode[key] = item
		}
	}
	if err := rows.Err(); err != nil {
		return graph, err
	}

	nodesByInstance := map[string][]map[string]any{}
	startByInstance := map[string]string{}
	for _, node := range graph.Nodes {
		nodeType, _ := node["type"].(string)
		nodeID, _ := node["id"].(string)
		data, _ := node["data"].(map[string]any)
		if data == nil {
			continue
		}
		instanceID, _ := data["instanceId"].(string)
		if instanceID == "" {
			continue
		}
		nodesByInstance[instanceID] = append(nodesByInstance[instanceID], node)

		if nodeType == "userTask" && nodeID != "" {
			key := instanceID + "::" + nodeID
			if task, ok := latestByInstanceNode[key]; ok {
				data["taskStatus"] = taskdesigner.NormalizeTaskStatus(task.Status)
				data["runtimeActive"] = task.Status == "claimed"
				if task.TriageColor != "" {
					data["triageColor"] = task.TriageColor
				}
			}
		}
		if nodeType == "startEvent" && nodeID != "" {
			startByInstance[instanceID] = nodeID
		}
	}

	for instanceID, nodes := range nodesByInstance {
		startID := startByInstance[instanceID]
		if startID == "" {
			continue
		}
		hasStartOutgoing := false
		for _, edge := range graph.Edges {
			source, _ := edge["source"].(string)
			if source == startID {
				hasStartOutgoing = true
				break
			}
		}
		if !hasStartOutgoing {
			var firstNodeID string
			var firstX float64
			firstSet := false
			for _, node := range nodes {
				nodeID, _ := node["id"].(string)
				nodeType, _ := node["type"].(string)
				if nodeID == "" || nodeID == startID || nodeType == "startEvent" {
					continue
				}
				pos, _ := node["position"].(map[string]any)
				x, ok := taskdesigner.NumberAsFloat(pos["x"])
				if !ok {
					continue
				}
				if !firstSet || x < firstX {
					firstSet = true
					firstX = x
					firstNodeID = nodeID
				}
			}
			if firstNodeID != "" && !taskdesigner.EdgeExists(graph.Edges, startID, firstNodeID) {
				graph.Edges = append(graph.Edges, map[string]any{
					"id":        fmt.Sprintf("edge-%s-%s", startID, firstNodeID),
					"source":    startID,
					"target":    firstNodeID,
					"type":      "sequenceFlow",
					"markerEnd": map[string]any{"type": "arrowclosed"},
					"style":     map[string]any{"stroke": "hsl(220,68%,30%)"},
				})
			}
		}

		mutableGraph := taskcreation.DesignerGraph{
			Nodes: graph.Nodes,
			Edges: graph.Edges,
		}
		taskcreation.NormalizeInstanceRouting(&mutableGraph, instanceID)
		graph.Nodes = mutableGraph.Nodes
		graph.Edges = mutableGraph.Edges
	}

	return graph, nil
}

func (r *Repository) fetchDrafts(ctx context.Context) ([]contracts.DraftRecord, error) {
	pool, err := r.client.Pool(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
SELECT id, name, version, saved_at, graph_payload
FROM drafts
ORDER BY saved_at DESC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]contracts.DraftRecord, 0)
	for rows.Next() {
		var item contracts.DraftRecord
		var savedAt time.Time
		var graphRaw json.RawMessage
		if err := rows.Scan(&item.ID, &item.Name, &item.Version, &savedAt, &graphRaw); err != nil {
			return nil, err
		}
		item.SavedAt = savedAt.UTC().Format(time.RFC3339)
		item.Graph = contracts.DesignerGraphPayload{Nodes: []map[string]any{}, Edges: []map[string]any{}}
		if len(graphRaw) > 0 {
			if err := json.Unmarshal(graphRaw, &item.Graph); err != nil {
				return nil, err
			}
		}
		if item.Graph.Nodes == nil {
			item.Graph.Nodes = []map[string]any{}
		}
		if item.Graph.Edges == nil {
			item.Graph.Edges = []map[string]any{}
		}
		items = append(items, item)
	}

	return items, rows.Err()
}
