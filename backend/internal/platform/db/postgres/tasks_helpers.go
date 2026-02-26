package postgres

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
)

func (c *Client) fetchTaskMutationResponse(ctx context.Context) (TaskMutationResponse, error) {
	tasks, err := c.fetchTasks(ctx)
	if err != nil {
		return TaskMutationResponse{}, err
	}
	savedTasks, err := c.fetchSavedTasks(ctx)
	if err != nil {
		return TaskMutationResponse{}, err
	}
	graph, err := c.fetchDesignerGraph(ctx)
	if err != nil {
		return TaskMutationResponse{}, err
	}
	instances, err := c.fetchInstances(ctx)
	if err != nil {
		return TaskMutationResponse{}, err
	}
	audit, err := c.fetchAudit(ctx)
	if err != nil {
		return TaskMutationResponse{}, err
	}

	return TaskMutationResponse{
		Tasks:      tasks,
		SavedTasks: savedTasks,
		Graph:      graph,
		Instances:  instances,
		Audit:      audit,
	}, nil
}

func (c *Client) buildTaskSnapshot(ctx context.Context, tx pgx.Tx, taskID string) (json.RawMessage, error) {
	var taskSnapshot json.RawMessage
	err := c.queryRowTx(ctx, tx, "task.snapshot.select", `
SELECT jsonb_build_object(
  'id', t.id,
  'nodeId', t.node_id,
  'instanceId', t.instance_id,
  'definitionName', t.definition_name,
  'name', t.name,
  'assignee', t.assignee_name,
  'role', t.role_key,
  'status', t.status,
  'priority', t.priority,
  'createdAt', to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'dueAt', to_char(t.due_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'slaMinutes', t.sla_minutes,
  'minutesRemaining', t.minutes_remaining,
  'patientName', t.patient_name,
  'patientId', t.patient_id,
  'formFields', t.form_fields,
  'formValues', t.form_values,
  'updatedAt', to_char(COALESCE(t.updated_at, NOW()) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'triageCategory', t.triage_category,
  'triageColor', t.triage_color
)
FROM tasks t
WHERE t.id = $1
`, taskID).Scan(&taskSnapshot)
	return taskSnapshot, err
}

func (c *Client) upsertSavedTaskSnapshot(ctx context.Context, tx pgx.Tx, taskID, instanceID, processStatus string, taskSnapshot json.RawMessage) error {
	err := c.execTx(ctx, tx, "task.saved_snapshot.upsert", `
INSERT INTO saved_tasks (task_id, instance_id, process_status, snapshot, updated_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (task_id) DO UPDATE
SET process_status = EXCLUDED.process_status, snapshot = EXCLUDED.snapshot, updated_at = NOW()
`, taskID, instanceID, processStatus, taskSnapshot)
	return err
}

func (c *Client) refreshInstanceCurrentNode(ctx context.Context, tx pgx.Tx, instanceID, patientName, patientID string) error {
	var currentNode string
	err := c.queryRowTx(ctx, tx, "instance.current_node.select_open_task", `
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

	status := "active"
	err = c.execTx(ctx, tx, "instance.current_node.update", `
UPDATE process_instances
SET current_node = $2, status = $3, patient_name = $4, patient_id = $5, updated_at = NOW()
WHERE id = $1
`, instanceID, currentNode, status, patientName, patientID)
	return err
}
