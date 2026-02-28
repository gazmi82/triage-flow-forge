package taskcreation

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

func (s Service) CreateTaskFromConsole(ctx context.Context, req contracts.CreateTaskFromConsoleRequest) (contracts.CreateTaskFromConsoleResponse, error) {
	return s.repo.CreateTaskFromConsole(ctx, req)
}
