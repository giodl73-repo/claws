---
pulse: 25
slug: fleet-kill
plan: claws-fleet-ops
depends_on: [20]
governing_roles: [claws:ciso, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
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

# Pulse 25: Fleet Kill Switch

## Objective

Implement the emergency kill switch for claws workspaces. The sentinel file path (`.claws/KILL`) is the primary kill mechanism — a "next-invocation block" where the next `claws check/build/watch` reads it and refuses to proceed. Fleet-wide kill iterates all discovered workspaces and activates the sentinel kill across the entire fleet.

**Scope note:** Sidecar HTTP and SIGTERM kill paths are future work requiring a gateway daemon (not in Anubis scope). They are documented as future paths but not implemented in this pulse.

Every kill activation is recorded in the audit chain with the path used, reason, actor, and timestamp. Double-kill prevention checks for an existing KILL sentinel before re-sending, avoiding redundant audit noise and potential race conditions.

## Deliverables

- [ ] `claws-sdk/src/fleet/kill.ts` — Sentinel file kill path: write `.claws/KILL` with timestamp + reason + actor to workspace; next `claws check/build/watch` reads sentinel and refuses to proceed. (Future paths documented but not implemented: sidecar HTTP POST to `/kill` endpoint, SIGTERM via `gateway.pid` — both require gateway daemon not in Anubis scope)
- [ ] `claws-sdk/src/fleet/kill-audit.ts` — Record KILL_ACTIVATED event in workspace audit chain (`.claws/audit.jsonl`): timestamp, kill path used (sentinel|sidecar|sigterm), reason, actor, workspace path
- [ ] `claws-sdk/src/fleet/kill-fleet.ts` — Fleet-wide kill: iterate all discovered workspaces via fleet scanner, activate kill on each, collect results (success/failure per workspace), report summary
- [ ] `claws-sdk/src/fleet/double-kill.ts` — Double-kill prevention: check for existing `.claws/KILL` sentinel before activating; if sentinel exists and is recent (within configured TTL), skip with "already killed" status; if sentinel is stale (beyond TTL), re-activate
- [ ] `claws-cli/src/commands/kill.ts` — CLI command: `claws kill [workspace] [--fleet] [--reason "..."]`
- [ ] `claws-sdk/tests/fleet/kill.unit.test.ts` — L0 unit tests (6 tests)
- [ ] `claws-sdk/tests/fleet/kill.integration.test.ts` — L1 integration tests (2 tests)
- [ ] `claws-sdk/tests/fleet/kill.e2e.test.ts` — L2 e2e: kill single workspace → verify .claws/KILL sentinel + audit.jsonl entry → kill --fleet on 3 fixtures → verify all governed workspaces have sentinel, audit chain complete
- [ ] `claws-sdk/tests/accept/e2e/fleet-kill.accept.test.ts` — L3 acceptance: kill switch reliability contract — sentinel blocks next invocation, double-kill within TTL returns already-killed, stale sentinel re-activated, audit event has all required fields

## Acceptance Criteria

- [ ] `claws kill ./workspace --reason "emergency"` writes `.claws/KILL` sentinel with reason and actor
- [ ] Sentinel file contains structured JSON: timestamp, reason, actor, kill path
- [ ] Sidecar HTTP and SIGTERM paths documented as future work (not implemented — require gateway daemon)
- [ ] `claws kill --fleet --reason "fleet emergency"` kills all workspaces in fleet
- [ ] KILL_ACTIVATED event is recorded in `.claws/audit.jsonl` for every kill activation
- [ ] Double-kill prevention: second kill on same workspace within TTL returns "already killed"
- [ ] Stale sentinel (beyond TTL) is re-activated with fresh timestamp
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/ciso.md` — kill switch governance, audit requirements, emergency procedures
- `.craft/roles/claws/gateway-eng.md` — gateway sidecar protocol, sentinel file format, PID management

## Dependencies

Pulse 20 (fleet-scan) — requires workspace discovery for fleet-wide kill iteration.

## Test Gates

- [ ] L0 unit (6 tests): sentinel write creates .claws/KILL with correct JSON, sentinel blocks next claws invocation (check/build/watch refuse to proceed), double-kill prevention skips recent sentinel, double-kill re-activates stale sentinel, audit event recorded with all required fields, sentinel JSON contains all required fields (timestamp, reason, actor, kill path)
- [ ] L1 integration (2 tests): kill on fixture workspace via sentinel path creates KILL file and audit event, fleet-wide kill activates across all discovered fixture workspaces
- [ ] L2 e2e (1 test): kill single workspace → verify sentinel + audit.jsonl → kill --fleet on 3 fixtures → verify all governed have sentinel + complete audit chain
- [ ] L3 acceptance (1 test): kill reliability contract — sentinel blocks invocation, double-kill within TTL returns already-killed, stale re-activated, audit fields complete
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
