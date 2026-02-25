package http

import (
	"net/http"
	"strings"

	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type claimTaskRequest struct {
	AssigneeName string `json:"assigneeName"`
}

func (s *server) handleTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	tasks, err := s.deps.Tasks.FetchTasks(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "unable to fetch tasks")
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (s *server) handleTaskActions(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	switch {
	case r.Method == http.MethodPost && strings.HasSuffix(path, "/claim"):
		taskID := strings.Trim(strings.TrimSuffix(path, "/claim"), "/")
		if taskID == "" {
			writeError(w, http.StatusBadRequest, "taskId is required")
			return
		}

		var req claimTaskRequest
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		payload, err := s.deps.Tasks.ClaimTask(r.Context(), taskID, req.AssigneeName)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, payload)
		return

	case r.Method == http.MethodPost && strings.HasSuffix(path, "/complete"):
		taskID := strings.Trim(strings.TrimSuffix(path, "/complete"), "/")
		if taskID == "" {
			writeError(w, http.StatusBadRequest, "taskId is required")
			return
		}

		var req postgres.CompleteTaskRequest
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		payload, err := s.deps.Tasks.CompleteTask(r.Context(), taskID, req)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, payload)
		return

	case r.Method == http.MethodPatch || r.Method == http.MethodPut || r.Method == http.MethodPost:
		taskID := strings.Trim(path, "/")
		if taskID == "" || strings.Contains(taskID, "/") {
			writeError(w, http.StatusNotFound, "route not found")
			return
		}

		var req postgres.SaveTaskEditsRequest
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		payload, err := s.deps.Tasks.SaveTaskEdits(r.Context(), taskID, req)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, payload)
		return

	default:
		writeError(w, http.StatusNotFound, "route not found")
		return
	}
}

func (s *server) handleCreateTaskFromConsole(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req postgres.CreateTaskFromConsoleRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	payload, err := s.deps.Creation.CreateTaskFromConsole(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, payload)
}
