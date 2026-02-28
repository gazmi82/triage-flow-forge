package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"triage-flow-forge/backend/internal/platform/db/postgres/taskcreation"
	"triage-flow-forge/backend/internal/platform/db/postgres/taskdesigner"
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
	graph, err = c.hydrateBootstrapGraphRuntime(ctx, graph)
	if err != nil {
		return DesignerGraphPayload{}, err
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

func (c *Client) hydrateBootstrapGraphRuntime(ctx context.Context, graph DesignerGraphPayload) (DesignerGraphPayload, error) {
	pool, err := c.ensurePool(ctx)
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

	// Ensure each instance has a Start -> first node edge if missing.
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
				nodeType, _ := node["type"].(string)
				nodeID, _ := node["id"].(string)
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
