package tasks

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

func (s Service) FetchTasks(ctx context.Context) ([]contracts.Task, error) {
	return s.repo.FetchTasks(ctx)
}

func (s Service) FetchPatientMedicalRecord(ctx context.Context, taskID string) (contracts.PatientMedicalRecordPayload, error) {
	return s.repo.FetchPatientMedicalRecord(ctx, taskID)
}

func (s Service) FetchTaskDesignerGraph(ctx context.Context, taskID string) (contracts.DesignerGraphPayload, error) {
	return s.repo.FetchTaskDesignerGraph(ctx, taskID)
}

func (s Service) ClaimTask(ctx context.Context, taskID, assigneeName string) (contracts.TaskMutationResponse, error) {
	return s.repo.ClaimTask(ctx, taskID, assigneeName)
}

func (s Service) SaveTaskEdits(ctx context.Context, taskID string, req contracts.SaveTaskEditsRequest) (contracts.TaskMutationResponse, error) {
	return s.repo.SaveTaskEdits(ctx, taskID, req)
}

func (s Service) CompleteTask(ctx context.Context, taskID string, req contracts.CompleteTaskRequest) (contracts.TaskMutationResponse, error) {
	return s.repo.CompleteTask(ctx, taskID, req)
}

func (s Service) DeleteTask(ctx context.Context, taskID string) (contracts.TaskMutationResponse, error) {
	return s.repo.DeleteTask(ctx, taskID)
}
