package logging

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/requestctx"
)

type Logger struct {
	mu                 sync.RWMutex
	level              Level
	entries            []Entry
	writeIndex         int
	entryCount         int
	slowQueryThreshold time.Duration
	std                *log.Logger
}

func New(options Options) *Logger {
	level := options.Level
	if level == "" {
		level = LevelInfo
	}

	bufferSize := options.BufferSize
	if bufferSize <= 0 {
		bufferSize = defaultBufferSize
	}

	slowQueryThreshold := options.SlowQueryThreshold
	if slowQueryThreshold <= 0 {
		slowQueryThreshold = defaultSlowQueryThreshold
	}

	return &Logger{
		level:              level,
		entries:            make([]Entry, bufferSize),
		slowQueryThreshold: slowQueryThreshold,
		std:                log.New(os.Stdout, "", 0),
	}
}

func NewFromEnv() *Logger {
	return New(OptionsFromEnv())
}

func (l *Logger) SlowQueryThreshold() time.Duration {
	if l == nil {
		return defaultSlowQueryThreshold
	}

	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.slowQueryThreshold
}

func (l *Logger) Debug(ctx context.Context, channel, message string, fields map[string]any) {
	l.Log(ctx, LevelDebug, channel, message, fields)
}

func (l *Logger) Info(ctx context.Context, channel, message string, fields map[string]any) {
	l.Log(ctx, LevelInfo, channel, message, fields)
}

func (l *Logger) Warn(ctx context.Context, channel, message string, fields map[string]any) {
	l.Log(ctx, LevelWarn, channel, message, fields)
}

func (l *Logger) Error(ctx context.Context, channel, message string, fields map[string]any) {
	l.Log(ctx, LevelError, channel, message, fields)
}

func (l *Logger) Log(ctx context.Context, level Level, channel, message string, fields map[string]any) {
	if l == nil {
		return
	}

	if !level.enabled(l.level) {
		return
	}

	entry := Entry{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Level:     level,
		Channel:   strings.TrimSpace(channel),
		Message:   strings.TrimSpace(message),
		RequestID: requestctx.RequestID(ctx),
		TraceID:   requestctx.TraceID(ctx),
		Fields:    sanitizeFields(fields),
	}
	if entry.Channel == "" {
		entry.Channel = "app"
	}
	if entry.Message == "" {
		entry.Message = "event"
	}

	l.append(entry)
	l.emit(entry)
}

func (l *Logger) append(entry Entry) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.entries[l.writeIndex] = entry
	l.writeIndex = (l.writeIndex + 1) % len(l.entries)
	if l.entryCount < len(l.entries) {
		l.entryCount++
	}
}

func (l *Logger) emit(entry Entry) {
	if l.std == nil {
		return
	}

	// Terminal output is intentionally human-readable.
	// Structured data remains available via in-memory entries/admin APIs.
	ts := entry.Timestamp
	if parsed, err := time.Parse(time.RFC3339Nano, entry.Timestamp); err == nil {
		ts = parsed.Local().Format("2006/01/02 15:04:05")
	}

	if entry.Channel == "http" && entry.Message == "request completed" {
		method := fieldString(entry.Fields, "method")
		path := fieldString(entry.Fields, "path")
		status := fieldInt(entry.Fields, "status")
		bytes := fieldInt(entry.Fields, "bytes")
		durationMS := fieldInt(entry.Fields, "durationMs")

		if entry.RequestID != "" {
			l.std.Printf("%s rid=%s method=%s path=%s status=%d bytes=%d duration=%dms", ts, entry.RequestID, method, path, status, bytes, durationMS)
		} else {
			l.std.Printf("%s method=%s path=%s status=%d bytes=%d duration=%dms", ts, method, path, status, bytes, durationMS)
		}
		return
	}

	if len(entry.Fields) == 0 {
		l.std.Printf("%s %s %s", ts, entry.Channel, entry.Message)
		return
	}

	fieldsJSON, err := json.Marshal(entry.Fields)
	if err != nil {
		l.std.Printf("%s %s %s", ts, entry.Channel, entry.Message)
		return
	}
	l.std.Printf("%s %s %s %s", ts, entry.Channel, entry.Message, string(fieldsJSON))
}

func (l *Logger) List(filter Filter) []Entry {
	if l == nil {
		return []Entry{}
	}

	entries := l.snapshot()
	out := make([]Entry, 0, len(entries))

	searchLower := strings.ToLower(strings.TrimSpace(filter.Search))
	channelLower := strings.ToLower(strings.TrimSpace(filter.Channel))

	for _, entry := range entries {
		if filter.Level != "" && entry.Level != filter.Level {
			continue
		}
		if channelLower != "" && strings.ToLower(entry.Channel) != channelLower {
			continue
		}
		if !filter.Since.IsZero() {
			parsed, err := time.Parse(time.RFC3339Nano, entry.Timestamp)
			if err == nil && parsed.Before(filter.Since) {
				continue
			}
		}
		if searchLower != "" && !entryContains(entry, searchLower) {
			continue
		}
		out = append(out, entry)
	}

	if filter.Limit > 0 && len(out) > filter.Limit {
		return out[len(out)-filter.Limit:]
	}
	return out
}

func (l *Logger) Summary(filter Filter) Summary {
	entries := l.List(filter)
	summary := Summary{
		Total:     len(entries),
		ByLevel:   map[string]int{},
		ByChannel: map[string]int{},
		Timeline:  []SummaryPoint{},
	}

	perMinute := make(map[string]int)
	for _, entry := range entries {
		summary.ByLevel[string(entry.Level)]++
		summary.ByChannel[entry.Channel]++
		if isIncident(entry) {
			summary.Incidents++
		}

		parsed, err := time.Parse(time.RFC3339Nano, entry.Timestamp)
		if err != nil {
			continue
		}
		bucket := parsed.UTC().Format("2006-01-02T15:04")
		perMinute[bucket]++
	}

	if len(perMinute) == 0 {
		return summary
	}

	buckets := make([]string, 0, len(perMinute))
	for bucket := range perMinute {
		buckets = append(buckets, bucket)
	}
	sort.Strings(buckets)

	points := make([]SummaryPoint, 0, len(buckets))
	for _, bucket := range buckets {
		points = append(points, SummaryPoint{
			Bucket: bucket,
			Count:  perMinute[bucket],
		})
	}
	summary.Timeline = points
	return summary
}

func (l *Logger) snapshot() []Entry {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if l.entryCount == 0 {
		return []Entry{}
	}

	out := make([]Entry, 0, l.entryCount)
	start := (l.writeIndex - l.entryCount + len(l.entries)) % len(l.entries)
	for i := 0; i < l.entryCount; i++ {
		index := (start + i) % len(l.entries)
		out = append(out, l.entries[index])
	}
	return out
}

func entryContains(entry Entry, searchLower string) bool {
	if strings.Contains(strings.ToLower(entry.Message), searchLower) {
		return true
	}
	if strings.Contains(strings.ToLower(entry.Channel), searchLower) {
		return true
	}
	if strings.Contains(strings.ToLower(entry.RequestID), searchLower) {
		return true
	}
	if strings.Contains(strings.ToLower(entry.TraceID), searchLower) {
		return true
	}
	for key, value := range entry.Fields {
		if strings.Contains(strings.ToLower(key), searchLower) {
			return true
		}
		if strings.Contains(strings.ToLower(toString(value)), searchLower) {
			return true
		}
	}
	return false
}

func toString(value any) string {
	raw, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(raw)
}

func fieldString(fields map[string]any, key string) string {
	if len(fields) == 0 {
		return ""
	}
	value, ok := fields[key]
	if !ok || value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return typed
	default:
		return fmt.Sprint(typed)
	}
}

func fieldInt(fields map[string]any, key string) int64 {
	if len(fields) == 0 {
		return 0
	}
	value, ok := fields[key]
	if !ok || value == nil {
		return 0
	}
	switch typed := value.(type) {
	case int:
		return int64(typed)
	case int8:
		return int64(typed)
	case int16:
		return int64(typed)
	case int32:
		return int64(typed)
	case int64:
		return typed
	case uint:
		return int64(typed)
	case uint8:
		return int64(typed)
	case uint16:
		return int64(typed)
	case uint32:
		return int64(typed)
	case uint64:
		return int64(typed)
	case float32:
		return int64(typed)
	case float64:
		return int64(typed)
	default:
		return 0
	}
}

func isIncident(entry Entry) bool {
	if entry.Level == LevelError {
		return true
	}
	if entry.Channel == "security" && (entry.Level == LevelWarn || entry.Level == LevelError) {
		return true
	}
	if entry.Channel == "db" && (entry.Level == LevelWarn || entry.Level == LevelError) {
		return true
	}
	return false
}
