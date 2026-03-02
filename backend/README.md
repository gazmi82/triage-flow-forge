# Backend (Go)

Go backend for Triage Flow Forge.

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

### Workflow/Tasks
- `GET /api/workflow/bootstrap`
- `GET /api/tasks`
- `POST /api/tasks/create-from-console`
- `GET /api/tasks/:taskId/designer`
- `POST /api/tasks/:taskId/claim`
- `POST /api/tasks/:taskId/complete`
- `PATCH|PUT|POST /api/tasks/:taskId` (save edits compatibility)
- `DELETE /api/tasks/:taskId`

## Data / Session Model

- Postgres: canonical records for users, instances, tasks, saved tasks, graphs, audit.
- Redis: session objects under `session:<id>` with TTL.
- Login issues `triage_session` HTTP-only cookie.
- Frontend bootstrap now reads backend bootstrap payload directly (no static public JSON seed file).

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
- `internal/platform/db/postgres/taskcreation/`: graph append/routing algorithms
- `internal/platform/db/postgres/taskdesigner/`: runtime graph projection/enrichment helpers
- `internal/transport/http/`: handlers + router

## Current Gaps

Frontend now calls backend-only transport. These endpoints are expected next for full designer parity:

- `POST /api/workflow/drafts`
- `POST /api/workflow/publish`

They are tracked in `BACKEND_NEXT_STEPS.md`.
