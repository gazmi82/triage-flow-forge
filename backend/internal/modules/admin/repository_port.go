package admin

import (
	"context"

	"triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	CreateUser(ctx context.Context, req contracts.AdminCreateUserRequest) (contracts.AdminCreateUserResponse, error)
}
