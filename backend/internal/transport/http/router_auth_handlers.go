package http

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"triage-flow-forge/backend/internal/platform/cache/redis"
	"triage-flow-forge/backend/internal/platform/db/postgres"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authSessionRecord struct {
	User      postgres.AuthPayload `json:"user"`
	CreatedAt string               `json:"createdAt"`
}

const (
	sessionCookieName = "triage_session"
	sessionKeyPrefix  = "session:"
	sessionTTL        = 24 * time.Hour
)

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

	sessionID, err := newSessionID()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to create session.")
		return
	}

	record := authSessionRecord{
		User:      payload,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	raw, err := json.Marshal(record)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to create session.")
		return
	}
	if err := s.deps.Redis.SetString(r.Context(), sessionKey(sessionID), string(raw), sessionTTL); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Session store unavailable.")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionTTL.Seconds()),
	})

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

func (s *server) handleSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	record, err := s.readSession(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated.")
		return
	}

	writeJSON(w, http.StatusOK, record.User)
}

func (s *server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	if cookie, err := r.Cookie(sessionCookieName); err == nil && cookie.Value != "" {
		_ = s.deps.Redis.Delete(r.Context(), sessionKey(cookie.Value))
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "signed_out"})
}

func (s *server) readSession(r *http.Request) (authSessionRecord, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return authSessionRecord{}, errors.New("missing session")
	}

	raw, err := s.deps.Redis.GetString(r.Context(), sessionKey(cookie.Value))
	if err != nil {
		if errors.Is(err, redis.ErrKeyNotFound) {
			return authSessionRecord{}, errors.New("missing session")
		}
		return authSessionRecord{}, err
	}

	var record authSessionRecord
	if err := json.Unmarshal([]byte(raw), &record); err != nil {
		return authSessionRecord{}, err
	}
	return record, nil
}

func newSessionID() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func sessionKey(sessionID string) string {
	return sessionKeyPrefix + sessionID
}
