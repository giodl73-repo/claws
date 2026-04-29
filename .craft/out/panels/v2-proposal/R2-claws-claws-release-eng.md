# v2 Proposal Review · R2

**Reviewer**: claws:claws-release-eng
**Round**: 2
**Date**: 2026-04-29
**Subject**: v2 OpenClaw contribution proposal — amended state (snap pre-RFC R1+R1-follow-on, policy pre-RFC R1+R1-follow-on, guardrails-adapter R1+R1-follow-on, realigned-story R1+R1-follow-on) + new sibling plan `hapi-amendment-to-contract-first.md`
**Lens**: publish reliability / cutover-safety / cadence / coordination / calendar honesty
**Prior round**: R1 = REQUEST-CHANGES (6 BLOCK / 6 WARN / 3 NOTE)

---

## Verdict: **APPROVE-WITH-WARNINGS** — operational machinery now drafted; coordination cost honestly priced; trim plan still owed but its absence is no longer load-bearing for this proposal package

The amended proposal package crosses the operational threshold R1 said it had to cross. Calendar honesty is now load-bearing language in `realigned-story.md` (lines 11, 173, 206-245); the 6-10 week chain window is named explicitly in three places and propagated into `policy-pre-rfc.md:173`. The trim arithmetic resolves to a pinned 6,200 LoC firm with arithmetic shown (lines 189-202), and the audit-stays-downstream rationale (lines 64-76) explains *why* the figure is what it is rather than handwaving it. The hapi narrative is honest (lines 13-27): no fictional PR-7, the actual PR-5/6 daemon shapes are acknowledged, and a sibling coordination plan (`hapi-amendment-to-contract-first.md`) was authored to execute the amendment with explicit gating on R2 verdict + sequencing-before-v2-PR-1-dispatch.

What stays open but does not block this approval: the **trim wave plan itself was not written** (only the hapi-amendment plan was). R1's B4 raised four release-eng concerns about the trim (test-migration, downstream consumers, commit topology, coverage propagation) and forward-pointed to a future trim plan to absorb them. That trim plan still does not exist. However: the realigned-story now explicitly forward-points to it as a separate doc that the trim wave owns (lines 274, 314), the rollback gates (B3) are partially absorbed by the calendar honesty (the trim cannot begin before week 6 per the realistic cadence), and the trim cannot dispatch before the contract chain merges anyway. So the trim plan is **the next required artifact**, not a fix to this proposal. This is a sequencing call, not a hand-wave: the trim plan reads against contracts that haven't merged, and writing it before R2 of the proposal package would have been speculative. Writing it after the contracts open at upstream is the right order.

The hapi-amendment plan is operationally the strongest artifact in the package. It explicitly enumerates what stays, what changes, sequencing-with-v2-PR-1-dispatch, risk register (7 items), out-of-scope, four open questions to resolve before execute. From a release-eng "publish reliability over velocity" lens, this is the discipline the original R1 was missing: the coordination cost is now priced and bounded.

**Three new MAJOR findings** surface at R2 (all release-eng-specific operational concerns the v2 amendments expose but don't fully close): (1) the new hapi-amendment plan introduces a coordination cost not reflected in the v2 proposal's chain-timeline math; (2) the audit-stays-downstream rationale acknowledges format hasn't baked across non-claws consumers but doesn't define the bake-test trigger for future v3; (3) the trim plan deferral is correct but its absence creates a documentation race condition where contracts could merge before the trim plan exists, leaving the team to draft trim under deadline pressure.

**Six WARN-level** findings on cadence-leak between hapi amendment and v2 PR-1, audit-format soak-test gate, trim plan deadline-pressure risk, downstream feature-freeze policy still undefined for the 6-10 week window, doc-destination still unpinned, and the new claws-guardrails rename adding to the rename-coordination cost.

**Two NOTE-level** observations on calendar diagram annotation and the lack of explicit "approve gates" between the hapi amendment, v2 PR opening, and trim wave start.

The architecture is right. The operational machinery is now drafted. The remaining gaps are **next-step sequencing**, not "this proposal is broken." If R2 verdict is APPROVE-WITH-WARNINGS, the user is correctly cleared to share the channel-safe pre-RFCs and dispatch the hapi amendment, with the WARN items as a fix-while-implementing punch list.

---

## R1 finding resolution

### M-HAPI-COLLISION (R1 B1 + repo-steward HC-BLOCK 2) — **RESOLVED**

The amended `realigned-story.md` §"Hapi wave coordination" (lines 13-27) replaces the earlier fiction with an honest account of hapi's current state:

- Acknowledges **no PR-7 exists** (`realigned-story.md:15`: "There is no PR-7 in the current revision — that was a numbering artifact from an earlier plan")
- Names the actual offenders (PR-5 = policy generator + 9-verb subcommand; PR-6 = snap daemon-shape with port + HTTP surface + audit chain coupling + 11-verb subcommand)
- States explicitly that they "contradict the v2 contract-first proposal" (`realigned-story.md:15`)
- Lists 5 concrete coordination steps (`realigned-story.md:21-25`) marked out-of-scope for the docs-only fix-pass with the rationale being "the user's instruction was 'do not touch the hapi worktree'" (line 27)

The new `hapi-amendment-to-contract-first.md` plan operationalizes those 5 steps as 3 plan headlines + 12-step order-of-operations + 7-item risk register. This is exactly the coordination mechanism R1 B1 asked for. The plan even captures the working-tree-uncommitted-edits risk (Risk §5) and the cherry-pick-window concern (Risk §6) that R1 didn't anticipate.

**Citation**: `realigned-story.md:13-27`, `hapi-amendment-to-contract-first.md` (entire file, especially Coordination §1-12 lines 119-131 and Risk §1-7 lines 141-153).

**Caveat (re-stated as new finding R2-M-NEW-1)**: the amendment plan exists but its execution is gated on R2 APPROVE; the v2 proposal package itself does not assume the amendment is done, just planned. This is the right discipline. The dependency is named honestly in `hapi-amendment-to-contract-first.md` Coordination §1 and Sequencing.

### M-UPSTREAM-CADENCE-FANTASY (R1 B2) — **RESOLVED**

Calendar honesty is now load-bearing language across all three docs that need it:

- `realigned-story.md:11` (TL;DR): "Realistic upstream timeline: 6–10 weeks for the chain to land (not "1–2 weeks") — see "Calendar honesty" below."
- `realigned-story.md:206-245` (entire §"Calendar honesty" subsection): names the constraints (10-PR cap, 2-PR concurrency, 2-week LTS, bot reviewer trio, AI-disclosure, refactor-only auto-rejected, one-thing-per-PR, codename gates), gives the per-PR realistic cycle (Day 1 / Days 2-4 / Days 5-10 / Days 10-14), gives the chain math table (lines 231-237), states "Realistic chain merge: day 28 best case, day 42–56 typical, day 70+ tail. Translation: 6–10 weeks." (line 238)
- `realigned-story.md:240-244` (Implications): "The trim wave cannot begin before the chain lands... Eduardo's deployment timeline cannot assume contracts merged before week 6... The post-trim Rust port is gated on the trim, so it sits behind another wave at week 8+."
- `realigned-story.md:312` (out-of-scope): "OpenClaw upstream releases / cadence — Hapi wave coordinates with the 2-week release train; the chain itself is 6–10 weeks regardless."
- `policy-pre-rfc.md:173`: "Realistic upstream timeline: per `realigned-story.md` 'Calendar honesty,' the upstream chain is a 6–10 week window, not '1–2 weeks.' See `realigned-story.md` for the per-PR cadence math."

The framing is consistent across docs and uses the per-PR median + tail decomposition R1 asked for. The 2-week-LTS friction is explicit. The Eduardo-blast-radius is named.

**One residual gap**: the sequencing diagram in §"Sequencing" (lines 247-261) now has calendar-week annotations per arrow ("week 0", "week 0–3 (median day 14)", "week 2–6 (overlapping iteration with snap; median day 28)", "week 6+"). R1 N1 asked for this; landed.

**Citation**: `realigned-story.md:11, 173, 206-245, 247-261, 312`; `policy-pre-rfc.md:173`.

### M-TRIM-ARITHMETIC-AMBIGUITY (R1 B4 partial + repo-steward HC-BLOCK 4 + platform-eng M3) — **RESOLVED**

The trim arithmetic is now pinned at 6,200 LoC firm (no range), with the arithmetic shown:

- `realigned-story.md:11` (TL;DR): "we drop ~6,200 LoC of parallel implementations after deduplicating snap×policy overlap... pinned to the conservative figure per R1-follow-on amendment because audit stays downstream"
- `realigned-story.md:189-202` (entire §"What this replaces" subsection): gross sum 7,889 (1,556 + 1,726 + 3,107 + 1,500), explicit "− ~1,689 LoC of audit×snapshot overlap that's actually double-listed = ~6,200 LoC"
- The audit-stays-downstream rationale (`realigned-story.md:64-76`, §"Why audit is not in v2 scope") explains *why* the figure is what it is — three reasons (no meaningful consumer choice variation; upstream surface budget; format hasn't baked) and explicitly states "If audit had been promoted to `@openclaw/audit`, the trim figure would have included an additional ~1,500 LoC of carve-out churn... the gross trim would have moved up to the ~7,000 LoC range — at the cost of an extra upstream PR" (line 74)
- `realigned-story.md:281` updates the per-target line for `claws-sdk/src/audit/` to: "fold the chain machinery into `claws-policy-generator/emit/`. R1-follow-on 2026-04-29: the destination is now firm — audit stays downstream in v2 (see 'Why audit is not in v2 scope' above); no `@openclaw/audit` carve-out is in scope. The earlier 'or a new `openclaw-audit/` if cross-package demand emerges' hedge is retracted; future v3 may revisit."

This is exactly what R1 B4 asked for: arithmetic shown, single firm number, double-counts named and deduplicated.

**Citation**: `realigned-story.md:11, 64-76, 189-202, 281`.

### R1 B3 — Trim wave has no reverse-cutover (rollback) story — **PARTIALLY-RESOLVED**

The amended docs partially address this:

- The **calendar honesty** subsection (`realigned-story.md:240-244`) makes the rollback-window narrative implicit: "The trim wave cannot begin before the chain lands — risk of rollback if a contract changes shape mid-trim is too high." This closes one of R1 B3's three concrete scenarios (mid-trim contract change) by gating trim-start on contract-landed.
- **Out-of-scope** (`realigned-story.md:314`) explicitly defers to a future trim plan: "Trim wave plan drafting — separate doc; this story sketches the scope but the rollback gates, test-migration manifest, downstream-consumer impact analysis, commit topology, and coverage recomputation gate live in the trim plan." This is the right scope discipline — trim plan is forward-pointed but not drafted here.
- **What's NOT addressed**: the explicit "Option B reactivates" gate (R1 B3 suggestion #1c — "if PolicyIR is rejected, claws-policy-generator still renames + absorbs, but the conformance claim becomes 'matches the local PolicyIR shape' not 'matches `@openclaw/plugin-sdk/policy-ir`'"). The amended docs don't define this fallback.
- **What's NOT addressed**: the bisect-safe-commits.md / commit topology requirement (R1 B3 suggestion #2). Forward-pointed to the trim plan but not specified here.

The PARTIAL-RESOLVED rather than RESOLVED verdict reflects the gap between (a) the calendar-gate-on-contract-landed which is now explicit (good), and (b) the explicit rollback runbook which is forward-pointed but absent. For an APPROVE-WITH-WARNINGS verdict at R2, the calendar gate is sufficient; the missing runbook becomes a trim-plan deliverable, captured below as **R2-W-NEW-3**.

**Citation**: `realigned-story.md:240-244, 274, 314`.

### R1 B4 — Parallel-implementation cleanup hand-waves trim mechanics — **PARTIALLY-RESOLVED (deferred to trim plan)**

R1 B4's four concerns (test-migration manifest, downstream consumer impact, commit topology / git-mv discipline, coverage propagation) are **all forward-pointed but not drafted** in the amended package:

- `realigned-story.md:274-283` (§"Trim wave scope") has the 4-bullet delete list with destinations + the compiler-move bullet, but no test-migration table, no consumer-impact table, no commit topology, no coverage gate.
- `realigned-story.md:314` (out-of-scope) explicitly defers all four to "the trim plan" along with rollback gates.

This is **the right scope discipline** for the v2 proposal package — it does not pretend the trim plan exists. But it leaves the trim plan as the next required artifact and makes its absence a release-eng risk: see **R2-M-NEW-3** below.

**Verdict**: PARTIALLY-RESOLVED (good-faith deferral with explicit forward pointer). A real RESOLVED would require the trim plan to land before the v2 chain starts merging at upstream. Per the calendar honesty at `realigned-story.md:240-244`, the trim wave can't begin until week 6+; the trim plan can be drafted in weeks 0-6 alongside the upstream review cycle. This is the right ordering.

**Citation**: `realigned-story.md:274-283, 314`.

### R1 B5 — Rust-port plan's R1 panel findings unaddressed — **PARTIALLY-RESOLVED**

The amended `realigned-story.md:293-295` (§"Rust port scope (post-trim)") now explicitly conditions the rust-port on the unaddressed R1 findings:

> "Rust port target is conditional on trim landing, post-trim contract stability, and the unaddressed rust-port R1 findings (M-CRYPTO-MISLABEL, M-CUTOVER-ROLLBACK, RB-violation, codename discipline). The earlier '2-3 weeks at sustainable pace' claim is retracted — at upstream's realistic cadence and given the rust-port-plan revision must close 4 critical findings before dispatch, the honest scope is **5–6 weeks at sustainable pace, NOT within the user's recurring '1–2 weeks' ambition window.**"

It also escalates the rust-port plan's flag from `revision_pending: true` to `revision_required_before_dispatch: true` (in narrative form on line 295) with explicit dependencies on (a) trim landing, (b) R1 findings closing, (c) contract-stability post-trim signal.

This is exactly what R1 B5 asked for. The 4 critical findings are named explicitly. The honest scope replaces the optimistic claim. The dependency on the rust-port-plan revision is conditional, not aspirational.

**Caveat**: the realigned-story does NOT enumerate which trim-wave activity addresses which R1 finding (R1 B5 suggestion #1: "lists the 4 critical R1 findings and states which the trim wave addresses... and which the rust-port-plan-revision must address"). The escalation is named but the per-finding ownership is not. PARTIALLY-RESOLVED.

**Citation**: `realigned-story.md:293-295`.

### R1 B6 — Doc destination unpinned; channel-shareable artifacts have no repo-of-record — **UNRESOLVED**

The amended docs have NOT pinned the destination. `.craft/out/proposals/` is still where they live. `realigned-story.md:4` still says: "potentially shareable to `#clawtributors` as the 'why' behind the pre-RFCs (with scrubbing pass per repo-steward W3)" — *potentially* and *with scrubbing pass per repo-steward W3* are both still hedges, not decisions.

The footer scrubs in `snap-pre-rfc.md:271` and `policy-pre-rfc.md:205` now say "Internal architecture audit notes available on request" instead of citing `.craft/out/audits/...` paths — that's a small win on internal-tooling-leak-avoidance.

But `guardrails-adapter.md` still has internal package paths (`packages/claws-guardrails/src/openclaw-adapter.ts`) — line 46 — and `realigned-story.md` has internal LoC counts of specific subdirectories (lines 195-198), specific scrubbing not yet performed.

R1 B6 is **UNRESOLVED**. The doc-destination decision was deferred. This is captured below as **R2-W-NEW-5**.

**Citation**: `realigned-story.md:4`, `snap-pre-rfc.md:271` (improved), `policy-pre-rfc.md:205` (improved), `guardrails-adapter.md:46`, `realigned-story.md:195-198`.

### R1 W1-W6 status

- **R1 W1 (Eduardo coordination + rename timing)**: PARTIALLY-RESOLVED. Renames are explicit (`realigned-story.md:286-291`) and the §"Calendar honesty" at lines 240-244 names "Eduardo's deployment timeline cannot assume contracts merged before week 6." Specific rename-relative-to-Eduardo-first-crossing decision still not made. New `claws-guardrails` rename adds to the coordination cost — see **R2-W-NEW-6**.
- **R1 W2 (conformance test cross-PR coupling iteration cost)**: RESOLVED. `realigned-story.md:322` (cross-contract concerns §3) updates the iteration estimate: "Per gateway-eng R1 §3, naming RFC 8785 JCS in **both** contracts (which we now do, per `snap-pre-rfc.md` 'Snapshot ID generation' and `policy-pre-rfc.md` 'Canonicalization') **uncouples** the conformance test from the cross-PR handshake — both sides reference the same standard, so the test becomes a unit test against the standard, not a moving-target cross-PR negotiation. Expect 1–2 iteration rounds rather than the earlier 2–3." Better than R1 W2 asked for.
- **R1 W3 (per-PR test budgets / 100-fixture canonicalization gate)**: UNRESOLVED. The pre-RFCs do not have §Per-PR Test Budget tables. The 100-fixture canonicalization gate is still not anchored explicitly in `snap-pre-rfc.md`. Captured below as **R2-W-NEW-2**.
- **R1 W4 (retirement window for TS through the contract chain)**: UNRESOLVED. No §Retirement Window subsection added. Forward-pointed implicitly via the rust-port scope (`realigned-story.md:293-295`). Still owed.
- **R1 W5 (post-trim coverage propagation)**: UNRESOLVED. `realigned-story.md:314` defers coverage recomputation to the trim plan; no current-state baseline pinned. Still owed at trim plan time.
- **R1 W6 (concurrent claws feature dev during upstream window)**: UNRESOLVED. The 6-10 week feature-freeze policy on the 4 deletion-target subdirectories is still undefined. Captured below as **R2-W-NEW-4**.

### R1 N1-N3 status

- **R1 N1 (sequencing diagram with calendar annotations)**: RESOLVED. `realigned-story.md:247-261` adds week-range annotations per arrow.
- **R1 N2 (split open-question §5 into ordering vs calendar)**: NOT-ADDRESSED. The single open-question survives at `realigned-story.md:303` as one combined question. Minor.
- **R1 N3 (capability-table membership pre-decision)**: PARTIALLY-RESOLVED. `snap-pre-rfc.md:232` now says "Recommendation: no row for v1." `policy-pre-rfc.md:147` says "Recommendation: no row for v1." These are pre-positions matching R1 N3. Not all open questions got pre-positions, but the capability-table ones did.

---

## Lens.verify checklist applied to amended state

The role's `lens.verify` checklist has 8 questions. Most of them apply to the **release workflow** which is not the subject of this v2 proposal; they apply to the eventual trim wave + rust port + downstream packaging. Below is the subset relevant to the v2 proposal package:

1. **"Does the release workflow run install + smoke + dogfood BEFORE tagging the release, or only after?"** N/A for the v2 proposal (which is upstream pre-RFCs, not a downstream package release). Applies to the post-trim downstream rename wave; flag forward.

2. **"Is the version/tag convention documented (semver? wave-aligned tags? conventional commits?) and enforced by a check?"** **GAP**. The pre-RFCs declare types like `interface PolicyIR { readonly version: string; ... }` (`policy-pre-rfc.md:58-65`) but never state a versioning policy. R1's coordination obligation §6 raised this: "When PolicyIR v1 lands and v2 changes shape later, what's the semver story?" Still unaddressed. Captured below as **R2-NOTE-2**.

3. **"Does the release workflow publish all packages atomically, or can a partial failure leave some packages at vN and others at vN+1?"** Future trim wave concern, not v2 proposal concern. Forward-flag.

4. **"When a release fails mid-pipeline, is rollback documented and practiced?"** Same as R1 B3 PARTIALLY-RESOLVED — calendar gate yes, runbook no.

The other lens.verify questions (smoke test, sibling-consume dogfood, NODE_AUTH_TOKEN, publishConfig.registry) are workflow-level and don't apply to the v2 proposal package. They will apply when the trim wave's downstream renames and any subsequent `@gim-home/*` republish happen.

**Net lens.verify result on the v2 proposal package**: clean enough for APPROVE-WITH-WARNINGS. The forward-flagged items become trim plan / rust port plan / future release-engineering deliverables.

---

## New findings (release/coordination concerns the v2 amendments expose or don't fully close)

### R2-M-NEW-1 — Hapi-amendment plan introduces coordination cost not reflected in chain timeline

The new `hapi-amendment-to-contract-first.md` plan is operationally strong but introduces a **sequencing constraint** the v2 proposal's chain timeline doesn't price:

- `hapi-amendment-to-contract-first.md` Sequencing (lines 175-180): "BEFORE any v2 PR-1 (snap contract) opens at `openclaw/openclaw`. Otherwise hapi's retired PR drafts and v2's contract drafts will both reference the upstream simultaneously and confuse future readers."
- Risk §3 (line 145): "The amendment is scoped to ~1 day of execution work (1 commit on hapi, 1 commit on main monorepo, ~12 file moves + edits, no code changes). Per `realigned-story.md` §"Calendar honesty," v2's chain is 6–10 weeks of upstream review cycle, so a 1-day amendment is not on the critical path."

But the `realigned-story.md` chain math (lines 231-237) starts at "day 0 = oc-path merged" — it does NOT add the hapi amendment day(s) before snap can open. If the amendment takes 1 day plus user-review cycle, the actual chain calendar is `1-3 days hapi amendment → snap PR opens → day 14 median snap merge → day 28 PolicyIR median → ...`. Realistic but unstated.

**Severity**: Medium. The 1-3 day delta is small relative to 6-10 weeks, but the chain timeline at `realigned-story.md:231-237` should annotate the pre-day-0 amendment as a precondition, not just an out-of-scope note.

**Fix**: amend `realigned-story.md` §"Calendar honesty" or §"Sequencing" to add a "week -1 / day -3 to -1: hapi amendment lands before any v2 PR opens at `openclaw/openclaw`" precondition row. This makes the dependency on the amendment plan visible in the chain math.

### R2-M-NEW-2 — Audit format soak-test trigger for future v3 is undefined

`realigned-story.md:64-76` (§"Why audit is not in v2 scope") gives three reasons audit doesn't belong upstream in v2. Reason #3 (`realigned-story.md:72`) says: "Format hasn't baked across enough consumers yet... let it run two release cycles in claws before contractualizing... let the HMAC chain + Ed25519 head bake in claws for two release cycles (the 2-week LTS cadence × 2 = ~4 weeks of post-merge soak); revisit for a v3 contract proposal once the format has demonstrably survived a non-claws consumer integration."

This is conceptually correct but operationally undefined:

- "Two release cycles" is named (4 weeks). Good.
- "Demonstrably survived a non-claws consumer integration" is named. But **no consumer pipeline currently consumes the audit format outside claws**. Lobster-web vendors DTOs from `claws-sdk/src/types/`; that's a vendoring relationship, not a real consumer-of-format integration. There is no concrete plan for which non-claws consumer would do the integration test.
- **Trigger condition for v3 is unfalsifiable**: if no non-claws consumer ever integrates, the v3 audit contract never opens, the format is forever downstream-only, and the future v3 ask is a permanent dead letter.

**Severity**: Medium. From a release-eng "publish reliability over velocity" lens, this is a dead-letter-risk. The right discipline is to name a concrete trigger ("when consumer X requests audit format conformance" or "when 2 LTS cycles complete and a public consumer asks for `@openclaw/audit`") so the v3 ask has a known activation path.

**Fix**: amend `realigned-story.md:72` to define a concrete trigger: e.g., "v3 audit contract opens if and only if (a) two LTS cycles complete with no format breakage in claws, AND (b) a non-claws consumer (lobster-web's gateway-emitted-audit consumer, or a public OpenClaw user via `#clawtributors`) requests format-conformance, AND (c) the format has been documented in `docs/openclaw-contributions/audit-format-spec.md` (or wherever per R1 B6 destination)." Without (a)+(b)+(c), audit stays downstream indefinitely; the v3 ask is parked, not pretending to be a roadmap item.

### R2-M-NEW-3 — Trim plan deferral creates a documentation race condition under deadline pressure

R1 B3 (rollback) and R1 B4 (trim mechanics) are both PARTIALLY-RESOLVED via deferral to "the trim plan" (which does not exist). The realigned-story is correct to defer, but the deferral creates a **documentation race condition**:

- Per `realigned-story.md:240-244`, the trim wave cannot begin before the chain lands (week 6+).
- Per `hapi-amendment-to-contract-first.md` Out-of-Scope: "Trim wave plan drafting — separate plan; the trim wave executes the `claws-sdk/src/{snapshot,governance,compliance,audit}/` deletes + the renames after v2 contracts merge."
- **Neither doc names who/when drafts the trim plan.** The realigned-story implies "between now and week 6" but does not put it on a calendar.

**Risk scenario**: contracts open at upstream week 1, snap merges week 3, PolicyIR merges week 5, ctx.snapshotId rides on week 5. Suddenly "the chain has landed" and the trim is supposed to start. But the trim plan does not exist. The team drafts it under deadline pressure with the contracts already merged and Eduardo's deploy clock ticking. Quality of the trim plan suffers because there's no time to do the test-migration manifest, downstream-consumer-impact analysis, commit topology, and coverage recomputation properly.

**Severity**: Medium-High. This is exactly the kind of "publish reliability under velocity pressure" failure mode the release-eng role exists to defend against. The fix is to name the trim-plan-drafting calendar explicitly so it doesn't get squeezed.

**Fix**: amend `realigned-story.md:314` (out-of-scope §"Trim wave plan drafting") to add: "Drafted in parallel with the upstream chain review cycle — drafting starts at chain-day-7 (after snap PR opens and bot review trio has fired so the contract shape is known stable) and completes by chain-day-21 (before PolicyIR median-merge so the trim is ready to dispatch on contract-merged trigger). The trim plan is owned by `claws-release-eng` + `claws-repo-steward` jointly." This puts it on a calendar adjacent to but not on the critical path of the contracts.

### R2-W-NEW-1 — Hapi-amendment plan's risk register §6 (cherry-pick window) needs a deadline

`hapi-amendment-to-contract-first.md` Risk §6 (line 151): "Cherry-pick window for downstream package code: hapi `packages/openclaw-{workspace,policy,snap,guardrails}/` has live code (lint engine + 47 tests, generator + R5 invariants, snap registry + audit chain). This code's destination per v2 is the downstream rename targets... The trim wave (separate, post-v2-merge) executes the actual rename. Hapi must NOT delete this code as part of the amendment; it stays in place until trim. **Mitigation: amendment is doc-only on the hapi side; package code is left in place.**"

This is correct but creates a code-stranded-on-feature-branch problem: hapi's `packages/openclaw-snap/` has code that the trim wave will cherry-pick into `claws-snap-server/` once contracts merge. If the hapi branch goes stale (no merges, no rebases) while the contracts are in upstream review for 6-10 weeks, the cherry-pick gets harder due to drift.

**Severity**: Low-Medium. Not a blocker, but a maintenance task to call out.

**Fix**: hapi-amendment plan §"What stays" or §"Coordination" adds a "weekly rebase or merge from main" obligation on the hapi branch during the upstream review window. Otherwise the cherry-pick window quietly closes.

### R2-W-NEW-2 — Per-PR test budget tables still missing (R1 W3 carry-forward)

R1 W3 asked for §Per-PR Test Budget tables in each pre-RFC. Neither `snap-pre-rfc.md` nor `policy-pre-rfc.md` got one. The 100-fixture canonicalization parity gate is referenced indirectly (the conformance test) but not anchored as a per-PR test count.

**Severity**: Low-Medium. Bot reviewer trio at upstream will ask "where are the tests" on PR-open. Without pre-defined L0/L1/L2/L3 budgets per PR, the answer is "we'll see" — invites P1/P2 findings.

**Fix**: each pre-RFC adds a small "Per-PR test plan" section: snap PR commits to ≥30 tests (contract types unit, reference plugin integration, CLI snapshot, 100 RFC 8785 fixture round-trips); PolicyIR PR commits to ≥20 tests (types unit, validatePolicyIR + policyId hash round-trip across 100 fixtures, conformance cross-test). Anchor numbers from upstream's existing test-density expectations.

### R2-W-NEW-3 — Trim plan owes explicit Option-B-fallback runbook (R1 B3 carry-forward)

The trim plan when drafted needs to absorb R1 B3 suggestion #1c: "if PolicyIR is rejected, claws-policy-generator still renames + absorbs, but the conformance claim becomes 'matches the local PolicyIR shape' not 'matches `@openclaw/plugin-sdk/policy-ir`.'"

The amended `realigned-story.md` does not capture this fallback. The trim plan needs to.

**Severity**: Medium. If a contract is rejected mid-review (which is one of three known outcomes per `project_openclaw_pr_rules.md`), the trim wave needs an Option-B path that doesn't unwind 6 weeks of work.

**Fix**: trim plan when drafted includes a §"Contract rejection fallback (Option B)" subsection per R1 B3 suggestion. v2 proposal package adds a forward-pointer at `realigned-story.md:240-244` saying "see trim plan §Option-B for rejection-response runbook."

### R2-W-NEW-4 — Concurrent claws feature dev during 6-10 week upstream window still undefined (R1 W6 carry-forward)

The 6-10 week realistic chain timeline now exists in the docs. The feature-freeze policy on the 4 deletion-target subdirectories during that window does not.

**Severity**: Medium. Without an enforced freeze, feature work in `claws-sdk/src/{snapshot,governance,compliance,audit}/` continues for 6-10 weeks and gets deleted at trim time — wasted effort. Worse, in-flight feature work creates merge conflicts at trim execution.

**Fix**: realigned-story adds §"Concurrent dev policy" subsection (per R1 W6 suggestion): (i) feature work in deletion-target dirs blocked from pre-RFC date through trim wave end; (ii) bug fixes allowed but require trim-wave-aware codeowner approval; (iii) security hotfixes dual-applied to surviving package post-trim. CODEOWNERS update for these 4 subdirectories enforces.

### R2-W-NEW-5 — Doc destination still unpinned (R1 B6 carry-forward, downgraded from BLOCK to WARN at R2)

The R1 B6 BLOCK was for "doc destination unpinned + no scrubbing pass + no per-doc shareability decision." The amended footers in `snap-pre-rfc.md` and `policy-pre-rfc.md` improved the leaky-internal-tooling-paths concern (".craft/out/audits/..." → "internal architecture audit"). But the destination is still `.craft/out/proposals/`, the scrubbing pass for `guardrails-adapter.md` and `realigned-story.md` has not been performed, and per-doc shareability frontmatter has not been added.

**Severity downgrade rationale**: R1 B6 was BLOCK because the proposal was about to be shared. R2 verdict is APPROVE-WITH-WARNINGS gating the share on this fix. So the destination + scrubbing become WARN-level fix-before-share punch list items, not block-the-approval items.

**Fix**: per R1 B6 suggested fix #1 (pin destination to `docs/openclaw-contributions/`) + fix #2 (scrubbing pass) + fix #3 (per-doc shareability frontmatter). Owner: claws-release-eng + claws-repo-steward jointly. Deadline: before any pre-RFC opens at `#clawtributors`.

### R2-W-NEW-6 — `claws-guardrails` rename adds to rename-coordination cost (R1 W1 amplification)

The R1-follow-on amendment renamed `openclaw-guardrails` → `claws-guardrails` for naming consistency. This was correct per repo-steward's HC-BLOCK 3 finding (rename rule should be all-or-explicit). But it adds a **third rename** to the trim wave's rename batch:

- `openclaw-snap` → `claws-snap-server`
- `openclaw-policy` → `claws-policy-generator`
- `openclaw-guardrails` → `claws-guardrails` (NEW per R1-follow-on)

Each rename is a touch on root `package.json` workspaces array, RB-repo-boundary spec, `.no-craftworks-allowlist.yaml`, lobster-web vendored DTO freeze pipeline, claws-test imports, and (per W1) Eduardo's filing pipeline manifests. Three renames = 3× the touch surface of one.

**Severity**: Low-Medium. Not blocking; just to-be-priced into the trim plan.

**Fix**: trim plan when drafted lists all three renames as a single rename batch with a dedicated commit topology (each rename one commit, blame-preserving via `git mv`, bisect-safe, downstream-consumer-update commit per rename).

---

## NOTES

### R2-NOTE-1 — Calendar diagram annotations could go further

R1 N1 asked for week-range annotations per arrow in the sequencing diagram. `realigned-story.md:247-261` has them. Could go further with best-case / typical / tail bands per arrow per the spirit of R1 N1 second sentence ("Add a 'best case / typical / tail' annotation per arrow if precision warrants"). Minor.

### R2-NOTE-2 — Contract version semver discipline still undefined

`policy-pre-rfc.md:60` declares `readonly version: string` on PolicyIR. `snap-pre-rfc.md` is silent on `Snapshot` versioning. Neither pre-RFC declares a semver policy. R1 §"Coordination obligations" §6 raised this; not addressed at R2.

**Severity**: Low (NOTE). Channel reply will likely ask "what's the semver story when shape changes." Pre-positioning a recommendation (semver-major-on-shape-change, additive-fields-allowed-in-minor, breaking-changes-require-deprecation-cycle) reduces channel iteration.

**Fix**: each pre-RFC adds a one-line semver recommendation in the "Open questions" section, with a Recommendation: pre-position.

---

## Strengths (R2 increment over R1)

- **Calendar honesty is now load-bearing language**, not buried. `realigned-story.md:11` (TL;DR), 173 (cross-doc reference in policy-pre-rfc), 206-245 (full subsection), 312 (out-of-scope reaffirmation). The 6-10 week framing is propagated. This is the biggest R2 win.
- **The hapi-amendment plan is the strongest artifact in the package**. Headlines, sequencing, risk register (7 items), out-of-scope, open questions, and coordination obligations are all spelled out. This is exactly the "operational machinery" R1 said was missing.
- **Trim arithmetic is now firm and shows its work** (`realigned-story.md:189-202`). 6,200 LoC pinned, gross 7,889 minus ~1,689 LoC overlap, audit-stays-downstream rationale visible.
- **Audit-stays-downstream framing is honest** (`realigned-story.md:64-76`). Three reasons given, not handwaved. Trade-off acknowledged (gross would have been ~7,000 if `@openclaw/audit` had been carved). This is the discipline of a real release-eng audit.
- **Conformance test cross-PR coupling claim is downgraded** at `realigned-story.md:322` from "expect 2-3 iteration rounds" to "expect 1-2 iteration rounds because both contracts now reference RFC 8785 JCS so the conformance test is a unit test against the standard, not a moving target." Better than R1 W2 asked for.
- **Rust-port honesty restored** (`realigned-story.md:293-295`). 5-6 weeks at sustainable pace, NOT within 1-2 week ambition. R1 findings named explicitly. revision_pending escalates to revision_required_before_dispatch.
- **`ctx.snapshotId` thread-through, RFC 8785 JCS, gateway-as-signer, fail-closed sections, SnapshotErrorCode enum, OC_WORKSPACE_FILES registry awareness, OcPath/SnapshotInternalPath split** — all R1 cross-role asks landed in the amended docs. The architectural correctness work is real.
- **`claws-guardrails` rename closes repo-steward HC-BLOCK 3** (rename rule consistency). Adds coordination cost (R2-W-NEW-6) but the right call architecturally.

---

## What I'd like to see before R3 (or before pre-RFCs open at #clawtributors)

1. **Pin doc destination + scrubbing pass + shareability frontmatter** (R1 B6 / R2-W-NEW-5). Pre-RFCs cannot share until this is done.
2. **Per-PR test budgets** (R1 W3 / R2-W-NEW-2). Anchor 100-fixture canonicalization parity in `snap-pre-rfc.md` "What's NOT in v1 / What IS in v1."
3. **Hapi-amendment plan execution** before any v2 PR-1 dispatches at upstream. Sequencing-critical.
4. **Trim plan drafting calendar** explicit in `realigned-story.md:314` (R2-M-NEW-3). Avoid deadline-pressure draft.
5. **Concurrent dev / feature freeze policy** on the 4 deletion-target subdirectories during the upstream window (R1 W6 / R2-W-NEW-4). CODEOWNERS update for enforcement.
6. **Audit-format soak-test trigger** defined for future v3 (R2-M-NEW-2). Without (a)+(b)+(c) gates, v3 audit ask is a dead letter.
7. **Semver discipline pre-positions** in each pre-RFC (R2-NOTE-2). One line per contract.

If items 1-3 land, pre-RFCs can share. Items 4-7 become the trim-plan / hapi-amendment-execution / drafting-while-upstream-reviews work.

---

## Verdict (formal)

**APPROVE-WITH-WARNINGS**

3 R1 BLOCK RESOLVED (M-HAPI-COLLISION, M-UPSTREAM-CADENCE-FANTASY, M-TRIM-ARITHMETIC-AMBIGUITY).
2 R1 BLOCK PARTIALLY-RESOLVED via good-faith deferral to trim plan (B3 rollback gates, B4 trim mechanics) + 1 R1 BLOCK PARTIALLY-RESOLVED with per-finding ownership gap (B5 rust-port carry-forward).
1 R1 BLOCK UNRESOLVED but downgraded to WARN at R2 (B6 doc destination — fix-before-share, not fix-before-approve).
1 R1 WARN exceeded expectations (W2 conformance iteration cost — RFC 8785 JCS unblocks the cross-PR handshake).
2 R1 NOTE RESOLVED (N1 calendar annotations, N3 capability-table pre-positions) + 1 R1 NOTE not addressed (N2 split open-question §5).

Plus:
- 3 new MAJOR findings (R2-M-NEW-1: hapi-amendment-not-on-chain-timeline; R2-M-NEW-2: audit-soak-trigger-undefined; R2-M-NEW-3: trim-plan-deadline-pressure-risk)
- 6 new WARN findings (R2-W-NEW-1 through R2-W-NEW-6)
- 2 new NOTES (R2-NOTE-1, R2-NOTE-2)

Architectural recommendation: pivot is sound, proceed with v2 contracts.

Operational recommendation: **the proposal package is approved at R2 for the docs-and-coordination-plan scope it claims**. Channel sharing of pre-RFCs gated on R2-W-NEW-5 (doc destination + scrubbing). Hapi-amendment execution gated on R2 verdict (this verdict). Trim plan drafting gated on chain-day-7 with deadline at chain-day-21 (per R2-M-NEW-3).

Implementation-readiness: **YES for the proposal package as documents**. **YES for hapi-amendment plan execution**. **NOT YET for trim plan dispatch** (does not exist; required before contracts merge). **NOT YET for rust-port plan dispatch** (revision required before dispatch per `realigned-story.md:295`).

The architecture is right. The operational machinery is now drafted at the right scope. The remaining gaps are **next-step deliverables on a known calendar**, not "this proposal is broken." From a release-eng "publish reliability over velocity" lens, this is a clean R2 finish on a real fix-pass.
