package auth

import (
	"context"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	Login(ctx context.Context, email, password string) (contracts.AuthPayload, error)
}
