package postgres

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

func (c *Client) QueryRowTx(ctx context.Context, tx pgx.Tx, operation, query string, args ...any) pgx.Row {
	return c.queryRowTx(ctx, tx, operation, query, args...)
}

func (c *Client) ExecTx(ctx context.Context, tx pgx.Tx, operation, query string, args ...any) error {
	return c.execTx(ctx, tx, operation, query, args...)
}

func (c *Client) BuildTaskSnapshot(ctx context.Context, tx pgx.Tx, taskID string) (json.RawMessage, error) {
	return c.buildTaskSnapshot(ctx, tx, taskID)
}

func (c *Client) UpsertSavedTaskSnapshot(ctx context.Context, tx pgx.Tx, taskID, instanceID, processStatus string, taskSnapshot json.RawMessage) error {
	return c.upsertSavedTaskSnapshot(ctx, tx, taskID, instanceID, processStatus, taskSnapshot)
}
