package http

import (
	"context"
	"net/http"

	"triage-flow-forge/backend/internal/modules/admin"
	"triage-flow-forge/backend/internal/modules/auth"
	workflowbootstrap "triage-flow-forge/backend/internal/modules/workflow/bootstrap"
	workflowtaskcreation "triage-flow-forge/backend/internal/modules/workflow/taskcreation"
	workflowtasks "triage-flow-forge/backend/internal/modules/workflow/tasks"
	"triage-flow-forge/backend/internal/platform/cache/redis"
	"triage-flow-forge/backend/internal/platform/metrics"
	"triage-flow-forge/backend/internal/transport/http/middleware"
)

type Dependencies struct {
	Readiness ReadinessStore
	Redis     *redis.Client
	Metrics   *metrics.Registry
	Auth      auth.Repository
	Admin     admin.Repository
	Bootstrap workflowbootstrap.Repository
	Tasks     workflowtasks.Repository
	Creation  workflowtaskcreation.Repository
}

type server struct {
	deps Dependencies
}

type ReadinessStore interface {
	Ping(ctx context.Context) error
}

func NewRouter(deps Dependencies) http.Handler {
	srv := &server{deps: deps}
	mux := http.NewServeMux()

	mux.HandleFunc("/health", srv.handleHealth)
	mux.HandleFunc("/v1/ready", srv.handleReady)
	mux.HandleFunc("/v1/metrics", srv.handleMetrics)
	mux.HandleFunc("/api/workflow/bootstrap", srv.handleBootstrap)
	mux.HandleFunc("/api/auth/login", srv.handleLogin)
	mux.HandleFunc("/api/auth/session", srv.handleSession)
	mux.HandleFunc("/api/auth/logout", srv.handleLogout)
	mux.HandleFunc("/api/admin/users", srv.handleCreateUser)
	mux.HandleFunc("/api/tasks", srv.handleTasks)
	mux.HandleFunc("/api/tasks/create-from-console", srv.handleCreateTaskFromConsole)
	mux.HandleFunc("/api/tasks/", srv.handleTaskActions)

	return middleware.Chain(mux,
		middleware.CORS,
		middleware.RequestID,
		middleware.Recoverer,
		middleware.Logger,
	)
}
