# Backend (Go)

Go backend for Triage Flow Forge.

## Module Path

This backend is a Go submodule published as:

`github.com/gazmi82/triage-flow-forge/backend`

## Responsibilities

- Serve REST APIs consumed by frontend
- Persist workflow/task state in Postgres
- Store auth sessions in Redis
- Expose readiness/health/metrics endpoints

## Run

```bash
cd backend
GOCACHE=/tmp/gocache go run ./cmd/api
```

or

```bash
cd backend
make run
```

## Test / Format

```bash
cd backend
GOCACHE=/tmp/gocache go test ./...
make fmt
```

## Configuration

Loaded from env (`.env` or `backend/.env`) with defaults:

- `HTTP_ADDR=:8082`
- `POSTGRES_DSN=postgres://localhost:5432/triage?sslmode=disable`
- `REDIS_ADDR=127.0.0.1:6379`
- `REDIS_PASSWORD=`
- `REDIS_DB=0`
- `LOG_LEVEL=info` (`debug|info|warn|error`)
- `LOG_BUFFER_SIZE=5000` (in-memory admin log buffer)
- `LOG_SLOW_QUERY_MS=300` (DB slow query threshold)

## Implemented Endpoints

### System
- `GET /health`
- `GET /v1/ready`
- `GET /v1/metrics`

### Auth/Admin
- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `POST /api/admin/users`
- `GET /api/admin/logs`
- `GET /api/admin/logs/summary`
- `GET /api/profile`

### Workflow/Tasks
- `GET /api/workflow/bootstrap`
- `GET /api/tasks`
- `POST /api/tasks/create-from-console`
- `GET /api/tasks/:taskId/designer`
- `GET /api/tasks/:taskId/patient-record`
- `POST /api/tasks/:taskId/claim`
- `POST /api/tasks/:taskId/complete`
- `PATCH|PUT|POST /api/tasks/:taskId` (save edits compatibility)
- `DELETE /api/tasks/:taskId`

## Data / Session Model

- Postgres: canonical records for users, instances, tasks, saved tasks, graphs, audit.
- Redis: session objects under `session:<id>` with TTL.
- Login issues `triage_session` HTTP-only cookie.
- Frontend bootstrap now reads backend bootstrap payload directly (no static public JSON seed file).

## Profile API (Detailed)

### Endpoint

- `GET /api/profile`

### Auth model

- Requires active session (`triage_session` cookie in Redis-backed session store).
- User identity is extracted from auth middleware context and used as the profile scope.

### Returned shape (high level)

- `user`, `currentUser`, `profileRole`
- `peerUsers`
- `personalTasks`, `personalAudit`
- `patientActivity`, `eventBreakdown`, `activityByDay`
- `priorityDistribution`, `triageDistribution`
- computed KPI fields:
  - `completedCount`, `claimedCount`, `pendingCount`, `overdueCount`
  - `openWorkload`, `completionRate`, `avgCycleMinutes`, `slaRiskCount`
  - `activeInstanceCount`, `activityScore`
  - `firstAudit`, `lastAudit`

### Query/compute implementation

- Postgres query/computation module:
  - `internal/platform/db/postgres/profile/profile.go`
- Service/repository wiring:
  - `internal/modules/profile/*`
- HTTP transport:
  - `internal/transport/http/router_profile_handlers.go`

## Logging / Observability

- Structured JSON logs with `level`, `channel`, `requestId`, and `traceId`.
- Redaction for sensitive keys (`password`, `token`, `cookie`, `session`, `email`, `patientId`).
- Request/trace correlation headers:
  - `X-Request-ID`
  - `X-Trace-ID`
- Security/audit events for auth failures, forbidden access, and task/admin mutations.
- DB query logging for slow/failing statements with `queryHash`, `durationMs`, and lock-aware hints.
- `pgx.ErrNoRows` paths are treated as non-failure debug events (not incidents/error counters).
- Admin log APIs expose filtered log rows and summarized incident/chart data.

## Mutation Contract

Task mutation responses are returned as aggregate payloads to keep frontend state consistent:

- `tasks`
- `savedTasks`
- `graph`
- `instances`
- `audit`

## Internal Structure

- `internal/modules/contracts/`: shared DTO contracts
- `internal/modules/*`: module service/repository ports
- `internal/platform/db/postgres/`: DB adapters
- `internal/platform/db/postgres/profile/`: profile analytics query/computation layer
- `internal/platform/db/postgres/taskcreation/`: graph append/routing algorithms
- `internal/platform/db/postgres/taskdesigner/`: runtime graph projection/enrichment helpers
- `internal/transport/http/`: handlers + router

## Package Documentation Setup (pkg.go.dev)

The backend now includes package comments via `doc.go` in key packages so pkg.go.dev renders documentation sections:

- `cmd/api/doc.go`
- `internal/app/doc.go`
- `internal/modules/contracts/doc.go`
- `internal/modules/auth/doc.go`
- `internal/modules/admin/doc.go`
- `internal/modules/profile/doc.go`
- `internal/modules/workflow/bootstrap/doc.go`
- `internal/modules/workflow/tasks/doc.go`
- `internal/modules/workflow/taskcreation/doc.go`
- `internal/transport/http/doc.go`
- `internal/platform/db/postgres/doc.go`

Important:
- `cmd/api` is a command package; it will still display minimal docs by design.
- richer API docs appear in library packages with exported symbols + comments.

## Current Gaps

Frontend now calls backend-only transport. These endpoints are expected next for full designer parity:

- `POST /api/workflow/drafts`
- `POST /api/workflow/publish`

They are tracked in `BACKEND_NEXT_STEPS.md`.

## pkg.go.dev visibility

- Root repository now contains `LICENSE` (MIT), required for redistributable docs rendering.
- If docs are stale, publish a new tag and request index refresh:
  - `https://pkg.go.dev/github.com/gazmi82/triage-flow-forge/backend`

Recommended tag format for backend submodule:
- `backend/vX.Y.Z`
- Example:
  - `git tag backend/v0.1.2`
  - `git push origin backend/v0.1.2`

## Frontend Origin Notes (Dev)

- Frontend runs on `http://localhost:8080`.
- Backend runs on `http://localhost:8082`.
- Browser requests should still appear as same-origin `http://localhost:8080/api/...` because Vite proxies API traffic to backend.
