package auth

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

func (s Service) Login(ctx context.Context, email, password string) (contracts.AuthPayload, error) {
	return s.repo.Login(ctx, email, password)
}
