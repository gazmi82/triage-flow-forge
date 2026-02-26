package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (c *Client) FetchTaskDesignerGraph(ctx context.Context, taskID string) (DesignerGraphPayload, error) {
	if strings.TrimSpace(taskID) == "" {
		return DesignerGraphPayload{}, errors.New("taskId is required")
	}

	pool, err := c.ensurePool(ctx)
	if err != nil {
		return DesignerGraphPayload{}, err
	}

	var instanceID string
	err = pool.QueryRow(ctx, `
SELECT instance_id
FROM tasks
WHERE id = $1
`, taskID).Scan(&instanceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return DesignerGraphPayload{}, errors.New("task not found")
		}
		return DesignerGraphPayload{}, err
	}

	graph, err := c.fetchDesignerGraph(ctx)
	if err != nil {
		return DesignerGraphPayload{}, err
	}

	instanceTasks, err := c.fetchInstanceTasks(ctx, instanceID)
	if err != nil {
		return DesignerGraphPayload{}, err
	}

	projected := projectGraphByInstance(graph, instanceID)
	return enrichGraphForTaskRuntime(projected, instanceID, instanceTasks), nil
}

func projectGraphByInstance(graph DesignerGraphPayload, instanceID string) DesignerGraphPayload {
	if graph.Nodes == nil {
		graph.Nodes = []map[string]any{}
	}
	if graph.Edges == nil {
		graph.Edges = []map[string]any{}
	}
	if instanceID == "" {
		return graph
	}

	nodes := make([]map[string]any, 0)
	nodeIDs := make(map[string]struct{})
	for _, node := range graph.Nodes {
		if !nodeBelongsToInstance(node, instanceID) {
			continue
		}
		nodeID, _ := node["id"].(string)
		if nodeID != "" {
			nodeIDs[nodeID] = struct{}{}
		}
		nodes = append(nodes, node)
	}

	edges := make([]map[string]any, 0)
	for _, edge := range graph.Edges {
		sourceID, _ := edge["source"].(string)
		targetID, _ := edge["target"].(string)
		if sourceID == "" || targetID == "" {
			continue
		}
		_, sourceIn := nodeIDs[sourceID]
		_, targetIn := nodeIDs[targetID]
		if sourceIn && targetIn {
			edges = append(edges, edge)
		}
	}

	return DesignerGraphPayload{
		Nodes: nodes,
		Edges: edges,
	}
}

func nodeBelongsToInstance(node map[string]any, instanceID string) bool {
	nodeID, _ := node["id"].(string)
	if strings.Contains(nodeID, instanceID) {
		return true
	}

	data, ok := node["data"].(map[string]any)
	if !ok {
		return false
	}
	value, ok := data["instanceId"].(string)
	if !ok {
		return false
	}
	return value == instanceID
}

type instanceTaskRuntime struct {
	ID        string
	NodeID    string
	Name      string
	Role      Role
	Status    string
	Triage    string
	CreatedAt time.Time
}

func (c *Client) fetchInstanceTasks(ctx context.Context, instanceID string) ([]instanceTaskRuntime, error) {
	pool, err := c.ensurePool(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
SELECT id, COALESCE(node_id, ''), name, role_key, status, COALESCE(triage_color, ''), created_at
FROM tasks
WHERE instance_id = $1
ORDER BY created_at ASC
`, instanceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]instanceTaskRuntime, 0)
	for rows.Next() {
		var item instanceTaskRuntime
		if err := rows.Scan(&item.ID, &item.NodeID, &item.Name, &item.Role, &item.Status, &item.Triage, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func enrichGraphForTaskRuntime(graph DesignerGraphPayload, instanceID string, tasks []instanceTaskRuntime) DesignerGraphPayload {
	if graph.Nodes == nil {
		graph.Nodes = []map[string]any{}
	}
	if graph.Edges == nil {
		graph.Edges = []map[string]any{}
	}

	nodeByID := make(map[string]map[string]any, len(graph.Nodes))
	maxX := 260.0
	for _, node := range graph.Nodes {
		nodeID, _ := node["id"].(string)
		if nodeID != "" {
			nodeByID[nodeID] = node
		}
		if pos, ok := node["position"].(map[string]any); ok {
			if x, ok := numberAsFloat(pos["x"]); ok && x > maxX {
				maxX = x
			}
		}
	}

	// Ensure start event exists for consistent topology.
	startID := fmt.Sprintf("start-%s", instanceID)
	if _, ok := nodeByID[startID]; !ok {
		start := map[string]any{
			"id":     startID,
			"type":   "startEvent",
			"width":  40,
			"height": 40,
			"style": map[string]any{
				"width":  40,
				"height": 40,
			},
			"position": map[string]any{"x": 80, "y": 200},
			"data": map[string]any{
				"label":         "Start",
				"instanceId":    instanceID,
				"runtimeActive": false,
			},
		}
		graph.Nodes = append(graph.Nodes, start)
		nodeByID[startID] = start
	}

	// Backfill any missing task nodes and overlay runtime status/state.
	for i, task := range tasks {
		if strings.TrimSpace(task.NodeID) == "" {
			continue
		}

		node, ok := nodeByID[task.NodeID]
		if !ok {
			x := maxX + 320
			if i == 0 {
				x = 420
			}
			node = map[string]any{
				"id":     task.NodeID,
				"type":   "userTask",
				"width":  220,
				"height": 110,
				"style": map[string]any{
					"width":  220,
					"height": 110,
				},
				"position": map[string]any{"x": x, "y": 180},
				"data": map[string]any{
					"instanceId": instanceID,
				},
			}
			maxX = x
			graph.Nodes = append(graph.Nodes, node)
			nodeByID[task.NodeID] = node
		}

		data, _ := node["data"].(map[string]any)
		if data == nil {
			data = map[string]any{}
			node["data"] = data
		}
		data["instanceId"] = instanceID
		data["label"] = task.Name
		data["role"] = roleLabel(task.Role)
		if task.Role != "admin" {
			data["laneRef"] = string(task.Role)
		}
		if task.Triage != "" {
			data["triageColor"] = task.Triage
		}
		data["taskStatus"] = normalizeDesignerTaskStatus(task.Status)
		data["runtimeActive"] = task.Status == "claimed"
	}

	return graph
}

func normalizeDesignerTaskStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "completed":
		return "completed"
	case "claimed":
		return "claimed"
	default:
		return "pending"
	}
}

func numberAsFloat(value any) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case int:
		return float64(typed), true
	case int64:
		return float64(typed), true
	default:
		return 0, false
	}
}
