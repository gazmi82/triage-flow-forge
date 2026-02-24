# Project Memory (Persistent Context)

Purpose: Keep a compact, durable history of what this repo has achieved so future sessions do not need to rediscover context from scratch.

Scope: Rewritten `main` history as of commit `63bc924` (2026-02-24).

## Current Product Snapshot
- App type: Hospital emergency triage workflow simulator/manager (frontend-first, mock backend).
- Stack: React + TypeScript + Vite + Redux Toolkit + React Query + Tailwind + shadcn/ui + React Flow + Vitest.
Core capabilities:
- Role-based auth and protected routing.
- BPMN-like process designer (tasks, events, gateways).
- Task console with claim/complete/edit and routing logic.
- Saved tasks + draft process states + instance monitor + admin views.
- Mock API domain split (`read`, `designer`, `task`, `auth`) with shared in-memory state.

## Milestones (From First Commit, Grouped by 2 Commits)

### Checkpoint 01
- `b331aa1` (2025-01-01): Project template/bootstrap created.
- `f96d0d3` (2026-02-19): Early project changes and baseline setup iteration.
- Outcome: Repository initialized and moved from template state to first custom code pass.

### Checkpoint 02
- `2243523` (2026-02-19): Implemented BPMN designer UI.
- `e0ec700` (2026-02-19): Follow-up changes after initial designer implementation.
- Outcome: Core process modeling canvas introduced and stabilized.

### Checkpoint 03
- `a9cc768` (2026-02-19): Added node shape selector.
- `a01f348` (2026-02-19): Updated publish/site metadata.
- Outcome: UX improvements to designer + deployment/project metadata cleanup.

### Checkpoint 04
- `c9abdb1` (2026-02-19): Fixed task validation and designer drop coordinates; added lazy routes, tests, and `workflow.definition.json`.
- `c02231a` (2026-02-19): Added authenticated top navbar and navigation model updates.
- Outcome: Better runtime correctness, better navigation, and test/dev structure expansion.

### Checkpoint 05
- `7912703` (2026-02-19): Additional navbar/navigation model refinement.
- `aea34f8` (2026-02-20): Added saved tasks workspace and task-scoped redirects into process designer.
- Outcome: Stronger user flow from task records into process context.

### Checkpoint 06
- `3e30c36` (2026-02-20): Aligned workflow definition model with current designer/task flow and permissions.
- `73d6fa1` (2026-02-20): Small fixes.
- Outcome: Model consistency improvements + targeted bug cleanup.

### Checkpoint 07
- `1602ed4` (2026-02-22): Refactored frontend into task-console modules; moved seed usage toward JSON; aligned workflow typing.
- `8ec4935` (2026-02-22): Major workflow/API refactor.
- Split mock API by domain with shared state.
- Moved seed dataset to `public/mockData.json`.
- Added query bootstrap integration.
- Modularized task console components.
- Preserved completed tasks in inbox merge logic.
- Tightened TypeScript thunk typing.
- Added initial gRPC contract-prep file.
- Outcome: Architecture shifted from monolith-like frontend logic to a cleaner domain + state structure.

### Checkpoint 08
- `e5491a2` (2026-02-23): Enforced instance-scoped process graphs and improved completion UX.
- `fd59906` (2026-02-23): Extracted task-form validation/lookup services and finalized XOR routing UX.
- Outcome: Process/runtime integrity improved, especially around instance isolation and gateway behavior.

### Checkpoint 09
- `44e6eba` (2026-02-24): Fixed test validation.
- `63bc924` (2026-02-24): Stabilized triage workflow state, routing, and task-console API architecture.
- Outcome: Current stable baseline for triage workflow behavior and data-flow reliability.

## Update Protocol (Every 2 New Commits)
When there are 2 new commits on `main`, update this file immediately.

1. Collect new commits:
```bash
git --no-pager log --oneline --decorate -n 2
```
2. Append next checkpoint with:
- commit hashes + date + subject
- 2-5 bullets of what changed (files/modules/features)
- 1 short “Outcome” line
3. Update `Scope` line at top with latest commit hash/date.

## Authoring Rules For Future Updates
- Keep entries factual, not aspirational.
- Prefer behavior-level language (what user/system can do now).
- Mention regressions/fixes explicitly if relevant.
- Keep each checkpoint short enough to scan in under 20 seconds.
