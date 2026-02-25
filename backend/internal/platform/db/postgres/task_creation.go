package postgres

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (c *Client) CreateTaskFromConsole(ctx context.Context, req CreateTaskFromConsoleRequest) (CreateTaskFromConsoleResponse, error) {
	if err := validateCreateTaskFromConsoleRequest(req); err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}

	pool, err := c.ensurePool(ctx)
	if err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	now := time.Now().UTC()
	ts := now.UnixMilli()
	instanceID := resolveInstanceID(req, ts)
	normalizedNodeType := strings.TrimSpace(req.NodeType)

	definitionID, definitionName, graph, err := c.loadDefinitionAndGraph(ctx, tx)
	if err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}

	targetNodeID := appendNodeToGraph(&graph, req, instanceID, normalizedNodeType, ts)
	if err := c.upsertDefinitionGraph(ctx, tx, definitionID, graph); err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}

	patientName, patientID := resolvePatient(req)
	triageColor, priority, triageCategory, slaMinutes := resolveTriage(req)

	if err := c.upsertProcessInstance(ctx, tx, instanceID, definitionID, req.Label, patientID, patientName); err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}

	if normalizedNodeType == "userTask" {
		err = c.upsertUserTaskForNode(
			ctx, tx, req,
			instanceID, targetNodeID, definitionID, definitionName, priority,
			slaMinutes, patientName, patientID, triageCategory, triageColor, now,
		)
	} else {
		err = c.insertNonTaskAuditEvent(ctx, tx, req, instanceID, targetNodeID, normalizedNodeType)
	}
	if err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return CreateTaskFromConsoleResponse{}, err
	}

	return c.fetchCreateTaskFromConsoleResponse(ctx, targetNodeID, instanceID)
}
