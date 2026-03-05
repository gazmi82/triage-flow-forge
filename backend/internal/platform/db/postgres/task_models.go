package postgres

import "github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"

type Task = contracts.Task
type AuditEvent = contracts.AuditEvent
type SavedTaskRecord = contracts.SavedTaskRecord
type TaskMutationResponse = contracts.TaskMutationResponse
type CompleteTaskRequest = contracts.CompleteTaskRequest
type SaveTaskEditsRequest = contracts.SaveTaskEditsRequest
type CreateTaskFromConsoleRequest = contracts.CreateTaskFromConsoleRequest
type CreateTaskFromConsoleResponse = contracts.CreateTaskFromConsoleResponse
