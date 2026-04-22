---
pulse: 23
slug: fleet-broadcast
plan: claws-fleet-ops
depends_on: [20]
governing_roles: [claws:platform-eng, claws:compliance]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 23: Fleet Broadcast

## Objective

Implement fleet-level policy broadcast — pushing policy YAML files to all discovered governed workspaces with pre-broadcast validation, atomicity guarantees, monotonic trust enforcement, and retry semantics for Windows-specific transient failures (EBUSY, EPERM).

Broadcast is the distribution mechanism for fleet governance: when a CISO approves a new SOC2 policy, broadcast pushes it to every governed workspace in the fleet atomically. The `--confirm` gate ensures no accidental writes, and the `--reason` field creates an audit trail for every broadcast event. Monotonic tightening is enforced: broadcast cannot lower the trust floor of any workspace.

## Deliverables

- [ ] `claws-sdk/src/fleet/broadcast.ts` — Push policy YAML to discovered workspaces: pre-broadcast validation (policy is valid YAML, parseable as governance policy), atomic write via staging directory (write to `.claws/broadcast-staging/` temp dir, then atomic rename to target; orphaned-staging recovery on startup), retry on transient failure (EBUSY, EPERM on Windows, up to 3 retries with exponential backoff), skip permanent failures with error collection, `--confirm` gate (require explicit confirmation before any write), `--reason` field recorded in broadcast manifest
- [ ] `claws-sdk/src/fleet/trust-compat.ts` — Monotonic tightening enforcement: verify broadcast policy doesn't lower trust floor of any target workspace; trust floor only rises (T1→T2 allowed, T3→T2 blocked); return TrustCompatResult with per-workspace pass/fail and reason
- [ ] `claws-cli/src/commands/broadcast.ts` — CLI command: `claws broadcast [policy.yaml] [--fleet dir] [--confirm] [--reason "..."]`
- [ ] `claws-sdk/tests/fleet/broadcast.unit.test.ts` — L0 unit tests (6 tests)
- [ ] `claws-sdk/tests/fleet/broadcast.integration.test.ts` — L1 integration tests (3 tests)
- [ ] `claws-sdk/tests/fleet/broadcast.e2e.test.ts` — L2 e2e: scan fleet → broadcast soc2.yaml with --confirm --reason → verify policy landed only in GOVERNED workspaces, UNGOVERNED/MISCONFIGURED skipped, broadcast manifest has reason + audit trail
- [ ] `claws-sdk/tests/accept/e2e/fleet-broadcast.accept.test.ts` — L3 acceptance: atomicity + monotonic tightening contract — atomic write via staging dir, trust floor cannot be lowered, partial failure on one workspace doesn't block others

## Acceptance Criteria

- [ ] `claws broadcast soc2.yaml --fleet ./workspaces --confirm --reason "Q2 compliance"` pushes policy to all governed workspaces
- [ ] Pre-broadcast validation rejects invalid YAML and non-policy files
- [ ] Atomic write: files written to `.claws/broadcast-staging/` temp dir, then atomic rename to target; orphaned-staging recovery on startup
- [ ] EBUSY/EPERM on Windows triggers retry (up to 3, exponential backoff)
- [ ] Permanent failures (EACCES, ENOENT) are skipped with error collection, not fatal
- [ ] Without `--confirm`, broadcast prints what it would do and exits without writing
- [ ] `--reason` text is recorded in broadcast manifest for audit
- [ ] Trust compatibility check blocks broadcast that would lower trust floor
- [ ] Broadcast to UNGOVERNED or MISCONFIGURED workspaces is skipped with warning
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/platform-eng.md` — fleet architecture, atomic write patterns
- `.craft/roles/claws/compliance.md` — trust tier monotonicity, audit trail requirements

## Dependencies

Pulse 20 (fleet-scan) — requires workspace discovery, classification, and parallel runner infrastructure.

## Test Gates

- [ ] L0 unit (6 tests): atomic write via staging dir (files written to broadcast-staging then renamed), retry logic triggers on EBUSY, trust compat blocks trust floor downgrade, trust compat allows trust floor upgrade, confirm gate prevents write without flag, reason field stored in broadcast manifest
- [ ] L1 integration (3 tests): broadcast to 3 fixture workspaces pushes policy to governed only, transient failure (simulated EBUSY) is retried and succeeds, permanent failure (simulated EACCES) is skipped with error in result
- [ ] L2 e2e (1 test): scan fleet → broadcast soc2.yaml with --confirm --reason → verify policy in GOVERNED only, manifest has reason + audit
- [ ] L3 acceptance (1 test): atomicity + monotonic tightening contract — atomic staging write, trust floor cannot lower, partial failure isolation
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
