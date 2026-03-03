package taskcreation

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"triage-flow-forge/backend/internal/modules/contracts"
)

type designerGraph struct {
	Nodes []map[string]any `json:"nodes"`
	Edges []map[string]any `json:"edges"`
}

func loadDefinitionAndGraph(ctx context.Context, deps Dependencies, tx pgx.Tx) (string, string, designerGraph, error) {
	var (
		definitionID   string
		definitionName string
	)
	err := deps.QueryRowTx(ctx, tx, "task.create.select_definition_for_update", `
SELECT d.id, d.name
FROM process_definitions d
ORDER BY d.updated_at DESC
LIMIT 1
FOR UPDATE
`).Scan(&definitionID, &definitionName)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", designerGraph{}, errors.New("no process definition found")
		}
		return "", "", designerGraph{}, err
	}

	var graphRaw json.RawMessage
	err = deps.QueryRowTx(ctx, tx, "task.create.select_graph", `
SELECT graph_payload
FROM definition_graphs
WHERE definition_id = $1
`, definitionID).Scan(&graphRaw)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", "", designerGraph{}, err
	}

	graph := designerGraph{Nodes: []map[string]any{}, Edges: []map[string]any{}}
	if len(graphRaw) > 0 {
		if err := json.Unmarshal(graphRaw, &graph); err != nil {
			graph = designerGraph{Nodes: []map[string]any{}, Edges: []map[string]any{}}
		}
	}
	if graph.Nodes == nil {
		graph.Nodes = []map[string]any{}
	}
	if graph.Edges == nil {
		graph.Edges = []map[string]any{}
	}
	return definitionID, definitionName, graph, nil
}

func appendNodeToDesignerGraph(graph *designerGraph, req contracts.CreateTaskFromConsoleRequest, instanceID, normalizedNodeType string, ts int64) string {
	fromNodeID := ""
	if req.FromNodeID != nil {
		fromNodeID = strings.TrimSpace(*req.FromNodeID)
	}
	triageColor := ""
	if req.TriageColor != nil {
		triageColor = strings.TrimSpace(*req.TriageColor)
	}
	conditionExpression := ""
	if req.ConditionExpression != nil {
		conditionExpression = strings.TrimSpace(*req.ConditionExpression)
	}
	correlationKey := ""
	if req.CorrelationKey != nil {
		correlationKey = strings.TrimSpace(*req.CorrelationKey)
	}

	mutableGraph := DesignerGraph{
		Nodes: graph.Nodes,
		Edges: graph.Edges,
	}
	targetNodeID := AppendNodeToGraph(&mutableGraph, AppendNodeRequest{
		InstanceID:          instanceID,
		NormalizedNodeType:  normalizedNodeType,
		Label:               req.Label,
		AssignedRole:        string(req.AssignedRole),
		FromNodeID:          fromNodeID,
		TriageColor:         triageColor,
		ConditionExpression: conditionExpression,
		CorrelationKey:      correlationKey,
		TimestampMillis:     ts,
		AssignedRoleLabel:   roleLabel(req.AssignedRole),
	})
	graph.Nodes = mutableGraph.Nodes
	graph.Edges = mutableGraph.Edges
	return targetNodeID
}

func upsertDefinitionGraph(ctx context.Context, deps Dependencies, tx pgx.Tx, definitionID string, graph designerGraph) error {
	graphPayload, err := json.Marshal(graph)
	if err != nil {
		return err
	}
	return deps.ExecTx(ctx, tx, "task.create.upsert_graph", `
INSERT INTO definition_graphs (definition_id, graph_payload, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (definition_id) DO UPDATE
SET graph_payload = EXCLUDED.graph_payload, updated_at = NOW()
`, definitionID, graphPayload)
}
