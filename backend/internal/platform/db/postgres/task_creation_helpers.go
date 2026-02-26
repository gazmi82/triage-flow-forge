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

	instanceNodes := make([]map[string]any, 0)
	startNodeID := ""
	hasNonStartNode := false
	for _, node := range graph.Nodes {
		if nodeInstanceID(node) == instanceID {
			instanceNodes = append(instanceNodes, node)
			nodeType, _ := node["type"].(string)
			nodeID, _ := node["id"].(string)
			if nodeType == "startEvent" {
				startNodeID = nodeID
			} else {
				hasNonStartNode = true
			}
		}
	}

	instanceHasNode := len(instanceNodes) > 0
	if !instanceHasNode && normalizedNodeType != "startEvent" {
		startNodeID = fmt.Sprintf("start-%s", instanceID)
		startNode := map[string]any{
			"id":     startNodeID,
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
		}
		graph.Nodes = append(graph.Nodes, startNode)
		instanceNodes = append(instanceNodes, startNode)
	}

	reusedNode := false
	if normalizedNodeType == "userTask" {
		if existingID, ok := findUserTaskNodeForRole(instanceNodes, req.AssignedRole); ok {
			targetNodeID = existingID
			reusedNode = true
		}
	}

	if !reusedNode {
		sourceID := ""
		if req.FromNodeID != nil && strings.TrimSpace(*req.FromNodeID) != "" {
			sourceID = strings.TrimSpace(*req.FromNodeID)
		}
		sourceNode := findNodeByID(instanceNodes, sourceID)
		outgoingCountFromSource := countOutgoingEdges(graph.Edges, sourceID)
		x, y, width, height := computeNodePlacement(instanceNodes, sourceNode, outgoingCountFromSource, normalizedNodeType)

		newNode := map[string]any{
			"id":   targetNodeID,
			"type": normalizedNodeType,
			"position": map[string]any{
				"x": x,
				"y": y,
			},
			"width":  width,
			"height": height,
			"style": map[string]any{
				"width":  width,
				"height": height,
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
		if req.TriageColor != nil && strings.TrimSpace(*req.TriageColor) != "" {
			newNode["data"].(map[string]any)["triageColor"] = strings.TrimSpace(*req.TriageColor)
		}
		if req.ConditionExpression != nil && strings.TrimSpace(*req.ConditionExpression) != "" {
			newNode["data"].(map[string]any)["conditionExpression"] = strings.TrimSpace(*req.ConditionExpression)
		}
		if req.CorrelationKey != nil && strings.TrimSpace(*req.CorrelationKey) != "" {
			newNode["data"].(map[string]any)["correlationKey"] = strings.TrimSpace(*req.CorrelationKey)
		}

		graph.Nodes = append(graph.Nodes, newNode)
		instanceNodes = append(instanceNodes, newNode)
	} else {
		existingNode := findNodeByID(instanceNodes, targetNodeID)
		if existingNode != nil {
			data, _ := existingNode["data"].(map[string]any)
			if data == nil {
				data = map[string]any{}
				existingNode["data"] = data
			}
			data["instanceId"] = instanceID
			data["role"] = roleLabel(req.AssignedRole)
			if strings.TrimSpace(req.Label) != "" {
				data["label"] = req.Label
			}
			if req.AssignedRole != "admin" {
				data["laneRef"] = string(req.AssignedRole)
			}
			if req.TriageColor != nil && strings.TrimSpace(*req.TriageColor) != "" {
				data["triageColor"] = strings.TrimSpace(*req.TriageColor)
			}
		}
	}

	sourceID := ""
	if req.FromNodeID != nil && strings.TrimSpace(*req.FromNodeID) != "" {
		sourceID = strings.TrimSpace(*req.FromNodeID)
	} else if !hasNonStartNode && normalizedNodeType != "startEvent" {
		// First created task in an instance must be connected to Start.
		sourceID = startNodeID
	}
	if sourceID == "" || sourceID == targetNodeID || edgeExists(graph.Edges, sourceID, targetNodeID) {
		return targetNodeID
	}

	sourceNode := findNodeByID(instanceNodes, sourceID)
	outgoingCountFromSource := countOutgoingEdges(graph.Edges, sourceID)
	edge := map[string]any{
		"id":     fmt.Sprintf("edge-%d", ts),
		"source": sourceID,
		"target": targetNodeID,
		"type":   "sequenceFlow",
		"markerEnd": map[string]any{
			"type": "arrowclosed",
		},
		"style": map[string]any{"stroke": "hsl(220,68%,30%)"},
	}
	if sourceNode != nil {
		sourceType, _ := sourceNode["type"].(string)
		if sourceType == "andGateway" {
			if outgoingCountFromSource%2 == 0 {
				edge["sourceHandle"] = "top"
			} else {
				edge["sourceHandle"] = "bottom"
			}
			edge["label"] = fmt.Sprintf("Branch %c", 'A'+rune(outgoingCountFromSource))
		}
	}
	if req.ConditionExpression != nil && strings.TrimSpace(*req.ConditionExpression) != "" {
		edge["label"] = strings.TrimSpace(*req.ConditionExpression)
	}
	graph.Edges = append(graph.Edges, edge)

	return targetNodeID
}

func findUserTaskNodeForRole(nodes []map[string]any, role Role) (string, bool) {
	for _, node := range nodes {
		nodeType, _ := node["type"].(string)
		if nodeType != "userTask" {
			continue
		}
		data, _ := node["data"].(map[string]any)
		if data == nil {
			continue
		}
		laneRef, _ := data["laneRef"].(string)
		roleLabelValue, _ := data["role"].(string)
		if laneRef == string(role) || strings.EqualFold(roleLabelValue, roleLabel(role)) {
			nodeID, _ := node["id"].(string)
			if nodeID != "" {
				return nodeID, true
			}
		}
	}
	return "", false
}

func findNodeByID(nodes []map[string]any, id string) map[string]any {
	if strings.TrimSpace(id) == "" {
		return nil
	}
	for _, node := range nodes {
		nodeID, _ := node["id"].(string)
		if nodeID == id {
			return node
		}
	}
	return nil
}

func countOutgoingEdges(edges []map[string]any, sourceID string) int {
	if strings.TrimSpace(sourceID) == "" {
		return 0
	}
	count := 0
	for _, edge := range edges {
		source, _ := edge["source"].(string)
		if source == sourceID {
			count++
		}
	}
	return count
}

func edgeExists(edges []map[string]any, sourceID, targetID string) bool {
	for _, edge := range edges {
		source, _ := edge["source"].(string)
		target, _ := edge["target"].(string)
		if source == sourceID && target == targetID {
			return true
		}
	}
	return false
}

func computeNodePlacement(instanceNodes []map[string]any, sourceNode map[string]any, sourceOutgoing int, nodeType string) (int, int, int, int) {
	width, height := nodeSize(nodeType)
	x := 220
	y := 180

	if sourceNode != nil {
		sourcePos, _ := sourceNode["position"].(map[string]any)
		sourceX, _ := numberAsInt(sourcePos["x"])
		sourceY, _ := numberAsInt(sourcePos["y"])
		sourceWidth, _ := numberAsInt(sourceNode["width"])
		if sourceWidth == 0 {
			if style, ok := sourceNode["style"].(map[string]any); ok {
				sourceWidth, _ = numberAsInt(style["width"])
			}
		}
		if sourceWidth == 0 {
			sourceWidth = 120
		}
		x = sourceX + sourceWidth + 140
		y = sourceY

		sourceType, _ := sourceNode["type"].(string)
		if sourceType == "andGateway" || sourceType == "xorGateway" {
			y = sourceY + branchOffset(sourceOutgoing)
		}
	}

	for overlapsPlacement(instanceNodes, x, y, width, height) {
		y += 140
	}

	return x, y, width, height
}

func nodeSize(nodeType string) (int, int) {
	switch nodeType {
	case "xorGateway", "andGateway":
		return 64, 64
	case "startEvent", "endEvent", "timerEvent", "messageEvent", "signalEvent":
		return 40, 40
	default:
		return 220, 110
	}
}

func branchOffset(index int) int {
	if index == 0 {
		return -170
	}
	if index == 1 {
		return 170
	}
	level := ((index - 2) / 2) + 2
	if index%2 == 0 {
		return -170 * level
	}
	return 170 * level
}

func overlapsPlacement(nodes []map[string]any, x, y, width, height int) bool {
	for _, node := range nodes {
		pos, _ := node["position"].(map[string]any)
		nodeX, _ := numberAsInt(pos["x"])
		nodeY, _ := numberAsInt(pos["y"])
		nodeW, _ := numberAsInt(node["width"])
		nodeH, _ := numberAsInt(node["height"])
		if nodeW == 0 || nodeH == 0 {
			style, _ := node["style"].(map[string]any)
			if nodeW == 0 {
				nodeW, _ = numberAsInt(style["width"])
			}
			if nodeH == 0 {
				nodeH, _ = numberAsInt(style["height"])
			}
		}
		if nodeW == 0 {
			nodeW = 80
		}
		if nodeH == 0 {
			nodeH = 80
		}

		if x+width+36 < nodeX || nodeX+nodeW+36 < x || y+height+28 < nodeY || nodeY+nodeH+28 < y {
			continue
		}
		return true
	}
	return false
}

func numberAsInt(value any) (int, bool) {
	switch typed := value.(type) {
	case int:
		return typed, true
	case int32:
		return int(typed), true
	case int64:
		return int(typed), true
	case float64:
		return int(typed), true
	case float32:
		return int(typed), true
	default:
		return 0, false
	}
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
	if err := c.execTx(ctx, tx, "task.create.audit_task_event", `
INSERT INTO audit_events (
  id, instance_id, task_id, event_time, actor, role_key, event_type, node_id, node_name, payload
)
VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9)
`, fmt.Sprintf("ae-%d", time.Now().UnixNano()), instanceID, taskID, "System", string(req.AssignedRole), eventType, targetNodeID, req.Label, json.RawMessage(`{"source":"api"}`)); err != nil {
		return err
	}

	// Mirror historical frontend behavior: created/redirected tasks are auto-claimed by their role.
	return c.execTx(ctx, tx, "task.create.audit_task_claimed", `
INSERT INTO audit_events (
  id, instance_id, task_id, event_time, actor, role_key, event_type, node_id, node_name, payload
)
VALUES ($1, $2, $3, NOW(), $4, $5, 'task_claimed', $6, $7, $8)
`, fmt.Sprintf("ae-%d", time.Now().UnixNano()), instanceID, taskID, assigneeName, string(req.AssignedRole), targetNodeID, req.Label, json.RawMessage(`{"source":"api","autoClaimed":true}`))
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

func (c *Client) markInstanceClosed(ctx context.Context, tx pgx.Tx, instanceID string) error {
	if err := c.execTx(ctx, tx, "task.create.instance_mark_closed", `
UPDATE process_instances
SET status = 'completed', current_node = 'End', updated_at = NOW()
WHERE id = $1
`, instanceID); err != nil {
		return err
	}

	return c.execTx(ctx, tx, "task.create.saved_tasks_mark_closed", `
UPDATE saved_tasks
SET process_status = 'closed', updated_at = NOW()
WHERE instance_id = $1
`, instanceID)
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
