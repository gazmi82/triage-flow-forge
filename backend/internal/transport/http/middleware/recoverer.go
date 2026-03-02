package middleware

import (
	"encoding/json"
	"net/http"
	"runtime/debug"
)

func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				if appLogger := getLogger(); appLogger != nil {
					appLogger.Error(r.Context(), "http", "panic recovered", map[string]any{
						"panic": stringValue(recovered),
						"path":  r.URL.Path,
						"stack": string(debug.Stack()),
					})
				}

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error":     "internal server error",
					"requestId": RequestIDFromContext(r.Context()),
					"traceId":   TraceIDFromContext(r.Context()),
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func stringValue(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case error:
		return typed.Error()
	default:
		return "panic"
	}
}
