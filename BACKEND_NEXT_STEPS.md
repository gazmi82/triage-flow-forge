# Backend Next Steps (Execution Tracker)

Last updated: 2026-02-28

This file tracks what is already integrated vs what is still required for full backend parity.

## Status Matrix

### Completed

- Backend modular monolith scaffold (app, modules, transport, platform layers).
- Postgres + Redis wiring and readiness checks.
- Auth login/session/logout with Redis-backed session cookie.
- Admin user creation endpoint.
- Workflow bootstrap endpoint.
- Task runtime endpoints:
  - fetch tasks
  - claim task
  - save task edits
  - complete task
  - create task from console
  - delete task (restricted by END/closed process)
  - task-scoped designer graph fetch
- Shared contracts extracted into `internal/modules/contracts`.
- Postgres refactor to reduce long files and isolate graph-runtime helpers.

### In Progress / Pending

1. Designer drafts API
- `POST /api/workflow/drafts`
- `GET /api/workflow/drafts` (optional dedicated read; bootstrap already returns drafts)

2. Designer publish API
- `POST /api/workflow/publish`

3. Error contract hardening
- Normalize API errors to stable envelope (`code`, `message`, optional `fields`, `traceId`).

4. RBAC middleware
- Enforce role checks at route/service boundary (not only UI).

5. Metrics expansion
- Add endpoint-level mutation success/failure counters and latency buckets.

## Immediate Priority (because frontend now uses backend-only transport)

Frontend `appApi` no longer falls back to runtime in-memory implementation.
This means `saveDraft` and `publishDesignerGraph` should be implemented next.

### Required frontend/backend contract

#### Save draft
Request: `POST /api/workflow/drafts`

Body:
```json
{
  "nodes": [],
  "edges": []
}
```

Response:
```json
{
  "graph": { "nodes": [], "edges": [] },
  "drafts": []
}
```

#### Publish designer
Request: `POST /api/workflow/publish`

Body:
```json
{
  "nodes": [],
  "edges": []
}
```

Response:
```json
{
  "graph": { "nodes": [], "edges": [] },
  "tasks": [],
  "instances": []
}
```

## Suggested Implementation Order

1. Add routes in `backend/internal/transport/http/router.go`.
2. Add handlers in `router_system_handlers.go` or a dedicated workflow handler file.
3. Wire services in `internal/app/app.go` to existing workflow modules.
4. Implement repository methods in Postgres adapter.
5. Add integration tests for draft save/publish path.
6. Verify frontend flows:
- Designer: Save Draft button
- Designer: Publish button
- Draft tab load/open behavior in Saved Tasks

## Operational Checks

After each change:

```bash
cd backend
gofmt -w $(find . -name '*.go' -type f)
GOCACHE=/tmp/gocache go test ./...
```

```bash
cd /Users/gazmirsulcaj/triage-flow-forge
npm run build
```

## Notes for Session Recovery

If context resets, read in this order:
1. `README.md`
2. `PROJECT_MEMORY.md`
3. this file (`BACKEND_NEXT_STEPS.md`)
4. `backend/README.md`
