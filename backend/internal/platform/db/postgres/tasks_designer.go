package postgres

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"triage-flow-forge/backend/internal/platform/db/postgres/taskcreation"
	"triage-flow-forge/backend/internal/platform/db/postgres/taskdesigner"
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

	projectedNodes, projectedEdges := taskdesigner.ProjectByInstance(graph.Nodes, graph.Edges, instanceID)
	enrichedNodes, enrichedEdges := taskdesigner.EnrichForTaskRuntime(projectedNodes, projectedEdges, instanceID, instanceTasks)

	mutableGraph := taskcreation.DesignerGraph{
		Nodes: enrichedNodes,
		Edges: enrichedEdges,
	}
	taskcreation.NormalizeInstanceRouting(&mutableGraph, instanceID)

	return DesignerGraphPayload{
		Nodes: mutableGraph.Nodes,
		Edges: mutableGraph.Edges,
	}, nil
}

func (c *Client) fetchInstanceTasks(ctx context.Context, instanceID string) ([]taskdesigner.RuntimeTask, error) {
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

	items := make([]taskdesigner.RuntimeTask, 0)
	for rows.Next() {
		var item taskdesigner.RuntimeTask
		if err := rows.Scan(&item.ID, &item.NodeID, &item.Name, &item.RoleKey, &item.Status, &item.Triage, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
