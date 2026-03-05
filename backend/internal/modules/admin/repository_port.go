package admin

import (
	"context"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	CreateUser(ctx context.Context, req contracts.AdminCreateUserRequest) (contracts.AdminCreateUserResponse, error)
}
