package postgres

import (
	"context"
)

func (c *Client) FetchTasks(ctx context.Context) ([]Task, error) {
	return c.fetchTasks(ctx)
}
