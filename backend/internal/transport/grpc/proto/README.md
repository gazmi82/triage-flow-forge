# gRPC Proto Directory

Status: Placeholder for future internal gRPC contracts.

Current production transport for browser is REST under `internal/transport/http`.
Current REST includes patient medical record reads via:
- `GET /api/tasks/:taskId/patient-record`
Current REST also includes profile analytics reads via:
- `GET /api/profile`

## Why this folder exists

The backend uses modular boundaries that can later expose gRPC services without redesigning domain contracts.
Module path:
- `github.com/gazmi82/triage-flow-forge/backend`

Package documentation setup:
- package-level `doc.go` files exist in core backend packages to improve pkg.go.dev output.
- command package docs (`cmd/api`) are intentionally concise.

Planned service groups:
- `AuthService`
- `AdminService`
- `WorkflowReadService`
- `TaskService`
- `DesignerService`

## Current recommendation

When adding first `.proto` files:
1. Keep request/response shapes aligned with `internal/modules/contracts`.
2. Generate server/client stubs under `internal/transport/grpc`.
3. Optionally add grpc-gateway if HTTP->gRPC bridging is desired.
