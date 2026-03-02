package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

type timedRow struct {
	row    pgx.Row
	record func(error)
}

func (r *timedRow) Scan(dest ...any) error {
	err := r.row.Scan(dest...)
	r.record(err)
	return err
}

func (c *Client) queryRowTx(ctx context.Context, tx pgx.Tx, operation, query string, args ...any) pgx.Row {
	startedAt := time.Now()
	row := tx.QueryRow(ctx, query, args...)
	return &timedRow{
		row: row,
		record: func(err error) {
			c.recordQueryMetric(ctx, operation, query, startedAt, err)
		},
	}
}

func (c *Client) execTx(ctx context.Context, tx pgx.Tx, operation, query string, args ...any) error {
	startedAt := time.Now()
	_, err := tx.Exec(ctx, query, args...)
	c.recordQueryMetric(ctx, operation, query, startedAt, err)
	return err
}
