# R2 review — 10 the skill / connector author

**Verdict**: APPROVE
**R1 verdict was**: APPROVE-WITH-WARNINGS
**Delta vs R1**: Improved — three of the four R1 warnings (W1/W2/W3) are addressed at the type-shape level, and the addition of an isolated PR-4 with a public SDK helper means the breaking change actually ships with the migration kit attached. W4 (plugin-author code examples in the pre-RFCs) is the one that's still on the follow-ups list.

## R1 concerns — status check

### `LKGTracker<TParsed, TIssue>` generic split — CLOSED

PR body line 44 + line 204 show the new shape: `LKGTracker<TParsed, TIssue>`, with the entry-file frontmatter explicitly calling out `pr2: "LKG contract (LKGStore / LKGTracker<TParsed, TIssue>) + config-LKG migration"`. Line 204 frames it correctly: "trackers with rich domain-specific issues (PolicyIR's structured violations, etc.) don't downcast through `ValidationIssue`." That's exactly the W1 ergonomic — my plugin's `MyShapeIssue` with discriminated `kind` flows through `validate(parsed) → ValidationResult<TIssue>`, `suspiciousReasons` and `shouldRecover` see the typed issue vocabulary, no boundary downcast. Default-typed second generic keeps the simple case (a tracker that doesn't care about typed issues) literally unchanged. ~5 LoC contract delta as predicted; pays for itself the first time I switch on `issue.kind`. Caveat: I'd verify in the actual `upstream-pr2-lkg.md` once it lands on disk that the generic defaults flow correctly to inferable call sites — but the PR body type signature is right.

### `LKGFingerprint` POSIX-leak split — CLOSED

PR body lines 182-183 + 203 spell it out: universal core is `{ hash, bytes, observedAt, attestation? }`; the 8 POSIX fields move to optional `fsStat?: LKGFsStat`. This is exactly W2's recommendation and the framing is right ("segregating them keeps non-FS backends honest"). For a git-backed or HTTP/object-store tracker — the backends the proposal explicitly contemplates via `describe.each([fs, git])` — `fingerprint.fsStat` is just `undefined`, no boilerplate `null`-bag for 7 fields. Plugin code that previously would have looked like `if (fp.dev !== null && fp.ino !== null)` now looks like `if (fp.fsStat) { ... }`, which is the correct shape: a single optional appendix gates the POSIX-specific reads instead of seven nullable scalars bleeding `node:fs` semantics into the universal contract. The `attestation?` slot in the universal core is a nice extra — it's the right place for SOC 2 / FedRAMP signed-fingerprint composition without a contract change later.

### Plugin-author ergonomics for the widened approval field — CLOSED

PR body line 283 lists the full migration kit on PR-4: shared internal `mergeApprovals` helper, **public `normalizeApprovals(field): ApprovalDescriptor[]` SDK helper**, migration codemod, `gateway.approvalsMerger: "conjunctive" | "first-wins"` deprecation flag for one release. That's W3's ask delivered as W3(a) explicitly: every plugin author writes `for (const a of normalizeApprovals(decision.requireApproval)) { render(a); }` once and forgets the union shape exists. The codemod handles field readers across plugin codebases automatically — so the 70+ approval-aware plugins in the wild don't each hand-roll an `Array.isArray` discrimination. Crash-safety wrapper at the per-plugin invocation site is the right additional belt: plugin-A's approval survives plugin-B's exception. This is well-shaped.

## New R2 concerns

**One small ergonomic gap, and one residual.**

1. **No public `mergeApprovals` for plugin authors.** The PR-4 description (PR body line 283) says `mergeApprovals` is shared _between the two engine call sites_ but doesn't expose it from `@openclaw/plugin-sdk`. Most plugin authors won't need to merge approvals (the engine does it), but anyone composing approvals inside their own plugin (e.g., a meta-plugin that aggregates approvals from sub-routines before returning a single decision) will reach for the same helper. Worth either exporting it publicly alongside `normalizeApprovals` or documenting that the engine is the only legal merger.

2. **`attestation?` slot semantics are still vague.** Line 207 calls it "for SOC 2 §CC6.1 / FedRAMP AU-10 attestation pathways (enforcement is a follow-up; the slot's presence makes that future work a contract-stable composition rather than a contract change)." For a plugin author implementing a custom backend (HTTP-fetched configs, object-store-backed state) the question "what shape do I put in `attestation` if I want to populate it" isn't answered. The contract-stable-composition argument is correct (don't churn the type later), but a one-paragraph "here's what implementers should put here when ready, here's what consumers should do with it for now (treat as opaque)" would close the ambiguity.

3. **W4 (plugin-author code examples) is still open** — listed in PR body line 346 under "Known follow-ups (not blocking this PR)." That's a fair triage; the panel-fix structure was the higher-priority pass. As a plugin author, my push remains: ship the 20-line "minimum viable tracker" + 10-line `ctx.lkgFingerprint` consumer snippet inside the pre-RFCs before they hit `#clawtributors`. Maintainer reviewers will ask the same thing.

## Recommendation for the channel

Ready for `#clawtributors` once W4 lands (plugin-author code snippets in `upstream-pr2-lkg.md` + `upstream-pr3-policyir.md` + `upstream-pr4-hook-merger.md`). The type-shape fixes are right, the SDK helper is the correct ergonomic, the codemod is the right migration kit. The contract surface no longer leaks `node:fs`. The two new R2 concerns above (`mergeApprovals` exposure, `attestation?` semantics) are easy single-paragraph fixes that can ride into the same docs sweep as the code examples.

---

🤖 R2 review by general-purpose agent reading as persona 10
