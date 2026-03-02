package http

import (
	"context"
	"errors"
	"net/http"

	"triage-flow-forge/backend/internal/modules/contracts"
	"triage-flow-forge/backend/internal/transport/http/middleware"
)

type authUserCtxKey string

const requestAuthUserKey authUserCtxKey = "auth_user"

func (s *server) requireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		record, err := s.readSession(r)
		if err != nil {
			if errors.Is(err, errMissingSession) {
				if s.deps.Logger != nil {
					s.deps.Logger.Warn(r.Context(), "security", "unauthorized request: missing session", map[string]any{
						"method": r.Method,
						"path":   r.URL.Path,
					})
				}
				writeError(w, http.StatusUnauthorized, "Not authenticated.")
				return
			}
			if s.deps.Logger != nil {
				s.deps.Logger.Error(r.Context(), "security", "session store unavailable", map[string]any{
					"method": r.Method,
					"path":   r.URL.Path,
					"error":  err.Error(),
				})
			}
			writeError(w, http.StatusServiceUnavailable, "Session store unavailable.")
			return
		}

		ctx := context.WithValue(r.Context(), requestAuthUserKey, record.User)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *server) requireRoles(roles ...contracts.Role) middleware.Middleware {
	allowed := make(map[contracts.Role]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := authUserFromContext(r.Context())
			if !ok {
				if s.deps.Logger != nil {
					s.deps.Logger.Warn(r.Context(), "security", "unauthorized request: auth context missing", map[string]any{
						"method": r.Method,
						"path":   r.URL.Path,
					})
				}
				writeError(w, http.StatusUnauthorized, "Not authenticated.")
				return
			}
			if _, ok := allowed[user.Role]; !ok {
				if s.deps.Logger != nil {
					s.deps.Logger.Warn(r.Context(), "security", "forbidden request due to role policy", map[string]any{
						"method":   r.Method,
						"path":     r.URL.Path,
						"userRole": user.Role,
					})
				}
				writeError(w, http.StatusForbidden, "Forbidden.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func authUserFromContext(ctx context.Context) (contracts.AuthPayload, bool) {
	if ctx == nil {
		return contracts.AuthPayload{}, false
	}
	user, ok := ctx.Value(requestAuthUserKey).(contracts.AuthPayload)
	return user, ok
}
