package postgres

import (
	"context"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
	dbpostgres "github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres"
	bootstraprepo "github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres/bootstrap"
	dbtaskcreation "github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres/taskcreation"
)

type Repository struct {
	client *dbpostgres.Client
}

func New(client *dbpostgres.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) CreateTaskFromConsole(ctx context.Context, req contracts.CreateTaskFromConsoleRequest) (contracts.CreateTaskFromConsoleResponse, error) {
	return dbtaskcreation.CreateTaskFromConsole(ctx, dbtaskcreation.Dependencies{
		EnsurePool: r.client.Pool,
		QueryRowTx: r.client.QueryRowTx,
		ExecTx:     r.client.ExecTx,

		BuildTaskSnapshot:       r.client.BuildTaskSnapshot,
		UpsertSavedTaskSnapshot: r.client.UpsertSavedTaskSnapshot,

		FetchTasks: func(ctx context.Context) ([]contracts.Task, error) {
			return bootstraprepo.FetchTasks(ctx, r.client.Pool)
		},
		FetchSavedTasks: func(ctx context.Context) ([]contracts.SavedTaskRecord, error) {
			return bootstraprepo.FetchSavedTasks(ctx, r.client.Pool)
		},
		FetchDesignerGraph: func(ctx context.Context) (contracts.DesignerGraphPayload, error) {
			return bootstraprepo.FetchDesignerGraph(ctx, r.client.Pool)
		},
		FetchInstances: func(ctx context.Context) ([]contracts.ProcessInstance, error) {
			return bootstraprepo.FetchInstances(ctx, r.client.Pool)
		},
		FetchAudit: func(ctx context.Context) ([]contracts.AuditEvent, error) {
			return bootstraprepo.FetchAudit(ctx, r.client.Pool)
		},
	}, req)
}
