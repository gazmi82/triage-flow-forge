package logging

import (
	"fmt"
	"strings"
)

var sensitiveFieldSubstrings = []string{
	"password",
	"passcode",
	"secret",
	"token",
	"authorization",
	"cookie",
	"session",
	"email",
	"patientid",
	"patient_id",
}

const redactedValue = "[REDACTED]"

func sanitizeFields(fields map[string]any) map[string]any {
	if len(fields) == 0 {
		return nil
	}

	out := make(map[string]any, len(fields))
	for key, value := range fields {
		out[key] = sanitizeValue(key, value)
	}
	return out
}

func sanitizeValue(key string, value any) any {
	lowerKey := strings.ToLower(strings.TrimSpace(key))
	for _, sensitive := range sensitiveFieldSubstrings {
		if strings.Contains(lowerKey, sensitive) {
			return redactedValue
		}
	}

	switch typed := value.(type) {
	case map[string]any:
		return sanitizeFields(typed)
	case map[string]string:
		out := make(map[string]any, len(typed))
		for nestedKey, nestedValue := range typed {
			out[nestedKey] = sanitizeValue(nestedKey, nestedValue)
		}
		return out
	case []string:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, sanitizeValue(key, item))
		}
		return out
	case []any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, sanitizeValue(key, item))
		}
		return out
	default:
		return coerceScalar(typed)
	}
}

func coerceScalar(value any) any {
	switch value.(type) {
	case nil, string, bool, float64, float32, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return value
	default:
		return fmt.Sprint(value)
	}
}
