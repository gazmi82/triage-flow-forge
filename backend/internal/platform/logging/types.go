package logging

import "time"

type Level string

const (
	LevelDebug Level = "debug"
	LevelInfo  Level = "info"
	LevelWarn  Level = "warn"
	LevelError Level = "error"
)

var levelRank = map[Level]int{
	LevelDebug: 10,
	LevelInfo:  20,
	LevelWarn:  30,
	LevelError: 40,
}

func ParseLevel(value string) Level {
	switch value {
	case string(LevelDebug):
		return LevelDebug
	case string(LevelWarn):
		return LevelWarn
	case string(LevelError):
		return LevelError
	default:
		return LevelInfo
	}
}

func (l Level) enabled(minLevel Level) bool {
	return levelRank[l] >= levelRank[minLevel]
}

type Entry struct {
	Timestamp string         `json:"timestamp"`
	Level     Level          `json:"level"`
	Channel   string         `json:"channel"`
	Message   string         `json:"message"`
	RequestID string         `json:"requestId,omitempty"`
	TraceID   string         `json:"traceId,omitempty"`
	Fields    map[string]any `json:"fields,omitempty"`
}

type Filter struct {
	Level   Level
	Channel string
	Search  string
	Since   time.Time
	Limit   int
}

type SummaryPoint struct {
	Bucket string `json:"bucket"`
	Count  int    `json:"count"`
}

type Summary struct {
	Total     int            `json:"total"`
	Incidents int            `json:"incidents"`
	ByLevel   map[string]int `json:"byLevel"`
	ByChannel map[string]int `json:"byChannel"`
	Timeline  []SummaryPoint `json:"timeline"`
}
