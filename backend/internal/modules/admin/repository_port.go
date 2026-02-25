package admin

import (
	"context"

	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type Repository interface {
	CreateUser(ctx context.Context, req postgres.AdminCreateUserRequest) (postgres.AdminCreateUserResponse, error)
}
