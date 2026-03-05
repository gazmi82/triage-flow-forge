package taskdesigner

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres/taskcreation"
)

func FetchTaskDesignerGraph(
	ctx context.Context,
	ensurePool func(context.Context) (*pgxpool.Pool, error),
	fetchDesignerGraph func(context.Context) (contracts.DesignerGraphPayload, error),
	taskID string,
) (contracts.DesignerGraphPayload, error) {
	if strings.TrimSpace(taskID) == "" {
		return contracts.DesignerGraphPayload{}, errors.New("taskId is required")
	}

	pool, err := ensurePool(ctx)
	if err != nil {
		return contracts.DesignerGraphPayload{}, err
	}

	var instanceID string
	err = pool.QueryRow(ctx, `
SELECT instance_id
FROM tasks
WHERE id = $1
`, taskID).Scan(&instanceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return contracts.DesignerGraphPayload{}, errors.New("task not found")
		}
		return contracts.DesignerGraphPayload{}, err
	}

	graph, err := fetchDesignerGraph(ctx)
	if err != nil {
		return contracts.DesignerGraphPayload{}, err
	}

	instanceTasks, err := fetchInstanceTasks(ctx, ensurePool, instanceID)
	if err != nil {
		return contracts.DesignerGraphPayload{}, err
	}

	projectedNodes, projectedEdges := ProjectByInstance(graph.Nodes, graph.Edges, instanceID)
	enrichedNodes, enrichedEdges := EnrichForTaskRuntime(projectedNodes, projectedEdges, instanceID, instanceTasks)

	mutableGraph := taskcreation.DesignerGraph{
		Nodes: enrichedNodes,
		Edges: enrichedEdges,
	}
	taskcreation.NormalizeInstanceRouting(&mutableGraph, instanceID)

	return contracts.DesignerGraphPayload{
		Nodes: mutableGraph.Nodes,
		Edges: mutableGraph.Edges,
	}, nil
}

func fetchInstanceTasks(
	ctx context.Context,
	ensurePool func(context.Context) (*pgxpool.Pool, error),
	instanceID string,
) ([]RuntimeTask, error) {
	pool, err := ensurePool(ctx)
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

	items := make([]RuntimeTask, 0)
	for rows.Next() {
		var item RuntimeTask
		if err := rows.Scan(&item.ID, &item.NodeID, &item.Name, &item.RoleKey, &item.Status, &item.Triage, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
