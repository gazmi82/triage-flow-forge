package http

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/cache/redis"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authSessionRecord struct {
	User      contracts.AuthPayload `json:"user"`
	CreatedAt string                `json:"createdAt"`
}

var errMissingSession = errors.New("missing session")

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
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(r.Context(), "security", "login failed: invalid credentials", map[string]any{
					"email": req.Email,
				})
			}
			writeError(w, http.StatusUnauthorized, "Invalid email or password.")
		case errors.Is(err, postgres.ErrUserInactive):
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(r.Context(), "security", "login failed: inactive user", map[string]any{
					"email": req.Email,
				})
			}
			writeError(w, http.StatusForbidden, "User not found or inactive.")
		default:
			if s.deps.Logger != nil {
				s.deps.Logger.Error(r.Context(), "security", "login failed: unexpected auth error", map[string]any{
					"email": req.Email,
					"error": err.Error(),
				})
			}
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
		if s.deps.Logger != nil {
			s.deps.Logger.Error(r.Context(), "security", "login failed: session store unavailable", map[string]any{
				"userId": payload.ID,
				"error":  err.Error(),
			})
		}
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

	if s.deps.Logger != nil {
		s.deps.Logger.Info(r.Context(), "security", "login succeeded", map[string]any{
			"userId": payload.ID,
			"role":   payload.Role,
		})
	}

	writeJSON(w, http.StatusOK, payload)
}

func (s *server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req contracts.AdminCreateUserRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	payload, err := s.deps.Admin.CreateUser(r.Context(), req)
	if err != nil {
		if s.deps.Logger != nil {
			s.deps.Logger.Warn(r.Context(), "audit", "admin create user failed", map[string]any{
				"email": req.Email,
				"role":  req.Role,
				"error": err.Error(),
			})
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if s.deps.Logger != nil {
		s.deps.Logger.Info(r.Context(), "audit", "admin created user", map[string]any{
			"userId": payload.CreatedUser.ID,
			"role":   payload.CreatedUser.Role,
		})
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
		if errors.Is(err, errMissingSession) {
			writeError(w, http.StatusUnauthorized, "Not authenticated.")
		} else {
			writeError(w, http.StatusServiceUnavailable, "Session store unavailable.")
		}
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

	if s.deps.Logger != nil {
		s.deps.Logger.Info(r.Context(), "security", "logout succeeded", map[string]any{
			"method": r.Method,
			"path":   r.URL.Path,
		})
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "signed_out"})
}

func (s *server) readSession(r *http.Request) (authSessionRecord, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return authSessionRecord{}, errMissingSession
	}

	raw, err := s.deps.Redis.GetString(r.Context(), sessionKey(cookie.Value))
	if err != nil {
		if errors.Is(err, redis.ErrKeyNotFound) {
			return authSessionRecord{}, errMissingSession
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
