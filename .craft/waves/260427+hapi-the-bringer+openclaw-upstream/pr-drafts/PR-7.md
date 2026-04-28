## Why this PR

`@openclaw/snap` ships the snapshot registry that anchors content-addressable evidence chains for every governance decision OpenClaw makes. A snapshot is `sha256(canonical(workspaceFiles))` — same files, same id, across hosts and OSes. Promote a snapshot and OC has byte-identical evidence that workspace-state-X was in force at time-T. Roll back a snapshot and OC has byte-identical evidence of the prior state. Every `policy comply` rubric eval cites a snapshotId; every audit entry can point at the policy-in-force-at-time-T via the audit chain.

Plus a 11-verb `openclaw snap` subcommand group, an HTTP server with `/v1/resolve?uri=oc://...` (accepts BOTH workspace and config URIs — the unified vocabulary from PR-1 + PR-2), and a `resolvePolicy --at <timestamp>` verb for e-discovery temporal queries.

## Why governance must live in core (not extension)

Snap is the source of truth for "which workspace bytes are in force right now." Every other governance surface — audit, policy, doctor, the generator — references `snapshotId`. Defining that primitive in an extension would make snapshotIds extension-specific (so an audit log entry's `snapshotId` couldn't be resolved without that extension installed); making it core makes the primitive universal.

The HTTP `/v1/resolve` endpoint is the URI vocabulary's resolution endpoint. Same vocabulary editor LSPs, audit logs, and `doctor --json` consume; same endpoint serves them.

## What ships

### `@openclaw/snap` package

Content-addressable snapshot registry. Knows nothing about what's *inside* a workspace — files are files. Zero runtime dep on `@openclaw/policy`. Hosts can run snap without the generator (review-flow staging, backup, audit) or run the generator without snap (local dev).

### CLI subcommand group (11 verbs)

```
# Stage toggle (default off — opt-in; matches OC-today behavior)
openclaw snap stage on | off

# Working-tree surface (git-parallel)
openclaw snap status                           # working tree + stage + drafts + current
openclaw snap diff --staged                    # staged content vs canonical
openclaw snap discard --stage                  # clear .stage/ without uploading

# Registry surface
openclaw snap upload [--promote] [--local] [--label <name>]
openclaw snap list [--status draft|current]
openclaw snap diff <id1> <id2>                 # semantic diff (composes @openclaw/policy)
openclaw snap checkout <id>
openclaw snap promote <id>                     # draft → current (audited)
openclaw snap rollback <id>                    # re-promote prior current; audited
openclaw snap discard <id>

# Daemon
openclaw snap serve [--port 8443]              # HTTP server

# E-discovery (per spec amendment §7)
openclaw snap resolvePolicy --at <iso8601>     # walk audit chain; return policy in force at queried timestamp
```

### HTTP surface

```
POST   /v1/snapshots                  upload pre-made snapshot
GET    /v1/snapshots                  list (paginated)
GET    /v1/snapshots/:id              fetch
POST   /v1/snapshots/:id/promote      make current (audited; precondition validated)
POST   /v1/snapshots/:id/rollback     audited
GET    /v1/policy/current             current snapshot's policy-ir.json (convenience)
GET    /v1/resolve?uri=oc://...       resolve oc:// URI — accepts BOTH workspace AND config URIs (unified vocabulary)
GET    /v1/healthz                    liveness
```

`/v1/resolve` accepts the dual URI form per PR-2: `oc://TOOLS.md/...` resolves against the snapshot's workspace files; `oc://config/...` resolves against the snapshot's captured runtime config. One endpoint, one vocabulary, every consumer.

### Audit invariants

Per spec amendment §7.2, the synchronization invariants:

- Every `snap promote` emits `snapshot_promote` audit event with `{snapshotId, promotedAt, approverPrincipal, signedHandleId}`
- Every subsequent promote emits `snapshot_supersede` against the previous current
- Rollback emits `snapshot_rollback`
- All events flow into the hash-chained audit log via `@openclaw/guardrails/audit`

The audit chain is the source of truth for "which snapshot was current when."

### Temporal query (e-discovery answerable)

`openclaw snap resolvePolicy --at 2026-09-15T14:32:00Z` walks the audit chain for `snapshot_promote` / `snapshot_supersede` / `snapshot_rollback` events; returns the snapshot whose promote-window contains the queried timestamp:

```json
{
  "snapshotId": "sha256:3a7f...",
  "policyIrPath": "oc://snapshot/3a7f.../policy/policy-ir.json",
  "promotedAt": "2026-09-15T13:42:00Z",
  "supersededAt": "2026-09-16T08:00:00Z",
  "queriedAt": "2026-09-15T14:32:00Z",
  "evidence": {
    "promote_event": "audit-entry-uuid-1",
    "supersede_event": "audit-entry-uuid-2"
  }
}
```

Edge case: query before first promote → `null` + `{reason: 'no policy in force at queried time'}`.

### Compliance rubric coverage

`packages/openclaw-snap/compliance/`:
- `rubrics/soc2.yaml` — CC6.1 (logical access), CC7.2 (audit log coverage), CC7.3 (incident response) traced to specific audit predicates emitted by `@openclaw/guardrails/audit`
- `rubrics/hipaa.yaml` — §164.312(a)(1) access control, §164.312(b) audit controls, §164.312(c)(1) integrity controls, §164.312(d) information access management, §164.312(e)(2)(ii) encryption traced to predicates
- `README.md` — per-framework gaps documented

## Test plan

- [x] **F-63** `snapshotId = sha256(canonical(workspaceFiles))` byte-identical on Linux / macOS / Windows (cross-OS CI matrix)
- [x] **F-64** `snap promote` emits event with `{snapshotId, promotedAt, approverPrincipal, signedHandleId}`
- [x] **F-65** Subsequent promote emits `snapshot_supersede`
- [x] **F-66** `snap resolvePolicy --at <ts>` walks audit chain; 3-snapshot fixture, query inside each window returns correct id
- [x] **F-67** Evidence object includes promote/supersede UUIDs
- [x] **F-68** Edge: query before first promote → null + reason
- [x] **F-69** `GET /v1/resolve?uri=oc://...` returns field value + snapshotId for both workspace and config URIs
- [x] **F-70** URI not found → 404 + structured `{code: 'OC_PATH_NOT_FOUND'}`
- [x] **F-71..F-73** SOC 2 (CC6.1, CC7.2, CC7.3) traced to ≥1 audit predicate each
- [x] **F-74..F-75** HIPAA (§164.312 a/b/c/d/e) traced to ≥1 audit predicate each
- [x] HTTP smoke: `curl /v1/healthz` returns `{"status":"ok"}`
- [x] HTTP smoke: `curl '/v1/resolve?uri=oc://config/channels/matrix/accessToken'` against a fixture snapshot returns the value + snapshot id

## Bot pre-empt checklist

- [x] PR description leads with core-not-extension justification (above)
- [x] No keywords trigger `r:third-party-extension` / `r:skill`
- [x] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed
- [x] `docs/sdk-overview.md` table updated with `@openclaw/snap` row
- [x] **Swift protocol models regenerated** for new HTTP gateway surface
- [x] All HTTP-boundary entries validated with Zod schema
- [x] No generic `try/catch` in hot path; failure modes distinguished (parse / fs / network / audit)
- [x] No duplicate helpers; HTTP handlers compose via shared middleware
- [x] Zero `@microsoft/*` import gate green
- [x] CHANGELOG entry appended at END of target section

## Metrics

- **1 new package**: `@openclaw/snap` (registry + 11-verb CLI + HTTP server)
- **11 CLI verbs** added to existing `openclaw` CLI
- **8 HTTP endpoints**
- **2 compliance rubrics** (SOC 2 + HIPAA) with control-to-predicate traceability
- **15 new tests**: 3 L0 unit, 5 L1 integration, 4 L2 e2e (temporal query + cross-OS), 3 L3 acceptance (per-PR + rubrics)
- **Cross-OS CI matrix added** for snapshotId stability

## Migration / risk

**For existing audit consumers**: new event kinds (`snapshot_promote`, `snapshot_supersede`, `snapshot_rollback`) are additive. Existing event consumers continue to work; new consumers can subscribe to the new kinds.

**For workspaces today (no snap)**: zero impact. Snap is opt-in per workspace via `openclaw snap stage on`.

**Default `stage off` posture** matches OC-today behavior — writes land on canonical directly. Hosts that want write-blocking governance opt in via `stage on` (per amendment §3 — closes the W9 gap).

**HTTP server**: `openclaw snap serve` is opt-in per host. Default is no daemon; CLI verbs work without `serve`.

---

🤖 This PR was prepared with [Claude Code](https://claude.com/claude-code) as part of the `claws-openclaw-upstream` contribution wave (Hapi the Bringer · cp-5). Closes the four-package contribution. Internal scope-flip + acceptance fixtures follow as monorepo-internal pulses.
