package admin

import (
	"context"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return Service{repo: repo}
}

func (s Service) CreateUser(ctx context.Context, req contracts.AdminCreateUserRequest) (contracts.AdminCreateUserResponse, error) {
	return s.repo.CreateUser(ctx, req)
}
