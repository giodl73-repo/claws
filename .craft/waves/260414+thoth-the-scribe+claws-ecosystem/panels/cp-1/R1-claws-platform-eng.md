# R1 — claws:platform-eng Review — CP-1 (Security Hardening + Protect)

**Reviewer**: claws:platform-eng (fleet consistency lens)
**Review type**: impl (implementation review)
**Date**: 2026-04-14
**Scope**: Budget tracking, fleet budget aggregation, SSO identity, key rotation, broadcast hardening, trust-compat publish restrictions, LLM extractor backoff, merger risk floor

---

## Summary

CP-1 introduces significant security hardening across protect, fleet, keys, and compile/llm modules. From a fleet-ops perspective the broadcast policy-version resolution (C-W1), trust-compat publish restrictions (C-03), and budget-fleet aggregation are the highest-value changes. Key rotation rollback and timing-safe comparison are solid improvements. Several issues affect fleet-scale reliability and correctness.

---

## Findings

### M-01: Fleet budget aggregation silently drops failed workspaces

**File**: `claws-sdk/src/protect/budget-fleet.ts:67-74`
**Severity**: M (Major)

`budgetFleet` calls `runParallel` but only reads `results` -- `errors` from failed per-workspace budget calls are silently discarded. If 5 of 47 workspaces have corrupt audit chains or missing claws.json, the fleet total will be under-reported with no indication that workspaces were skipped.

```ts
const { results } = await runParallel(
  scanResult.workspaces,
  async (workspace) => {
    const result = await budget(workspace.path);
    return result.report;
  },
  4,
);
```

The `runParallel` return includes `errors` (used correctly in `broadcast.ts:392-398`). The fleet budget report should include a `failedCount` or `errors` field and the `BudgetFleetReport` type should carry this. A platform-eng running `claws protect budget --fleet` on 47 workspaces needs to know when data is incomplete.

---

### M-02: Fleet budget report has no workspace identity

**File**: `claws-sdk/src/protect/types.ts:16-25`, `claws-sdk/src/protect/budget-fleet.ts:24-43`
**Severity**: M (Major)

`BudgetReport` has `tokenCount`, `limit`, `percentage`, `period` -- but no `workspacePath` or `workspaceName` field. When I look at the fleet output sorted by usage, each entry is anonymous:

```
  87%  8700/10000 tokens (monthly)
  62%  6200/10000 tokens (monthly)
```

For a fleet of 47 workspaces, this is useless. I cannot identify which workspace is at 87%. The CLI output at `claws-cli/src/commands/protect.ts:111-118` confirms this -- it iterates `sortedByUsage` but has no path to display. The `BudgetFleetReport` should use a workspace-identified wrapper (e.g. `{ path: string; report: BudgetReport }`) rather than bare `BudgetReport[]`.

---

### M-03: Budget period limit for 'weekly' falls through to monthly

**File**: `claws-sdk/src/protect/budget.ts:215-216`
**Severity**: M (Major)

```ts
const periodLimit = period === 'daily' ? effectiveLimits.daily : effectiveLimits.monthly;
```

When `period === 'weekly'`, this falls through to `effectiveLimits.monthly`. There is no weekly limit in `BudgetLimit` (only `daily` and `monthly`), yet `BudgetPeriod` includes `'weekly'`. The percentage computation uses the monthly limit for a weekly window, which will always under-report (weekly usage / monthly limit = artificially low percentage). Either:
- Remove `'weekly'` from `BudgetPeriod` and the period-start logic, or
- Add a `weekly` field to `BudgetLimit` and handle it in the limit selection

Running `claws protect budget --period weekly` on 47 workspaces will produce misleading percentages.

---

### M-04: Policy version resolution is non-deterministic across fleet

**File**: `claws-sdk/src/fleet/broadcast.ts:406-411`
**Severity**: M (Major)

```ts
let policyVersion = 'unknown';
if (governedWorkspaces.length > 0) {
  policyVersion = await readPolicyVersion(governedWorkspaces[0]!.path);
}
```

The policy version for the entire broadcast manifest is read from whichever workspace happens to be `governedWorkspaces[0]`. This is non-deterministic -- `scanFleet` discovery order depends on filesystem readdir order, which varies across Windows/macOS/Linux. Two runs of the same broadcast could record different policy versions in the manifest if workspaces have different claws.json versions.

The policy version should come from the source policy file being broadcast, not from a target workspace. Alternatively, if this is meant to record the workspace's current version before the broadcast overwrites it, each per-workspace manifest already records per-workspace results, so this should be per-workspace, not fleet-global.

---

### W-01: Publish restriction check is one-directional

**File**: `claws-sdk/src/fleet/trust-compat.ts:232-244`
**Severity**: W (Warning)

```ts
for (const r of restrictions) {
  if (workspaceTier <= r.maxTrustTier) {
    return `Publish restriction violated: ...`;
  }
}
```

The check only compares `workspaceTier <= r.maxTrustTier` but does not inspect what risk-tier tools are actually in the policy being broadcast. The restriction says "tools above R{maxRiskTier} are blocked for workspaces at or below T{maxTrustTier}" -- but without checking the actual tool risk tiers in the policy content, this blocks *all* broadcasts to low-trust workspaces whenever any restriction exists, regardless of the tools' actual risk classification. This makes restrictions overly broad and will cause false positives during fleet upgrades.

---

### W-02: PKCE verifyPkce uses non-constant-time string comparison

**File**: `claws-sdk/src/protect/identity.ts:143-148`
**Severity**: W (Warning)

```ts
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const expected = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return expected === codeChallenge;
}
```

The PKCE verification uses plain `===` string comparison. While PKCE code challenges are public OAuth parameters (not secrets), this module also exports `verifyKeyMaterial` in rotate.ts with timing-safe comparison for exactly this class of concern. For consistency with the security posture established elsewhere in this CP, the PKCE comparison should also use `timingSafeEqual` or at minimum document why it does not need to.

---

### W-03: Self-signed cert detection errs permissive on parse failure

**File**: `claws-sdk/src/protect/identity.ts:403-407`
**Severity**: W (Warning)

```ts
} catch {
  // If parsing fails, assume not self-signed (err on the side of permissive)
  return false;
}
```

For a security hardening checkpoint, erring permissive on certificate parsing failure is surprising. A malformed certificate that cannot be parsed should be rejected, not allowed through. An attacker could craft a certificate that triggers a parsing error in the ASN.1 walker to bypass the self-signed check. This should return `true` (treated as self-signed, i.e., blocked) rather than `false`.

---

### W-04: LLM extractor retry loop has off-by-one

**File**: `claws-sdk/src/compile/llm/extractor.ts:124-141`
**Severity**: W (Warning)

```ts
while (retries <= BACKOFF_MAX_RETRIES) {
  try {
    result = await this.extractFile(entry, hints, options);
    consecutiveFailures = 0;
    break;
  } catch (err) {
    retries++;
    consecutiveFailures++;
    // ...
    if (retries > BACKOFF_MAX_RETRIES) throw err;
    // ...
  }
}
```

The loop condition is `retries <= BACKOFF_MAX_RETRIES` (i.e., up to 5 inclusive = 6 iterations). Inside the catch, `retries` is incremented and then checked `retries > BACKOFF_MAX_RETRIES`. On the 6th iteration (retries already 5 from prior failures), it tries once more, increments to 6, and throws. This results in `BACKOFF_MAX_RETRIES + 1` total attempts (6), not the documented 5 max retries. For fleet operations running extraction across many files, this adds an extra ~6.4s delay per file (200 * 2^5 = 6400ms) beyond what's documented.

---

### W-05: Budget token counting iterates entire audit chain three times

**File**: `claws-sdk/src/protect/budget.ts:196-213`
**Severity**: W (Warning)

The `budget()` function filters `tokenEvents` three separate times for three different period windows (requested period, daily, monthly). For a workspace with a large audit chain (enterprise workspaces can accumulate thousands of entries per month), this is O(3n) where a single pass with three accumulators would suffice.

More critically, it creates a `new Date(e.timestamp)` on every filter call -- that is 3n Date constructor calls. At fleet scale across 47 workspaces running in parallel, this creates significant GC pressure. Consider a single-pass accumulation approach.

---

### W-06: EnvStorage warns on every write, not just first

**File**: `claws-sdk/src/keys/storage.ts:203-204`
**Severity**: W (Warning)

```ts
warnPlaintextKeyStorage(this.envFilePath!);
```

Every call to `persistEnvFile` emits a warning. During key rotation (`rotateKey`), the private key and public key are written sequentially -- that is 2 warnings per rotation. Across a fleet rotation of 47 workspaces, that is 94 warning lines. Consider a write-once flag or deduplication to avoid console noise that obscures real issues during fleet operations.

---

### N-01: validateJwtClaims does not check `iat` (issued-at) or `nbf` (not-before)

**File**: `claws-sdk/src/protect/identity.ts:210-229`
**Severity**: N (Note)

The JWT claims validator checks `iss`, `aud`, `exp`, and `nonce` but not `iat` or `nbf`. For enterprise SSO, accepting tokens with `iat` far in the past (replay) or `nbf` in the future (premature use) is worth guarding against. Not critical for initial implementation but worth tracking.

---

### N-02: readPolicyTrustTier is now unused

**File**: `claws-sdk/src/fleet/trust-compat.ts:136-139`
**Severity**: N (Note)

After the refactor to `readPolicyFields`, the `readPolicyTrustTier` function is retained as a wrapper but is no longer called anywhere. It should be removed or exported if it has external consumers, to avoid dead code.

---

### N-03: LLM gap-fill risk floor (R2) is unconditional

**File**: `claws-sdk/src/compile/llm/merger.ts:219-222`
**Severity**: N (Note)

The C-01 fix applies `Math.max(li.riskClass, 2)` when a risk class exists, and assigns R2 when no risk class exists. This means every LLM-only intent gets at least R2, even intents like `label` or `context` that may be inherently R1. For fleet-wide compilation, this could inflate risk scores across all workspaces systematically. The floor should potentially be kind-dependent (e.g., R2 for `tool` intents, R1 for `label` intents).

---

### N-04: CLI fleet budget output lacks workspace path

**File**: `claws-cli/src/commands/protect.ts:111-118`
**Severity**: N (Note)

Related to M-02. The terminal output for `claws protect budget --fleet` shows percentages and token counts but no workspace identifier. The JSON output will also be anonymous since the underlying `BudgetReport` lacks a path field. For fleet operators, this is the primary consumer of budget data and needs workspace identification to be actionable.

---

### N-05: Broadcast staging cleanup race condition on parallel writes

**File**: `claws-sdk/src/fleet/broadcast.ts:243-252`
**Severity**: N (Note)

`cleanStagingDir` reads the staging directory, checks if empty, then calls `rmdir`. In parallel broadcast mode (concurrency 4), two workers could both see the directory as empty after their files were moved, and both attempt to rmdir. The second will get ENOENT. This is handled by the try/catch, so it is not a bug, but the design creates unnecessary error paths. Consider using `rm(stagingDir, { recursive: true, force: true })` (Node 14.14+) for atomic cleanup.

---

## Verdict

**3 changes accepted, 4 must-fix before landing:**

| ID | Severity | Verdict |
|----|----------|---------|
| M-01 | Major | Must fix: fleet budget must surface per-workspace errors |
| M-02 | Major | Must fix: BudgetReport needs workspace identity for fleet use |
| M-03 | Major | Must fix: weekly period limit falls through to monthly |
| M-04 | Major | Must fix: policy version should not come from arbitrary workspace |
| W-01 | Warning | Should fix: publish restriction overly broad without risk-tier inspection |
| W-02 | Warning | Should fix: PKCE comparison consistency |
| W-03 | Warning | Should fix: self-signed cert parse failure should reject, not allow |
| W-04 | Warning | Should fix: retry loop off-by-one |
| W-05 | Warning | Consider: single-pass token accumulation for performance |
| W-06 | Warning | Consider: deduplicate plaintext key storage warnings |
| N-01 | Note | Track: JWT iat/nbf validation |
| N-02 | Note | Clean up: remove dead readPolicyTrustTier function |
| N-03 | Note | Track: kind-dependent risk floor for LLM gap-fills |
| N-04 | Note | Track: CLI fleet budget needs workspace identity |
| N-05 | Note | Noted: parallel staging cleanup race is benign |

**Fleet impact assessment**: The budget aggregation (M-01, M-02) and policy version (M-04) issues directly affect `claws protect budget --fleet` and `claws broadcast` -- these are daily/monthly fleet commands. The weekly period bug (M-03) will confuse any fleet operator using weekly cadence. The 4 Majors must be resolved before this code is broadcast to production workspaces.
