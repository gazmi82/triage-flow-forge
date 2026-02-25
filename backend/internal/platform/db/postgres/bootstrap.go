package postgres

import (
	"context"
)

func (c *Client) FetchWorkflowBootstrap(ctx context.Context) (WorkflowBootstrapPayload, error) {
	users, err := c.FetchUsers(ctx)
	if err != nil {
		return WorkflowBootstrapPayload{}, err
	}

	definitions, err := c.fetchDefinitions(ctx)
	if err != nil {
		return WorkflowBootstrapPayload{}, err
	}

	instances, err := c.fetchInstances(ctx)
	if err != nil {
		return WorkflowBootstrapPayload{}, err
	}

	tasks, err := c.fetchTasks(ctx)
	if err != nil {
		return WorkflowBootstrapPayload{}, err
	}

	savedTasks, err := c.fetchSavedTasks(ctx)
	if err != nil {
		return WorkflowBootstrapPayload{}, err
	}

	auditEvents, err := c.fetchAudit(ctx)
	if err != nil {
		return WorkflowBootstrapPayload{}, err
	}

	graph, err := c.fetchDesignerGraph(ctx)
	if err != nil {
		return WorkflowBootstrapPayload{}, err
	}

	drafts, err := c.fetchDrafts(ctx)
	if err != nil {
		return WorkflowBootstrapPayload{}, err
	}

	return WorkflowBootstrapPayload{
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
