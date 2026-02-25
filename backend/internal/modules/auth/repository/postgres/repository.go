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

func (r *Repository) Login(ctx context.Context, email, password string) (postgres.AuthPayload, error) {
	return r.client.Login(ctx, email, password)
}
