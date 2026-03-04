package http

import (
	"errors"
	"net/http"
	"strings"
)

func (s *server) handleProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	user, ok := authUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Not authenticated.")
		return
	}

	payload, err := s.deps.Profile.FetchProfile(r.Context(), user)
	if err != nil {
		if s.deps.Logger != nil {
			s.deps.Logger.Warn(r.Context(), "profile", "profile fetch failed", map[string]any{
				"userId": user.ID,
				"error":  err.Error(),
			})
		}
		status := http.StatusInternalServerError
		if errors.Is(err, errMissingSession) {
			status = http.StatusUnauthorized
		} else if strings.Contains(strings.ToLower(err.Error()), "not found") {
			status = http.StatusNotFound
		} else if strings.Contains(strings.ToLower(err.Error()), "required") {
			status = http.StatusBadRequest
		}
		writeError(w, status, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, payload)
}
