package taskcreation

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"triage-flow-forge/backend/internal/modules/contracts"
)

func validateCreateTaskFromConsoleRequest(req contracts.CreateTaskFromConsoleRequest) error {
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

func resolveInstanceID(req contracts.CreateTaskFromConsoleRequest, ts int64) string {
	instanceID := fmt.Sprintf("pi-flow-%d", ts)
	if req.InstanceID != nil && strings.TrimSpace(*req.InstanceID) != "" {
		instanceID = strings.TrimSpace(*req.InstanceID)
	}
	return instanceID
}

func resolvePatient(req contracts.CreateTaskFromConsoleRequest) (string, string) {
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

func resolveTriage(req contracts.CreateTaskFromConsoleRequest) (color, priority, category string, slaMinutes int) {
	color = "yellow"
	if req.TriageColor != nil && strings.TrimSpace(*req.TriageColor) != "" {
		color = strings.TrimSpace(*req.TriageColor)
	}
	priority, category, slaMinutes = triageMeta(color)
	return color, priority, category, slaMinutes
}

func roleLabel(role contracts.Role) string {
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

func defaultTaskFormFields(role contracts.Role) json.RawMessage {
	triageOptions := []string{"Immediate", "Very urgent", "Urgent", "Standard", "Non-urgent"}
	base := []map[string]any{
		{"id": "patient_name", "label": "Patient Name", "type": "text", "required": true},
		{"id": "patient_id", "label": "Patient ID", "type": "text", "required": true},
	}

	fields := append([]map[string]any{}, base...)

	switch role {
	case "reception":
		fields = append(fields,
			map[string]any{"id": "chief_complaint", "label": "Chief Complaint", "type": "textarea", "required": true},
			map[string]any{"id": "registration_notes", "label": "Registration Notes", "type": "textarea", "required": false},
		)
	case "triage_nurse":
		fields = append(fields,
			map[string]any{"id": "vitals", "label": "Vital Signs Summary", "type": "textarea", "required": true},
			map[string]any{"id": "nurse_assessment", "label": "Nurse Assessment", "type": "textarea", "required": true},
			map[string]any{"id": "nurse_treatment", "label": "Nurse Treatment", "type": "textarea", "required": false},
			map[string]any{"id": "nurse_notes", "label": "Nurse Notes", "type": "textarea", "required": false},
		)
	case "physician":
		fields = append(fields,
			map[string]any{"id": "diagnosis", "label": "Primary Diagnosis", "type": "text", "required": true},
			map[string]any{"id": "severity", "label": "Severity Level", "type": "select", "required": true, "options": triageOptions},
			map[string]any{"id": "treatment_plan", "label": "Treatment Plan", "type": "textarea", "required": false},
			map[string]any{"id": "admit", "label": "Admit to Hospital", "type": "boolean", "required": true},
			map[string]any{"id": "clinical_notes", "label": "Clinical Notes", "type": "textarea", "required": false},
		)
	case "lab":
		fields = append(fields,
			map[string]any{"id": "lab_tests_requested", "label": "Lab Tests Requested", "type": "textarea", "required": true},
			map[string]any{"id": "lab_findings", "label": "Lab Findings", "type": "textarea", "required": false},
			map[string]any{"id": "lab_notes", "label": "Lab Notes", "type": "textarea", "required": false},
		)
	case "radiology":
		fields = append(fields,
			map[string]any{"id": "imaging_requested", "label": "Imaging Requested", "type": "textarea", "required": true},
			map[string]any{"id": "radiology_findings", "label": "Radiology Findings", "type": "textarea", "required": false},
			map[string]any{"id": "radiology_notes", "label": "Radiology Notes", "type": "textarea", "required": false},
		)
	default:
		fields = append(fields,
			map[string]any{"id": "status_summary", "label": "Status Summary", "type": "textarea", "required": false},
			map[string]any{"id": "notes", "label": "Notes", "type": "textarea", "required": false},
		)
	}

	fields = append(fields, map[string]any{"id": "handoff_notes", "label": "Handoff Notes", "type": "textarea", "required": false})

	raw, err := json.Marshal(fields)
	if err != nil {
		return json.RawMessage(`[]`)
	}
	return raw
}
