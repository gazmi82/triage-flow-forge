package bootstrap

import (
	"context"

	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type Repository interface {
	FetchWorkflowBootstrap(ctx context.Context) (postgres.WorkflowBootstrapPayload, error)
}
