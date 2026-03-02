package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"triage-flow-forge/backend/internal/platform/logging"
)

const (
	defaultLogLimit       = 200
	maxLogLimit           = 2000
	defaultLogSinceMinute = 180
)

func (s *server) handleAdminLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.deps.Logger == nil {
		writeJSON(w, http.StatusOK, map[string]any{"entries": []logging.Entry{}})
		return
	}

	filter, err := parseLogFilter(r, true)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"entries": s.deps.Logger.List(filter),
	})
}

func (s *server) handleAdminLogSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.deps.Logger == nil {
		writeJSON(w, http.StatusOK, logging.Summary{
			ByLevel:   map[string]int{},
			ByChannel: map[string]int{},
			Timeline:  []logging.SummaryPoint{},
		})
		return
	}

	filter, err := parseLogFilter(r, false)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, s.deps.Logger.Summary(filter))
}

func parseLogFilter(r *http.Request, includeLimit bool) (logging.Filter, error) {
	query := r.URL.Query()
	filter := logging.Filter{}

	level := strings.ToLower(strings.TrimSpace(query.Get("level")))
	switch level {
	case "", "all":
	case "debug", "info", "warn", "error":
		filter.Level = logging.ParseLevel(level)
	default:
		return logging.Filter{}, errors.New("invalid level")
	}

	channel := strings.TrimSpace(query.Get("channel"))
	if !strings.EqualFold(channel, "all") {
		filter.Channel = channel
	}

	filter.Search = strings.TrimSpace(query.Get("search"))

	if rawSince := strings.TrimSpace(query.Get("sinceMinutes")); rawSince != "" {
		sinceMinutes, err := strconv.Atoi(rawSince)
		if err != nil || sinceMinutes <= 0 {
			return logging.Filter{}, errors.New("invalid sinceMinutes")
		}
		filter.Since = time.Now().Add(-time.Duration(sinceMinutes) * time.Minute)
	} else {
		filter.Since = time.Now().Add(-defaultLogSinceMinute * time.Minute)
	}

	if includeLimit {
		if rawLimit := strings.TrimSpace(query.Get("limit")); rawLimit != "" {
			limit, err := strconv.Atoi(rawLimit)
			if err != nil || limit <= 0 {
				return logging.Filter{}, errors.New("invalid limit")
			}
			if limit > maxLogLimit {
				limit = maxLogLimit
			}
			filter.Limit = limit
		} else {
			filter.Limit = defaultLogLimit
		}
	}

	return filter, nil
}
