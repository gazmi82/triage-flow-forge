package tasks

import (
	"context"

	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type Repository interface {
	FetchTasks(ctx context.Context) ([]postgres.Task, error)
	ClaimTask(ctx context.Context, taskID, assigneeName string) (postgres.TaskMutationResponse, error)
	SaveTaskEdits(ctx context.Context, taskID string, req postgres.SaveTaskEditsRequest) (postgres.TaskMutationResponse, error)
	CompleteTask(ctx context.Context, taskID string, req postgres.CompleteTaskRequest) (postgres.TaskMutationResponse, error)
}
