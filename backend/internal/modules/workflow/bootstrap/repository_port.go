package bootstrap

import (
	"context"

	"triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	FetchWorkflowBootstrap(ctx context.Context) (contracts.WorkflowBootstrapPayload, error)
}
