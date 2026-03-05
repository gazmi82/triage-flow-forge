package http

import (
	"context"
	"net/http"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/admin"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/auth"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/profile"
	workflowbootstrap "github.com/gazmi82/triage-flow-forge/backend/internal/modules/workflow/bootstrap"
	workflowtaskcreation "github.com/gazmi82/triage-flow-forge/backend/internal/modules/workflow/taskcreation"
	workflowtasks "github.com/gazmi82/triage-flow-forge/backend/internal/modules/workflow/tasks"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/cache/redis"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/logging"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/metrics"
	"github.com/gazmi82/triage-flow-forge/backend/internal/transport/http/middleware"
)

type Dependencies struct {
	Readiness ReadinessStore
	Redis     *redis.Client
	Metrics   *metrics.Registry
	Logger    *logging.Logger
	Auth      auth.Repository
	Admin     admin.Repository
	Profile   profile.Repository
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
	mux.Handle("/api/workflow/bootstrap",
		middleware.Chain(http.HandlerFunc(srv.handleBootstrap), srv.requireSession),
	)
	mux.HandleFunc("/api/auth/login", srv.handleLogin)
	mux.HandleFunc("/api/auth/session", srv.handleSession)
	mux.HandleFunc("/api/auth/logout", srv.handleLogout)
	mux.Handle("/api/admin/users",
		middleware.Chain(http.HandlerFunc(srv.handleCreateUser), srv.requireSession, srv.requireRoles(contracts.Role("admin"))),
	)
	mux.Handle("/api/admin/logs",
		middleware.Chain(http.HandlerFunc(srv.handleAdminLogs), srv.requireSession, srv.requireRoles(contracts.Role("admin"))),
	)
	mux.Handle("/api/admin/logs/summary",
		middleware.Chain(http.HandlerFunc(srv.handleAdminLogSummary), srv.requireSession, srv.requireRoles(contracts.Role("admin"))),
	)
	mux.Handle("/api/profile",
		middleware.Chain(http.HandlerFunc(srv.handleProfile), srv.requireSession),
	)
	mux.Handle("/api/tasks",
		middleware.Chain(http.HandlerFunc(srv.handleTasks), srv.requireSession),
	)
	mux.Handle("/api/tasks/create-from-console",
		middleware.Chain(http.HandlerFunc(srv.handleCreateTaskFromConsole), srv.requireSession),
	)
	mux.Handle("/api/tasks/",
		middleware.Chain(http.HandlerFunc(srv.handleTaskActions), srv.requireSession),
	)

	return middleware.Chain(mux,
		middleware.RequestID,
		middleware.TraceID,
		middleware.CORS,
		middleware.Logger,
		middleware.Recoverer,
	)
}
