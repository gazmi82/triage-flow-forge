package middleware

import (
	"context"
	"net/http"
	"sync"
	"time"

	"triage-flow-forge/backend/internal/platform/logging"
)

type responseRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

var (
	loggerMu sync.RWMutex
	logger   *logging.Logger
)

func SetLogger(l *logging.Logger) {
	loggerMu.Lock()
	defer loggerMu.Unlock()
	logger = l
}

func getLogger() *logging.Logger {
	loggerMu.RLock()
	defer loggerMu.RUnlock()
	return logger
}

func (r *responseRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *responseRecorder) Write(p []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(p)
	r.bytes += n
	return n, err
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rec := &responseRecorder{ResponseWriter: w}
		next.ServeHTTP(rec, r)
		if rec.status == 0 {
			rec.status = http.StatusOK
		}
		logRequest(getLogger(), r.Context(), r, rec, started)
	})
}

func logRequest(appLogger *logging.Logger, ctx context.Context, r *http.Request, rec *responseRecorder, started time.Time) {
	if appLogger == nil {
		return
	}

	level := logging.LevelInfo
	if rec.status >= http.StatusInternalServerError {
		level = logging.LevelError
	} else if rec.status == http.StatusUnauthorized || rec.status == http.StatusForbidden {
		level = logging.LevelInfo
	} else if rec.status >= http.StatusBadRequest {
		level = logging.LevelWarn
	}

	appLogger.Log(ctx, level, "http", "request completed", map[string]any{
		"method":      r.Method,
		"path":        r.URL.Path,
		"status":      rec.status,
		"bytes":       rec.bytes,
		"durationMs":  time.Since(started).Milliseconds(),
		"remoteAddr":  r.RemoteAddr,
		"userAgent":   r.UserAgent(),
		"requestPath": r.URL.RequestURI(),
	})
}
