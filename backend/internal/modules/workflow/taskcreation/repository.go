package taskcreation

import (
	"context"

	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type Repository interface {
	CreateTaskFromConsole(ctx context.Context, req postgres.CreateTaskFromConsoleRequest) (postgres.CreateTaskFromConsoleResponse, error)
}
