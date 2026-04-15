# R1 — craft:dragon — Invariant Protection Review

**Panel**: anubis-security-final
**Wave**: Anubis the Judge (claws-ops)
**Reviewer**: craft:dragon
**Scope**: All Anubis wave source files (claws-sdk/src, claws-cli/src, claws-test/src)
**Date**: 2026-04-13

---

## Lens

> "Invariant rigor > feature velocity. Invariants are load-bearing walls — you do not remove them for a feature."

---

## Findings

### D-01 [M] Raise-only risk invariant not enforced at amendment validation boundary

**File**: `claws-sdk/src/amend/validate.ts:98-132`

The `validateAmendment()` function checks tool risk against trust tier thresholds for `add-skill` amendments, but it does not verify the raise-only invariant defined in the merger (`merger.ts:113-121`). A crafted amendment with `type: 'update-policy'` targeting `trustTier` could lower the trust tier (e.g., T3 to T1), which would retroactively make previously-blocked high-risk tools accessible without re-validation.

While the trust tier range is validated (1-5), there is no monotonic tightening check at the amendment layer — the invariant only exists in the broadcast trust-compat module.

**Recommendation**: Add a monotonic-only check: `validateAmendment` for `update-policy` with `trustTier` must reject values lower than the current trust tier unless an explicit override flag is set with severity-5 audit event.

---

### D-02 [M] Audit chain has no chaining hash — entries are independently signed but not linked

**File**: `claws-sdk/src/compliance/audit-chain.ts:123-152`

Each audit chain entry is HMAC-signed independently. The `seq` field provides ordering but there is no cryptographic chaining — entry N does not include the hash of entry N-1. This means:

1. An attacker with file system access can **delete** entries from the middle of chain.jsonl without detection.
2. Entries can be **reordered** without breaking any signature.
3. The chain is an append-only log by convention, not by cryptographic enforcement.

The `signablePayload` in `artifact-signer.ts:74-87` includes `seq` but not a `previousHash` field. The `readChainLength` function counts lines but does not verify chain continuity.

**Recommendation**: Add a `previousHash` field to `AuditChainEntry`. When appending, compute `previousHash = sha256(JSON.stringify(lastEntry))` and include it in the signable payload. On verification, walk the chain and verify each entry links to its predecessor.

---

### D-03 [M] File-based lock mechanism has TOCTOU race window

**Files**: `claws-sdk/src/keys/rotate.ts:51-89`, `claws-sdk/src/keys/registry.ts:30-67`

Both `acquireLock()` and `acquireRegistryLock()` use a two-step TOCTOU pattern: check if lock file exists, then create with `wx` flag. If the first `wx` write fails, they read the file, check PID liveness, delete, and retry with another `wx` write.

Between the `unlink()` of the stale lock and the `writeFile(..., { flag: 'wx' })` retry, another process can acquire the lock. This is a classic TOCTOU race. On Windows, the race window is wider because `unlink` on NTFS may not be immediately visible to concurrent processes.

**Recommendation**: Use a single-attempt `wx` with retry loop and backoff, rather than read-delete-recreate. Alternatively, use `fs.open` with `O_CREAT | O_EXCL` and hold the file descriptor as the lock.

---

### D-04 [M] Bypass evaluation has two independent implementations that could diverge

**Files**: `claws-sdk/src/config/bypass.ts` and `claws-sdk/src/init/bypass.ts`

Two separate bypass evaluation modules exist:
- `config/bypass.ts:25-62` — `evaluateBypass()`: pure function, returns state + audit event object
- `init/bypass.ts:51-93` — `checkBypass()`: async, writes to audit chain directly

These are structurally different: one is synchronous and returns an event for the caller to persist; the other is async and persists itself. If the fleet policy schema changes or a new bypass condition is added, both must be updated in lockstep. The `evaluateBypass` function does not check `fleetPolicy.allowBypass === false` (it checks truthiness), while `checkBypass` uses strict `=== false`.

**Recommendation**: Consolidate into a single bypass evaluation function. The `config/bypass.ts` pure evaluator should be the canonical implementation; `init/bypass.ts` should call it and handle persistence.

---

### D-05 [M] Key rotation rollback does not restore archived key files

**File**: `claws-sdk/src/keys/rotate.ts:178-258`

When re-signing fails during rotation, the rollback at line 232-234 restores key material to storage but does not undo the `archiveOldKey` rename at line 211. After rollback, both `{keyId}.v{version}.key` (archived) and `{keyId}.key` (restored) exist. The registry entry still has the old version number (the `updateKey` at line 243 hasn't executed), so subsequent operations will find the correct material, but the orphaned archive file is a key material leak.

**Recommendation**: Move `archiveOldKey` to after the re-signing loop succeeds, or undo the archive rename in the rollback path.

---

### D-06 [W] `evaluateBypass` in config/bypass.ts does not record to audit chain

**File**: `claws-sdk/src/config/bypass.ts:25-62`

The `evaluateBypass` function returns a `BypassAuditEvent` object but does not persist it to the audit chain. The caller is responsible for writing it. If any CLI adapter forgets to persist the audit event, bypass activations will be unrecorded. The `init/bypass.ts` version handles this correctly by calling `appendAuditEvent` directly.

**Recommendation**: Document the caller obligation in JSDoc, or consolidate per D-04.

---

### D-07 [W] Shamir threshold=2 allows single-point collusion

**File**: `claws-sdk/src/keys/ceremony.ts:191-193`

The minimum threshold is 2 (`threshold < 2` throws). For root keys in enterprise settings, a threshold of 2 means any two shareholders can reconstruct the root key. The code does not warn or enforce a minimum threshold relative to the total shares (e.g., majority quorum).

**Recommendation**: Add a warning diagnostic when `threshold < ceil(totalShares / 2) + 1` and a hard minimum of 3 for `purpose: 'root'` keys.

---

### D-08 [W] Kill sentinel has no authentication — any file system writer can activate

**File**: `claws-sdk/src/fleet/kill.ts:78-83`

The `writeSentinel` function creates `.claws/KILL` with actor information but does not sign or authenticate the sentinel content. Any process with write access to the workspace can create a KILL sentinel, causing a denial-of-service for all subsequent `claws check/build/watch` operations.

**Recommendation**: Sign the sentinel JSON with the workspace HMAC key (from `audit-chain.ts:85-98`). `checkSentinelBlock` should verify the signature before honoring the kill.

---

### D-09 [W] `readAmendmentsFile` silently accepts non-array JSON

**File**: `claws-sdk/src/amend/apply.ts:159-167`

The `readAmendmentsFile` function returns `[]` for any non-array parse result. If the file is corrupted to contain `{ "type": "nuke" }`, it silently treats it as empty and appends a new array. This masks corruption.

**Recommendation**: Throw on non-array JSON rather than silently returning empty. Append should only succeed on a valid base state.

---

### D-10 [N] GF(256) EXP_TABLE[255] duplicates EXP_TABLE[0]

**File**: `claws-sdk/src/keys/ceremony.ts:38`

`EXP_TABLE[255] = EXP_TABLE[0]!` — this is mathematically correct for the cyclic group but undocumented. Adding a brief comment would prevent future contributors from "fixing" it.

---

### D-11 [N] Lock stale-check has integer overflow edge case

**File**: `claws-sdk/src/keys/rotate.ts:76-78`

`Date.now() - lockTs > LOCK_STALE_MS` — if `lockTs` is `NaN` (unparseable), the comparison is `NaN > number` which is `false`, so the lock is treated as fresh. The `Number.isFinite(lockTs)` guard at line 77 handles this for rotate.ts, but the identical pattern in `registry.ts:55` omits the `Number.isFinite` check.

**Recommendation**: Add `Number.isFinite(lockTs)` guard to `registry.ts:55`.

---

### D-12 [W] FleetException `globToRegex` allows ReDoS via crafted patterns

**File**: `claws-sdk/src/fleet/exception.ts:24-49`

The `globToRegex` function converts glob patterns to regex. While the function is simple, the resulting regex with `.*` segments from `**` can cause catastrophic backtracking on long paths. For example, pattern `**/**/**/**/**` against a long non-matching path will exhibit exponential time.

**Recommendation**: Limit the number of `**` segments allowed in a pattern (e.g., max 3), or use a non-backtracking approach.

---

## Summary

| Severity | Count |
|----------|-------|
| M (Must fix) | 5 |
| W (Warning) | 5 |
| N (Note) | 2 |

**Key invariant risks**: The audit chain lacks cryptographic chaining (D-02), bypass evaluation is split across two modules that could diverge (D-04), and the raise-only risk invariant is not enforced at the amendment boundary (D-01). The file-lock TOCTOU race (D-03) and key rotation rollback leak (D-05) are structural issues that compound under concurrent access.
