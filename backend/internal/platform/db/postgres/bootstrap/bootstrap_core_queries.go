package bootstrap

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"triage-flow-forge/backend/internal/modules/contracts"
)

func FetchDefinitions(
	ctx context.Context,
	ensurePool func(context.Context) (*pgxpool.Pool, error),
) ([]contracts.ProcessDefinition, error) {
	pool, err := ensurePool(ctx)
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

func FetchInstances(
	ctx context.Context,
	ensurePool func(context.Context) (*pgxpool.Pool, error),
) ([]contracts.ProcessInstance, error) {
	pool, err := ensurePool(ctx)
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

func FetchTasks(
	ctx context.Context,
	ensurePool func(context.Context) (*pgxpool.Pool, error),
) ([]contracts.Task, error) {
	pool, err := ensurePool(ctx)
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
