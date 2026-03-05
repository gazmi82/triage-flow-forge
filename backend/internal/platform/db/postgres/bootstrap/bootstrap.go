package bootstrap

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
	authrepo "github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres/auth"
)

func FetchWorkflowBootstrap(
	ctx context.Context,
	ensurePool func(context.Context) (*pgxpool.Pool, error),
) (contracts.WorkflowBootstrapPayload, error) {
	users, err := authrepo.FetchUsers(ctx, ensurePool)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	definitions, err := FetchDefinitions(ctx, ensurePool)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	instances, err := FetchInstances(ctx, ensurePool)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	tasks, err := FetchTasks(ctx, ensurePool)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	savedTasks, err := FetchSavedTasks(ctx, ensurePool)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	auditEvents, err := FetchAudit(ctx, ensurePool)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	graph, err := FetchDesignerGraph(ctx, ensurePool)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	drafts, err := FetchDrafts(ctx, ensurePool)
	if err != nil {
		return contracts.WorkflowBootstrapPayload{}, err
	}

	return contracts.WorkflowBootstrapPayload{
		Users:       users,
		Definitions: definitions,
		Instances:   instances,
		Tasks:       tasks,
		SavedTasks:  savedTasks,
		Audit:       auditEvents,
		Graph:       graph,
		Drafts:      drafts,
	}, nil
}
