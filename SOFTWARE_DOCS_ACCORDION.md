# Software Documentation (Accordion)

Use this as a compact, collapsible documentation page.

<details>
<summary><strong>1) Product Purpose</strong></summary>

- Hospital emergency triage workflow simulator/manager.
- Supports role-based task routing across reception, triage nurse, physician, lab, radiology, and admin.
- Simulates process instances, tasks, SLA pressure, and workflow transitions.

</details>

<details>
<summary><strong>2) Tech Stack</strong></summary>

- React + TypeScript + Vite
- Redux Toolkit (state)
- React Query (bootstrap/data loading)
- Tailwind + shadcn/ui
- React Flow (`@xyflow/react`) for BPMN-like designer
- Vitest for tests

</details>

<details>
<summary><strong>3) Core Modules</strong></summary>

- `src/App.tsx`: app shell, route protection, lazy routes.
- `src/store/slices/workflowSlice.ts`: workflow orchestration/thunks.
- `src/store/slices/authSlice.ts`: auth/session state.
- `src/data/workflow-logic/`: workflow rules/utilities.
- `src/data/api/`: mock backend domains (`read`, `designer`, `task`, `auth`).
- `src/pages/`: product surfaces (Tasks, Designer, SavedTasks, Instances, Admin).

</details>

<details>
<summary><strong>4) Main User Flows</strong></summary>

- Sign in with role-based account.
- View dashboard with urgent tasks and active instances.
- Open task console, claim/complete/edit tasks.
- Route process using user task, XOR, AND, timer/message/signal nodes.
- Save/open drafts and redirect saved tasks back to process designer.

</details>

<details>
<summary><strong>5) Data Model + Seed</strong></summary>

- Types/interfaces: `src/data/mockData.ts`
- Seed dataset: `public/mockData.json`
- Workflow definition reference: `workflow.definition.json`

</details>

<details>
<summary><strong>6) Runtime/Behavior Notes</strong></summary>

- Instance-scoped process graph behavior is enforced.
- Task console merges live and saved-task records for visibility.
- Triage color influences priority/category/SLA.
- Mock API is structured for future backend replacement.

</details>

<details>
<summary><strong>7) Testing</strong></summary>

- Tests live under `src/test/`.
- Focus includes BPMN validation, instance isolation, designer behavior, and task validation.

</details>

<details>
<summary><strong>8) Fast Context Recovery</strong></summary>

If chat resets, review in this order:

1. `PROJECT_MEMORY.md`
2. `src/App.tsx`
3. `src/store/slices/workflowSlice.ts`
4. `src/data/workflow-logic/`
5. `src/data/api/`
6. `src/pages/Tasks.tsx`
7. `src/components/designer/`
8. `src/test/`

</details>

<details>
<summary><strong>9) Task Runtime Contract (Current)</strong></summary>

- Canonical create endpoint: `POST /api/tasks/create-from-console`
- Claim endpoint: `POST /api/tasks/{taskId}/claim`
- Save endpoint: `PATCH /api/tasks/{taskId}` (backend also accepts `PUT/POST` for compatibility)
- Complete endpoint: `POST /api/tasks/{taskId}/complete`

Mutation response contract:
- `tasks`
- `savedTasks`
- `graph`
- `instances`
- `audit`

Create/save/complete behavior:
- Create seeds default form fields (`patient_name`, `patient_id`, `notes`) for new user tasks.
- Save updates form values, patient fields, triage/SLA-derived attributes, and saved snapshot projection.
- Complete closes current task, appends audit, refreshes instance state, and can spawn downstream task(s).

Frontend completion guard:
- Complete blocked until at least one successful save in current task session.
- Complete blocked if there are unsaved edits.
- Routing-only temporary fields are stripped from forwarded form payload when spawning next tasks.

Core implementation files:
- Frontend: `src/pages/Tasks.tsx`, `src/pages/tasks/TaskForm.tsx`, `src/data/apiClient.ts`, `src/store/slices/workflowSlice.ts`
- Backend: `backend/internal/transport/http/router.go`, `backend/internal/platform/db/postgres/task_creation.go`, `backend/internal/platform/db/postgres/tasks.go`

</details>
