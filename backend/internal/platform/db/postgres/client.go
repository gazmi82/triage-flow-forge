package postgres

import (
	"context"
	"errors"
	"hash/fnv"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"triage-flow-forge/backend/internal/platform/logging"
	"triage-flow-forge/backend/internal/platform/metrics"
)

type Client struct {
	dsn     string
	mu      sync.Mutex
	pool    *pgxpool.Pool
	metrics *metrics.Registry
	logger  *logging.Logger
}

func NewClient(dsn string) *Client {
	return &Client{dsn: dsn}
}

func (c *Client) SetMetrics(reg *metrics.Registry) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.metrics = reg
}

func (c *Client) SetLogger(logger *logging.Logger) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.logger = logger
}

func (c *Client) Ping(ctx context.Context) error {
	pool, err := c.ensurePool(ctx)
	if err != nil {
		return err
	}
	return pool.Ping(ctx)
}

func (c *Client) Pool(ctx context.Context) (*pgxpool.Pool, error) {
	return c.ensurePool(ctx)
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

func (c *Client) recordQueryMetric(ctx context.Context, operation, query string, startedAt time.Time, err error) {
	if c == nil {
		return
	}

	elapsed := time.Since(startedAt)
	lockAware := strings.Contains(strings.ToUpper(query), "FOR UPDATE")
	noRows := errors.Is(err, pgx.ErrNoRows)

	metricsErr := err
	if noRows {
		metricsErr = nil
	}

	if c.metrics != nil {
		c.metrics.ObserveQuery(operation, elapsed, lockAware, metricsErr)
	}

	if c.logger == nil {
		return
	}

	if noRows {
		c.logger.Debug(ctx, "db", "query returned no rows", map[string]any{
			"operation":  operation,
			"durationMs": elapsed.Milliseconds(),
			"lockAware":  lockAware,
			"queryHash":  hashQuery(query),
		})
		return
	}

	threshold := c.logger.SlowQueryThreshold()
	if err == nil && elapsed < threshold {
		return
	}

	level := logging.LevelWarn
	message := "slow query detected"
	fields := map[string]any{
		"operation":       operation,
		"durationMs":      elapsed.Milliseconds(),
		"lockAware":       lockAware,
		"queryHash":       hashQuery(query),
		"slowThresholdMs": threshold.Milliseconds(),
	}
	if lockAware && elapsed >= threshold {
		fields["lockWaitLikely"] = true
	}
	if err != nil {
		level = logging.LevelError
		message = "query failed"
		fields["error"] = err.Error()
	}

	c.logger.Log(ctx, level, "db", message, fields)
}

func hashQuery(query string) string {
	normalized := strings.Join(strings.Fields(strings.ToLower(query)), " ")
	hasher := fnv.New64a()
	_, _ = hasher.Write([]byte(normalized))
	return strconv.FormatUint(hasher.Sum64(), 16)
}
