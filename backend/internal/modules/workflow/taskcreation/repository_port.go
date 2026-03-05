package taskcreation

import (
	"context"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	CreateTaskFromConsole(ctx context.Context, req contracts.CreateTaskFromConsoleRequest) (contracts.CreateTaskFromConsoleResponse, error)
}
