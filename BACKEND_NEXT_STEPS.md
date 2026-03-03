# Backend Next Steps (Execution Tracker)

Last updated: 2026-03-03

This file tracks what is already integrated vs what is still required for full backend parity.

## Status Matrix

### Completed

- Backend modular monolith scaffold (app, modules, transport, platform layers).
- Postgres + Redis wiring and readiness checks.
- Auth login/session/logout with Redis-backed session cookie.
- Route-level authz middleware and RBAC gate for admin endpoints.
- Admin user creation endpoint.
- Admin runtime logs endpoints:
  - `GET /api/admin/logs`
  - `GET /api/admin/logs/summary`
- Workflow bootstrap endpoint.
- Task runtime endpoints:
  - fetch tasks
  - fetch patient medical record by task id
  - claim task
  - save task edits
  - complete task
  - create task from console
  - delete task (restricted by END/closed process)
  - task-scoped designer graph fetch
- Shared contracts extracted into `internal/modules/contracts`.
- Postgres refactor to reduce long files and isolate graph-runtime helpers.
- Structured logging stack:
  - request/trace correlation IDs (`X-Request-ID`, `X-Trace-ID`)
  - redaction for sensitive fields (`password`, `token`, `cookie`, `session`, `email`, `patientId`)
  - DB slow/failing query logs with `queryHash` and lock-aware hints
  - no-row lookups (`pgx.ErrNoRows`) treated as non-failure debug signal
- HTTP log level tuning:
  - 401/403 logged as `info` in `http` channel
  - security events remain `warn`

### In Progress / Pending

1. Designer drafts API
- `POST /api/workflow/drafts`
- `GET /api/workflow/drafts` (optional dedicated read; bootstrap already returns drafts)

2. Designer publish API
- `POST /api/workflow/publish`

3. Error contract hardening
- Normalize API errors to stable envelope (`code`, `message`, optional `fields`, `traceId`).

4. Metrics expansion
- Add endpoint-level mutation success/failure counters and latency buckets.
5. Persisted log sink
- Optional persistent sink (Postgres/ELK/OpenSearch) in addition to in-memory ring buffer.

## Immediate Priority (because frontend now uses backend-only transport)

Frontend `appApi` no longer falls back to runtime in-memory implementation.
This means `saveDraft` and `publishDesignerGraph` should be implemented next.

Patient record backend wiring is complete:
- `GET /api/tasks/:taskId/patient-record`
- Response shape includes `task`, `instance`, and `audit` arrays for the `/saved-tasks/:taskId/view` page.

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
