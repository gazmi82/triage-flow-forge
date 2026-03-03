package http

import (
	"net/http"
	"strings"

	"triage-flow-forge/backend/internal/modules/contracts"
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
		if s.deps.Logger != nil {
			s.deps.Logger.Error(r.Context(), "workflow", "failed to fetch tasks", map[string]any{
				"error": err.Error(),
			})
		}
		writeError(w, http.StatusInternalServerError, "unable to fetch tasks")
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (s *server) handleTaskActions(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	switch {
	case r.Method == http.MethodGet && strings.HasSuffix(path, "/patient-record"):
		taskID := strings.Trim(strings.TrimSuffix(path, "/patient-record"), "/")
		if taskID == "" {
			writeError(w, http.StatusBadRequest, "taskId is required")
			return
		}

		record, err := s.deps.Tasks.FetchPatientMedicalRecord(r.Context(), taskID)
		if err != nil {
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(r.Context(), "workflow", "failed to fetch patient medical record", map[string]any{
					"taskId": taskID,
					"error":  err.Error(),
				})
			}
			if strings.Contains(strings.ToLower(err.Error()), "not found") {
				writeError(w, http.StatusNotFound, err.Error())
				return
			}
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, record)
		return

	case r.Method == http.MethodGet && strings.HasSuffix(path, "/designer"):
		taskID := strings.Trim(strings.TrimSuffix(path, "/designer"), "/")
		if taskID == "" {
			writeError(w, http.StatusBadRequest, "taskId is required")
			return
		}

		graph, err := s.deps.Tasks.FetchTaskDesignerGraph(r.Context(), taskID)
		if err != nil {
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(r.Context(), "workflow", "failed to fetch task designer graph", map[string]any{
					"taskId": taskID,
					"error":  err.Error(),
				})
			}
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, graph)
		return

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
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(r.Context(), "workflow", "task claim failed", map[string]any{
					"taskId":       taskID,
					"assigneeName": req.AssigneeName,
					"error":        err.Error(),
				})
			}
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if s.deps.Logger != nil {
			s.deps.Logger.Info(r.Context(), "audit", "task claimed", map[string]any{
				"taskId":       taskID,
				"assigneeName": req.AssigneeName,
			})
		}
		writeJSON(w, http.StatusOK, payload)
		return

	case r.Method == http.MethodPost && strings.HasSuffix(path, "/complete"):
		taskID := strings.Trim(strings.TrimSuffix(path, "/complete"), "/")
		if taskID == "" {
			writeError(w, http.StatusBadRequest, "taskId is required")
			return
		}

		var req contracts.CompleteTaskRequest
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		payload, err := s.deps.Tasks.CompleteTask(r.Context(), taskID, req)
		if err != nil {
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(r.Context(), "workflow", "task completion failed", map[string]any{
					"taskId": taskID,
					"actor":  req.Actor,
					"error":  err.Error(),
				})
			}
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if s.deps.Logger != nil {
			s.deps.Logger.Info(r.Context(), "audit", "task completed", map[string]any{
				"taskId": taskID,
				"actor":  req.Actor,
			})
		}
		writeJSON(w, http.StatusOK, payload)
		return

	case r.Method == http.MethodDelete:
		taskID := strings.Trim(path, "/")
		if taskID == "" || strings.Contains(taskID, "/") {
			writeError(w, http.StatusNotFound, "route not found")
			return
		}

		payload, err := s.deps.Tasks.DeleteTask(r.Context(), taskID)
		if err != nil {
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(r.Context(), "workflow", "task deletion blocked", map[string]any{
					"taskId": taskID,
					"error":  err.Error(),
				})
			}
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if s.deps.Logger != nil {
			s.deps.Logger.Info(r.Context(), "audit", "task deleted", map[string]any{
				"taskId": taskID,
			})
		}
		writeJSON(w, http.StatusOK, payload)
		return

	case r.Method == http.MethodPatch || r.Method == http.MethodPut || r.Method == http.MethodPost:
		taskID := strings.Trim(path, "/")
		if taskID == "" || strings.Contains(taskID, "/") {
			writeError(w, http.StatusNotFound, "route not found")
			return
		}

		var req contracts.SaveTaskEditsRequest
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		payload, err := s.deps.Tasks.SaveTaskEdits(r.Context(), taskID, req)
		if err != nil {
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(r.Context(), "workflow", "task save failed", map[string]any{
					"taskId": taskID,
					"actor":  req.Actor,
					"error":  err.Error(),
				})
			}
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if s.deps.Logger != nil {
			s.deps.Logger.Info(r.Context(), "audit", "task saved", map[string]any{
				"taskId": taskID,
				"actor":  req.Actor,
			})
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

	var req contracts.CreateTaskFromConsoleRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	payload, err := s.deps.Creation.CreateTaskFromConsole(r.Context(), req)
	if err != nil {
		if s.deps.Logger != nil {
			s.deps.Logger.Warn(r.Context(), "workflow", "task creation from console failed", map[string]any{
				"instanceId": req.InstanceID,
				"nodeType":   req.NodeType,
				"error":      err.Error(),
			})
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if s.deps.Logger != nil {
		s.deps.Logger.Info(r.Context(), "audit", "task created from console", map[string]any{
			"instanceId": payload.InstanceID,
			"nodeId":     payload.CreatedNodeID,
		})
	}
	writeJSON(w, http.StatusOK, payload)
}
