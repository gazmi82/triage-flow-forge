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

func (r *Repository) CreateUser(ctx context.Context, req postgres.AdminCreateUserRequest) (postgres.AdminCreateUserResponse, error) {
	return r.client.CreateUser(ctx, req)
}
