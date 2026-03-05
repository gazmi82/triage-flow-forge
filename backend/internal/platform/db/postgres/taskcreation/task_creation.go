package taskcreation

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

type Dependencies struct {
	EnsurePool func(context.Context) (*pgxpool.Pool, error)
	QueryRowTx func(context.Context, pgx.Tx, string, string, ...any) pgx.Row
	ExecTx     func(context.Context, pgx.Tx, string, string, ...any) error

	BuildTaskSnapshot       func(context.Context, pgx.Tx, string) (json.RawMessage, error)
	UpsertSavedTaskSnapshot func(context.Context, pgx.Tx, string, string, string, json.RawMessage) error

	FetchTasks         func(context.Context) ([]contracts.Task, error)
	FetchSavedTasks    func(context.Context) ([]contracts.SavedTaskRecord, error)
	FetchDesignerGraph func(context.Context) (contracts.DesignerGraphPayload, error)
	FetchInstances     func(context.Context) ([]contracts.ProcessInstance, error)
	FetchAudit         func(context.Context) ([]contracts.AuditEvent, error)
}

func (d Dependencies) validate() error {
	switch {
	case d.EnsurePool == nil:
		return errors.New("taskcreation dependencies: EnsurePool is required")
	case d.QueryRowTx == nil:
		return errors.New("taskcreation dependencies: QueryRowTx is required")
	case d.ExecTx == nil:
		return errors.New("taskcreation dependencies: ExecTx is required")
	case d.BuildTaskSnapshot == nil:
		return errors.New("taskcreation dependencies: BuildTaskSnapshot is required")
	case d.UpsertSavedTaskSnapshot == nil:
		return errors.New("taskcreation dependencies: UpsertSavedTaskSnapshot is required")
	case d.FetchTasks == nil:
		return errors.New("taskcreation dependencies: FetchTasks is required")
	case d.FetchSavedTasks == nil:
		return errors.New("taskcreation dependencies: FetchSavedTasks is required")
	case d.FetchDesignerGraph == nil:
		return errors.New("taskcreation dependencies: FetchDesignerGraph is required")
	case d.FetchInstances == nil:
		return errors.New("taskcreation dependencies: FetchInstances is required")
	case d.FetchAudit == nil:
		return errors.New("taskcreation dependencies: FetchAudit is required")
	default:
		return nil
	}
}

func CreateTaskFromConsole(
	ctx context.Context,
	deps Dependencies,
	req contracts.CreateTaskFromConsoleRequest,
) (contracts.CreateTaskFromConsoleResponse, error) {
	if err := deps.validate(); err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}
	if err := validateCreateTaskFromConsoleRequest(req); err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}

	pool, err := deps.EnsurePool(ctx)
	if err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	now := time.Now().UTC()
	ts := now.UnixMilli()
	instanceID := resolveInstanceID(req, ts)
	normalizedNodeType := req.NodeType

	definitionID, definitionName, graph, err := loadDefinitionAndGraph(ctx, deps, tx)
	if err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}

	targetNodeID := appendNodeToDesignerGraph(&graph, req, instanceID, normalizedNodeType, ts)
	if err := upsertDefinitionGraph(ctx, deps, tx, definitionID, graph); err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}

	patientName, patientID := resolvePatient(req)
	triageColor, priority, triageCategory, slaMinutes := resolveTriage(req)

	if err := upsertProcessInstance(ctx, deps, tx, instanceID, definitionID, req.Label, patientID, patientName); err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}

	if normalizedNodeType == "userTask" {
		err = upsertUserTaskForNode(
			ctx, deps, tx, req,
			instanceID, targetNodeID, definitionID, definitionName, priority,
			slaMinutes, patientName, patientID, triageCategory, triageColor, now,
		)
	} else {
		err = insertNonTaskAuditEvent(ctx, deps, tx, req, instanceID, targetNodeID, normalizedNodeType)
	}
	if err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}
	if normalizedNodeType == "endEvent" {
		if err := markInstanceClosed(ctx, deps, tx, instanceID); err != nil {
			return contracts.CreateTaskFromConsoleResponse{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return contracts.CreateTaskFromConsoleResponse{}, err
	}

	return fetchCreateTaskFromConsoleResponse(ctx, deps, targetNodeID, instanceID)
}
