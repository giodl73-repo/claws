# CP-3 Consolidated Review — Round 1

**Panel**: gateway-eng, platform-eng, architect, CISO, compliance
**Type**: impl
**Round**: 1
**Date**: 2026-04-13
**Scope**: Snapshot system (P19-P21, P24) + Fleet operations (P20, P22-P23, P25-P27)

---

## Totals

| Role | Major | Warning | Note | Total |
|------|-------|---------|------|-------|
| gateway-eng | 4 | 8 | 7 | 19 |
| platform-eng | 4 | 8 | 6 | 18 |
| architect | 1 | 5 | 7 | 13 |
| CISO | 6 | 8 | 5 | 19 |
| compliance | 5 | 7 | 6 | 18 |
| **Raw total** | **20** | **36** | **31** | **87** |

After deduplication:

| Severity | Unique | Consensus (2+ roles) |
|----------|--------|---------------------|
| Major | 10 | 4 |
| Warning | ~20 | 6 |
| Note | ~18 | 3 |

---

## Consensus Majors (flagged by 2+ roles — fix required)

### CM1: Kill sentinel path mismatch [5/5 consensus]
- **Files**: `fleet/report.ts` reads `.claws/kill.json`, `fleet/kill.ts` writes `.claws/KILL`
- **Impact**: Fleet reports NEVER detect killed workspaces. Compliance matrix shows "active" for killed workspaces.
- **Fix**: Use `readSentinel()` from `kill.ts` in `report.ts` instead of ad-hoc file read.
- **Flagged by**: gateway M1, platform M-01, architect M1, CISO M1, compliance C1

### CM2: Broadcast events not recorded in audit chain [2/5 consensus]
- **Files**: `fleet/broadcast.ts`
- **Impact**: Audit chain is incomplete for the most common fleet operation. Kill and init are audited; broadcast is not.
- **Fix**: Record BROADCAST_APPLIED event to chain.jsonl per workspace after successful policy write.
- **Flagged by**: CISO M6, compliance C5

### CM3: Exception registry lacks authorization + pattern injection [3/5 consensus]
- **Files**: `fleet/exception.ts`
- **Impact**: (a) No approver validation — empty string accepted (SOC2 CC6.1 violation). (b) Substring matching — pattern "a" suppresses entire fleet. (c) Expired exceptions silently skipped, never purged.
- **Fix**: Validate approver non-empty, use glob matching instead of includes(), add expiry purge/reporting.
- **Flagged by**: CISO M2+M3, compliance C2+C3, platform W-07

### CM4: Severity classification fails open on null trust tier [2/5 consensus]
- **Files**: `fleet/severity.ts`, `fleet/drift.ts`
- **Impact**: When claws.json is deleted/unreadable, trust tier returns null, severity maps to LOW instead of CRITICAL. Violates fail-closed principle.
- **Fix**: Treat null/missing trust tier as CRITICAL (worst-case assumption).
- **Flagged by**: CISO M4, platform (implicit in M-02 hash discussion)

---

## Single-Role Majors (fix required)

### SM1: localeCompare non-deterministic hash ordering [platform M-02]
- **Files**: `fleet/drift.ts`, `snapshot/provenance.ts`
- **Impact**: `localeCompare` without explicit locale produces different sort order across platforms. Snapshots saved on one locale fail integrity on another.
- **Fix**: Use `localeCompare('en', { sensitivity: 'base' })` or plain `<`/`>` comparison for deterministic sorting.

### SM2: Serial fleet loops where runParallel exists [gateway M2, platform W-01..W-04]
- **Files**: `fleet/broadcast.ts`, `fleet/kill-fleet.ts`, `fleet/drift.ts`
- **Impact**: Fleet operations run serially when `runParallel` from `runner.ts` is already available. Won't scale to production fleet sizes.
- **Fix**: Use `runParallel` for broadcast, fleet-kill, and drift detection loops.

### SM3: Full fleet manifest leaked to every workspace [gateway M3]
- **Files**: `fleet/broadcast.ts`
- **Impact**: Broadcast manifest written to each workspace contains full fleet paths. O(n^2) disk writes + workspace path disclosure.
- **Fix**: Write per-workspace manifest with only that workspace's broadcast record.

### SM4: Provenance signer is unauthenticated string [CISO M5]
- **Files**: `snapshot/provenance.ts`
- **Impact**: Defaults to 'local', no cryptographic identity binding. Forgeable by anyone with filesystem access.
- **Fix**: Document as known limitation for v1. Future: HMAC-sign provenance with workspace key.

### SM5: Broadcast central log missing [compliance C4]
- **Files**: `fleet/broadcast.ts`
- **Impact**: Broadcast evidence is per-workspace only. If workspace is deleted, evidence is lost.
- **Fix**: Write fleet-level broadcast log to fleet manifest alongside per-workspace records.

### SM6: Hidden directory scanning gap [platform M-03]
- **Files**: `fleet/scan.ts`
- **Impact**: Workspaces under hidden parent directories (e.g., `.internal/project-a/`) are invisible to scan.
- **Fix**: Only skip `.git` and `node_modules`, not all hidden dirs.

---

## Warning Themes (deduplicated)

| Theme | Count | Roles |
|-------|-------|-------|
| Code duplication (loadGovernanceIR, collectFiles, readTrustTier, CLAWS_VERSION) | 6 | architect, platform |
| Serial loops should use runParallel | 4 | gateway, platform |
| Redundant manifest reads in diff/promote | 2 | gateway, platform |
| Unused imports | 1 | architect |
| Naive regex for YAML deny-rule detection | 1 | platform |

---

## Disposition

**Must fix before merge (10 Majors):**
- CM1 (sentinel path) — trivial fix, highest priority
- CM2 (broadcast audit) — moderate, add audit event
- CM3 (exception auth + pattern + expiry) — moderate, 3 sub-fixes
- CM4 (severity fail-open) — trivial, null → CRITICAL
- SM1 (localeCompare) — trivial, deterministic sort
- SM2 (serial→parallel) — moderate, use existing runParallel
- SM3 (manifest leak) — moderate, per-workspace manifest
- SM5 (broadcast central log) — moderate
- SM6 (hidden dir scanning) — trivial

**Accepted as known limitation:**
- SM4 (provenance signer) — document for v1, cryptographic signing is future work

**Warnings:** Address during fix pass where they overlap with Majors (dedup helpers, unused imports). Remaining warnings are tracked but don't block.

---

## Next Step

Dispatch fix agents for the 9 actionable Majors, then re-review (Round 2) to confirm resolution.
