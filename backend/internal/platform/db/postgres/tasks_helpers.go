package postgres

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

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
