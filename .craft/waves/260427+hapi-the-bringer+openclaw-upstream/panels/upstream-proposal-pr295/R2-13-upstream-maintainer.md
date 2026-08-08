# R2 review — 13 the upstream maintainer

**Verdict**: APPROVE-WITH-WARNINGS
**R1 verdict was**: REQUEST-CHANGES
**Delta vs R1**: Improved — Option C closes the two HC-BLOCKs that would have auto-rejected the chain at upstream review (B2 refactor-only, B3 scope creep), and the 3→4 PR split actually makes the chain _more_ reviewable, not less, despite spending one more PR slot.

> Reading note: the new package files (`workspace-modernization.md`, `pr-strategy.md`, `upstream-pr1..4-*.md`) are not on the lobster-docs working tree at `Tech/OpenClaw/specs/proposals/upstream/` — only the pre-rename `realigned-story.md` / `lkg-pre-rfc.md` / `policy-pre-rfc.md` / `lkg-git-pre-rfc.md` / `guardrails-adapter.md` set is on disk. Like R1, I am reviewing against the canonical state in PR-295's body (`pr295-body-v2.md`). If the renamed files exist on the PR-295 branch I am taking that on faith; if not, B1 reopens.

## R1 HC-BLOCKs — status check

### HC-BLOCK B1 (vault inconsistency / chain doc missing on disk) — PARTIAL

The PR-295 body now explicitly enumerates every renamed file (`workspace-modernization.md` entry, `README.md` was `realigned-story.md` via `git mv`, `upstream-pr2-lkg.md` was `lkg-pre-rfc.md`, etc.) in the "What's in this package (file-level)" section. That paper trail is exactly what R1 asked for — _if_ it actually lives on the branch. I cannot verify on disk: the lobster-docs working tree still shows the pre-rename layout. Closing this requires the reviewer to confirm `git diff origin/main…HEAD` on PR-295 actually shows the renames + new files. I will treat this as procedural rather than substantive — a clean `gh pr diff 295 --name-only` showing the 4 new/renamed files closes it.

### HC-BLOCK B2 (PR-2 refactor-only auto-reject) — CLOSED

This is the headline fix and it actually lands. PR-295 body lines 162-167 + 215: PR-2 now ships "factor out the existing config-recovery mechanism… **AND migrate the existing config-LKG code as the first reference consumer in the same PR** — so the new abstraction has a real consumer landing alongside it (not a follow-up), and a byte-for-byte conformance test pinning the migrated behavior against pre-migration baseline." That migrates `recoverConfigFromLastKnownGood` (issue #70528, shipped `v2026.4.23`, commit `af56926e2fc4`) onto the new `LKGStore` in-PR. **This is no longer a refactor-only PR by upstream's PR_WORKFLOW.md definition** — it has a real consumer landing in the same PR, the parallel-mechanism risk W4 raised in R1 is gone, and the conformance test against the shipped behavior gives reviewers a hard regression gate. ~400-500 LoC budget (contract + reference plugin + config migration + conformance test) is on the upper edge of "small focused PR" but acceptable given the migration carries its weight.

### HC-BLOCK B3 (PR-3 bundles 3 deltas) — CLOSED

The split is real, not cosmetic. PR-3 (lines 224-279) is now strictly additive: PolicyIR types contract + optional `ctx.lkgFingerprint` field. PR-295 body line 231 explicitly states: "The breaking-change merger fix that was originally bundled here rides PR-4 instead, so PR-3 stays purely additive — existing plugins compile unchanged; the new field is optional." PR-4 (lines 281-313) is the isolated breaking change with its own deprecation flag (`gateway.approvalsMerger: "conjunctive" | "first-wins"`), its own codemod, its own `normalizeApprovals` SDK helper, and its own crash-safety wrapper. **Cross-contamination check**: PR-3 description does not mention `mergeApprovals`, `requireApproval[]`, or `hooks.ts:1008-1013`. PR-4 description does not mention PolicyIR types or `ctx.lkgFingerprint`. The split is clean. Each PR is independently reviewable and independently revertable.

### HC-BLOCK B4 (ctx field vs accessor) — OPEN

The R1 callout's status as "still pending" is accurate. PR-3 description (line 229) keeps `ctx.lkgFingerprint` as a field on `PluginHookToolContext` and offers no concrete failure mode the accessor cannot satisfy. The "Defense in depth — two anchors" section justifies _fingerprinting at all_ but not _field-shape over accessor-shape_. This is small — a paragraph in the PR-3 description — but the bot trio (Greptile in particular) will ask for it on first review cycle if it isn't pre-empted. Not blocking, but I want it landed before the upstream PR opens, not as a review-cycle exchange.

## New R2 concerns

- **10-PR cap math (was W3): same author, now 4-PR chain stacked on the 6-PR Hapi wave = 10 PRs total — exactly at the cap, zero headroom for a bug-fix PR before auto-close trips at 11.** The package needs an explicit dispatch plan stating which Hapi-wave PRs merge before any LKG-chain PR opens. "Open all 4 at once and let the queue serialize" is an exemption ask I will refuse. Two-PR-open culture (`pr_open_concurrency: 2`) is non-negotiable; the chain ordering must respect it.
- **AI-assisted disclosure (was R1 B6): I see the package-level disclosure on the entry frontmatter and the PR-295 body's `Co-Authored-By` trailer.** Per-PR disclosure on each of the 4 upstream PR descriptions is still a hard expectation when those PRs open at `openclaw/openclaw` — the PR-295 body is a vault-side artifact; bot reviewers read upstream PR descriptions only.
- **Microsoft-isms sweep (line 345 "Known follow-ups"): the package self-flags this as low-priority polish.** From my chair it is not low priority — every "claws", "lobster", "@bic/", "Microsoft" reference must be scrubbed from the upstream PR descriptions and code comments before opening, or the contributor-pace-asymmetry pain that this persona protects against materializes. Schedule it before `#clawtributors`, not after.
- **Dependency ordering**: PR-1 → PR-2 (LKG depends on byte-stable workspace files) → PR-3 (PolicyIR ctx threading depends on LKG) → PR-4 (independent of 1-3). Land 1, 2, 3 in order; PR-4 can ride parallel as long as the 2-PR-open quota is respected.

## Recommendation for the channel

**Ready for `#clawtributors` thread once three small things land**: (1) per-PR AI-assisted disclosure in each of the 4 upstream PR descriptions; (2) the B4 field-vs-accessor justification paragraph in PR-3's description; (3) the dispatch order document showing how the 4 LKG PRs interleave with the remaining Hapi-wave PRs to keep open-PR count ≤ 2 and total ≤ 10. Merge order at upstream: PR-1 → PR-2 → PR-3, with PR-4 ridable in parallel after PR-1 lands. None of these are blocking the directional `#clawtributors` ask; they are blocking the actual upstream PRs opening.

The Option C restructure earned the upgrade from REQUEST-CHANGES to APPROVE-WITH-WARNINGS. The maintainer-shaped concerns that drove R1's REQUEST-CHANGES are closed; the residuals are cleanup, not blockers.

---

🤖 R2 review by general-purpose agent reading as persona 13
