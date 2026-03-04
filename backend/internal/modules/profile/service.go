package profile

import (
	"context"

	"triage-flow-forge/backend/internal/modules/contracts"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return Service{repo: repo}
}

func (s Service) FetchProfile(ctx context.Context, user contracts.AuthPayload) (contracts.ProfilePayload, error) {
	return s.repo.FetchProfile(ctx, user)
}
