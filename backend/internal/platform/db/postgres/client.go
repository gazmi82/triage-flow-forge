package postgres

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"triage-flow-forge/backend/internal/platform/metrics"
)

type Client struct {
	dsn     string
	mu      sync.Mutex
	pool    *pgxpool.Pool
	metrics *metrics.Registry
}

func NewClient(dsn string) *Client {
	return &Client{dsn: dsn}
}

func (c *Client) SetMetrics(reg *metrics.Registry) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.metrics = reg
}

func (c *Client) Ping(ctx context.Context) error {
	pool, err := c.ensurePool(ctx)
	if err != nil {
		return err
	}
	return pool.Ping(ctx)
}

func (c *Client) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.pool != nil {
		c.pool.Close()
		c.pool = nil
	}
}

func (c *Client) ensurePool(ctx context.Context) (*pgxpool.Pool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.pool != nil {
		return c.pool, nil
	}

	pool, err := pgxpool.New(ctx, c.dsn)
	if err != nil {
		return nil, err
	}

	c.pool = pool
	return c.pool, nil
}

func (c *Client) recordQueryMetric(operation, query string, startedAt time.Time, err error) {
	if c == nil || c.metrics == nil {
		return
	}
	lockAware := strings.Contains(strings.ToUpper(query), "FOR UPDATE")
	c.metrics.ObserveQuery(operation, time.Since(startedAt), lockAware, err)
}
