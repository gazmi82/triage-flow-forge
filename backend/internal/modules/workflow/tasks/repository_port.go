package tasks

import (
	"context"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

type Repository interface {
	FetchTasks(ctx context.Context) ([]contracts.Task, error)
	FetchPatientMedicalRecord(ctx context.Context, taskID string) (contracts.PatientMedicalRecordPayload, error)
	FetchTaskDesignerGraph(ctx context.Context, taskID string) (contracts.DesignerGraphPayload, error)
	ClaimTask(ctx context.Context, taskID, assigneeName string) (contracts.TaskMutationResponse, error)
	SaveTaskEdits(ctx context.Context, taskID string, req contracts.SaveTaskEditsRequest) (contracts.TaskMutationResponse, error)
	CompleteTask(ctx context.Context, taskID string, req contracts.CompleteTaskRequest) (contracts.TaskMutationResponse, error)
	DeleteTask(ctx context.Context, taskID string) (contracts.TaskMutationResponse, error)
}
