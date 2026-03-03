package postgres

import "strings"

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
