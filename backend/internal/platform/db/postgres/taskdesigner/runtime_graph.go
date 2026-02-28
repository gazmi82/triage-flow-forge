package taskdesigner

import (
	"fmt"
	"strings"
	"time"
)

type RuntimeTask struct {
	ID        string
	NodeID    string
	Name      string
	RoleKey   string
	Status    string
	Triage    string
	CreatedAt time.Time
}

func ProjectByInstance(nodes []map[string]any, edges []map[string]any, instanceID string) ([]map[string]any, []map[string]any) {
	if nodes == nil {
		nodes = []map[string]any{}
	}
	if edges == nil {
		edges = []map[string]any{}
	}
	if instanceID == "" {
		return nodes, edges
	}

	projectedNodes := make([]map[string]any, 0)
	nodeIDs := make(map[string]struct{})
	for _, node := range nodes {
		if !NodeBelongsToInstance(node, instanceID) {
			continue
		}
		nodeID, _ := node["id"].(string)
		if nodeID != "" {
			nodeIDs[nodeID] = struct{}{}
		}
		projectedNodes = append(projectedNodes, node)
	}

	projectedEdges := make([]map[string]any, 0)
	for _, edge := range edges {
		sourceID, _ := edge["source"].(string)
		targetID, _ := edge["target"].(string)
		if sourceID == "" || targetID == "" {
			continue
		}
		_, sourceIn := nodeIDs[sourceID]
		_, targetIn := nodeIDs[targetID]
		if sourceIn && targetIn {
			projectedEdges = append(projectedEdges, edge)
		}
	}

	return projectedNodes, projectedEdges
}

func NodeBelongsToInstance(node map[string]any, instanceID string) bool {
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

func EnrichForTaskRuntime(nodes []map[string]any, edges []map[string]any, instanceID string, tasks []RuntimeTask) ([]map[string]any, []map[string]any) {
	if nodes == nil {
		nodes = []map[string]any{}
	}
	if edges == nil {
		edges = []map[string]any{}
	}

	nodeByID := make(map[string]map[string]any, len(nodes))
	maxX := 260.0
	for _, node := range nodes {
		nodeID, _ := node["id"].(string)
		if nodeID != "" {
			nodeByID[nodeID] = node
		}
		if pos, ok := node["position"].(map[string]any); ok {
			if x, ok := NumberAsFloat(pos["x"]); ok && x > maxX {
				maxX = x
			}
		}
	}

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
		nodes = append(nodes, start)
		nodeByID[startID] = start
	}

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
			nodes = append(nodes, node)
			nodeByID[task.NodeID] = node
		}

		data, _ := node["data"].(map[string]any)
		if data == nil {
			data = map[string]any{}
			node["data"] = data
		}
		data["instanceId"] = instanceID
		data["label"] = task.Name
		data["role"] = RoleLabel(task.RoleKey)
		if task.RoleKey != "admin" {
			data["laneRef"] = task.RoleKey
		}
		if task.Triage != "" {
			data["triageColor"] = task.Triage
		}
		data["taskStatus"] = NormalizeTaskStatus(task.Status)
		data["runtimeActive"] = task.Status == "claimed"
	}

	firstTaskNodeID := ""
	for _, task := range tasks {
		if strings.TrimSpace(task.NodeID) != "" {
			firstTaskNodeID = strings.TrimSpace(task.NodeID)
			break
		}
	}
	if firstTaskNodeID == "" {
		minX := 1e12
		for _, node := range nodes {
			nodeID, _ := node["id"].(string)
			if nodeID == "" || nodeID == startID {
				continue
			}
			nodeType, _ := node["type"].(string)
			if nodeType == "startEvent" {
				continue
			}
			pos, _ := node["position"].(map[string]any)
			x, ok := NumberAsFloat(pos["x"])
			if ok && x < minX {
				minX = x
				firstTaskNodeID = nodeID
			}
		}
	}
	if firstTaskNodeID != "" && !EdgeExists(edges, startID, firstTaskNodeID) {
		edges = append(edges, map[string]any{
			"id":        fmt.Sprintf("edge-%s-%s", startID, firstTaskNodeID),
			"source":    startID,
			"target":    firstTaskNodeID,
			"type":      "sequenceFlow",
			"markerEnd": map[string]any{"type": "arrowclosed"},
			"style":     map[string]any{"stroke": "hsl(220,68%,30%)"},
		})
	}

	return nodes, edges
}

func NormalizeTaskStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "completed":
		return "completed"
	case "claimed":
		return "claimed"
	default:
		return "pending"
	}
}

func NumberAsFloat(value any) (float64, bool) {
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

func EdgeExists(edges []map[string]any, sourceID, targetID string) bool {
	for _, edge := range edges {
		source, _ := edge["source"].(string)
		target, _ := edge["target"].(string)
		if source == sourceID && target == targetID {
			return true
		}
	}
	return false
}

func RoleLabel(roleKey string) string {
	switch roleKey {
	case "reception":
		return "Reception"
	case "triage_nurse":
		return "Triage Nurse"
	case "physician":
		return "Physician"
	case "lab":
		return "Laboratory"
	case "radiology":
		return "Radiology"
	default:
		return "Admin"
	}
}
