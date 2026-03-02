# Project Memory (Persistent Context)

Purpose: Keep durable project state so work can resume quickly after chat/session loss.

Last updated: 2026-03-02

## Current Product Snapshot

- Product: Hospital emergency triage workflow manager.
- Frontend: React + TypeScript + Vite + Redux Toolkit + React Query + Tailwind + shadcn/ui + React Flow.
- Backend: Go modular monolith with explicit service/repository ports.
- Persistence: Postgres (system of record) + Redis (sessions/cache primitives).

## High-Confidence Current Behavior

1. Auth/session
- Login is real backend auth (`/api/auth/login`).
- Session cookie: `triage_session`.
- Session payload is stored in Redis as `session:<session-id>` with TTL.

2. Workflow/task runtime
- Frontend bootstraps state from `GET /api/workflow/bootstrap`.
- Task mutations (claim/save/complete/delete/create) use backend APIs and update aggregate state.
- Process designer view for a task is fetched from `GET /api/tasks/:taskId/designer`.

3. Saved Tasks UX
- Actions are in 3-dot menu: `Canvas`, `View`, `Delete`.
- `View` opens new route: `/saved-tasks/:taskId/view`.
- `Delete` restricted to closed/END-completed process instances.

4. Observability / Admin Logs
- Structured logs include `timestamp`, `level`, `channel`, `message`, `requestId`, `traceId`, and sanitized `fields`.
- Admin can query runtime log stream and summary charts from `/api/admin/logs` and `/api/admin/logs/summary`.
- Admin Logs table supports:
  - filter controls (level/channel/search/window/limit)
  - pagination (20 rows default)
  - per-row formatter toggle (`Raw` vs `JSON`) for `fields`

## Recent Architecture Changes

### Backend
- Introduced shared contracts package:
  - `backend/internal/modules/contracts/*`
- Refactored Postgres layer for separation of concerns:
  - `task_creation_helpers.go` reduced and split into:
    - `task_creation_inputs.go`
    - `task_creation_graph.go`
  - designer runtime logic extracted to:
    - `backend/internal/platform/db/postgres/taskdesigner/runtime_graph.go`
- Updated query/helper reuse from `bootstrap_state_queries.go` and `tasks_delete.go` to shared designer helpers.
- Added request context keys and middleware for request/trace IDs:
  - `backend/internal/platform/requestctx/context.go`
  - `backend/internal/transport/http/middleware/request_id.go`
  - `backend/internal/transport/http/middleware/trace_id.go`
- Added platform logging subsystem:
  - `backend/internal/platform/logging/*`
- Added admin log handlers:
  - `backend/internal/transport/http/router_admin_logs_handlers.go`

### Frontend
- Saved Tasks refactored into feature module:
  - `src/features/saved-tasks/*`
- New static patient medical record page:
  - `src/features/patient-record/PatientMedicalRecordPage.tsx`
- Runtime in-memory fallback removed from transport path:
  - `src/data/appApi.ts` now calls backend-only APIs.
- Admin page includes Logs & Incidents tab with charts, table pagination, and row formatter toggle.
- Naming cleanup completed:
  - `src/data/contracts.ts` is the canonical frontend contract module.
  - `src/data/bootstrapSeedApi.ts` is the bootstrap seed loader.
  - `src/data/inMemoryApi.ts` is the in-memory test API aggregator.
  - `src/data/api/state.ts` exposes `inMemoryStore`.

## Known Gaps / Next Critical Items

1. Designer draft and publish backend routes
- Frontend now calls:
  - `POST /api/workflow/drafts`
  - `POST /api/workflow/publish`
- These routes need backend handler wiring + module implementation.

2. Naming cleanup
- Type contracts now live in `src/data/contracts.ts`.
- Public static seed file removed; bootstrap seed now comes from backend.

3. Legacy in-memory API cleanup
- Runtime path no longer depends on any in-memory fallback; backend transport is the source of truth.
- In-memory API modules under `src/data/api/*` are retained only for test scaffolding.

## Quick Rehydrate Map (If Context Resets)

1. Root docs
- `README.md`
- `BACKEND_NEXT_STEPS.md`
- this file (`PROJECT_MEMORY.md`)

2. Frontend runtime/data path
- `src/data/apiClient.ts`
- `src/data/appApi.ts`
- `src/store/slices/workflowSlice.ts`
- `src/store/slices/authSlice.ts`

3. Saved Tasks and patient record feature
- `src/features/saved-tasks/`
- `src/features/patient-record/PatientMedicalRecordPage.tsx`

4. Backend request flow
- `backend/internal/app/app.go`
- `backend/internal/transport/http/router.go`
- `backend/internal/transport/http/router_auth_handlers.go`
- `backend/internal/transport/http/router_task_handlers.go`

5. Backend Postgres logic
- `backend/internal/platform/db/postgres/`
- `backend/internal/platform/db/postgres/taskcreation/`
- `backend/internal/platform/db/postgres/taskdesigner/`

## Update Protocol

When major behavior/architecture shifts are made:
1. Update `README.md` and `backend/README.md` first.
2. Update this file with:
- what changed
- what is stable now
- what remains pending
3. Add/refresh actionable items in `BACKEND_NEXT_STEPS.md`.
