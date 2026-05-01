# upstream-proposal-pr295 · Consolidated Persona Review · R1

**Date**: 2026-05-01
**Subject**: lobster-docs PR #295 — `proposals/upstream/` convention + `workspace-modernization` package (3 upstream PRs to `openclaw/openclaw`)
**PR**: https://microsoft.ghe.com/bic/lobster/pull/295

## Panel verdicts

| # | Persona | Verdict | Headline concern |
|---|---|---|---|
| 05 | The hobbyist | APPROVE-WITH-WARNINGS | PR-3 merger fix is a behavior footgun for users with multiple plugins installed — needs release-notes story + `openclaw doctor` improvement |
| 07 | The enterprise IT admin | APPROVE-WITH-WARNINGS | Multi-tenant LKG isolation unspecified; merger widening needs deprecation window; sentinel guard is literal-only |
| 08 | The compliance officer | APPROVE-WITH-WARNINGS | Multi-tenant isolation MUST be explicit (top priority); contract-level signing hook needed for SOC 2 / FedRAMP; the 3 [GAP]s need compensating-control runbooks |
| 10 | The skill connector author | APPROVE-WITH-WARNINGS | `LKGTracker<T>` should be `LKGTracker<TParsed, TIssue>`; `LKGFingerprint` leaks 7 POSIX `node:fs` fields; `ApprovalDescriptor[]` ergonomics; zero plugin-author code examples |
| 13 | The upstream maintainer | **REQUEST-CHANGES** | PR-2 reads as refactor-only (auto-rejected); PR-3 bundles 3 deltas (one-thing-per-PR); `ctx.lkgFingerprint` field-shape vs `getCurrentLKGFingerprint()` accessor not justified; 10-PR cap math against existing hapi wave |

**Net stance**: 4 of 5 personas vote APPROVE-WITH-WARNINGS. The upstream maintainer (the one whose vote actually closes a PR upstream) votes REQUEST-CHANGES. The package is structurally good; specific HC-BLOCKs from the maintainer + cross-cutting WARNs need to close before any of the 3 PRs open at `openclaw/openclaw`.

---

## Cross-cutting findings (flagged by 2+ reviewers)

### XC-1 — Multi-tenant LKG isolation (HC-BLOCK from compliance + HC-WARN from IT admin)

**The contract is silent on multi-tenant isolation.** Path-normalize collisions across tenants are technically possible if two tenants register the same absolute path; LKG state could leak. Both the IT admin and compliance officer flag this as a launch-blocker for regulated-environment deployment.

**Recommended fix**: either (a) `LKGStore` instances are per-tenant by construction (with the gateway scoping at register-time), or (b) every method takes a `tenantId` parameter. Document explicitly. Compliance officer's wording: this MUST be made explicit before HIPAA-BAA / EU AI Act / FedRAMP-Moderate deployments can proceed.

### XC-2 — Hook-merger migration cost (raised by hobbyist + IT admin + skill author)

The widening from `ApprovalDescriptor` to `ApprovalDescriptor | ApprovalDescriptor[]` is small at the merger but ripples through every consumer:

- **Hobbyist**: existing plugin combos that "worked yesterday" suddenly throw approval prompts (or, if a plugin throws, `plugin_invocation_failed` audit entries appear that users don't understand)
- **IT admin**: supervisor-UI fleet (including third-party Swift apps) can't take a single-day cutover; needs a deprecation window or feature flag
- **Skill author**: `Array.isArray(result.requireApproval)` discriminations ripple through every approval-rendering plugin; ship a `normalizeApprovals` helper from the SDK to absorb the difference

**Recommended fix**: ship the helper from SDK (compile-time and runtime); add a deprecation window before flipping the merger semantics; make the behavior change opt-in via gateway config for the first release.

### XC-3 — `__OPENCLAW_REDACTED__` sentinel guard is literal-only (IT admin W2)

The PR-1 substrate guard rejects the literal string `"__OPENCLAW_REDACTED__"` at the emit boundary. IT admin points out this is a single-rotation-cycle solution: when ops rotates the substrate (the redacted-snapshot codepath at `src/config/redact-snapshot.ts:93`) without rotating the guard, the system silently regresses. Sentinel and substrate must rotate together — pull from a shared registry (`OC_REDACTION_SENTINELS` or similar).

### XC-4 — PR-3 bundles 3 deltas (HC-BLOCK from upstream maintainer)

Upstream maintainer flags PR-3 as violating one-thing-per-PR culture (PolicyIR types + `ctx.lkgFingerprint` extension + hook merger AND fix = three separately-reviewable changes). Recommends splitting:
- PR-3a: PolicyIR types contract (additive)
- PR-3b: `ctx.lkgFingerprint` extension (additive)
- PR-3c: hook merger conjunctive AND (behavior change)

Counter-argument from the package: they're the same chain-of-custody story at different layers. Splitting orphans one half.

**Recommended path**: file the umbrella issue first; let the maintainer decide whether they want one PR or three. Be ready to split.

### XC-5 — Audit-trail correlation across LKG recovery (IT admin W3 + compliance officer W2)

When LKG recovery fires mid-session, the audit trail should let SIEM stitch:
- The bad-bytes fingerprint that triggered recovery
- The good-bytes fingerprint that was restored
- The clobbered-file path (so forensics can read the bad bytes)
- The session/correlation event ID
- The actor (which plugin, which agent, which session)

The current `LKGObservation`-recovered shape doesn't carry all of these. Compliance officer asks specifically for HIPAA §164.312(b) audit-controls compliance. IT admin asks for SIEM correlation IDs.

**Recommended fix**: extend `LKGObservation`'s recovered variant with `replacedFingerprint`, `actor: { pluginId, agentId, sessionId }`, `correlationEventId`, `clobberedFileHash`.

### XC-6 — Contract-level signing absent (compliance officer W4)

The package punts signing to "operator-territory layered on top." Compliance officer pushes back: SOC 2 §CC6.1 and FedRAMP AU-10 expect a contract-level attestation pathway. Recommend an optional `attestation?: string` field on `LKGFingerprint` with a MUST-verify-or-audit-absent semantic.

**Recommended fix**: add the optional field; document the MUST-verify-or-audit semantic; leave actual signing to operators but provide the slot.

---

## Per-persona detailed findings

### 05 — Hobbyist · APPROVE-WITH-WARNINGS

**Strengths called out**:
- PR-1's byte-stable workspace files is "exactly the bug I hit twice last month"
- PR-2 is invisibly served by the existing config recovery (already shipped)

**Warnings**:
- PR-3 merger fix is a behavior change for users with plugin combos
- Microsoft-isms in the pre-RFCs (`Sensitivity` enum spelling, Agent365-only authorship example, OneDrive-primary multi-agent framing) need cleanup before `#clawtributors` sees them

**Asks**: release notes in plain English ("your comments and formatting in `openclaw.json` will now be preserved"); `openclaw doctor` improvement to surface the new merger semantics

### 07 — Enterprise IT admin · APPROVE-WITH-WARNINGS

**Strengths called out**: substrate-level corruption guard (PR-1's sentinel rejection) and conjunctive merger (PR-3) close the two failure modes that wake the IT admin up at night.

**5 HC-WARNs**:
- W1 — `ApprovalDescriptor[]` widening needs deprecation window or feature flag (third-party Swift apps can't take single-day cutover)
- W2 — Sentinel guard literal-only; needs shared registry
- W3 — LKG audit-trail correlation across mid-session recovery underspecified for SIEM stitching
- W4 — Multi-tenant LKG isolation silent at contract level (path-normalize collisions across tenants)
- W5 — `ctx.lkgFingerprint` closes TOCTOU at plugin layer but NOT at supervisor approval layer

### 08 — Compliance officer · APPROVE-WITH-WARNINGS

**Strengths called out**: 326-scenario evidence base is "the strongest I've seen from this contributor wave" — strong enough for an external auditor.

**5 HC-WARNs**:
- W1 — Rename "defense-in-depth" to "two-axis integrity" + add normative MUST-check-both rule
- W2 — Extend `LKGObservation`-recovered for HIPAA §164.312(b) forensic reconstruction
- W3 — The 3 documented `[GAP]`s need compensating-control runbooks (they're audit findings until they do)
- W4 — Signing punted to "operator territory" needs contract-level attestation hook for SOC 2 §CC6.1 / FedRAMP AU-10
- W5 — Multi-tenant LKG isolation MUST be made explicit (highest priority)

**Conditional sign-off** enumerated for HIPAA-BAA, EU AI Act, FedRAMP-Moderate deployments.

### 10 — Skill connector author · APPROVE-WITH-WARNINGS

**Strengths called out**: substrate is the right shape; declarative registration; content-addressed; backend-agnostic. `policyId = sha256(jcs(body))` is the right cache-key choice (just export the canonicalizer so plugins don't re-implement it).

**4 ergonomic warnings**:
- W1 — `LKGTracker<T>` should be `LKGTracker<TParsed, TIssue>` so plugin authors keep their typed issues at the validation boundary
- W2 — `LKGFingerprint` 11-field shape leaks `node:fs` (`dev`, `ino`, `mode`, `nlink`, `uid`, `gid`, `mtimeMs`, `ctimeMs`); split into universal `{hash, bytes, observedAt}` + optional `fsStat?:` appendix BEFORE non-FS backends ship
- W3 — `ApprovalDescriptor | ApprovalDescriptor[]` widening looks small at the merger but ripples ugly `Array.isArray` discrimination through every approval-rendering plugin; ship a `normalizeApprovals` helper from the SDK
- W4 — Pre-RFCs have ZERO plugin-author code examples; this will become the loudest first-week complaint

### 13 — Upstream maintainer · REQUEST-CHANGES

**Note**: the upstream-maintainer agent reviewed against an older state of the vault (the proposals/ flat-file layout from before the restructure this PR makes), which produced one HC-BLOCK around "vault inconsistency" that's an artifact of the agent's reading state, not a real proposal defect. The OTHER findings are substantive and worth treating seriously.

**Substantive HC-BLOCKs**:
- B2 — PR-2 reads as **refactor-only** (auto-rejected per PR_WORKFLOW.md): generalizes `recoverConfigFromLastKnownGood` into a contract WITHOUT migrating the existing consumer or registering a second consumer in the same wave. Recommend: include the config-LKG migration in PR-2, OR include a second consumer (PolicyIR's tracker registration) in the same PR.
- B3 — PR-3 **bundles 3 deltas** violating one-thing-per-PR culture. See XC-4.
- B4 — `ctx.lkgFingerprint` as a field-shape extension hasn't been justified over an accessor-shape `getCurrentLKGFingerprint(path)` API. Recommend: spell out the accessor alternative and why field-shape wins.

**HC-WARNs**:
- "modernization" is Microsoft-shaped framing — community will read it as marketing. Pick a less loaded word.
- 10-PR cap math: claws-hapi has 6 PRs in flight in the existing hapi wave; 3 more from this package puts the contributor at 9 against the 10-cap. Tight. Coordinate with the hapi wave maintainer before opening any of these.
- `flock(2)`-on-FUSE for the git-backed LKG impl unresolved (raised in `downstream-lkg-git-backend.md`); should resolve before the FS-backed reference plugin ships, since the test matrix would benefit from that gating answer.

---

## Recommended path forward

1. **Address XC-1 (multi-tenant isolation)** in `upstream-pr2-lkg.md` and `upstream-pr3-policyir.md` — make tenant-scoping explicit in the contract. This is the #1 priority blocker.
2. **Address XC-4 (PR-3 bundling)** by being prepared to split. File the umbrella issue first, let the maintainer decide.
3. **Address XC-2 (merger migration cost)** by drafting the `normalizeApprovals` helper and sketching a deprecation window proposal.
4. **Address XC-5 (audit correlation)** by extending the `LKGObservation`-recovered shape.
5. **Address XC-6 (contract-level signing slot)** by adding the optional `attestation?` field to `LKGFingerprint`.
6. **Address upstream maintainer B2 (refactor-only PR-2)** by deciding whether to bundle the config-LKG migration into PR-2 OR ship PolicyIR's tracker registration as the second consumer in the same PR.
7. **Address skill author W2 (POSIX leak)** by splitting `LKGFingerprint` into universal + optional appendix BEFORE non-FS backends ship.
8. **Address skill author W1 (TParsed/TIssue split)** in the type generic.
9. **Cleanup pass on Microsoft-isms** before any `#clawtributors` thread or upstream filing.
10. **Add plugin-author code examples** to the pre-RFCs (skill author W4).

Once these are addressed, revisit verdicts. The maintainer is the gating reviewer; the others are advisory but converge on real, addressable concerns.

---

## Files

Per-persona reviews:
- [[05-hobbyist.md]]
- [[07-enterprise-it-admin.md]]
- [[08-compliance-officer.md]]
- [[10-skill-connector-author.md]]
- [[13-upstream-maintainer.md]]
