package auth

import (
	"context"

	"triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	Login(ctx context.Context, email, password string) (contracts.AuthPayload, error)
}
