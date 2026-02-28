package postgres

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

func validateCreateTaskFromConsoleRequest(req CreateTaskFromConsoleRequest) error {
	if strings.TrimSpace(req.NodeType) == "" {
		return errors.New("nodeType is required")
	}
	if strings.TrimSpace(req.Label) == "" {
		return errors.New("label is required")
	}
	if strings.TrimSpace(string(req.AssignedRole)) == "" {
		return errors.New("assignedRole is required")
	}
	if strings.TrimSpace(string(req.CreatedByRole)) == "" {
		return errors.New("createdByRole is required")
	}
	return nil
}

func resolveInstanceID(req CreateTaskFromConsoleRequest, ts int64) string {
	instanceID := fmt.Sprintf("pi-flow-%d", ts)
	if req.InstanceID != nil && strings.TrimSpace(*req.InstanceID) != "" {
		instanceID = strings.TrimSpace(*req.InstanceID)
	}
	return instanceID
}

func resolvePatient(req CreateTaskFromConsoleRequest) (string, string) {
	patientName := "Unknown Patient"
	if req.PatientName != nil && strings.TrimSpace(*req.PatientName) != "" {
		patientName = strings.TrimSpace(*req.PatientName)
	}
	patientID := "P-UNSET"
	if req.PatientID != nil && strings.TrimSpace(*req.PatientID) != "" {
		patientID = strings.TrimSpace(*req.PatientID)
	}
	return patientName, patientID
}

func resolveTriage(req CreateTaskFromConsoleRequest) (color, priority, category string, slaMinutes int) {
	color = "yellow"
	if req.TriageColor != nil && strings.TrimSpace(*req.TriageColor) != "" {
		color = strings.TrimSpace(*req.TriageColor)
	}
	priority, category, slaMinutes = triageMeta(color)
	return color, priority, category, slaMinutes
}

func roleLabel(role Role) string {
	switch role {
	case "reception":
		return "Reception"
	case "triage_nurse":
		return "Triage Nurse"
	case "physician":
		return "Physician"
	case "lab":
		return "Laboratory"
	case "radiology":
		return "Radiology"
	default:
		return "Admin"
	}
}

func triageMeta(color string) (priority string, category string, slaMinutes int) {
	switch strings.ToLower(strings.TrimSpace(color)) {
	case "red":
		return "critical", "urgent", 5
	case "orange":
		return "high", "urgent", 15
	case "green":
		return "low", "non_urgent", 60
	case "blue":
		return "low", "non_urgent", 120
	default:
		return "medium", "urgent", 30
	}
}

func defaultTaskFormFields(role Role) json.RawMessage {
	fields := []map[string]any{
		{"id": "patient_name", "label": "Patient Name", "type": "text", "required": true},
		{"id": "patient_id", "label": "Patient ID", "type": "text", "required": true},
		{"id": "notes", "label": "Notes", "type": "textarea", "required": false},
	}

	if role == "triage_nurse" {
		fields = append(fields, map[string]any{
			"id":       "urgency",
			"label":    "Urgency",
			"type":     "select",
			"required": false,
			"options":  []string{"Immediate", "Very urgent", "Urgent", "Standard", "Non-urgent"},
		})
	}

	raw, err := json.Marshal(fields)
	if err != nil {
		return json.RawMessage(`[]`)
	}
	return raw
}
