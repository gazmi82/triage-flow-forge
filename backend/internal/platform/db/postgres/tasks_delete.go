package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"triage-flow-forge/backend/internal/platform/db/postgres/taskdesigner"
)

func (c *Client) DeleteTask(ctx context.Context, taskID string) (TaskMutationResponse, error) {
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
		instanceID   string
		definitionID string
		hasEndEvent  bool
	)
	err = c.queryRowTx(ctx, tx, "task.delete.guard", `
SELECT
  t.instance_id,
  i.definition_id,
  EXISTS (
    SELECT 1
    FROM audit_events ae
    WHERE ae.instance_id = t.instance_id
      AND ae.event_type = 'task_created'
      AND COALESCE(ae.payload->>'nodeType', '') = 'endEvent'
  ) AS has_end_event
FROM tasks t
JOIN process_instances i ON i.id = t.instance_id
WHERE t.id = $1
FOR UPDATE OF t, i
`, taskID).Scan(&instanceID, &definitionID, &hasEndEvent)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return TaskMutationResponse{}, errors.New("task not found")
		}
		return TaskMutationResponse{}, err
	}

	if !hasEndEvent {
		return TaskMutationResponse{}, errors.New("task can be deleted only after END is reached and process is closed")
	}

	if err := c.removeInstanceFromDefinitionGraph(ctx, tx, definitionID, instanceID); err != nil {
		return TaskMutationResponse{}, err
	}

	if err := c.execTx(ctx, tx, "task.delete.instance", `
DELETE FROM process_instances
WHERE id = $1
`, instanceID); err != nil {
		return TaskMutationResponse{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return TaskMutationResponse{}, err
	}

	return c.fetchTaskMutationResponse(ctx)
}

func (c *Client) removeInstanceFromDefinitionGraph(ctx context.Context, tx pgx.Tx, definitionID, instanceID string) error {
	if strings.TrimSpace(definitionID) == "" || strings.TrimSpace(instanceID) == "" {
		return nil
	}

	var graphRaw json.RawMessage
	err := c.queryRowTx(ctx, tx, "task.delete.select_graph_for_update", `
SELECT graph_payload
FROM definition_graphs
WHERE definition_id = $1
FOR UPDATE
`, definitionID).Scan(&graphRaw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}

	graph := DesignerGraphPayload{
		Nodes: []map[string]any{},
		Edges: []map[string]any{},
	}
	if len(graphRaw) > 0 {
		if err := json.Unmarshal(graphRaw, &graph); err != nil {
			return fmt.Errorf("decode graph payload: %w", err)
		}
	}
	if graph.Nodes == nil {
		graph.Nodes = []map[string]any{}
	}
	if graph.Edges == nil {
		graph.Edges = []map[string]any{}
	}

	runtimeNodeIDs, err := c.fetchInstanceRuntimeNodeIDs(ctx, tx, instanceID)
	if err != nil {
		return err
	}

	nodeByID := make(map[string]map[string]any, len(graph.Nodes))
	for _, node := range graph.Nodes {
		if nodeID, _ := node["id"].(string); nodeID != "" {
			nodeByID[nodeID] = node
		}
	}

	removedNodeIDs := make(map[string]struct{})
	for _, node := range graph.Nodes {
		nodeID, _ := node["id"].(string)
		if taskdesigner.NodeBelongsToInstance(node, instanceID) {
			if nodeID != "" {
				removedNodeIDs[nodeID] = struct{}{}
			}
			continue
		}
		if _, trackedRuntimeNode := runtimeNodeIDs[nodeID]; trackedRuntimeNode {
			if nodeID, _ := node["id"].(string); nodeID != "" {
				removedNodeIDs[nodeID] = struct{}{}
			}
			continue
		}
	}

	// Older graph data may contain gateway/event nodes without instance metadata.
	// If they are connected to removed runtime nodes, prune them as well.
	changed := true
	for changed {
		changed = false
		for _, edge := range graph.Edges {
			sourceID, _ := edge["source"].(string)
			targetID, _ := edge["target"].(string)
			_, sourceRemoved := removedNodeIDs[sourceID]
			_, targetRemoved := removedNodeIDs[targetID]

			if sourceRemoved && !targetRemoved && nodeIsUnscoped(nodeByID[targetID]) {
				removedNodeIDs[targetID] = struct{}{}
				changed = true
				continue
			}
			if targetRemoved && !sourceRemoved && nodeIsUnscoped(nodeByID[sourceID]) {
				removedNodeIDs[sourceID] = struct{}{}
				changed = true
			}
		}
	}

	keptNodes := make([]map[string]any, 0, len(graph.Nodes))
	for _, node := range graph.Nodes {
		nodeID, _ := node["id"].(string)
		if _, removed := removedNodeIDs[nodeID]; removed {
			continue
		}
		keptNodes = append(keptNodes, node)
	}

	keptEdges := make([]map[string]any, 0, len(graph.Edges))
	for _, edge := range graph.Edges {
		sourceID, _ := edge["source"].(string)
		targetID, _ := edge["target"].(string)
		if _, sourceRemoved := removedNodeIDs[sourceID]; sourceRemoved {
			continue
		}
		if _, targetRemoved := removedNodeIDs[targetID]; targetRemoved {
			continue
		}
		keptEdges = append(keptEdges, edge)
	}

	nextGraphRaw, err := json.Marshal(DesignerGraphPayload{
		Nodes: keptNodes,
		Edges: keptEdges,
	})
	if err != nil {
		return fmt.Errorf("encode graph payload: %w", err)
	}

	return c.execTx(ctx, tx, "task.delete.update_graph", `
UPDATE definition_graphs
SET graph_payload = $2, updated_at = NOW()
WHERE definition_id = $1
`, definitionID, nextGraphRaw)
}

func (c *Client) fetchInstanceRuntimeNodeIDs(ctx context.Context, tx pgx.Tx, instanceID string) (map[string]struct{}, error) {
	var nodeIDs []string
	err := c.queryRowTx(ctx, tx, "task.delete.runtime_node_ids", `
SELECT COALESCE(
  ARRAY_AGG(DISTINCT node_id) FILTER (WHERE node_id <> ''),
  ARRAY[]::TEXT[]
)
FROM (
  SELECT COALESCE(node_id, '') AS node_id
  FROM tasks
  WHERE instance_id = $1
  UNION ALL
  SELECT COALESCE(node_id, '') AS node_id
  FROM audit_events
  WHERE instance_id = $1
) runtime_nodes
`, instanceID).Scan(&nodeIDs)
	if err != nil {
		return nil, err
	}

	result := make(map[string]struct{}, len(nodeIDs))
	for _, nodeID := range nodeIDs {
		nodeID = strings.TrimSpace(nodeID)
		if nodeID == "" {
			continue
		}
		result[nodeID] = struct{}{}
	}
	return result, nil
}

func nodeIsUnscoped(node map[string]any) bool {
	if node == nil {
		return false
	}
	data, _ := node["data"].(map[string]any)
	if data == nil {
		return true
	}
	instanceID, _ := data["instanceId"].(string)
	return strings.TrimSpace(instanceID) == ""
}
