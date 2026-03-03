package contracts

import "encoding/json"

type Task struct {
	ID               string          `json:"id"`
	NodeID           string          `json:"nodeId,omitempty"`
	InstanceID       string          `json:"instanceId"`
	DefinitionName   string          `json:"definitionName"`
	Name             string          `json:"name"`
	Assignee         any             `json:"assignee"`
	Role             Role            `json:"role"`
	Status           string          `json:"status"`
	Priority         string          `json:"priority"`
	CreatedAt        string          `json:"createdAt"`
	DueAt            string          `json:"dueAt"`
	SLAMinutes       int             `json:"slaMinutes"`
	MinutesRemaining int             `json:"minutesRemaining"`
	PatientName      string          `json:"patientName"`
	PatientID        string          `json:"patientId"`
	FormFields       json.RawMessage `json:"formFields"`
	FormValues       json.RawMessage `json:"formValues,omitempty"`
	UpdatedAt        string          `json:"updatedAt,omitempty"`
	TriageCategory   string          `json:"triageCategory,omitempty"`
	TriageColor      string          `json:"triageColor,omitempty"`
}

type AuditEvent struct {
	ID         string          `json:"id"`
	InstanceID string          `json:"instanceId"`
	Timestamp  string          `json:"timestamp"`
	Actor      string          `json:"actor"`
	Role       Role            `json:"role"`
	EventType  string          `json:"eventType"`
	NodeID     string          `json:"nodeId"`
	NodeName   string          `json:"nodeName"`
	Payload    json.RawMessage `json:"payload,omitempty"`
}

type SavedTaskRecord map[string]any

type TaskMutationResponse struct {
	Tasks      []Task               `json:"tasks"`
	SavedTasks []SavedTaskRecord    `json:"savedTasks"`
	Graph      DesignerGraphPayload `json:"graph"`
	Instances  []ProcessInstance    `json:"instances"`
	Audit      []AuditEvent         `json:"audit"`
}

type PatientMedicalRecordPayload struct {
	Task     SavedTaskRecord `json:"task"`
	Instance ProcessInstance `json:"instance"`
	Audit    []AuditEvent    `json:"audit"`
}

type CompleteTaskRequest struct {
	Actor       string `json:"actor"`
	PatientName string `json:"patientName,omitempty"`
	PatientID   string `json:"patientId,omitempty"`
}

type SaveTaskEditsRequest struct {
	Actor       string                 `json:"actor"`
	FormValues  map[string]interface{} `json:"formValues"`
	TriageColor *string                `json:"triageColor,omitempty"`
	Label       *string                `json:"label,omitempty"`
	PatientName *string                `json:"patientName,omitempty"`
	PatientID   *string                `json:"patientId,omitempty"`
}

type CreateTaskFromConsoleRequest struct {
	FromNodeID          *string                `json:"fromNodeId,omitempty"`
	InstanceID          *string                `json:"instanceId,omitempty"`
	NodeType            string                 `json:"nodeType"`
	Label               string                 `json:"label"`
	ConditionExpression *string                `json:"conditionExpression,omitempty"`
	CorrelationKey      *string                `json:"correlationKey,omitempty"`
	TriageColor         *string                `json:"triageColor,omitempty"`
	AssignedRole        Role                   `json:"assignedRole"`
	CreatedByRole       Role                   `json:"createdByRole"`
	PatientName         *string                `json:"patientName,omitempty"`
	PatientID           *string                `json:"patientId,omitempty"`
	RegistrationNote    *string                `json:"registrationNote,omitempty"`
	FormValues          map[string]interface{} `json:"formValues,omitempty"`
}

type CreateTaskFromConsoleResponse struct {
	Tasks         []Task               `json:"tasks"`
	SavedTasks    []SavedTaskRecord    `json:"savedTasks"`
	Graph         DesignerGraphPayload `json:"graph"`
	Instances     []ProcessInstance    `json:"instances"`
	Audit         []AuditEvent         `json:"audit"`
	CreatedNodeID string               `json:"createdNodeId"`
	InstanceID    string               `json:"instanceId"`
}
