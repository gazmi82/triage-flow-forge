package postgres

import "encoding/json"

type Role string

type User struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Role       Role   `json:"role"`
	Department string `json:"department"`
	Active     bool   `json:"active"`
}

type AuthPayload struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Role       Role   `json:"role"`
	Department string `json:"department"`
}

type ProcessDefinition struct {
	ID            string   `json:"id"`
	Key           string   `json:"key"`
	Name          string   `json:"name"`
	Version       int      `json:"version"`
	Status        string   `json:"status"`
	CreatedBy     string   `json:"createdBy"`
	CreatedAt     string   `json:"createdAt"`
	UpdatedAt     string   `json:"updatedAt"`
	Description   string   `json:"description"`
	Lanes         []string `json:"lanes"`
	InstanceCount int      `json:"instanceCount"`
}

type ProcessInstance struct {
	ID             string `json:"id"`
	DefinitionID   string `json:"definitionId"`
	DefinitionName string `json:"definitionName"`
	Status         string `json:"status"`
	StartedAt      string `json:"startedAt"`
	StartedBy      string `json:"startedBy"`
	CurrentNode    string `json:"currentNode"`
	Priority       string `json:"priority"`
	PatientID      string `json:"patientId,omitempty"`
	PatientName    string `json:"patientName,omitempty"`
}

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

type DesignerGraphPayload struct {
	Nodes []map[string]any `json:"nodes"`
	Edges []map[string]any `json:"edges"`
}

type DraftRecord struct {
	ID      string               `json:"id"`
	Name    string               `json:"name"`
	Version int                  `json:"version"`
	SavedAt string               `json:"savedAt"`
	Graph   DesignerGraphPayload `json:"graph"`
}

type SavedTaskRecord map[string]any

type WorkflowBootstrapPayload struct {
	Users       []User               `json:"users"`
	Definitions []ProcessDefinition  `json:"definitions"`
	Instances   []ProcessInstance    `json:"instances"`
	Tasks       []Task               `json:"tasks"`
	SavedTasks  []SavedTaskRecord    `json:"savedTasks"`
	Audit       []AuditEvent         `json:"audit"`
	Graph       DesignerGraphPayload `json:"graph"`
	Drafts      []DraftRecord        `json:"drafts"`
}

type TaskMutationResponse struct {
	Tasks      []Task               `json:"tasks"`
	SavedTasks []SavedTaskRecord    `json:"savedTasks"`
	Graph      DesignerGraphPayload `json:"graph"`
	Instances  []ProcessInstance    `json:"instances"`
	Audit      []AuditEvent         `json:"audit"`
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

type AdminCreateUserRequest struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	Role       Role   `json:"role"`
	Department string `json:"department"`
	Active     *bool  `json:"active,omitempty"`
}

type AdminCreateUserResponse struct {
	Users       []User `json:"users"`
	CreatedUser User   `json:"createdUser"`
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
