# R2 review — 05 the hobbyist

**Verdict**: APPROVE
**R1 verdict was**: APPROVE-WITH-WARNINGS
**Delta vs R1**: Improved — Option C addressed the headline footgun about as squarely as a hobbyist could hope for, and the structural split actually makes the package more legible from my seat too.

## R1 concern: PR-3 merger fix is a behavior footgun for users with multiple plugins installed — needs release-notes story — Status: CLOSED (with a minor residual ask)

The Option C restructure addressed this from four directions, all of which I asked for in R1:

1. **Isolation.** The merger fix is now its own PR-4 (`upstream-pr4-hook-merger.md`) instead of riding piggyback on an additive contract. From a hobbyist-tracking-the-changelog perspective this is huge: a behavior change with its own GitHub PR, its own release-notes line, its own review thread. Exactly what R1 asked for.
2. **Opt-out path is now first-class.** The new `gateway.approvalsMerger: "conjunctive" | "first-wins"` config flag (PR body lines 283, PR-4 description) is the escape hatch I begged for. If `openclaw update` lands the fix and my home-lab agent suddenly starts blocking on a misbehaving clawhub plugin, I can flip back to `"first-wins"` for one release while I figure out which plugin to disable. That's the right ergonomic — a knob with a deprecation window, not a hard cutover.
3. **Crash-safety wrapper.** The per-plugin invocation site now isolates one plugin's exception from another's approval requirement. This kills the worst R1 scenario I flagged ("plugin B silently throws → tool calls I used yesterday now blocked") — plugin A's approval survives plugin B's exception instead of the whole merge collapsing.
4. **Plugin-author migration kit.** The public `normalizeApprovals(field): ApprovalDescriptor[]` SDK helper plus the codemod means the clawhub plugins I have installed will get patched by their authors with one codemod run, not a hand-rewrite. Faster ecosystem catch-up = less time my home-lab spends with one mismatched plugin in the merger chain.

**Residual ask (not blocking)**: the PR-4 pre-RFC and the eventual upstream release notes still need a plain-English hobbyist line — something like "if you have multiple plugins installed and your agent starts asking for approvals it didn't ask for before, this is why; flip `gateway.approvalsMerger: 'first-wins'` for one release if it breaks your setup." The infrastructure is now there; the prose still has to land. I'd verify this in the upstream PR-4 body when it actually opens at `openclaw/openclaw`.

## New R2 concerns

**One small one.** PR-2 absorbing the config-LKG migration in-PR is the right call structurally (gives the contract a real consumer; satisfies the "no refactor-only" maintainer rule), but it does mean PR-2 now touches the existing `recoverConfigFromLastKnownGood` code path that's been silently saving my bacon since v2026.4.23. The byte-for-byte conformance test pinning migrated behavior against pre-migration baseline (PR body line 220) is the right mitigation, but if the migration regresses the config-recovery story even on a corner case, that's a hobbyist-visible regression in the very mechanism that's been protecting me. Worth confirming in CI that the conformance fixture set covers the original `#70528` bug class, not just happy-path round-trips.

The Option C type-shape fixes (universal `LKGFingerprint` core + optional `LKGFsStat` appendix, `LKGTracker<TParsed, TIssue>` generic split, `attestation?` slot) are invisible to me — plugin-author concerns. No new hobbyist surface area.

## Recommendation for the channel

Ready for the `#clawtributors` thread once the PR-4 upstream PR body carries an explicit hobbyist-shaped release-notes paragraph (the `gateway.approvalsMerger` opt-out + the `openclaw doctor` diagnostic story for misbehaving plugins). The structure is right, the helpers are right, the deprecation window is right. Just don't bury the behavior-change story under "conjunctive AND merger" jargon when it hits the upstream changelog — half the hobbyists who'll feel it won't know what that phrase means until their agent breaks.

---

🤖 R2 review by general-purpose agent reading as persona 05
