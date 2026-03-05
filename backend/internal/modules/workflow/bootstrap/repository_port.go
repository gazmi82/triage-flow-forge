package bootstrap

import (
	"context"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	FetchWorkflowBootstrap(ctx context.Context) (contracts.WorkflowBootstrapPayload, error)
}
