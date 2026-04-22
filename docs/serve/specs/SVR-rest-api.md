# SVR — REST API

**Sub-spec of**: [SV-serve.md](./SV-serve.md)

## 43-route surface

Organised by endpoint group:

### Workspace (8 routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/workspace/ast` | return current WorkspaceAST |
| GET | `/workspace/tools` | enumerate tools |
| GET | `/workspace/tool/{name}` | one tool's entry |
| GET | `/workspace/files` | list source files |
| GET | `/workspace/file/{path}` | read one source file |
| POST | `/workspace/validate` | validate the workspace |
| GET | `/workspace/hash` | workspace content hash |
| GET | `/workspace/doctor` | run doctor; return findings |

### Policy (7 routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/policy/current` | active policy metadata |
| POST | `/policy/generate` | compile workspace → IR |
| POST | `/policy/validate` | run 29 G-rules against IR |
| POST | `/policy/verify` | check IR hash matches expected |
| POST | `/policy/diff` | diff two IRs |
| GET | `/policy/ir` | download canonical IR bytes |
| GET | `/policy/findings` | last validation findings |

### Snapshot (9 routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/snap/current` | active snapshot metadata |
| GET | `/snap/list` | list known snapshots |
| POST | `/snap/promote` | promote new snapshot |
| POST | `/snap/rollback` | rollback to prior |
| GET | `/snap/healthz` | liveness |
| GET | `/snap/events` | SSE event stream |
| GET | `/snap/{id}` | one snapshot's metadata |
| DELETE | `/snap/{id}` | delete a non-current snapshot |
| POST | `/snap/verify` | verify snapshot integrity |

### Audit (6 routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/audit/chain` | tail the chain |
| GET | `/audit/verify` | run `verifyChain` |
| GET | `/audit/decision/{correlationId}` | fetch one decision cluster |
| GET | `/audit/events` | SSE stream of new entries |
| POST | `/audit/export` | bulk export for SIEM |
| GET | `/audit/findings` | verification findings |

### Approval (5 routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/approvals/pending` | list pending approval requests |
| POST | `/approvals/{handleId}/respond` | companion submits response |
| GET | `/approvals/{handleId}` | one approval's state |
| GET | `/approvals/subscribe` | SSE: new approval requests |
| GET | `/approvals/history` | past approvals |

### Fleet (4 routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/fleet/binding` | current fleet binding |
| POST | `/fleet/reload` | re-fetch from fleet admin |
| GET | `/fleet/verify` | verify signature |
| GET | `/fleet/events` | SSE: fleet binding changes |

### Health (4 routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/healthz` | liveness (always 200) |
| GET | `/readyz` | readiness (200 once ready) |
| GET | `/version` | daemon version + SDK version |
| GET | `/metrics` | Prometheus-format metrics |

## Auth model

Every request is subject to an auth challenge. Acceptable auth:

- **Bearer token** (default) — opaque token issued by fleet admin
- **Mutual TLS** — client certificate with identity in subject
- **Session cookie** — issued by `POST /auth/session`, bound to origin

Unauthenticated requests MUST return 401 with `WWW-Authenticate:
Bearer`.

## Error shape

Every error is JSON:

```json
{
  "error": {
    "code": "POLICY_INVALID",
    "message": "policy G-24 violated: R5 tool with fail-mode open",
    "correlationId": "u-abc-123"
  }
}
```

## Pagination

List endpoints use cursor pagination:

```
GET /audit/chain?limit=100&cursor=<opaque>
```

Response includes `next-cursor` header. No page numbers — cursor-based
only. See [../guides/session-model.md](../guides/session-model.md).
