package profile

import (
	"context"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	FetchProfile(ctx context.Context, user contracts.AuthPayload) (contracts.ProfilePayload, error)
}
