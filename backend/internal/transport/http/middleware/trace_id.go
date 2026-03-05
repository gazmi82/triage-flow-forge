package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/requestctx"
)

func TraceID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := strings.TrimSpace(r.Header.Get("X-Trace-ID"))
		if traceID == "" {
			traceID = fmt.Sprintf("trace-%d", time.Now().UTC().UnixNano())
		}
		w.Header().Set("X-Trace-ID", traceID)
		ctx := requestctx.WithTraceID(r.Context(), traceID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func TraceIDFromContext(ctx context.Context) string {
	return requestctx.TraceID(ctx)
}
