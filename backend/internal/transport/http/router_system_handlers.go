package http

import "net/http"

func (s *server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *server) handleReady(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if err := s.deps.Readiness.Ping(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "postgres unavailable")
		return
	}
	if err := s.deps.Redis.Ping(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "redis unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	if s.deps.Metrics == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"query": map[string]any{},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"query": s.deps.Metrics.QuerySnapshot(),
	})
}

func (s *server) handleBootstrap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	payload, err := s.deps.Bootstrap.FetchWorkflowBootstrap(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "unable to fetch workflow bootstrap")
		return
	}
	writeJSON(w, http.StatusOK, payload)
}
