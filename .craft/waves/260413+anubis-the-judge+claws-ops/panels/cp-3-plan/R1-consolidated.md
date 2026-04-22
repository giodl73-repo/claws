---
review_round: R1
checkpoint: 3
type: plan-review
panel:
  - claws:gateway-eng
  - claws:platform-eng
  - craft:architect
  - claws:ciso
date: 2026-04-12
status: complete
---

# CP-3 Plan Review — R1 Consolidated

**Panel**: claws:gateway-eng, claws:platform-eng, craft:architect, claws:ciso
**Scope**: Pulses 19-27 (Snapshot + Fleet)
**Review focus**: Manifest integrity, semantic diff cost, broadcast atomicity, kill path reliability, fleet concurrency, drift determinism, CI feasibility

---

## Major Findings

### M-01: Snapshot manifest format underspecified — no schema version or migration path
**Pulse**: 19 (snap-save-restore)
**Role**: craft:architect, claws:ciso

The SnapshotManifest type includes `files[]`, `SHA-256 hashes`, `timestamp`, `clawsVersion`, and `workspaceHash`, but no schema version field. When the manifest format inevitably evolves (e.g., adding provenance in P24, or future fields for signing), older snapshots become unreadable or silently misinterpreted. This is a data format that persists on disk and is consumed across multiple operations (diff, promote, restore).

**Recommendation**: Add `schemaVersion: number` to manifest.json (starting at 1). Pulse 19 deliverables must specify the version field and Pulse 24 (promote) must validate it.

---

### M-02: Semantic diff requires double compilation — no cheaper path specified
**Pulse**: 21 (snap-diff)
**Role**: claws:gateway-eng, craft:architect

The pulse states: "compile both snapshots through the analysis pipeline and compare the resulting GovernanceIR." For any non-trivial workspace, this means invoking the full parse-extract-analyze pipeline twice per diff. The CP-3 exit criteria require diff to be part of the e2e loop (P27), and the <120s budget for 3 workspaces (line 39 of cp-3.md) will be consumed almost entirely by six compilations (2 snapshots x 3 workspaces).

The pulse plan has no discussion of:
- Caching compiled IR alongside the snapshot at save time (so diff only loads, never recompiles)
- A fast-path hash comparison that skips compilation when file hashes are identical

**Recommendation**: Amend P19 to save the compiled GovernanceIR *inside* the snapshot directory (it's already listed as a captured file but not explicitly compiled fresh at save time). Amend P21 to load pre-compiled IR from both snapshots instead of recompiling. This eliminates the double-compilation cost and makes diff O(IR-size) instead of O(compile-time).

---

### M-03: Broadcast atomicity claim is not achievable with the specified write sequence
**Pulse**: 23 (fleet-broadcast)
**Role**: claws:platform-eng, claws:ciso

The pulse claims "manifest atomicity (write manifest.json first with planned changes, then write files, verify after)." This is not atomic — it is a two-phase write without rollback. If power loss or a crash occurs after writing manifest.json but before writing all policy files, the workspace is left in an inconsistent state: the manifest claims files were written, but they don't exist (or are partial).

True atomicity on a filesystem requires either:
1. Write-to-temp + atomic rename (rename is atomic on NTFS and ext4)
2. A journal/WAL that can detect incomplete writes on next read

The current plan also doesn't address what happens when the verify-after step fails (files exist but don't match manifest). There is no rollback or cleanup specified.

**Recommendation**: Amend P23 to use write-to-temp-dir + atomic rename for each workspace. Write all policy files to `.claws/broadcast-staging/`, write manifest, then rename staging to final location. On failure, delete staging dir. Add a recovery procedure for "orphaned staging dirs found on next scan."

---

### M-04: Kill sentinel file reliability — agent may not poll the filesystem
**Pulse**: 25 (fleet-kill)
**Role**: claws:gateway-eng

The sentinel file path (`.claws/KILL`) assumes that a running gateway process or agent actively polls the filesystem for this file. The pulse plan does not specify:
- Who reads the KILL file and at what frequency
- What happens if the agent framework has no filesystem polling (e.g., Bedrock agents, LangGraph running remotely)
- The expected latency between KILL file creation and actual execution halt

For the sidecar HTTP path, the plan assumes a running sidecar process on a known port, but the sidecar may not be running (claws is a compile-time tool today, not a runtime daemon).

For the SIGTERM path, `gateway.pid` implies a long-running process, but current claws architecture is batch-mode (compile and exit), not daemon-mode.

**Recommendation**: Amend P25 to explicitly document the gateway polling contract (when it exists) and for the current batch-mode architecture, clarify that sentinel-file is a "next-invocation block" (the KILL file prevents the next `claws compile` or `claws check` from proceeding, rather than interrupting a running agent). Sidecar and SIGTERM paths should be marked as "future: requires gateway daemon" in the deliverables so they don't block the pulse with unimplementable features.

---

### M-05: Drift hash composition is not deterministic across platforms
**Pulse**: 22 (fleet-drift)
**Role**: claws:platform-eng, claws:ciso

The pulse specifies "SHA-256 of concatenated hashes of claws.json + policies/ files + governance-ir.json." This composite hash is sensitive to:
1. **File enumeration order**: `policies/` directory listing order differs between NTFS (case-insensitive, insertion-ordered) and ext4 (inode-ordered). If hashes are concatenated in directory listing order, the same workspace produces different composite hashes on Windows vs Linux.
2. **Line endings**: Git checkout on Windows may convert LF to CRLF in JSON/YAML files, changing file hashes even though content is semantically identical.
3. **JSON key ordering**: If governance-ir.json is regenerated (not byte-copied), JSON.stringify key order may differ.

A hash that varies by platform breaks fleet operations in mixed-OS environments (common: CI on Linux, dev on Windows).

**Recommendation**: Amend P22 to specify: (a) files are sorted lexicographically by relative path before hash concatenation, (b) hashes are computed on the raw bytes as stored (not after normalization — normalization creates its own problems), (c) document that baselines are platform-bound (a Windows baseline cannot be compared against a Linux workspace). Alternatively, normalize line endings to LF before hashing, but this must be explicit.

---

## Warning Findings

### W-01: Exception registry in fleet-exceptions.json has no authorization model
**Pulse**: 22 (fleet-drift)
**Role**: claws:ciso

The exception registry stores "workspace pattern, reason, approver, expiry date" but there is no specification for:
- Who is authorized to create exceptions (any user? only CISO role?)
- Whether exceptions are signed (can an attacker add an exception to suppress drift alerts?)
- Whether exceptions are included in the audit chain

An unsigned exception file is a trivial bypass for drift detection: modify the policy, add yourself as approver of an exception, and drift alerts disappear.

**Recommendation**: At minimum, exceptions should be HMAC-signed using the existing artifact-signer infrastructure (P-28+ in CP-4 covers key management, but exceptions in CP-3 should at least spec the signing field). Add an EXCEPTION_CREATED audit event.

---

### W-02: Fleet runner parallelism may hit Windows file locking on .claws/ dirs
**Pulse**: 20 (fleet-scan), 23 (fleet-broadcast)
**Role**: claws:platform-eng

The parallel runner defaults to 8 concurrent operations. On Windows, multiple concurrent reads of `.claws/` directories rarely lock, but concurrent writes (broadcast) to different workspaces that share a parent directory can trigger EBUSY on manifest.json if an antivirus scanner (Windows Defender) has a handle open.

P23 has retry logic for EBUSY, but P20 (scan) and P22 (drift) have no retry logic despite also reading from `.claws/` directories during parallel execution.

**Recommendation**: Extract retry logic into a shared utility (e.g., `claws-sdk/src/fleet/fs-retry.ts`) that all fleet operations use for `.claws/` directory access. Mention Windows Defender interaction in the test fixtures setup (may need brief exclusion or retry tolerance in CI).

---

### W-03: E2e test (P27) depends on all 8 prior pulses — fragile and slow
**Pulse**: 27 (e2e-fleet-loop)
**Role**: craft:architect

The e2e test exercises scan -> broadcast -> drift -> snap save -> kill -> audit in sequence. This is the CP-3 gate. If any upstream pulse has a subtle bug, the entire e2e test fails with an opaque error deep in the chain.

There is no intermediate verification step — the test goes from "all primitives exist" to "full lifecycle works" in one jump. The L1 integration tests in individual pulses test each operation in isolation, but there's a gap: no test verifies two operations compose correctly (e.g., scan + broadcast, or drift + report) before the full e2e.

**Recommendation**: Add a 2-operation composition test in at least one of P22/P23/P26 (e.g., "scan then drift" as an L1 integration test in P22). This creates a stepping stone between isolated unit tests and the full 8-operation e2e.

---

### W-04: Fleet-report compliance matrix assumes framework detection exists
**Pulse**: 26 (fleet-report)
**Role**: claws:compliance, craft:architect

The compliance matrix "cross-references workspaces against governance frameworks (SOC2, ISO 27001, custom policies) showing pass/fail/missing per cell." But no prior pulse in CP-3 (or CP-1/CP-2) implements framework detection — the ability to identify which compliance framework a policy YAML file belongs to.

P26 deliverables don't include a framework classifier. The matrix will have empty columns unless P23 (broadcast) or an earlier pulse establishes framework tagging in policy files.

**Recommendation**: Either (a) amend P23 to include a `framework` field in policy YAML metadata that broadcast preserves, or (b) amend P26 to include a simple filename-convention classifier (e.g., `soc2-*.yaml` maps to SOC2 framework). Without this, the compliance matrix is unimplementable.

---

### W-05: Snapshot promote "signer" field is just a string — no identity verification
**Pulse**: 24 (snap-promote)
**Role**: claws:ciso

Provenance includes `signer (string identifier)` but there's no verification that the signer string corresponds to an actual authorized identity. Anyone who can write to `.claws/` can set signer to any value. The bundleHash provides integrity (content wasn't tampered) but not authenticity (who actually promoted it).

CP-4 introduces key management (P28+), but P24 in CP-3 should at least reserve the signing mechanism field so the type doesn't need a breaking change later.

**Recommendation**: Add `signerKeyId?: string` and `signatureAlgorithm?: string` optional fields to PromoteProvenance now (nullable in CP-3, populated in CP-4). This avoids a manifest schema migration later.

---

### W-06: Kill audit uses different event format than existing AuditEvent/AuditChainEntry
**Pulse**: 25 (fleet-kill)
**Role**: claws:gateway-eng, claws:ciso

P25 specifies recording KILL_ACTIVATED in `.claws/audit.jsonl` with "timestamp, kill path used, reason, actor, workspace path." The existing `AuditEvent` type (`claws-sdk/src/ir/audit-event.ts`) and `AuditChainEntry` type (`claws-sdk/src/compliance/artifact-signer.ts`) have a structured schema with fields like `eventType`, `target`, `action`, `outcome`, `ruleId`, `severity`, `hmacSignature`.

The kill audit as specified would be a different, simpler format — breaking the single canonical audit event guarantee established in CP-2 review amendment C08 ("Every audit-producing code path MUST emit this type").

**Recommendation**: Amend P25 to emit KILL_ACTIVATED as a proper AuditChainEntry using the existing type. Map fields: `eventType: "kill"`, `target: workspacePath`, `action: killPath`, `outcome: "deny"`, `ruleId: "KILL-SENTINEL"`. Sign with artifact-signer. This maintains the single audit format invariant.

---

### W-07: Double-kill TTL is configurable but no default is specified
**Pulse**: 25 (fleet-kill)
**Role**: claws:gateway-eng

P25 mentions "within configured TTL" for determining if a sentinel is stale, but doesn't specify the default TTL, where the TTL is configured, or reasonable bounds. A TTL too short (seconds) means legitimate rapid re-kills get through; too long (days) means a killed workspace can never be re-killed after the original issue is resolved and re-triggered.

**Recommendation**: Specify a default TTL of 1 hour in the pulse plan. Store TTL in claws.json under `fleet.killTtlMs`. Document the semantics: a KILL sentinel younger than TTL blocks re-kill; older than TTL allows re-activation.

---

## Note Findings

### N-01: Test count totals across CP-3 pulses don't match exit criteria
**Role**: craft:architect

CP-3 exit criteria specify "L0: 35+ unit tests, L1: 14+ integration, L2: 7+ e2e." Summing the pulse test_tiers:

| Tier | P19 | P20 | P21 | P22 | P23 | P24 | P25 | P26 | P27 | Total | Target |
|------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-------|--------|
| L0   | 8   | 6   | 5   | 6   | 6   | 4   | 6   | 4   | 0   | 45    | 35+    |
| L1   | 3   | 3   | 2   | 2   | 3   | 2   | 2   | 2   | 0   | 19    | 14+    |
| L2   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 1   | 1     | 7+     |

L0 and L1 exceed targets, but **L2 is 1 against a target of 7+**. The e2e target is dramatically undershot. Either the target is wrong or P27 needs more e2e test cases (or some L1 tests in earlier pulses should be promoted to L2).

**Recommendation**: Clarify whether the "7+ e2e" target includes L3 acceptance tests. If not, add e2e tests to individual pulses (e.g., snap save+restore round-trip as L2, broadcast+scan composition as L2).

---

### N-02: No `.gitignore` guidance for snapshot and fleet directories
**Pulse**: 19, 20, 22
**Role**: claws:platform-eng

Snapshots go into `.claws/snapshots/`, fleet manifests into `.claws/fleet-manifest.json`, exceptions into `.claws/fleet-exceptions.json`. None of the pulse plans mention whether these should be gitignored (local machine state) or committed (shared governance state).

**Recommendation**: Add a note to P19 specifying that `.claws/snapshots/` is gitignored (local) while `.claws/fleet-manifest.json` and `.claws/fleet-exceptions.json` are committed (shared). Or vice versa — but the decision must be explicit.

---

### N-03: Scan marker list may need extensibility
**Pulse**: 20 (fleet-scan)
**Role**: claws:platform-eng

The hardcoded marker list (SOUL.md, CLAUDE.md, .cursorrules, .cursor/rules, AGENTS.md, TOOLS.md) covers current OC platforms but new platforms (e.g., Windsurf, Devin, future Claude features) will require code changes. The existing `claws-sdk/src/detect/marker-registry.ts` already has an extensible marker system.

**Recommendation**: P20 should reuse the marker-registry from `detect/` rather than hardcoding a new marker list. This is a minor implementation detail but avoids marker list divergence between `claws compile` (which uses marker-registry) and `claws scan` (which would have its own list).

---

### N-04: Fleet-report default format detection (TTY vs pipe) is not testable in CI
**Pulse**: 26 (fleet-report)
**Role**: claws:platform-eng

The acceptance criteria state "Default format is table when stdout is TTY, JSON when piped." CI environments typically have no TTY, so the default format will always be JSON in CI. Tests that verify the table format must explicitly pass `--format table`.

**Recommendation**: Ensure L0/L1 tests explicitly pass format flags rather than relying on TTY detection. Minor, but prevents flaky tests in CI.

---

### N-05: Audit chain append concurrency during fleet-wide kill
**Pulse**: 25 (fleet-kill)
**Role**: claws:ciso

Fleet-wide kill iterates all workspaces and activates kill on each. Since each workspace has its own `.claws/audit.jsonl`, there's no cross-workspace contention. However, if two fleet operations run concurrently (e.g., broadcast and kill on the same workspace), both could append to audit.jsonl simultaneously, risking a corrupted JSONL line.

**Recommendation**: Document that audit.jsonl appends should use atomic-append semantics (O_APPEND on POSIX, equivalent on Windows via `fs.appendFile` which is not atomic). For CP-3, single-operation-at-a-time is acceptable with a documented limitation. True concurrent audit safety belongs in a later checkpoint.

---

## Summary

| Severity | Count | Key themes |
|----------|-------|------------|
| Major    | 5     | Manifest schema version, double-compilation cost, broadcast atomicity, kill path semantics, drift hash determinism |
| Warning  | 7     | Exception signing, Windows file locking, e2e fragility, framework detection gap, signer identity, audit format inconsistency, kill TTL default |
| Note     | 5     | Test count mismatch, gitignore guidance, marker extensibility, TTY testing, audit concurrency |

**Pulses requiring edits**: P19 (M-01, M-02), P21 (M-02), P22 (M-05, W-01), P23 (M-03, W-04), P24 (W-05), P25 (M-04, W-06, W-07), P27 (N-01)
