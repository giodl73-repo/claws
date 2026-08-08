# R1 — claws:ciso Review — CP-3 Snapshot & Fleet Operations

**Reviewer**: claws:ciso (enterprise security posture guardian)
**Scope**: Snapshot system (manifest, integrity, storage, save, restore, diff, promote, provenance, fleet-registry) and Fleet operations (scan, classify, drift, severity, exception, broadcast, trust-compat, kill, kill-audit, kill-fleet, double-kill, report, compliance-matrix, report-format)
**Lens**: Can I show this to an auditor and sleep at night?

---

## Summary

The CP-3 implementation delivers a structurally sound governance snapshot and fleet management system. SHA-256 integrity verification, HMAC-signed audit trails, monotonic trust tightening, and atomic broadcast writes are all present. However, several findings require attention before this system is auditor-ready. The kill switch sentinel file path is inconsistent between modules, the exception registry lacks authorization controls, provenance uses symmetric HMAC rather than asymmetric signatures, and the compliance report conflates drift with compliance failure in ways that could mislead auditors.

---

## Findings

### MUST Fix

| #   | Severity | File                  | Line(s)        | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------- | --------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | CRITICAL | `fleet/report.ts`     | 144-155        | **Kill sentinel path mismatch — report reads `kill.json`, kill module writes `KILL`.** `readKillStatus()` checks for `.claws/kill.json` but `kill.ts:59` defines the sentinel as `.claws/KILL` (no extension). The report will _never_ detect an active kill. Every fleet compliance report presented to an auditor will show "active" for killed workspaces. This is a data integrity bug in the compliance artifact that auditors rely on.                                                              |
| M2  | HIGH     | `fleet/exception.ts`  | 32-56          | **Exception matching is overly broad — substring match allows pattern injection.** `matchException()` uses `normalizedPath.includes(pattern)` which means a pattern like `"a"` would suppress drift for _every_ workspace containing the letter "a" in its path. An exception pattern of `""` (empty string) suppresses the entire fleet. There is no validation on pattern specificity. An attacker (or careless admin) adding a broad pattern silently disables governance monitoring across the fleet. |
| M3  | HIGH     | `fleet/exception.ts`  | 96-106         | **Exception registry has no authorization or approval verification.** `addException()` writes directly to disk with no signature, no approval chain verification, no audit trail entry. Anyone with filesystem access can add an exception that suppresses drift detection for any workspace. For an artifact that the CISO presents to auditors ("here's why we approved this deviation"), the exception itself must be signed and recorded in the audit chain.                                          |
| M4  | HIGH     | `fleet/severity.ts`   | 61-75          | **Trust tier downgrade detection returns 'same' when either tier is null — masks CRITICAL drift.** If `readTrustTier()` returns null for either workspace (e.g., corrupted claws.json), `detectTrustTierChange()` returns `'same'`, which degrades the severity to LOW. A workspace that had its claws.json deleted (tier becomes null) should be CRITICAL, not LOW. Fail-closed means: if we _can't read_ the trust tier, we assume the worst, not the best.                                             |
| M5  | HIGH     | `snapshot/promote.ts` | 29-30, 202-208 | **Provenance signer field is an unauthenticated string — no cryptographic binding to identity.** The `signer` field defaults to `'local'` and is a plain string with no signature or token. An attacker who compromises the fleet registry can forge provenance with any signer value. For legal discovery, provenance must be tied to a verifiable identity (HMAC-signed at minimum, PKI-signed ideally).                                                                                                |
| M6  | HIGH     | `fleet/broadcast.ts`  | 383-399        | **Broadcast manifest is not recorded in the audit chain.** Every broadcast writes a `broadcast-manifest.json` to the workspace, but never appends a BROADCAST event to the `.claws/audit/chain.jsonl`. The audit chain is the CISO's single source of truth for governance events. If broadcast events are missing from the chain, the chain is incomplete and an auditor will flag the gap.                                                                                                              |

### WARN

| #   | Severity | File                         | Line(s) | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------- | ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | MEDIUM   | `snapshot/save.ts`           | 22      | **Hardcoded SDK version `'0.36.0'` duplicated across save.ts:22 and promote.ts:29.** Version drift between these two constants means snapshots saved by one version and promoted by another will have inconsistent version metadata. Should be a single source of truth (e.g., imported from package.json or a shared constant).                                                                                                         |
| W2  | MEDIUM   | `fleet/drift.ts`             | 70-81   | **hashFile reads as utf-8 and normalizes line endings — binary policy files will be corrupted.** If a policy directory ever contains a binary file (e.g., a signed certificate, a binary policy blob), reading as utf-8 with CRLF normalization will produce incorrect hashes. Hash computation should operate on raw bytes and normalize only for known text extensions.                                                                |
| W3  | MEDIUM   | `snapshot/integrity.ts`      | 71-75   | **workspaceHash computation concatenates hex strings without delimiters — theoretical collision risk.** `computeWorkspaceHash()` joins SHA-256 hex digests directly. While hex digits are fixed-length (64 chars), if the scheme ever supports variable-length hashes, this becomes exploitable. Best practice: join with a delimiter (e.g., newline) or length-prefix each hash. Low risk today but flagged for defense-in-depth.       |
| W4  | MEDIUM   | `fleet/broadcast.ts`         | 183-231 | **Atomic write fallback to copyFile loses atomicity guarantee.** When all rename retries fail, `atomicWritePolicy()` falls back to `copyFile()` at line 220. `copyFile` is not atomic — a crash during copy leaves a partial file. The fallback should either be documented as degraded-mode or the operation should fail hard. For governance files, partial writes are worse than failed writes.                                       |
| W5  | MEDIUM   | `fleet/report.ts`            | 189-198 | **Compliance matrix marks any drift as 'fail' regardless of severity.** `buildComplianceMatrix()` at line 198 marks a framework cell as `fail` whenever `drift.driftDetected && !drift.suppressed`, even for LOW severity drift (e.g., a metadata change). A SOC2 auditor seeing FAIL for a cosmetic config change undermines report credibility. Severity should influence the compliance status.                                       |
| W6  | MEDIUM   | `fleet/kill-fleet.ts`        | 56-82   | **Fleet kill iterates sequentially — slow at scale and no rollback on partial failure.** `killFleet()` activates kills one-by-one. For 47 workspaces this is tolerable, but the lack of parallelism means a fleet kill during an active incident takes longer than necessary. More importantly, there is no rollback mechanism if the kill fails partway through — some workspaces are killed, others are not, with no way to reconcile. |
| W7  | MEDIUM   | `snapshot/fleet-registry.ts` | 56-72   | **nextVersion() uses readdir + max which is subject to TOCTOU race.** Two concurrent promotions could read the same version number and overwrite each other. For a fleet registry that's the authoritative source of promoted governance snapshots, this is a data integrity risk. Should use a lock file or atomic counter.                                                                                                             |
| W8  | MEDIUM   | `snapshot/diff.ts`           | 338-398 | **diff() reads manifests twice — once for verification, once for timestamps.** Lines 344-351 read and verify manifests, then lines 365-366 re-read the same manifests. This is a TOCTOU window where a manifest could be modified between reads. The verified manifest should be reused, not re-read.                                                                                                                                    |

### NOTE

| #   | Severity | File                         | Line(s) | Finding                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------- | ---------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | LOW      | `snapshot/provenance.ts`     | 1-25    | **PromoteProvenance type lacks a `chainHash` field linking to the previous provenance entry.** For a tamper-evident provenance chain (analogous to a blockchain), each provenance record should hash the previous one. Currently, provenance records are independent — an attacker can delete or reorder entries without detection.                            |
| N2  | LOW      | `fleet/scan.ts`              | 97-109  | **Hidden directory scanning skips all dot-dirs except `.cursor` — may miss `.claws` directories at scan root.** The scan correctly finds `.claws` inside workspace roots (since it checks markers first), but if someone nests workspaces under a `.hidden` directory, those workspaces will never be discovered. Document this limitation.                    |
| N3  | LOW      | `claws-cli/commands/kill.ts` | 21-34   | **Kill command has no `--confirm` gate — single invocation kills immediately.** Broadcast has a `--confirm` flag (default false) requiring explicit opt-in. Kill does not. For the most destructive operation in the system, requiring `--confirm` (or at minimum `--yes`) is expected by security auditors as a safeguard against accidental fleet-wide kill. |
| N4  | LOW      | `fleet/report-format.ts`     | 40-84   | **CSV output does not escape values containing CRLF within fields.** `csvEscape()` handles commas, quotes, and newlines in its detection, but the escaping only wraps in quotes without normalizing embedded newlines. Some spreadsheet parsers will interpret embedded newlines as row breaks even inside quoted fields.                                      |
| N5  | LOW      | `snapshot/storage.ts`        | 21-23   | **Snapshot name is used directly in path construction with no sanitization.** `snapshotDir()` joins the name directly into the path. A malicious name like `../../etc` would escape the snapshots directory. Input validation should reject names containing path separators or `..`.                                                                          |

---

## Audit Chain Assessment

The audit chain infrastructure (`audit-chain.ts`, `artifact-signer.ts`) is well-designed:

- HMAC-SHA256 signing with constant-time verification (prevents timing attacks)
- Length-prefixed signable payload (prevents delimiter confusion attacks)
- Sequential numbering with append-only semantics
- Key rotation support via `keyId` field

However, the chain is incomplete because **broadcast events and exception changes are not recorded** (M6, M3). The kill switch correctly integrates with the audit chain (kill-audit.ts). For SOC2/HIPAA audit evidence, every governance-modifying action must appear in the chain.

## Kill Switch Assessment

The kill switch architecture (sentinel file + double-kill prevention + fleet-wide kill + audit trail) is fundamentally sound. Key strengths:

- Sentinel file is simple and fail-safe (any reader can check)
- Double-kill TTL prevents redundant activations
- Audit events are HMAC-signed

Key gaps:

- M1: Report module reads the wrong file path
- N3: No confirmation gate on the most destructive operation
- The "sidecar" and "sigterm" kill paths are documented but not implemented — this should be explicitly communicated in compliance reports as "sentinel-only" capability

## Compliance Reporting Assessment

The three-format output (CSV, JSON, table) is good for different stakeholder needs. The compliance matrix concept is sound. However:

- M1: Kill status is always wrong (path mismatch)
- W5: Low-severity drift incorrectly shows as compliance failure
- The matrix ties compliance status to drift, but an auditor expects compliance status tied to _policy enforcement checks_, not just hash comparison

---

## Verdict

**6 MUST-fix findings** block auditor sign-off. The M1 sentinel path mismatch is the most urgent — it means every fleet report misrepresents kill status. M2-M3 (exception registry security), M4 (severity fail-open), M5 (unsigned provenance), and M6 (incomplete audit chain) must all be addressed before this system can serve as compliance evidence.

The architecture is sound and the code quality is high. These are design-level gaps, not implementation bugs (except M1 which is a straightforward path mismatch). Once addressed, this system will be auditor-ready.
