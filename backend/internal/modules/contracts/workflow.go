package contracts

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
