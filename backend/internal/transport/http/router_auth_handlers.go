package http

import (
	"errors"
	"net/http"

	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	payload, err := s.deps.Auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, postgres.ErrInvalidCredentials):
			writeError(w, http.StatusUnauthorized, "Invalid email or password.")
		case errors.Is(err, postgres.ErrUserInactive):
			writeError(w, http.StatusForbidden, "User not found or inactive.")
		default:
			writeError(w, http.StatusInternalServerError, "Unable to sign in.")
		}
		return
	}

	writeJSON(w, http.StatusOK, payload)
}

func (s *server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req postgres.AdminCreateUserRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	payload, err := s.deps.Admin.CreateUser(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, payload)
}
