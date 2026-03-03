package taskcreation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"triage-flow-forge/backend/internal/modules/contracts"
)

const defaultAssigneeName = "Unassigned"

func upsertProcessInstance(ctx context.Context, deps Dependencies, tx pgx.Tx, instanceID, definitionID, label, patientID, patientName string) error {
	var instanceExists bool
	err := deps.QueryRowTx(ctx, tx, "task.create.instance_exists", `SELECT EXISTS(SELECT 1 FROM process_instances WHERE id = $1)`, instanceID).Scan(&instanceExists)
	if err != nil {
		return err
	}
	if !instanceExists {
		return deps.ExecTx(ctx, tx, "task.create.insert_instance", `
INSERT INTO process_instances (
  id, definition_id, status, started_at, started_by_user_id, current_node,
  priority, patient_id, patient_name, created_at, updated_at
)
VALUES ($1, $2, 'active', NOW(), NULL, $3, 'medium', $4, $5, NOW(), NOW())
`, instanceID, definitionID, label, patientID, patientName)
	}
	return deps.ExecTx(ctx, tx, "task.create.update_instance", `
UPDATE process_instances
SET current_node = $2, patient_id = $3, patient_name = $4, updated_at = NOW()
WHERE id = $1
`, instanceID, label, patientID, patientName)
}

func upsertUserTaskForNode(
	ctx context.Context,
	deps Dependencies,
	tx pgx.Tx,
	req contracts.CreateTaskFromConsoleRequest,
	instanceID, targetNodeID, definitionID, definitionName, priority string,
	slaMinutes int,
	patientName, patientID, triageCategory, triageColor string,
	now time.Time,
) error {
	var existingTaskID string
	err := deps.QueryRowTx(ctx, tx, "task.create.lookup_existing_by_node", `
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
	err = deps.QueryRowTx(ctx, tx, "task.create.lookup_default_assignee", `
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
		err = deps.ExecTx(ctx, tx, "task.create.insert_task", `
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
		err = deps.ExecTx(ctx, tx, "task.create.update_task", `
UPDATE tasks
SET
  name = $2,
  assignee_name = $3,
  role_key = $4,
  status = 'claimed',
  priority = $5,
  due_at = $6,
  minutes_remaining = $7,
  patient_name = $8,
  patient_id = $9,
  form_fields = $10,
  form_values = $11,
  updated_at = NOW(),
  triage_category = $12,
  triage_color = $13
WHERE id = $1
`, taskID, req.Label, assigneeName, string(req.AssignedRole), priority, now.Add(time.Duration(slaMinutes)*time.Minute), slaMinutes, patientName, patientID, formFieldsRaw, formValuesRaw, triageCategory, triageColor)
	}
	if err != nil {
		return err
	}

	taskSnapshot, err := deps.BuildTaskSnapshot(ctx, tx, taskID)
	if err != nil {
		return err
	}
	if err := deps.UpsertSavedTaskSnapshot(ctx, tx, taskID, instanceID, "open", taskSnapshot); err != nil {
		return err
	}

	eventType := "task_created"
	if !createdTask {
		eventType = "task_claimed"
	}
	if err := deps.ExecTx(ctx, tx, "task.create.audit_task_event", `
INSERT INTO audit_events (
  id, instance_id, task_id, event_time, actor, role_key, event_type, node_id, node_name, payload
)
VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9)
`, fmt.Sprintf("ae-%d", time.Now().UnixNano()), instanceID, taskID, "System", string(req.AssignedRole), eventType, targetNodeID, req.Label, json.RawMessage(`{"source":"api"}`)); err != nil {
		return err
	}

	return deps.ExecTx(ctx, tx, "task.create.audit_task_claimed", `
INSERT INTO audit_events (
  id, instance_id, task_id, event_time, actor, role_key, event_type, node_id, node_name, payload
)
VALUES ($1, $2, $3, NOW(), $4, $5, 'task_claimed', $6, $7, $8)
`, fmt.Sprintf("ae-%d", time.Now().UnixNano()), instanceID, taskID, assigneeName, string(req.AssignedRole), targetNodeID, req.Label, json.RawMessage(`{"source":"api","autoClaimed":true}`))
}

func insertNonTaskAuditEvent(ctx context.Context, deps Dependencies, tx pgx.Tx, req contracts.CreateTaskFromConsoleRequest, instanceID, targetNodeID, normalizedNodeType string) error {
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
	return deps.ExecTx(ctx, tx, "task.create.audit_non_task_event", `
INSERT INTO audit_events (
  id, instance_id, event_time, actor, role_key, event_type, node_id, node_name, payload
)
VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)
`, fmt.Sprintf("ae-%d", time.Now().UnixNano()), instanceID, "System", string(req.CreatedByRole), eventType, targetNodeID, req.Label, payloadRaw)
}

func fetchCreateTaskFromConsoleResponse(ctx context.Context, deps Dependencies, createdNodeID, instanceID string) (contracts.CreateTaskFromConsoleResponse, error) {
	tasks, err := deps.FetchTasks(ctx)
	if err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}
	savedTasks, err := deps.FetchSavedTasks(ctx)
	if err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}
	latestGraph, err := deps.FetchDesignerGraph(ctx)
	if err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}
	instances, err := deps.FetchInstances(ctx)
	if err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}
	audit, err := deps.FetchAudit(ctx)
	if err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}

	return contracts.CreateTaskFromConsoleResponse{
		Tasks:         tasks,
		SavedTasks:    savedTasks,
		Graph:         latestGraph,
		Instances:     instances,
		Audit:         audit,
		CreatedNodeID: createdNodeID,
		InstanceID:    instanceID,
	}, nil
}

func markInstanceClosed(ctx context.Context, deps Dependencies, tx pgx.Tx, instanceID string) error {
	if err := deps.ExecTx(ctx, tx, "task.create.instance_mark_closed", `
UPDATE process_instances
SET status = 'completed', current_node = 'End', updated_at = NOW()
WHERE id = $1
`, instanceID); err != nil {
		return err
	}

	return deps.ExecTx(ctx, tx, "task.create.saved_tasks_mark_closed", `
UPDATE saved_tasks
SET process_status = 'closed', updated_at = NOW()
WHERE instance_id = $1
`, instanceID)
}
