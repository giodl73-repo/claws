---
pulse: 53
slug: snap-carve-out
plan: claws-pre-extraction-packaging
depends_on: [50]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S42]
stage: implementation
test_tiers:
  L0_unit: 22
  L1_integration: 6
  L2_e2e: 2
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk/packages/snap && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk/packages/snap && npx tsc --noEmit"
checkpoint: 11
---

# Pulse 53: Snap Carve-Out from claws-serve

## Objective

Carve `@bic/openclaw-snap` out of `claws-serve/` per the kept/dropped/merged route table (with counts verified against disk 2026-04-18: chunks-* is 6 files). HTTP-only surface (no library-first working-tree API — that was reverted from the spec). 9 kept endpoints. Creates cli-handlers/ subtree for 11 snap verbs (architect W1/W2 closure).

## Deliverables

- [ ] `claws-sdk/packages/snap/package.json` — name `@bic/openclaw-snap`; single root with `exports` field
- [ ] `claws-sdk/packages/snap/src/store/` — SnapshotStore interface + inMemoryStore + filesystemStore reference impls
- [ ] `claws-sdk/packages/snap/src/server/` — `startServer(opts): Promise<ServerHandle>` with 9 endpoints (POST /v1/snapshots, GET /v1/snapshots, GET /v1/snapshots/:id, POST /v1/snapshots/:id/promote, POST /v1/snapshots/:id/rollback, GET /v1/policy/current, GET /v1/resolve, GET /v1/snapshots/:id/resolve, GET /v1/healthz)
- [ ] HTTP-only surface — top-level exports: `SnapshotStore` (interface), `inMemoryStore`, `filesystemStore`, `startServer`, `StartServerOptions`. NO library-first `readWorkingTree`/`computeDraft`/`applyCheckout`/`clearStage` (reverted from spec)
- [ ] Promote precondition via S42 scenario fixture: 409 POLICY_NOT_GENERATED / POLICY_IR_MALFORMED / POLICY_IR_INCONSISTENT matrix handled
- [ ] `claws-sdk/packages/snap/src/cli-handlers/` — stub files for 11 verbs (stage-on/stage-off merged, status, diff-staged, discard-stage, upload, list, diff, checkout, promote, rollback, discard, serve) — thin argv→HTTP-client→render (architect W1 closure)
- [ ] Route table execution (steward ground-truth): `claws-serve/src/routes/` — **kept** routes (snapshot.ts, new /v1/resolve, /v1/healthz from health/status/events merge) migrate to snap package; **dropped-kept-internal** routes (6 chunks-_.ts files per fresh disk count, + compile, classify, diagnostics, diff, invalidate, loop-_, sessions, session-config, trust, allow-all, ir, ir-resolution, tensions, governance, batch, workqueue, schedule, patch-chunks, oc-generic, workspace-schema, admin-reset, error-sanitize) remain in claws-serve/ for bic/claws-internal product
- [ ] Peer-dep on `@bic/openclaw-workspace` (for /canonicalize promote precondition + /path for /v1/resolve)
- [ ] Peer-dep on `@bic/openclaw-guardrails/audit` (audit events on promote/rollback)
- [ ] Peer-dep on `@bic/openclaw-guardrails/identity` (caller-identity types)
- [ ] L0 tests itemized: 3 SnapshotStore conformance (inMemory + filesystem, per put/get/list/promote/rollback/current), 5 HTTP endpoint unit (one per kept endpoint group), 3 promote-precondition (presence, parse, self-consistency), 4 audit event shape on promote/rollback, 3 rate-limit + store failure fail-closed, 4 CLI handler argv-parsing = 22 L0
- [ ] L1 tests itemized: 2 store ↔ workspace/canonicalize chain, 2 server ↔ store (full request/response), 2 promote + audit cross-package = 6 L1
- [ ] L2 tests itemized: 1 full snapshot lifecycle (upload→promote→rollback with audit verify), 1 /v1/resolve round-trip (workspace/path URI composition) = 2 L2
- [ ] Zero `@craftworks/*` runtime imports

## Spec Amendment Absorption

If this pulse surfaces a gap in the proposal spec (main spec, one of the 4 package specs, or the plan) — **the amendment lands inside this pulse's commit**. No deferral, no follow-up pulse. Amendment SHA = pulse SHA.

Commit-message convention for in-pulse amendments:

```
<pulse-type>(<pulse-slug>): <summary>

Spec amendment absorbed in-pulse:
- target: <file>:<section>  (e.g. docs/claws/proposals/openclaw-upstream/snap.md §Semantics)
- trigger: <what surfaced the gap>
- fix: <one-line rationale>
```

Applies especially to cases where the carve-out reveals a gap in `snap.md` (an HTTP endpoint's response body shape, an error code not in the spec's 409 matrix, a SnapshotStore interface method missing or misnamed).

If the amendment crosses spec + plan (e.g., a subpath rename that affects both `snap.md` and `claws-pre-extraction-packaging.md`'s route table), both files are updated in the same commit.

Per the user "no deferrals" directive, this pulse cannot close with a known spec gap marked `TBD`, `// FIXME`, or tracked in `DEFERRED.md`. Either the spec is amended, or the pulse is extended until the amendment lands.

## Acceptance Criteria

- snap package shipped with HTTP-only surface (no library-first claims)
- 9 endpoints live; 409 precondition matrix covered
- cli-handlers/ stubs for 11 verbs
- Internal routes remain in claws-serve (dropped from snap per route table)
- L0: 22; L1: 6; L2: 2

## Governing Roles

- `craft:architect` — HTTP surface + peer-dep honesty (no library-first drift back in)
- `claws:gateway-eng` — promote precondition + 409 response matrix matches S42 scenario

## Dependencies

CP-10 gate (P50) passed. Parallel with P51/P52.

## Test Gates

L0: 22 itemized. L1: 6 cross-package chain. L2: 2 full lifecycle. 9-endpoint HTTP surface (no library-first). Zero @craftworks.
