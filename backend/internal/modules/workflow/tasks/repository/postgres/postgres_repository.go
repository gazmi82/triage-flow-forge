package postgres

import (
	"context"

	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type Repository struct {
	client *postgres.Client
}

func New(client *postgres.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) FetchTasks(ctx context.Context) ([]postgres.Task, error) {
	return r.client.FetchTasks(ctx)
}

func (r *Repository) FetchTaskDesignerGraph(ctx context.Context, taskID string) (postgres.DesignerGraphPayload, error) {
	return r.client.FetchTaskDesignerGraph(ctx, taskID)
}

func (r *Repository) ClaimTask(ctx context.Context, taskID, assigneeName string) (postgres.TaskMutationResponse, error) {
	return r.client.ClaimTask(ctx, taskID, assigneeName)
}

func (r *Repository) SaveTaskEdits(ctx context.Context, taskID string, req postgres.SaveTaskEditsRequest) (postgres.TaskMutationResponse, error) {
	return r.client.SaveTaskEdits(ctx, taskID, req)
}

func (r *Repository) CompleteTask(ctx context.Context, taskID string, req postgres.CompleteTaskRequest) (postgres.TaskMutationResponse, error) {
	return r.client.CompleteTask(ctx, taskID, req)
}
