package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

func (c *Client) ClaimTask(ctx context.Context, taskID, assigneeName string) (TaskMutationResponse, error) {
	pool, err := c.ensurePool(ctx)
	if err != nil {
		return TaskMutationResponse{}, err
	}

	if taskID == "" {
		return TaskMutationResponse{}, errors.New("taskId is required")
	}
	if assigneeName == "" {
		return TaskMutationResponse{}, errors.New("assigneeName is required")
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return TaskMutationResponse{}, err
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

	err = c.queryRowTx(ctx, tx, "task.claim.update", `
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
			return TaskMutationResponse{}, errors.New("task not found")
		}
		return TaskMutationResponse{}, err
	}

	auditID := fmt.Sprintf("ae-%d", time.Now().UnixNano())
	err = c.execTx(ctx, tx, "task.claim.audit_insert", `
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

	_ = c.execTx(ctx, tx, "task.claim.instance_update", `
UPDATE process_instances
SET current_node = $2, updated_at = NOW()
WHERE id = $1
`, instanceID, nodeName)

	if err := tx.Commit(ctx); err != nil {
		return TaskMutationResponse{}, err
	}

	return c.fetchTaskMutationResponse(ctx)
}
