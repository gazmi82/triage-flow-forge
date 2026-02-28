package postgres

import (
	"context"

	"triage-flow-forge/backend/internal/modules/contracts"
	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type Repository struct {
	client *postgres.Client
}

func New(client *postgres.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) FetchWorkflowBootstrap(ctx context.Context) (contracts.WorkflowBootstrapPayload, error) {
	return r.client.FetchWorkflowBootstrap(ctx)
}
