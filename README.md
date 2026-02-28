# Triage Flow Forge

Hospital emergency workflow platform with:
- React + TypeScript frontend (Task Console, Designer, Saved Tasks, Admin)
- Go backend (REST API, Postgres persistence, Redis sessions/cache)

This README is maintained as the primary recovery point if chat/session context is lost.

## Architecture Overview

- Frontend (`/src`): role-based app shell, task operations, process designer UI.
- Backend (`/backend`): modular monolith (`auth`, `admin`, `workflow/*`) with explicit repository/service boundaries.
- Database: Postgres is the system of record.
- Cache/session: Redis stores auth sessions and cache primitives.

## Run Locally

### 1) Backend

```bash
cd backend
GOCACHE=/tmp/gocache go run ./cmd/api
```

Default backend address: `:8082`

### 2) Frontend

```bash
cd /Users/gazmirsulcaj/triage-flow-forge
npm install
npm run dev
```

Default frontend address: `http://localhost:8080`

Vite proxies `/api`, `/health`, `/v1` to backend `http://127.0.0.1:8082`.

## Environment Variables

### Backend (`backend/.env` or process env)

- `HTTP_ADDR` (default `:8082`)
- `POSTGRES_DSN` (default `postgres://localhost:5432/triage?sslmode=disable`)
- `REDIS_ADDR` (default `127.0.0.1:6379`)
- `REDIS_PASSWORD` (optional)
- `REDIS_DB` (default `0`)

### Frontend

- `VITE_API_BASE_URL` (optional; if unset, uses relative `/api`)

## Current Product Status

Implemented and active:
- Auth login/session/logout via backend + Redis session cookie (`triage_session`)
- Workflow bootstrap from backend
- Task APIs: fetch, claim, save edits, complete, delete
- Task creation from console (`/api/tasks/create-from-console`)
- Task-scoped designer projection (`/api/tasks/:taskId/designer`)
- Saved Tasks refactored to feature module with actions menu (`Canvas`, `View`, `Delete`)
- New route: `/saved-tasks/:taskId/view` (static Patient Medical Record view)
- Frontend transport now backend-only (runtime in-memory fallback removed)
- Frontend contract/seed modules renamed for neutral naming:
  - `src/data/contracts.ts`
  - `src/data/bootstrapSeedApi.ts`
  - `src/data/inMemoryApi.ts`

In progress / known gap:
- Designer draft/publish endpoints still need backend route wiring to match frontend calls:
  - `POST /api/workflow/drafts`
  - `POST /api/workflow/publish`

## Key Frontend Paths

- App shell and routes: `src/App.tsx`
- Saved Tasks feature: `src/features/saved-tasks/`
- Patient record view: `src/features/patient-record/PatientMedicalRecordPage.tsx`
- API transport: `src/data/apiClient.ts`, `src/data/appApi.ts`
- State orchestration: `src/store/slices/workflowSlice.ts`, `src/store/slices/authSlice.ts`

## Key Backend Paths

- App wiring: `backend/internal/app/app.go`
- HTTP router: `backend/internal/transport/http/router.go`
- Auth handlers: `backend/internal/transport/http/router_auth_handlers.go`
- Task handlers: `backend/internal/transport/http/router_task_handlers.go`
- Postgres adapters: `backend/internal/platform/db/postgres/`
- Graph routing logic: `backend/internal/platform/db/postgres/taskcreation/`
- Runtime designer graph helpers: `backend/internal/platform/db/postgres/taskdesigner/`
- Shared contracts: `backend/internal/modules/contracts/`

## Test / Build

### Frontend

```bash
npm run build
```

### Backend

```bash
cd backend
GOCACHE=/tmp/gocache go test ./...
```

## Documentation Index

- Root state memory: `PROJECT_MEMORY.md`
- Backend status and next steps: `BACKEND_NEXT_STEPS.md`
- Concise accordion docs: `SOFTWARE_DOCS_ACCORDION.md`
- Backend runtime docs: `backend/README.md`
