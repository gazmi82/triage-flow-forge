package bootstrap

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

func (s Service) FetchWorkflowBootstrap(ctx context.Context) (contracts.WorkflowBootstrapPayload, error) {
	return s.repo.FetchWorkflowBootstrap(ctx)
}
