package app

import (
	"context"
	"log"
	"net/http"
	"time"

	adminmodule "triage-flow-forge/backend/internal/modules/admin/repository/postgres"
	authmodule "triage-flow-forge/backend/internal/modules/auth/repository/postgres"
	bootstrapmodule "triage-flow-forge/backend/internal/modules/workflow/bootstrap/repository/postgres"
	taskcreationmodule "triage-flow-forge/backend/internal/modules/workflow/taskcreation/repository/postgres"
	tasksmodule "triage-flow-forge/backend/internal/modules/workflow/tasks/repository/postgres"
	"triage-flow-forge/backend/internal/platform/cache/redis"
	"triage-flow-forge/backend/internal/platform/db/postgres"
	"triage-flow-forge/backend/internal/platform/metrics"
	httptransport "triage-flow-forge/backend/internal/transport/http"
)

type App struct {
	cfg        Config
	httpServer *http.Server
	postgres   *postgres.Client
	redis      *redis.Client
	metrics    *metrics.Registry
}

func New(cfg Config) (*App, error) {
	pg := postgres.NewClient(cfg.PostgresDSN)
	metricRegistry := metrics.New()
	pg.SetMetrics(metricRegistry)
	rdb := redis.NewClient(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	authRepo := authmodule.New(pg)
	adminRepo := adminmodule.New(pg)
	bootstrapRepo := bootstrapmodule.New(pg)
	tasksRepo := tasksmodule.New(pg)
	taskCreationRepo := taskcreationmodule.New(pg)

	router := httptransport.NewRouter(httptransport.Dependencies{
		Readiness: pg,
		Redis:     rdb,
		Metrics:   metricRegistry,
		Auth:      authRepo,
		Admin:     adminRepo,
		Bootstrap: bootstrapRepo,
		Tasks:     tasksRepo,
		Creation:  taskCreationRepo,
	})

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
	}, nil
}

func (a *App) Run(ctx context.Context) error {
	defer a.postgres.Close()
	defer func() { _ = a.redis.Close() }()

	if err := a.postgres.Ping(ctx); err != nil {
		return err
	}
	if err := a.redis.Ping(ctx); err != nil {
		log.Printf("redis unavailable at startup, continuing in degraded mode: %v", err)
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
