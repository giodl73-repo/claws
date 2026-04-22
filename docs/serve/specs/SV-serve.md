# SV — @bic/claws-serve (primary spec)

**Status**: Alpha · **Upstream target**: none

## Package overview

The `claws-serve` daemon exposes the claws SDK over HTTP + SSE.
Operators run it behind a reverse proxy to let editors, CI, and
companion apps hit claws governance remotely.

## Components

- **REST API** (43 routes — see [SVR](./SVR-rest-api.md)) for
  workspace introspection, policy ops, snapshot lifecycle, approvals
- **Session layer** — TLS-terminated HTTP connections with optional
  mutual-TLS identity attestation
- **SSE channels** — event streams for snapshot events, approval
  requests, audit chain tails
- **Cap-surface integration** — Capability-aware integration for
  workspace, skills, and file ingest operations

## Sub-spec index

| Code | File | Authority over |
|------|------|----------------|
| **SVR** | [SVR-rest-api.md](./SVR-rest-api.md) | 43-route surface, auth model, pagination, error shape |
| **SVI** | [SVI-workspace-introspect.md](./SVI-workspace-introspect.md) | Read-only workspace endpoints, AST serialization |
| **SVC** | [SVC-cap-surfaces.md](./SVC-cap-surfaces.md) | Cap-integration: capability-scoped access, trust escalation |

## Stability

Alpha. The 43-route surface is stable (additive changes only within
Alpha). SSE event shapes are stable.
