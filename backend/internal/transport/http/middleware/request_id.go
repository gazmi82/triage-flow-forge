package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/requestctx"
)

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rid := strings.TrimSpace(r.Header.Get("X-Request-ID"))
		if rid == "" {
			rid = fmt.Sprintf("%d", time.Now().UTC().UnixNano())
		}
		w.Header().Set("X-Request-ID", rid)
		ctx := requestctx.WithRequestID(r.Context(), rid)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequestIDFromContext(ctx context.Context) string {
	return requestctx.RequestID(ctx)
}
