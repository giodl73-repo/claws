---
pulse: 13
slug: audit-wal-recovery
plan: claws-comply-audit
depends_on: [11]
governing_roles: [claws:ciso, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 13: Audit WAL Recovery

## Objective

Write-ahead log for crash recovery. WAL persists approvalStartTime so approval timeout does NOT reset on crash. Remaining time = originalTimeout - (now - approvalStartTime). Crash cannot be exploited to extend the approval window. Uses monotonic time source (process.hrtime.bigint()) for timeout computation. System clock adjustments (NTP sync, DST) cannot extend the approval window.

The WAL is an append-only JSONL file at `.claws/audit/wal.jsonl`. Each WAL entry records the approval start time, original timeout duration, and operation context. On recovery, the WAL is replayed to reconstruct in-flight approval states. The remaining timeout is computed as `originalTimeout - (process.hrtime.bigint() - approvalStartTime)` — if this value is zero or negative, the approval has expired and must be rejected. This prevents a crash-restart attack where an adversary could repeatedly crash the process to reset the approval timer and gain unlimited time to tamper with pending approvals.

After a successful approval completes (approved or rejected), the corresponding WAL entry is cleaned up to prevent unbounded file growth.

## Deliverables

- [ ] `claws-sdk/src/audit/wal.ts` — WAL: persist approvalStartTime, recover remaining timeout on crash, append-only file at .claws/audit/wal.jsonl. HMAC-sign WAL entries with workspace audit key for tamper detection
- [ ] `claws-sdk/tests/audit/wal.unit.test.ts` — L0: WAL persists approvalStartTime (1), recovered timeout = original - elapsed (1), crash does not reset timeout (1), system clock adjustment does not extend approval timeout (1)
- [ ] `claws-sdk/tests/audit/wal.integration.test.ts` — L1: full WAL lifecycle: write → simulate crash → recover → verify remaining timeout (1), WAL cleanup after successful approval (1)

## Acceptance Criteria

- [ ] WAL file created at `.claws/audit/wal.jsonl` on first approval
- [ ] approvalStartTime persisted before approval processing begins
- [ ] On recovery: remaining time = originalTimeout - (now - approvalStartTime)
- [ ] Expired approvals (remaining <= 0) are rejected on recovery
- [ ] WAL entries cleaned up after successful approval completion
- [ ] WAL file uses append-only JSONL format (one JSON object per line)
- [ ] WAL timeout uses monotonic time source, not Date.now()
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/ciso.md` — crash recovery security, approval timeout integrity, WAL design
- `.craft/roles/claws/platform-eng.md` — file I/O patterns, JSONL format, crash recovery implementation

## Dependencies

- Pulse 11 (audit-chain-foundation) — provides AuditEntry types and chain append primitives

## Test Gates

- [ ] L0 unit (4 tests): WAL persists approvalStartTime (1), recovered timeout = original - elapsed (1), crash does not reset timeout (1), system clock adjustment does not extend approval timeout (1)
- [ ] L1 integration (2 tests): full WAL lifecycle: write → simulate crash → recover → verify remaining timeout (1), WAL cleanup after successful approval (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
