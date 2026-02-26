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

func (c *Client) CompleteTask(ctx context.Context, taskID string, req CompleteTaskRequest) (TaskMutationResponse, error) {
	pool, err := c.ensurePool(ctx)
	if err != nil {
		return TaskMutationResponse{}, err
	}

	if strings.TrimSpace(taskID) == "" {
		return TaskMutationResponse{}, errors.New("taskId is required")
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return TaskMutationResponse{}, err
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
	err = c.queryRowTx(ctx, tx, "task.complete.update", `
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
			return TaskMutationResponse{}, errors.New("task not found")
		}
		return TaskMutationResponse{}, err
	}

	actor := strings.TrimSpace(req.Actor)
	if actor == "" {
		actor = "System"
	}
	err = c.execTx(ctx, tx, "task.complete.audit_insert", `
INSERT INTO audit_events (
  id, instance_id, task_id, event_time, actor, role_key, event_type, node_id, node_name, payload
)
VALUES ($1, $2, $3, NOW(), $4, $5, 'task_completed', $6, $7, $8)
`, fmt.Sprintf("ae-%d", time.Now().UnixNano()), instanceID, taskID, actor, roleKey, nodeID, nodeName, json.RawMessage(`{"source":"task_console"}`))
	if err != nil {
		return TaskMutationResponse{}, err
	}

	taskSnapshot, err := c.buildTaskSnapshot(ctx, tx, taskID)
	if err != nil {
		return TaskMutationResponse{}, err
	}
	err = c.upsertSavedTaskSnapshot(ctx, tx, taskID, instanceID, "open", taskSnapshot)
	if err != nil {
		return TaskMutationResponse{}, err
	}

	err = c.refreshInstanceCurrentNode(ctx, tx, instanceID, patientName, patientID)
	if err != nil {
		return TaskMutationResponse{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return TaskMutationResponse{}, err
	}

	return c.fetchTaskMutationResponse(ctx)
}
