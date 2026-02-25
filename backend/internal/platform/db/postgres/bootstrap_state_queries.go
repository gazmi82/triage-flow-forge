package postgres

import (
	"context"
	"encoding/json"
	"time"
)

func (c *Client) fetchSavedTasks(ctx context.Context) ([]SavedTaskRecord, error) {
	pool, err := c.ensurePool(ctx)
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

	items := make([]SavedTaskRecord, 0)
	for rows.Next() {
		var raw json.RawMessage
		var processStatus string
		if err := rows.Scan(&raw, &processStatus); err != nil {
			return nil, err
		}
		record := SavedTaskRecord{}
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

func (c *Client) fetchAudit(ctx context.Context) ([]AuditEvent, error) {
	pool, err := c.ensurePool(ctx)
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

	items := make([]AuditEvent, 0)
	for rows.Next() {
		var item AuditEvent
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

func (c *Client) fetchDesignerGraph(ctx context.Context) (DesignerGraphPayload, error) {
	pool, err := c.ensurePool(ctx)
	if err != nil {
		return DesignerGraphPayload{}, err
	}

	var raw json.RawMessage
	err = pool.QueryRow(ctx, `
SELECT graph_payload
FROM definition_graphs
ORDER BY updated_at DESC
LIMIT 1
`).Scan(&raw)
	if err != nil {
		return DesignerGraphPayload{Nodes: []map[string]any{}, Edges: []map[string]any{}}, nil
	}

	graph := DesignerGraphPayload{Nodes: []map[string]any{}, Edges: []map[string]any{}}
	if len(raw) == 0 {
		return graph, nil
	}
	if err := json.Unmarshal(raw, &graph); err != nil {
		return DesignerGraphPayload{Nodes: []map[string]any{}, Edges: []map[string]any{}}, nil
	}
	if graph.Nodes == nil {
		graph.Nodes = []map[string]any{}
	}
	if graph.Edges == nil {
		graph.Edges = []map[string]any{}
	}
	return graph, nil
}

func (c *Client) fetchDrafts(ctx context.Context) ([]DraftRecord, error) {
	pool, err := c.ensurePool(ctx)
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

	items := make([]DraftRecord, 0)
	for rows.Next() {
		var item DraftRecord
		var savedAt time.Time
		var graphRaw json.RawMessage
		if err := rows.Scan(&item.ID, &item.Name, &item.Version, &savedAt, &graphRaw); err != nil {
			return nil, err
		}
		item.SavedAt = savedAt.UTC().Format(time.RFC3339)
		item.Graph = DesignerGraphPayload{Nodes: []map[string]any{}, Edges: []map[string]any{}}
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
