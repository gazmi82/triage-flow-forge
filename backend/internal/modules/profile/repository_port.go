package profile

import (
	"context"

	"triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	FetchProfile(ctx context.Context, user contracts.AuthPayload) (contracts.ProfilePayload, error)
}
