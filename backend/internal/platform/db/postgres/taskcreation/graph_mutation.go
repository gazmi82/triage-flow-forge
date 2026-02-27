package taskcreation

import (
	"fmt"
	"strings"
)

type DesignerGraph struct {
	Nodes []map[string]any `json:"nodes"`
	Edges []map[string]any `json:"edges"`
}

type AppendNodeRequest struct {
	InstanceID          string
	NormalizedNodeType  string
	Label               string
	AssignedRole        string
	FromNodeID          string
	TriageColor         string
	ConditionExpression string
	CorrelationKey      string
	TimestampMillis     int64
	AssignedRoleLabel   string
}

func AppendNodeToGraph(graph *DesignerGraph, req AppendNodeRequest) string {
	targetNodeID := fmt.Sprintf("node-%d", req.TimestampMillis)
	if req.NormalizedNodeType == "startEvent" {
		targetNodeID = fmt.Sprintf("start-%s", req.InstanceID)
	}

	instanceNodes := make([]map[string]any, 0)
	startNodeID := ""
	hasNonStartNode := false
	for _, node := range graph.Nodes {
		if nodeInstanceID(node) == req.InstanceID {
			instanceNodes = append(instanceNodes, node)
			nodeType, _ := node["type"].(string)
			nodeID, _ := node["id"].(string)
			if nodeType == "startEvent" {
				startNodeID = nodeID
			} else {
				hasNonStartNode = true
			}
		}
	}

	instanceHasNode := len(instanceNodes) > 0
	if !instanceHasNode && req.NormalizedNodeType != "startEvent" {
		startNodeID = fmt.Sprintf("start-%s", req.InstanceID)
		startNode := map[string]any{
			"id":     startNodeID,
			"type":   "startEvent",
			"width":  40,
			"height": 40,
			"style": map[string]any{
				"width":  40,
				"height": 40,
			},
			"position": map[string]any{"x": 80, "y": 200},
			"data": map[string]any{
				"label":      "Start",
				"instanceId": req.InstanceID,
			},
		}
		graph.Nodes = append(graph.Nodes, startNode)
		instanceNodes = append(instanceNodes, startNode)
	}

	reusedNode := false
	if req.NormalizedNodeType == "userTask" {
		if existingID, ok := findUserTaskNodeForRole(instanceNodes, req.AssignedRole, req.AssignedRoleLabel); ok {
			targetNodeID = existingID
			reusedNode = true
		}
	}

	if !reusedNode {
		sourceNode := findNodeByID(instanceNodes, req.FromNodeID)
		outgoingCountFromSource := countOutgoingEdges(graph.Edges, req.FromNodeID)
		x, y, width, height := computeNodePlacement(instanceNodes, sourceNode, outgoingCountFromSource, req.NormalizedNodeType)

		newNode := map[string]any{
			"id":   targetNodeID,
			"type": req.NormalizedNodeType,
			"position": map[string]any{
				"x": x,
				"y": y,
			},
			"width":  width,
			"height": height,
			"style": map[string]any{
				"width":  width,
				"height": height,
			},
			"data": map[string]any{
				"label":      req.Label,
				"instanceId": req.InstanceID,
				"role":       req.AssignedRoleLabel,
			},
		}
		if req.NormalizedNodeType == "userTask" {
			newNode["data"].(map[string]any)["taskStatus"] = "pending"
		}
		if req.AssignedRole != "admin" {
			newNode["data"].(map[string]any)["laneRef"] = req.AssignedRole
		}
		if strings.TrimSpace(req.TriageColor) != "" {
			newNode["data"].(map[string]any)["triageColor"] = strings.TrimSpace(req.TriageColor)
		}
		if strings.TrimSpace(req.ConditionExpression) != "" {
			newNode["data"].(map[string]any)["conditionExpression"] = strings.TrimSpace(req.ConditionExpression)
		}
		if strings.TrimSpace(req.CorrelationKey) != "" {
			newNode["data"].(map[string]any)["correlationKey"] = strings.TrimSpace(req.CorrelationKey)
		}

		graph.Nodes = append(graph.Nodes, newNode)
		instanceNodes = append(instanceNodes, newNode)
	} else {
		existingNode := findNodeByID(instanceNodes, targetNodeID)
		if existingNode != nil {
			data, _ := existingNode["data"].(map[string]any)
			if data == nil {
				data = map[string]any{}
				existingNode["data"] = data
			}
			data["instanceId"] = req.InstanceID
			data["role"] = req.AssignedRoleLabel
			if strings.TrimSpace(req.Label) != "" {
				data["label"] = req.Label
			}
			if req.AssignedRole != "admin" {
				data["laneRef"] = req.AssignedRole
			}
			if strings.TrimSpace(req.TriageColor) != "" {
				data["triageColor"] = strings.TrimSpace(req.TriageColor)
			}
		}
	}

	sourceID := req.FromNodeID
	if sourceID == "" && !hasNonStartNode && req.NormalizedNodeType != "startEvent" {
		sourceID = startNodeID
	}
	if sourceID == "" || sourceID == targetNodeID || edgeExists(graph.Edges, sourceID, targetNodeID) {
		return targetNodeID
	}

	sourceNode := findNodeByID(instanceNodes, sourceID)
	targetNode := findNodeByID(instanceNodes, targetNodeID)
	outgoingCountFromSource := countOutgoingEdges(graph.Edges, sourceID)
	incomingByHandle := countIncomingByTargetHandle(graph.Edges, targetNodeID)
	outgoingByHandle := countOutgoingBySourceHandle(graph.Edges, sourceID)
	sourceHandle, targetHandle := chooseEdgeHandles(
		sourceNode,
		targetNode,
		outgoingCountFromSource,
		outgoingByHandle,
		incomingByHandle,
		graph.Edges,
		instanceNodes,
		sourceID,
		targetNodeID,
	)

	edge := map[string]any{
		"id":     fmt.Sprintf("edge-%d", req.TimestampMillis),
		"source": sourceID,
		"target": targetNodeID,
		"type":   "sequenceFlow",
		"markerEnd": map[string]any{
			"type": "arrowclosed",
		},
		"style": map[string]any{"stroke": "hsl(220,68%,30%)"},
	}
	if sourceHandle != "" {
		edge["sourceHandle"] = sourceHandle
	}
	if targetHandle != "" {
		edge["targetHandle"] = targetHandle
	}
	if sourceNode != nil {
		sourceType, _ := sourceNode["type"].(string)
		if sourceType == "andGateway" && strings.TrimSpace(req.ConditionExpression) == "" {
			edge["label"] = fmt.Sprintf("Branch %c", 'A'+rune(outgoingCountFromSource))
		}
		if sourceType == "xorGateway" && strings.TrimSpace(req.ConditionExpression) == "" && outgoingCountFromSource > 0 {
			edge["label"] = fmt.Sprintf("Condition %c", 'A'+rune(outgoingCountFromSource))
		}
	}
	if strings.TrimSpace(req.ConditionExpression) != "" {
		edge["label"] = strings.TrimSpace(req.ConditionExpression)
	}
	graph.Edges = append(graph.Edges, edge)

	return targetNodeID
}

func findUserTaskNodeForRole(nodes []map[string]any, assignedRole, assignedRoleLabel string) (string, bool) {
	for _, node := range nodes {
		nodeType, _ := node["type"].(string)
		if nodeType != "userTask" {
			continue
		}
		data, _ := node["data"].(map[string]any)
		if data == nil {
			continue
		}
		laneRef, _ := data["laneRef"].(string)
		roleLabelValue, _ := data["role"].(string)
		if laneRef == assignedRole || strings.EqualFold(roleLabelValue, assignedRoleLabel) {
			nodeID, _ := node["id"].(string)
			if nodeID != "" {
				return nodeID, true
			}
		}
	}
	return "", false
}

func nodeInstanceID(node map[string]any) string {
	data, ok := node["data"].(map[string]any)
	if !ok {
		return ""
	}
	value, ok := data["instanceId"].(string)
	if !ok {
		return ""
	}
	return value
}
