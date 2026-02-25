package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"triage-flow-forge/backend/internal/app"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg := app.LoadConfig()
	application, err := app.New(cfg)
	if err != nil {
		log.Fatalf("app init failed: %v", err)
	}

	if err := application.Run(ctx); err != nil {
		log.Fatalf("app run failed: %v", err)
	}
}
