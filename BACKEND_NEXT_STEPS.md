# Backend Integration Plan (Go + REST + gRPC + Postgres + Redis)

## 1. Goal

This document defines the execution plan to migrate the current frontend from in-memory mock APIs to a production-ready backend stack:

- **Go** for backend services
- **REST** for browser-facing APIs
- **gRPC** for internal service contracts and future service-to-service communication
- **Postgres** as system of record
- **Redis** for caching, rate limits, idempotency, and short-lived coordination

It is intentionally detailed so work can continue even when chat history is lost.

---

## 2. Current Frontend Reality (What backend must match)

Current frontend architecture:

- Redux Toolkit thunks in `src/store/slices/workflowSlice.ts`
- Auth thunks in `src/store/slices/authSlice.ts`
- Data access abstraction in `src/data/mockApi.ts`
- Domain API modules in `src/data/api/`:
  - `readApi`
  - `taskApi`
  - `designerApi`
  - `authApi`
  - `adminApi`

The backend must initially match these call surfaces so frontend changes remain small and safe.

### Critical frontend expectations

1. Bootstrap endpoint returns:
- users
- definitions
- instances
- tasks
- savedTasks
- audit
- graph
- drafts

2. Task mutation endpoints return updated aggregates for immediate UI refresh:
- tasks
- savedTasks
- graph
- instances
- audit

3. Admin create user flow expects:
- validation on name/email/password/department
- role assignment
- duplicate email rejection
- immediate users list refresh

4. Active/open instance semantics:
- open instance summary is derived from **non-completed tasks**
- not only from a persisted instance status flag

---

## 3. Recommended Backend Architecture

Use a **modular monolith** first (single deployable service, bounded modules internally):

- `auth`
- `admin`
- `definitions`
- `instances`
- `tasks`
- `designer`
- `drafts`
- `audit`

Why:
- Faster delivery than multi-service from day 1
- Strong domain boundaries still enforced
- Easy future split by module if scale demands it

### Suggested Go project structure

```txt
backend/
  cmd/
    api/
      main.go
  internal/
    app/
      app.go
      config.go
    transport/
      http/
        router.go
        middleware/
      grpc/
        server.go
        proto/
    modules/
      auth/
      admin/
      workflow/
        definitions/
        instances/
        tasks/
        designer/
        drafts/
        audit/
    platform/
      db/
      cache/
      logging/
      tracing/
      metrics/
      idempotency/
      outbox/
  migrations/
  sql/
  Makefile
  go.mod
```

---

## 4. Data Model (Postgres)

Use Postgres as source of truth. Suggested core tables:

### Identity & access
- `users`
- `credentials` (or external auth provider mapping)
- optional `sessions` / `refresh_tokens`

### Workflow design/runtime
- `process_definitions`
- `process_definition_versions`
- `process_instances`
- `tasks`
- `task_form_values` (jsonb)
- `designer_graph_snapshots`
- `drafts`
- `saved_tasks` (or materialized projection from tasks/audit)
- `audit_events`

### Required constraints
- `users.email` unique
- enum/domain constraints:
  - role
  - task_status
  - instance_status
  - priority
  - triage_color
- foreign keys:
  - tasks -> instances
  - instances -> definition_version
  - audit_events -> instances

### Suggested index priorities
- `tasks(instance_id, status)`
- `tasks(role, status, due_at)`
- `process_instances(status, started_at)`
- `audit_events(instance_id, timestamp desc)`
- `users(email)`

---

## 5. Redis Responsibilities

Use Redis intentionally, not as a second database.

### Cache
- dashboard aggregate counters
- definition summaries
- role workload matrices

### Coordination and safety
- idempotency keys for mutation endpoints (`claim`, `complete`, `create task`, `create user`)
- short TTL locks for workflow transitions on the same instance
- optional rate limiting by user/IP

### Invalidation strategy
- on task mutation:
  - invalidate `dashboard:*`
  - invalidate `instances:*`
  - invalidate `role-metrics:*`
- on admin user creation/update:
  - invalidate `users:*`
  - invalidate `role-metrics:*`

---

## 6. REST + gRPC Strategy (Pragmatic)

### Browser APIs
Expose REST/JSON endpoints for frontend.

### Internal contracts
Define gRPC services for domain operations.

### Bridge
Use **grpc-gateway** so:
- browser keeps calling REST
- gateway maps REST -> gRPC handlers internally
- one canonical protobuf contract remains source of truth

This fits current frontend with minimal disruption.

---

## 7. API Mapping From Current Frontend

Map existing mock methods directly to backend endpoints first.

## Read/bootstrap
- `GET /api/workflow/bootstrap`
- `GET /api/users`
- `GET /api/definitions`
- `GET /api/instances`
- `GET /api/tasks`
- `GET /api/tasks/saved`
- `GET /api/audit`
- `GET /api/designer/graph`
- `GET /api/drafts`

## Task mutations
- `POST /api/tasks/{taskId}/claim`
- `POST /api/tasks/{taskId}/complete`
- `PATCH /api/tasks/{taskId}`
- `POST /api/tasks/create-from-console`

## Designer
- `POST /api/designer/draft`
- `POST /api/designer/publish`
- `GET /api/designer/by-task/{taskId}`
- `POST /api/designer/load-draft/{draftId}`

## Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

## Admin
- `POST /api/admin/users`
- future:
  - `PATCH /api/admin/users/{id}`
  - `PATCH /api/admin/users/{id}/status`
  - `POST /api/admin/users/{id}/reset-password`

---

## 8. Domain Contracts (Stability Rules)

These should be versioned and treated as public contracts to frontend.

### Task mutation response contract
Always return:
- tasks
- savedTasks
- graph
- instances
- audit

This avoids frontend partial state drift.

### Error contract
Use consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 6 characters.",
    "fields": {
      "password": "too_short"
    },
    "traceId": "..."
  }
}
```

### Idempotency
For mutation endpoints, support `Idempotency-Key` header.

---

## 9. Transaction Semantics (Very Important)

Workflow consistency depends on transactional updates.

For `complete task` and `create task from console`, do in one DB transaction:

1. Lock target task row (`FOR UPDATE`)
2. Validate preconditions and current status
3. Update task status
4. Insert/merge downstream tasks
5. Update instance current node and effective status
6. Append audit events
7. Commit

Never split these across separate transactions in the API request path.

---

## 10. Security Baseline

- JWT access + refresh token rotation
- password hashing with `bcrypt` or `argon2id`
- server-side RBAC checks (never trust frontend role only)
- audit admin mutations (create user, role/status changes)
- CORS restricted per environment
- request body size limits

---

## 11. Observability Baseline

- structured logs (JSON)
- request ID + trace ID propagation
- Prometheus metrics:
  - request duration
  - DB query duration
  - cache hit/miss
  - task mutation success/failure counts
- OpenTelemetry traces for:
  - task claim/complete/create
  - admin create user
  - bootstrap

---

## 12. Migration Plan (Phased)

## Phase 0: Contracts + schema
- finalize protobuf + REST mappings
- implement migrations
- create seed scripts
- add OpenAPI generation from gateway

Exit criteria:
- DB schema and contracts frozen for first integration slice

## Phase 1: Read-only integration
- implement bootstrap/read endpoints
- switch frontend reads from `mockApi` to real `apiClient` behind feature flag
- keep mutations on mock temporarily

Exit criteria:
- dashboard/admin/tasks pages load from real backend without mutation paths

## Phase 2: Auth + admin user creation
- implement login/register/refresh/logout
- implement `POST /api/admin/users`
- switch Admin Add User flow to backend

Exit criteria:
- admin can create user and role assignment persists in Postgres

## Phase 3: Core task mutations
- claim task
- save task edits
- complete task
- create task from console
- preserve aggregate response contract

Exit criteria:
- task console lifecycle works end-to-end from backend

## Phase 4: Designer + drafts
- save/load draft
- publish designer graph
- fetch task-scoped designer graph

Exit criteria:
- process projection and drafts behave as current frontend expects

## Phase 5: Hardening
- load/performance tests
- retry/idempotency verification
- role/permission audit
- backup/restore strategy

Exit criteria:
- production readiness checklist complete

---

## 13. Frontend Integration Pattern

Keep frontend stable by replacing only transport implementation:

- introduce `src/data/apiClient.ts` (axios/fetch)
- replace `mockApi.*` calls incrementally using same method names/signatures
- preserve thunk payload/response shapes first
- only then optimize payload size if needed

Feature flag suggestion:
- `VITE_USE_REAL_API=true|false`

---

## 14. Testing Strategy

## Backend tests
- unit tests per module (validation, business rules)
- integration tests with ephemeral Postgres + Redis
- transaction race tests for same task/instance mutation

## Contract tests
- REST response schema checks vs frontend expected shape
- gRPC contract compatibility tests

## Frontend regression
- keep existing Vitest suites
- add API-mocked tests for failure and retry states

---

## 15. Initial protobuf service sketch

```proto
service TaskService {
  rpc ClaimTask(ClaimTaskRequest) returns (WorkflowSnapshotResponse);
  rpc CompleteTask(CompleteTaskRequest) returns (WorkflowSnapshotResponse);
  rpc SaveTaskEdits(SaveTaskEditsRequest) returns (WorkflowSnapshotResponse);
  rpc CreateTaskFromConsole(CreateTaskFromConsoleRequest) returns (WorkflowSnapshotResponse);
}

service AdminService {
  rpc CreateUser(AdminCreateUserRequest) returns (AdminCreateUserResponse);
}

service ReadService {
  rpc FetchBootstrap(FetchBootstrapRequest) returns (WorkflowBootstrapResponse);
}
```

Where `WorkflowSnapshotResponse` mirrors current frontend mutation response aggregate.

---

## 16. Decisions to finalize now

1. `sqlc` vs ORM (`ent`/`gorm`)
2. auth strategy:
- internal credential table vs external IdP
3. deployment:
- single binary with grpc-gateway vs separate gateway
4. event strategy:
- immediate inline audit only vs outbox + worker
5. tenancy assumptions:
- single hospital vs multi-tenant (affects schema keys now)

---

## 17. Recommended defaults (fast + safe)

- DB access: `pgx` + `sqlc`
- Migrations: `goose`
- HTTP router: `chi`
- gRPC: `grpc-go` + `grpc-gateway`
- Auth: JWT access + refresh tokens in DB
- Logging: `zap`
- Validation: `go-playground/validator`
- Observability: OpenTelemetry + Prometheus

---

## 18. Definition of done for first production slice

You can call this backend integration successful when:

- frontend reads/mutations run against real backend for:
  - bootstrap
  - claim/complete/save/create-task
  - admin create user
- Postgres contains canonical state for users/tasks/instances/audit
- Redis is active for cache + idempotency
- role checks enforced server-side
- dashboard/instances semantics match:
  - open instances = instances with non-completed tasks
- tracing/logging expose mutation lifecycle end-to-end

---

## 19. Immediate next actions (execution order)

1. Scaffold `backend/` Go service skeleton.
2. Create initial migrations for users/definitions/instances/tasks/audit.
3. Implement `GET /api/workflow/bootstrap`.
4. Implement `POST /api/admin/users`.
5. Switch frontend Admin create-user thunk to real API behind feature flag.
6. Implement task mutation endpoints in transactional flow.
7. Enable Redis idempotency for mutation endpoints.
8. Add contract/integration tests before full frontend switch.

---

## 20. Notes for future sessions

If context is lost, start from:

1. `PROJECT_MEMORY.md`
2. `workflow.definition.json`
3. `src/store/slices/workflowSlice.ts`
4. `src/data/api/` and `src/data/mockApi.ts`
5. this file: `BACKEND_NEXT_STEPS.md`

