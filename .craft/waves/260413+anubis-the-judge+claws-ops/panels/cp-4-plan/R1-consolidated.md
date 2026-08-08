---
round: 1
checkpoint: cp-4
scope: plan-review
date: 2026-04-12
reviewers:
  - claws:ciso
  - claws:skill-author
  - craft:architect
  - claws:founder
verdict: conditional-pass
total_findings: 17
major: 5
warning: 7
note: 5
---

# R1 Consolidated Review -- CP-4 Plan (Keys + Makers + Publish)

## Panel

| Role               | Focus Area                                                 | Verdict          |
| ------------------ | ---------------------------------------------------------- | ---------------- |
| claws:ciso         | Key management security, ceremony integrity, signing chain | conditional-pass |
| claws:skill-author | Scaffold experience, annotation accuracy, publish workflow | conditional-pass |
| craft:architect    | Shamir dependency, package boundaries, atomicity design    | conditional-pass |
| claws:founder      | Community adoption, publish trust model, badge credibility | conditional-pass |

All four reviewers issued conditional-pass. Five Major findings require pulse edits before implementation.

---

## Major Findings

### M-01: All 8 pulses use wrong SDK paths -- plan/pulse path divergence

**Source**: craft:architect
**Pulses**: 28-35 (all)
**Severity**: Major

Every pulse invents its own directory structure that contradicts the authoritative plan paths:

| Domain   | Plan (authoritative)     | Pulse (divergent)         |
| -------- | ------------------------ | ------------------------- |
| Keys     | `claws-sdk/src/protect/` | `claws-sdk/src/keys/`     |
| Scaffold | `claws-sdk/src/maker/`   | `claws-sdk/src/scaffold/` |
| Annotate | `claws-sdk/src/maker/`   | `claws-sdk/src/annotate/` |
| Publish  | `claws-sdk/src/maker/`   | `claws-sdk/src/publish/`  |

If agents implement from pulses, they will create 4 orphan directories that don't match the plan's module structure. The `maker/` grouping in the scaffold/annotate/publish plans is intentional -- these are all maker-experience commands that share types and utilities. The `protect/` grouping for keys is aligned with `claws-protect` (vault) adjacency.

**Resolution**: Update all 8 pulses to use the authoritative plan paths. Keys: `protect/`. Scaffold/annotate/publish: `maker/`. File names can differ but the parent directory must match the plan.

### M-02: L2 and L3 test gates are under-allocated -- CP exit criteria unachievable

**Source**: claws:skill-author, craft:architect
**Pulses**: 28-35
**Severity**: Major

CP-4 exit criteria require `L2: 8+` and `L3: 3+` tests. Actual pulse allocations:

| Tier | CP-4 Target | Sum of Pulses | Deficit   |
| ---- | ----------- | ------------- | --------- |
| L0   | 52+         | 52            | 0 (exact) |
| L1   | 17+         | 17            | 0 (exact) |
| L2   | 8+          | 4             | **-4**    |
| L3   | 3+          | 1             | **-2**    |

L2 e2e tests are only in pulses 29, 33, 34, and 35 (1 each). L3 acceptance tests are only in pulse 35 (1 test). Four L2 tests and two L3 tests are missing from any pulse. This means either the CP exit criteria are wrong or pulses need more tests.

**Resolution**: Either (a) redistribute L2/L3 tests into specific pulses -- e.g., add L2 tests to pulse 30 (rotate + re-sign chain verification), pulse 31 (annotate on reference workspace), pulse 32 (scaffold + annotate + pinch), and pulse 28 (generate + list + verify on disk); add L3 acceptance tests to pulse 33 (full ceremony lifecycle) and pulse 30 (key lifecycle: generate, rotate, revoke, verify audit chain) -- or (b) reduce the CP exit criteria targets to match the actual pulse allocations (L2: 4, L3: 1). Option (a) is strongly preferred.

### M-03: Shamir's Secret Sharing dependency not specified -- npm package vs custom implementation

**Source**: claws:ciso, craft:architect
**Pulse**: 33 (key-ceremony)
**Severity**: Major

The plan notes (line 109): "Shamir's Secret Sharing requires a dedicated audited implementation (e.g., `shamir-secret-sharing` npm package or custom GF(256) implementation)." Pulse 33 says "Shamir's Secret Sharing" without resolving this decision. This matters for security posture:

- **npm dependency**: Faster to implement, but introduces a supply chain dependency for a security-critical primitive. The `shamir-secret-sharing` npm package has low download counts and no security audit. A compromised SSS implementation can leak the root key through biased share generation.
- **Custom GF(256)**: More code to maintain, but zero supply chain risk for the most sensitive cryptographic operation in claws. The algorithm is well-documented (Adi Shamir, 1979) and the GF(256) arithmetic is ~150 lines.

For a governance compiler whose value proposition is supply chain security, using an unaudited npm package for root key splitting is a credibility risk. The ceremony is also enterprise-only and used rarely -- performance is irrelevant.

**Resolution**: Pulse 33 must specify: implement GF(256) Shamir SSS from scratch using Node.js `crypto.randomBytes` for coefficient generation. No npm dependency for the core split/reconstruct algorithm. Add a test vector set from a known reference implementation (e.g., Hashicorp Vault's SSS test vectors) to validate correctness. Document this decision in the pulse as a security constraint.

### M-04: Key rotation re-sign has no concurrency model -- in-flight artifact race condition

**Source**: claws:ciso
**Pulse**: 30 (key-rotate-revoke)
**Severity**: Major

Pulse 30 says "re-sign pending artifacts with the new key" but does not define:

1. **What are "pending artifacts"?** Unsigned manifests? Manifests signed with the old key? All manifests in the workspace? The scope of re-signing is undefined.
2. **What happens to in-flight operations?** If a `claws build` is running while `claws keys rotate` executes, the build may sign with the old key, then rotation archives that key, then the newly-signed manifest has a signature from a now-archived key. The build succeeds but the artifact is immediately stale-signed.
3. **Atomicity of re-sign**: If rotation re-signs 10 artifacts and crashes after artifact 5, what state is the key registry in? Is the old key archived or still active? Are 5 artifacts signed with the new key and 5 with the old?

**Resolution**: Pulse 30 must specify: (a) "pending artifacts" = all manifests in `.claws/` signed with the key being rotated; (b) rotation acquires a file lock (`.claws/keys/.lock`) to prevent concurrent key operations -- `claws build` checks the lock and waits or fails with "key rotation in progress"; (c) re-sign is atomic: old key remains active until ALL artifacts are re-signed, then old key is archived in a single registry write. Add test for partial re-sign failure recovery.

### M-05: Fleet policy blocking DECLARED publish creates an adoption cliff

**Source**: claws:founder, claws:skill-author
**Pulse**: 35 (publish-pipeline)
**Severity**: Major

The CP-4 exit criterion says: "Fleet policy `requireVerifiedPublish: true` blocks DECLARED-tier publish." The plan (claws-publish) also specifies this. But from an adoption funnel perspective, this creates a hard cliff:

- DECLARED is the entry tier ("3-line YAML frontmatter only"). It exists to lower the onboarding barrier.
- Enterprise fleets enable `requireVerifiedPublish` for security.
- Result: skill authors in enterprise fleets cannot publish their first skill at all until they complete the full VERIFIED workflow (test template, supply chain stub, GovernanceValidator).

The adoption funnel is: scaffold (DECLARED) -> annotate -> build -> publish -> learn from badge -> upgrade to TYPED -> VERIFIED. If publish is blocked at DECLARED, the author never sees a badge, never gets the feedback loop, and may abandon claws.

**Resolution**: Pulse 35 must add a `fleet.allowDeclaredDryRun: true` (default true) policy that lets DECLARED skills do `claws publish --dry-run` even when `requireVerifiedPublish` is set. This gives authors the full validation feedback ("here's what your badge WOULD look like, here's what's missing for VERIFIED") without actually publishing an unverified skill. Add this to fleet-policy.ts and test both the block path and the dry-run-allowed path.

---

## Warning Findings

### W-01: 20-skill annotation corpus is statistically underpowered

**Source**: claws:skill-author, claws:ciso
**Pulse**: 34 (annotate-accuracy)
**Severity**: Warning

The accuracy target is >=85% within 1 R-level, with OBO FN <3% and FP <15%. With 20 skills:

- 85% accuracy means at most 3 can be wrong. A single misclassification is 5% of the corpus. The margin of error at 95% confidence interval with n=20 is +/-15.6 percentage points, meaning the true accuracy could be anywhere from 70% to 100%.
- OBO FN <3% on 20 skills means zero false negatives are allowed (1/20 = 5% > 3%). The target is only achievable if every OBO skill is correctly detected.
- The distribution (5+5+4+3+3) gives only 3 skills at R4 and 3 at R5. Under-classification of a single R5 skill is a 33% false-negative rate at that level.

**Resolution**: Acknowledge in pulse 34 that the 20-skill corpus validates heuristic BEHAVIOR, not statistical accuracy bounds. Either (a) increase the corpus to 50+ skills (10 per risk level) for meaningful statistical power, or (b) reframe the targets as "pass on the test corpus" rather than ">=85% accuracy" which implies statistical generalizability.

### W-02: Scaffold tier mapping (T2->R3 max) is only in pulse text, not in CL-08

**Source**: craft:architect
**Pulse**: 29 (scaffold-core)
**Severity**: Warning

The trust tier to risk cap mapping (T1=R1, T2=R3, T3=R4, T4=R5) appears in the claws-scaffold plan notes (line 118) and in pulse 29 deliverables. CL-02 defines trust tiers but does not define this specific mapping table. CL-08 (Package Architecture) defines layers but not tier-risk caps. If the mapping is wrong, there is no spec-level authority to correct against.

**Resolution**: The T->R mapping must be specified in CL-02 (Security Model) as a normative table, not buried in a plan note. Add "CL-02 amendment: trust tier to max risk mapping" to pulse 29's deliverables or to the CP-4 exit criteria.

### W-03: "Two-phase transaction" in publish is a misnomer -- no transaction coordinator

**Source**: craft:architect
**Pulse**: 35 (publish-pipeline)
**Severity**: Warning

Pulse 35 describes atomicity as "Two-phase transaction: stage locally, commit on remote 200, rollback on failure." This is not a two-phase commit (2PC) -- there is no transaction coordinator, no prepare/commit protocol, and no distributed consensus. It is a local staging pattern: write to temp, rename on success, delete on failure.

Calling it "two-phase" may lead implementers to over-engineer (adding coordinator state, recovery logs) or under-implement (assuming 2PC semantics handle partial failure automatically).

**Resolution**: Rename to "staged publish with rollback" in the pulse. Specify the exact mechanism: (1) write staged artifacts to `.claws/publish-staging/`, (2) call remote API, (3) on success: move staged artifacts to final location and update local state, (4) on failure: delete `.claws/publish-staging/`. This is a temp-file-and-rename pattern, not a distributed transaction.

### W-04: Badge freshness -- no build validation before publish

**Source**: claws:ciso, claws:founder
**Pulse**: 35 (publish-pipeline)
**Severity**: Warning

Pulse 35 says "Read current SKILL.md frontmatter at publish time (not cached)." But reading SKILL.md at publish time only ensures badge metadata is fresh. It does NOT ensure the compiled artifact matches the current SKILL.md. Consider:

1. Author edits SKILL.md (changes risk from R3 to R5)
2. Author does NOT re-run `claws build`
3. Author runs `claws publish`
4. Badge reads current SKILL.md: shows R5 (correct)
5. Compiled artifact still has R3 governance rules (stale)

The badge says R5 but the artifact enforces R3. This is a governance integrity gap.

**Resolution**: Pulse 35 should add a build-artifact staleness check: compare SKILL.md content hash against the hash recorded in `.claws-manifest` at build time. If they differ, warn "SKILL.md changed since last build -- run `claws build` before publish" (or block, depending on fleet policy).

### W-05: Single-developer ceremony bypass undermines the ceremony's value proposition

**Source**: claws:ciso
**Pulse**: 33 (key-ceremony)
**Severity**: Warning

The `--single-dev` flag bypasses M-of-N ceremony with a passphrase-derived key. This is reasonable for solo developers. However, there is no mechanism to prevent an enterprise fleet developer from using `--single-dev` to bypass their organization's ceremony requirement.

**Resolution**: The `--single-dev` flag must check fleet policy. If `fleet.requireCeremony: true` is set, `--single-dev` should fail with "Fleet policy requires M-of-N ceremony. Contact your fleet administrator." Add this check to pulse 33 acceptance criteria.

### W-06: CLI wiring appears in pulses but plans say "CLI wiring: None"

**Source**: craft:architect
**Pulses**: 28, 30, 31, 33, 35 (all that add CLI commands)
**Severity**: Warning

The claws-key-management plan says "CLI Wiring: None in this plan (keys commands come in claws-cli plan)." Similarly for publish and annotate plans. Yet pulses 28, 30, 33, and 35 include `claws-cli/src/commands/keys.ts` and pulse 35 includes `claws-cli/src/commands/publish.ts`. Pulse 31 includes `claws-cli/src/commands/annotate.ts`.

This is either a scope creep from plans into pulses, or the plans are outdated. If CLI wiring is done here, the claws-cli plan will duplicate work.

**Resolution**: Decide: either (a) pulses are correct and CLI wiring is in-scope for CP-4 -- update the plans to reflect this, or (b) plans are correct and pulses should remove CLI deliverables, deferring to the claws-cli plan. Given that CP-4 exit criteria reference CLI commands (`claws keys generate`, `claws new skill`, etc.), option (a) is the pragmatic choice. Update the plans.

### W-07: Key storage permissions -- FileStorage "restricted file permissions" is OS-dependent

**Source**: claws:ciso
**Pulse**: 28 (key-generate-list)
**Severity**: Warning

Pulse 28 acceptance criterion: "FileStorage writes to `.claws/keys/` with restricted file permissions." On Unix this is `chmod 600`. On Windows, file permissions use ACLs (icacls), and Node.js `fs.chmod` is a no-op for restrictive permissions on Windows.

Given the CLAUDE.md requirement that code must work on Windows, macOS, and Linux, the "restricted file permissions" criterion is not implementable with a single API call.

**Resolution**: Specify the cross-platform approach in pulse 28: Unix uses `fs.chmod(path, 0o600)`. Windows uses `fs.writeFile` with default permissions (Windows NTFS inherits from parent ACL). Add a note that KMS storage tier is the recommended approach for Windows enterprise environments. Test the permission check on both platforms or make the permission check OS-conditional.

---

## Note Findings

### N-01: Annotate pulse 31 classifies "send" as R4-R5, but CL-02 puts "Send email" at R5 exclusively

**Source**: claws:skill-author
**Pulse**: 31 (annotate-heuristics)
**Severity**: Note

Pulse 31 maps "send"/"email"/"purchase"/"delete" to R4-R5 as a range. CL-02's OBO boundary table puts "Send email" and "Process payment" in the "AS the user (GATE REQUIRED)" column, which maps to R5 specifically. The heuristic range R4-R5 may under-classify email and payment tools that should always be R5.

**Resolution**: Consider splitting the heuristic: "send-email" and "purchase" always suggest R5 (not R4-R5). "delete" can remain R4-R5 since file deletion is R4 while account deletion is R5. Document the rationale in the heuristic pattern table.

### N-02: Pulse 34 corpus distribution (5+5+4+3+3) is unbalanced toward low-risk skills

**Source**: claws:skill-author
**Pulse**: 34 (annotate-accuracy)
**Severity**: Note

10 of 20 corpus skills (50%) are R1-R2, which are the easiest to classify. Only 6 (30%) are R4-R5, which are the hardest and most security-critical. This means the aggregate accuracy number is inflated by easy classifications.

**Resolution**: Report per-risk-level accuracy in addition to aggregate. If R4-R5 accuracy is below 75%, the aggregate 85% is misleading.

### N-03: Ceremony audit trail records "participant identity" but identity system is not in CP-4

**Source**: claws:ciso
**Pulse**: 33 (key-ceremony)
**Severity**: Note

Pulse 33 records "participant identity" for each share distribution. But `claws identity` (referenced in the key-management plan) is not a CP-4 deliverable. What format does "identity" take? A username string? An email? A GPG fingerprint?

**Resolution**: Pulse 33 should specify that participant identity is a freeform string label in CP-4 (e.g., "alice@example.com"), with structured identity linking deferred to the identity plan. Add a type constraint: `participantId: string` with minimum length validation.

### N-04: KMSStorage "interface only" in Pulse 28 may confuse test count expectations

**Source**: craft:architect
**Pulse**: 28 (key-generate-list)
**Severity**: Note

Pulse 28 lists KMSStorage as a deliverable but says "interface only -- throws 'not implemented' on invocation." The L0 test list does not include a KMS test (only FileStorage and EnvStorage round-trips). If a developer adds KMS tests, they will inflate the count. If they skip KMS, the interface may ship without any validation that it follows the Storage contract.

**Resolution**: Add one L0 test: "KMSStorage throws NotImplementedError with correct message." This validates the interface contract without requiring KMS infrastructure.

### N-05: Pulse 35 L0 lists 9 tests but the count says 8

**Source**: craft:architect
**Pulse**: 35 (publish-pipeline)
**Severity**: Note

The L0 test description in pulse 35 lists 9 distinct test cases (absent manifest, valid-signed, invalid-signed, stale-signed, fleet policy blocks, atomicity success, atomicity rollback, key resolution chain, badge freshness) but the frontmatter says `L0_unit: 8`. This is an off-by-one that will cause confusion when the test count is validated against the gate.

**Resolution**: Update `L0_unit` to 9, or clarify which 8 of the 9 listed tests are in scope.

---

## Verdict

**Conditional pass.** The 5 Major findings must be resolved in pulse edits before CP-4 implementation begins:

1. **M-01**: Fix all pulse paths to match authoritative plans
2. **M-02**: Redistribute L2/L3 tests or adjust CP exit criteria
3. **M-03**: Specify custom GF(256) SSS implementation, no npm dependency
4. **M-04**: Define "pending artifacts" scope, add file lock for concurrent operations, specify atomic re-sign
5. **M-05**: Add `fleet.allowDeclaredDryRun` policy to preserve adoption funnel

Warning findings should be addressed but are not blocking.
