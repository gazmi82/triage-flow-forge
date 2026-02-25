package redis

import (
	"context"
	"strconv"
	"sync"

	goredis "github.com/redis/go-redis/v9"
)

type Client struct {
	addr     string
	password string
	db       string

	mu     sync.Mutex
	client *goredis.Client
}

func NewClient(addr, password, db string) *Client {
	return &Client{addr: addr, password: password, db: db}
}

func (c *Client) Ping(ctx context.Context) error {
	cli := c.ensureClient()
	return cli.Ping(ctx).Err()
}

func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.client != nil {
		err := c.client.Close()
		c.client = nil
		return err
	}
	return nil
}

func (c *Client) ensureClient() *goredis.Client {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.client != nil {
		return c.client
	}

	db := 0
	if parsed, err := strconv.Atoi(c.db); err == nil {
		db = parsed
	}

	c.client = goredis.NewClient(&goredis.Options{
		Addr:     c.addr,
		Password: c.password,
		DB:       db,
	})
	return c.client
}
