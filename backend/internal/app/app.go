package app

import (
	"context"
	"net/http"
	"time"

	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/admin"
	adminrepo "github.com/gazmi82/triage-flow-forge/backend/internal/modules/admin/repository/postgres"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/auth"
	authrepo "github.com/gazmi82/triage-flow-forge/backend/internal/modules/auth/repository/postgres"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/profile"
	profilerepo "github.com/gazmi82/triage-flow-forge/backend/internal/modules/profile/repository/postgres"
	workflowbootstrap "github.com/gazmi82/triage-flow-forge/backend/internal/modules/workflow/bootstrap"
	bootstraprepo "github.com/gazmi82/triage-flow-forge/backend/internal/modules/workflow/bootstrap/repository/postgres"
	workflowtaskcreation "github.com/gazmi82/triage-flow-forge/backend/internal/modules/workflow/taskcreation"
	taskcreationrepo "github.com/gazmi82/triage-flow-forge/backend/internal/modules/workflow/taskcreation/repository/postgres"
	workflowtasks "github.com/gazmi82/triage-flow-forge/backend/internal/modules/workflow/tasks"
	tasksrepo "github.com/gazmi82/triage-flow-forge/backend/internal/modules/workflow/tasks/repository/postgres"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/cache/redis"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/logging"
	"github.com/gazmi82/triage-flow-forge/backend/internal/platform/metrics"
	httptransport "github.com/gazmi82/triage-flow-forge/backend/internal/transport/http"
	"github.com/gazmi82/triage-flow-forge/backend/internal/transport/http/middleware"
)

type App struct {
	cfg        Config
	httpServer *http.Server
	postgres   *postgres.Client
	redis      *redis.Client
	metrics    *metrics.Registry
	logger     *logging.Logger
}

// New builds the application runtime with configured infrastructure clients,
// module services, and HTTP transport wiring.
func New(cfg Config) (*App, error) {
	appLogger := logging.NewFromEnv()
	pg := postgres.NewClient(cfg.PostgresDSN)
	metricRegistry := metrics.New()
	pg.SetMetrics(metricRegistry)
	pg.SetLogger(appLogger)
	rdb := redis.NewClient(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	authService := auth.NewService(authrepo.New(pg))
	adminService := admin.NewService(adminrepo.New(pg))
	profileService := profile.NewService(profilerepo.New(pg))
	bootstrapService := workflowbootstrap.NewService(bootstraprepo.New(pg))
	tasksService := workflowtasks.NewService(tasksrepo.New(pg))
	taskCreationService := workflowtaskcreation.NewService(taskcreationrepo.New(pg))

	router := httptransport.NewRouter(httptransport.Dependencies{
		Readiness: pg,
		Redis:     rdb,
		Metrics:   metricRegistry,
		Logger:    appLogger,
		Auth:      authService,
		Admin:     adminService,
		Profile:   profileService,
		Bootstrap: bootstrapService,
		Tasks:     tasksService,
		Creation:  taskCreationService,
	})
	middleware.SetLogger(appLogger)

	return &App{
		cfg: cfg,
		httpServer: &http.Server{
			Addr:              cfg.HTTPAddr,
			Handler:           router,
			ReadHeaderTimeout: 5 * time.Second,
		},
		postgres: pg,
		redis:    rdb,
		metrics:  metricRegistry,
		logger:   appLogger,
	}, nil
}

// Run starts the HTTP server and keeps it alive until the provided context is
// canceled or the server exits with an error.
func (a *App) Run(ctx context.Context) error {
	defer a.postgres.Close()
	defer func() { _ = a.redis.Close() }()

	if err := a.postgres.Ping(ctx); err != nil {
		return err
	}
	if a.logger != nil {
		a.logger.Info(ctx, "system", "postgres readiness check passed", nil)
	}
	if err := a.redis.Ping(ctx); err != nil {
		if a.logger != nil {
			a.logger.Warn(ctx, "system", "redis unavailable at startup; continuing in degraded mode", map[string]any{
				"error": err.Error(),
			})
		}
	} else if a.logger != nil {
		a.logger.Info(ctx, "system", "redis readiness check passed", nil)
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- a.httpServer.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = a.httpServer.Shutdown(shutdownCtx)
		return nil
	case err := <-errCh:
		if err == http.ErrServerClosed {
			return nil
		}
		return err
	}
}
