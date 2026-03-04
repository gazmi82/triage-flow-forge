package contracts

type ProfilePayload struct {
	User                 AuthPayload                 `json:"user"`
	CurrentUser          *User                       `json:"currentUser,omitempty"`
	ProfileRole          Role                        `json:"profileRole"`
	PeerUsers            []User                      `json:"peerUsers"`
	PersonalTasks        []Task                      `json:"personalTasks"`
	PersonalAudit        []AuditEvent                `json:"personalAudit"`
	PatientActivity      []ProfilePatientActivity    `json:"patientActivity"`
	EventBreakdown       []ProfileEventBreakdown     `json:"eventBreakdown"`
	ActivityByDay        []ProfileActivityDay        `json:"activityByDay"`
	PriorityDistribution ProfilePriorityDistribution `json:"priorityDistribution"`
	TriageDistribution   ProfileTriageDistribution   `json:"triageDistribution"`
	CompletedCount       int                         `json:"completedCount"`
	ClaimedCount         int                         `json:"claimedCount"`
	PendingCount         int                         `json:"pendingCount"`
	OverdueCount         int                         `json:"overdueCount"`
	OpenWorkload         int                         `json:"openWorkload"`
	CompletionRate       int                         `json:"completionRate"`
	AvgCycleMinutes      int                         `json:"avgCycleMinutes"`
	SLARiskCount         int                         `json:"slaRiskCount"`
	ActiveInstanceCount  int                         `json:"activeInstanceCount"`
	ActivityScore        int                         `json:"activityScore"`
	FirstAudit           *AuditEvent                 `json:"firstAudit,omitempty"`
	LastAudit            *AuditEvent                 `json:"lastAudit,omitempty"`
}

type ProfileEventBreakdown struct {
	EventType string `json:"eventType"`
	Count     int    `json:"count"`
}

type ProfileActivityDay struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Count int    `json:"count"`
}

type ProfilePatientActivity struct {
	PatientID    string `json:"patientId"`
	PatientName  string `json:"patientName"`
	InstanceID   string `json:"instanceId"`
	LatestStatus string `json:"latestStatus"`
	Priority     string `json:"priority"`
	TriageColor  string `json:"triageColor,omitempty"`
	LatestTouch  string `json:"latestTouch"`
	TouchCount   int    `json:"touchCount"`
}

type ProfilePriorityDistribution struct {
	Low      int `json:"low"`
	Medium   int `json:"medium"`
	High     int `json:"high"`
	Critical int `json:"critical"`
}

type ProfileTriageDistribution struct {
	Red    int `json:"red"`
	Orange int `json:"orange"`
	Yellow int `json:"yellow"`
	Green  int `json:"green"`
	Blue   int `json:"blue"`
}
