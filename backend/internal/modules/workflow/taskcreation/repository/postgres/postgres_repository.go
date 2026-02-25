package postgres

import (
	"context"

	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type Repository struct {
	client *postgres.Client
}

func New(client *postgres.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) CreateTaskFromConsole(ctx context.Context, req postgres.CreateTaskFromConsoleRequest) (postgres.CreateTaskFromConsoleResponse, error) {
	return r.client.CreateTaskFromConsole(ctx, req)
}
