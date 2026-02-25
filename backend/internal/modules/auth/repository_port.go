package auth

import (
	"context"

	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type Repository interface {
	Login(ctx context.Context, email, password string) (postgres.AuthPayload, error)
}
