package logging

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Options struct {
	Level              Level
	BufferSize         int
	SlowQueryThreshold time.Duration
}

const (
	defaultBufferSize         = 5000
	defaultSlowQueryThreshold = 300 * time.Millisecond
)

func OptionsFromEnv() Options {
	level := ParseLevel(strings.ToLower(strings.TrimSpace(os.Getenv("LOG_LEVEL"))))
	bufferSize := parsePositiveInt(os.Getenv("LOG_BUFFER_SIZE"), defaultBufferSize)
	slowQueryMS := parsePositiveInt(os.Getenv("LOG_SLOW_QUERY_MS"), int(defaultSlowQueryThreshold.Milliseconds()))

	return Options{
		Level:              level,
		BufferSize:         bufferSize,
		SlowQueryThreshold: time.Duration(slowQueryMS) * time.Millisecond,
	}
}

func parsePositiveInt(raw string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}
