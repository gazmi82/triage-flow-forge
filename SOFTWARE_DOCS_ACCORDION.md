# Software Documentation (Accordion)

Use this as a compact collapsible reference.

<details>
<summary><strong>1) Product Purpose</strong></summary>

- Hospital emergency triage workflow management platform.
- Role-based orchestration across reception, triage nurse, physician, laboratory, radiology, admin.
- Includes task console, process designer, saved tasks, drafts, and audit timeline behavior.

</details>

<details>
<summary><strong>2) Tech Stack</strong></summary>

- Frontend: React + TypeScript + Vite + Redux Toolkit + React Query + Tailwind + shadcn/ui + React Flow.
- Backend: Go modular monolith.
- Storage: Postgres (record), Redis (sessions/cache).

</details>

<details>
<summary><strong>3) Core Modules</strong></summary>

Frontend:
- `src/App.tsx`: protected routing + lazy page composition.
- `src/store/slices/workflowSlice.ts`: workflow state and thunks.
- `src/store/slices/authSlice.ts`: auth/session state.
- `src/features/saved-tasks/`: feature-oriented Saved Tasks module.
- `src/features/patient-record/PatientMedicalRecordPage.tsx`: static patient record page.
- `src/data/apiClient.ts`, `src/data/appApi.ts`: backend transport path.

Backend:
- `backend/internal/transport/http/`: routes/handlers.
- `backend/internal/modules/*`: module services/repositories.
- `backend/internal/platform/db/postgres/`: persistence adapters.
- `backend/internal/platform/db/postgres/taskcreation/`: layout/routing algorithms.
- `backend/internal/platform/db/postgres/taskdesigner/`: runtime graph projection helpers.

</details>

<details>
<summary><strong>4) Main User Flows</strong></summary>

- Sign in -> bootstrap workspace.
- Claim/save/complete tasks from Task Console.
- Create tasks/events/gateways from console and project into designer graph.
- Open Saved Tasks and use actions menu:
  - `Canvas` -> open process designer for selected task.
  - `View` -> open patient record route.
  - `Delete` -> only enabled for closed/END-completed process.

</details>

<details>
<summary><strong>5) Current Routes</strong></summary>

Frontend notable routes:
- `/tasks`
- `/designer`
- `/saved-tasks`
- `/saved-tasks/:taskId/view`
- `/admin` (admin role)

Backend notable APIs:
- `GET /api/workflow/bootstrap`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `POST /api/admin/users`
- `GET /api/admin/logs`
- `GET /api/admin/logs/summary`
- `GET /api/tasks`
- `POST /api/tasks/create-from-console`
- `GET /api/tasks/:taskId/designer`
- `POST /api/tasks/:taskId/claim`
- `PATCH|PUT|POST /api/tasks/:taskId`
- `POST /api/tasks/:taskId/complete`
- `DELETE /api/tasks/:taskId`

</details>

<details>
<summary><strong>6) Runtime/Behavior Notes</strong></summary>

- Task mutation responses return aggregate state (`tasks`, `savedTasks`, `graph`, `instances`, `audit`).
- END/closed semantics gate deletion.
- Start-to-first-task edge enforcement is part of runtime graph shaping.
- Frontend transport is backend-only (runtime in-memory fallback removed).
- Logging/observability:
  - request + trace correlation IDs
  - sensitive field redaction
  - DB slow/failure logging with query hash
  - admin-facing log table and chart summary

</details>

<details>
<summary><strong>7) Admin Logs UX</strong></summary>

- Logs tab supports filtering by level, channel, search term, and lookback window.
- Log stream table has pagination with default 20 rows/page.
- Each message row contains a formatter toggle:
  - `Raw` for compact JSON string
  - `JSON` for pretty-printed object

</details>

<details>
<summary><strong>8) Known Gaps</strong></summary>

- Backend routes for drafts/publish still need full wiring:
  - `POST /api/workflow/drafts`
  - `POST /api/workflow/publish`
- In-memory API modules remain for test scaffolding and are no longer used by `appApi` runtime path.

</details>

<details>
<summary><strong>9) Fast Context Recovery</strong></summary>

If chat/session resets, read in this order:

1. `README.md`
2. `PROJECT_MEMORY.md`
3. `BACKEND_NEXT_STEPS.md`
4. `backend/README.md`
5. `src/features/saved-tasks/`
6. `src/data/apiClient.ts` and `src/data/appApi.ts`

</details>
