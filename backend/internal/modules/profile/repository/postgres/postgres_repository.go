package postgres

import (
	"context"

	"triage-flow-forge/backend/internal/modules/contracts"
	dbpostgres "triage-flow-forge/backend/internal/platform/db/postgres"
	profilerepo "triage-flow-forge/backend/internal/platform/db/postgres/profile"
)

type Repository struct {
	client *dbpostgres.Client
}

func New(client *dbpostgres.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) FetchProfile(ctx context.Context, user contracts.AuthPayload) (contracts.ProfilePayload, error) {
	return profilerepo.FetchProfile(ctx, r.client.Pool, user)
}
