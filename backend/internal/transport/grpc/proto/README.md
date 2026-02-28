# gRPC Proto Directory

Status: Placeholder for future internal gRPC contracts.

Current production transport for browser is REST under `internal/transport/http`.

## Why this folder exists

The backend uses modular boundaries that can later expose gRPC services without redesigning domain contracts.

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
