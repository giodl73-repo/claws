---
pulse: 9
slug: security-hardening-race
plan: claws-protect
depends_on: []
governing_roles: [claws:ciso, claws:platform-eng]
scenario_codes: [injection-defense/S04, injection-defense/S05, injection-defense/S06]
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 09: Security Hardening — Race Conditions & Bypass Consolidation

## Objective

Address two THOTH-FINDINGS related to race conditions and module divergence:

**D-03 (file lock TOCTOU race in rotate.ts and registry.ts):** Both `rotate.ts` and `registry.ts` implement file locking with a read-check-delete-recreate pattern that is vulnerable to time-of-check-to-time-of-use (TOCTOU) races. Between the existence check and the lock file creation, another process can acquire the lock, leading to concurrent mutations of key material or registry state. Fix: replace the multi-step lock pattern with a single-attempt `O_EXCL` (exclusive create) flag on `fs.open`. `O_EXCL` is atomic at the filesystem level — if the file exists, the open fails immediately. No read-check-delete sequence needed.

**D-04/A-02 (two bypass evaluation modules can diverge):** `config/bypass.ts` and `init/bypass.ts` both implement bypass evaluation logic (determining whether a tool invocation should skip governance checks). They were written independently and have subtly different edge-case handling. If one is updated without the other, bypass decisions diverge — a tool might be bypassed in config context but enforced in init context, or vice versa. Fix: consolidate into a single `config/bypass.ts` module that both config and init paths import. Delete `init/bypass.ts` and update all import sites.

## Deliverables

- [ ] `claws-sdk/src/keys/rotate.ts` (EDIT) — replace read-delete-recreate lock with `fs.open(lockPath, O_CREAT | O_EXCL | O_WRONLY)`. On success, write PID to lock file. On EEXIST error, throw "lock held by another process". Release by unlinking lock file in finally block. Check if PID in lock file is still alive via `process.kill(pid, 0)`. If process is dead, lock is stale and reclaimable. Add configurable lock timeout (default 60s).
- [ ] `claws-sdk/src/keys/registry.ts` (EDIT) — replace file lock with identical `O_EXCL` pattern matching rotate.ts. Same error handling, same PID write, same finally-unlink release.
- [ ] `claws-sdk/src/config/bypass.ts` (EDIT) — consolidate with `init/bypass.ts` into single bypass evaluation module. Merge all bypass rules from both modules. Export `evaluateBypass(tool, context): BypassDecision`. Update all import sites that referenced `init/bypass.ts` to import from `config/bypass.ts`.
- [ ] `claws-sdk/tests/keys/lock-toctou.unit.test.ts` — L0: concurrent lock acquisition with O_EXCL — second attempt fails with EEXIST (1 test), lock release via unlink allows re-acquisition (1 test), stale lock detected when PID is dead (1 test)
- [ ] `claws-sdk/tests/config/bypass-consolidated.unit.test.ts` — L0: single bypass module evaluates config-path scenario correctly (1 test), single bypass module evaluates init-path scenario identically — no divergence (1 test)
- [ ] `claws-sdk/tests/keys/lock-toctou.integration.test.ts` — L1: concurrent rotation attempts — first succeeds, second gets lock-held error, both complete without corruption (1 test), bypass evaluation matches across init and config paths — same inputs produce same BypassDecision (1 test)
- [ ] `claws-sdk/tests/protect/security-hardening-race.e2e.test.ts` — L2: full race condition and bypass consolidation pipeline — O_EXCL locking under concurrent access, stale lock recovery, and unified bypass evaluation across config and init paths
- [ ] `claws-sdk/tests/protect/security-hardening-race.accept.test.ts` — L3: SDK acceptance — consumer exercises file locking and bypass evaluation through public APIs and validates atomic lock semantics and consistent bypass decisions

## Acceptance Criteria

- [ ] File lock uses `O_EXCL` atomic create — no read-check-delete sequence
- [ ] Concurrent lock acquisition fails immediately with descriptive error (not silent corruption)
- [ ] Lock file contains PID for debugging stale locks
- [ ] Stale lock from crashed process is detected and reclaimable
- [ ] Lock release via unlink allows subsequent acquisition
- [ ] Single bypass evaluation module at `config/bypass.ts` — no `init/bypass.ts`
- [ ] All init-path bypass evaluations produce identical results to config-path evaluations
- [ ] No import sites reference `init/bypass.ts` after consolidation
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/ciso.md` — TOCTOU threat model, file locking security requirements
- `.craft/roles/claws/platform-eng.md` — Node.js fs.open flags, O_EXCL semantics, module consolidation patterns

## Dependencies

None (no dependency on protect-types).

## Test Gates

- [ ] L0 unit (5 tests): O_EXCL concurrent lock fails (1), lock release allows re-acquisition (1), stale lock detected when PID is dead (1), consolidated bypass evaluates config-path correctly (1), consolidated bypass evaluates init-path identically (1)
- [ ] L1 integration (2 tests): concurrent rotation with O_EXCL (1), bypass evaluation consistency across paths (1)
- [ ] L2 e2e (1 test): full race condition and bypass consolidation pipeline end-to-end
- [ ] L3 accept (1 test): SDK acceptance — file locking and bypass evaluation through public APIs
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
