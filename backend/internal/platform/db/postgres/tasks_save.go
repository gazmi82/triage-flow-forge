package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (c *Client) SaveTaskEdits(ctx context.Context, taskID string, req SaveTaskEditsRequest) (TaskMutationResponse, error) {
	pool, err := c.ensurePool(ctx)
	if err != nil {
		return TaskMutationResponse{}, err
	}

	if strings.TrimSpace(taskID) == "" {
		return TaskMutationResponse{}, errors.New("taskId is required")
	}
	if req.FormValues == nil {
		req.FormValues = map[string]interface{}{}
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return TaskMutationResponse{}, err
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
	err = c.queryRowTx(ctx, tx, "task.save.select_for_update", `
SELECT instance_id, COALESCE(node_id, id), name, role_key, name, COALESCE(triage_color, 'yellow'), patient_name, patient_id
FROM tasks
WHERE id = $1
FOR UPDATE
`, taskID).Scan(&instanceID, &nodeID, &nodeName, &roleKey, &currentLabel, &currentTriage, &currentPatient, &currentPatientID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return TaskMutationResponse{}, errors.New("task not found")
		}
		return TaskMutationResponse{}, err
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
		return TaskMutationResponse{}, err
	}

	err = c.execTx(ctx, tx, "task.save.update", `
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
		return TaskMutationResponse{}, err
	}

	taskSnapshot, err := c.buildTaskSnapshot(ctx, tx, taskID)
	if err != nil {
		return TaskMutationResponse{}, err
	}
	processStatus := "open"
	err = c.upsertSavedTaskSnapshot(ctx, tx, taskID, instanceID, processStatus, taskSnapshot)
	if err != nil {
		return TaskMutationResponse{}, err
	}

	_ = c.execTx(ctx, tx, "task.save.instance_update", `
UPDATE process_instances
SET patient_name = $2, patient_id = $3, priority = $4, current_node = $5, updated_at = NOW()
WHERE id = $1
`, instanceID, nextPatientName, nextPatientID, nextPriority, nextLabel)

	if err := tx.Commit(ctx); err != nil {
		return TaskMutationResponse{}, err
	}

	return c.fetchTaskMutationResponse(ctx)
}
