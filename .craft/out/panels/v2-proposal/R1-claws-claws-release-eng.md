# v2 Proposal Review · R1

**Reviewer**: claws:claws-release-eng
**Date**: 2026-04-29
**Subject**: v2 OpenClaw contribution proposal (snap pre-RFC + policy pre-RFC + guardrails adapter + realigned story)
**Lens**: publish reliability / cutover-safety / cadence / coordination

---

## Verdict: **REQUEST-CHANGES** — directionally right, operationally underspecified

The proposal pivot is sound. Yankee + bandit + pundit collectively prove that `oc-path → snap → PolicyIR → guardrails` is a smaller, less rejection-prone shape than Hapi's PR-7 daemon-as-package design. Net upstream surface drops from ~1665 LoC of likely-rejected daemon to ~250–500 LoC of contract types across three PRs, plus a 0-LoC adapter downstream. From a release-eng "publish reliability over velocity" lens, this is the *correct* architectural call: contracts upstream let us ship downstream on our own cadence, not couple our deploy timeline to Peter's merge cadence.

But the proposal stops at architecture and never crosses the operational threshold a release-eng review needs cleared. **Six BLOCK-level gaps** prevent this from being implementation-ready: (1) the proposal claims to *replace* Hapi PR-6 + PR-7 but the Hapi wave is in flight on `feature/isis-the-weaver` with PR-drafts already written and never gets updated to reflect the v2 sequencing — two parallel branches diverge today; (2) the upstream chain timeline is asserted as "tight succession" but the realistic merge cadence for 4 sequential contract PRs through a 2-week-LTS-cadenced upstream with a 10-PR cap and AI-assisted disclosure friction is **months, not weeks**, and the proposal never says so; (3) the trim wave (~7,700 LoC delete) is sequenced *after* contracts land but has no rollback story if a contract gets rejected mid-review or asked to change shape after the trim has already shipped; (4) parallel-implementation cleanup across `claws-sdk/{snapshot,governance,compliance,audit}` is named but not bounded — tests, downstream consumers (lobster-web, claws-test), and git-history-hygiene are all hand-waved; (5) the rust-port plan (Draft + revision_pending) is referenced as "post-trim, smaller target" but the R1 panel review's 4 unaddressed Major findings (M-CRYPTO-MISLABEL, M-CUTOVER-ROLLBACK, RB-violation, codename discipline) carry forward into the post-trim port and the proposal doesn't say so; (6) **doc destination is unpinned** — the proposals live in `.craft/out/proposals/`, target is `#clawtributors`, but there's no plan for where the channel-shareable artifacts live as repo-of-record, no scrubbing pass for guardrails-adapter's internal-only details, and no commitment to a `docs/openclaw-contributions/` (or similar) destination.

Plus six WARN-level findings on Eduardo coordination, conformance test cross-PR coupling, per-PR coverage gates, retirement window for TS through the contract chain, post-trim coverage propagation, and concurrent claws feature-dev policy during the upstream window.

**The architectural pivot is right. The operational machinery to execute it isn't drafted.** The proposal reads like a successful audit conclusion presented as a plan; what's missing is the wave/checkpoint shape, the sequencing-vs-Eduardo math, and the multi-month upstream-merge-cadence reality.

---

## Findings

### HC-BLOCK (6)

#### B1 — Hapi wave coordination is unspecified; two parallel branches diverge today

`realigned-story.md:131-133` states "the Hapi wave's existing PR-7 (1665 LoC daemon) gets restructured into snap-pre-rfc's three layers (contract, plugin, CLI) before opening, replacing it with a much smaller PR. PR-6 (policy) similarly collapses to PR-6a (~80–220 LoC types-only)." This is a one-sentence claim with **no concrete coordination mechanism**.

The Hapi wave is not paused. Per `wave.yaml:47` it is `stages_in_progress: implementation` with all 12 pulses written, all 5 checkpoints planned, all 7 PR-drafts at `pr-drafts/PR-{1..7}.md` already authored, and `PROGRESS.md` showing implementation as the next stage. The PR-7 draft (`pr-drafts/PR-7.md`) is 148 lines of concrete daemon-shape pitch — 11 CLI verbs, 8 HTTP endpoints, 2 compliance rubrics, Swift model regen, cross-OS CI matrix. The PR-6 draft (`pr-drafts/PR-6.md`) is 30+ lines of "ship a generator + 9-verb CLI upstream" — exactly the convention-bound generator that pundit's audit and `policy-pre-rfc.md:23` say should NOT go upstream.

So as of today, two artifacts contradict: the Hapi wave's planning + PR-drafts say "ship daemons + generators upstream"; the v2 proposal says "ship types only, no daemons, no generators." If implementation dispatches the existing pulses (10–12 in cp-5) without an update, **PR-7 opens as the daemon-shape**, gets rejected per yankee's audit, the wave wastes 2–4 weeks rebuilding, and the v2 proposal's premise gets validated the expensive way. If implementation is held pending v2 ratification, **the Hapi wave's `wave.yaml` and `PROGRESS.md` must be amended to record the hold and the rewrite scope** — neither has happened.

**Consequence**: the proposal is presented as if Hapi will smoothly absorb it, but the wave artifacts as written would dispatch the rejected shape. Without explicit wave-amendment steps, the v2 proposal is a good audit conclusion that doesn't translate into action.

**Suggested fix**:
1. Before any pre-RFC opens at `#clawtributors`, the Hapi wave must execute a formal amendment cycle: `wave.yaml` adds a `v2_proposal_absorption:` section recording (a) which PR-drafts (PR-6, PR-7) are deprecated in favor of v2 contract PRs, (b) which PR-drafts (PR-1, PR-2, PR-3, PR-4, PR-5) survive as-is, (c) which v2 pre-RFC channel-asks gate which PR-draft rewrites.
2. `PROGRESS.md` adds a row to the stage table: "v2-proposal-absorption — pending — gates implementation-stage cp-4/cp-5 dispatch."
3. The pulse files for cp-4 (pulse 09 PR-6 policy) and cp-5 (pulse 10 PR-7 snap) get marked `superseded_by: <new pulse for v2 contract PR>` rather than dispatched as written.
4. PR-drafts PR-6 and PR-7 get archived (move to `pr-drafts/superseded/`) with a header note pointing at the v2 pre-RFCs.
5. New PR-drafts authored at `pr-drafts/PR-6-v2-policy-ir.md` and `pr-drafts/PR-7-v2-snap-contract.md` matching the v2 pre-RFC shapes.
6. The existing `wave.yaml:264-326` checkpoint structure (cp-1 through cp-5) gets a sub-table per checkpoint reconciling v1-pulses-vs-v2-asks; if cp-4/cp-5 collapse to one cp under v2, that's a wave restructure, not an implicit absorption.

**Without these steps, B1 is a coordination-failure-in-progress, not just a documentation gap.**

#### B2 — Upstream-merge-cadence math is missing; "tight succession" is fantasy at upstream's actual cadence

`realigned-story.md:160-163` open-questions §5 raises "would Peter prefer snap+policy contracts post-oc-path immediately (small, focused PRs landing in tight succession), or batched after the larger Hapi sequence completes." `policy-pre-rfc.md:115-122` shows a sequencing table treating the chain as composable-at-type-level but offers no calendar.

The constraints (per `project_openclaw_pr_rules.md` + `project_openclaw_upstream.md`) are:
- 10 open PRs per author cap (auto-rejected at 11)
- 2-PR-open-at-a-time culture per `wave.yaml:332` (`pr_open_concurrency: 2`)
- 2-week LTS cadence (per the upstream relationship memory)
- Bot reviewer trio (Greptile + Copilot + chatgpt-codex) with P1/P2/P3 categories that must be pre-empted
- AI-assisted disclosure expectation (extra friction; bots ask more questions)
- Refactor-only PRs auto-rejected
- One-thing-per-PR rule strictly enforced (per `CONTRIBUTING.md:122`)
- Codename + spelling + boundary-import + baseline-hash + Swift-model-regen pre-submit gates per the existing Hapi wave's bot-preempt-checklist

A realistic per-PR review cycle for an AI-assisted, types-shaped, contract-introducing PR at this upstream is:
- Day 1: open PR, bot review trio fires within hours, reply to bot findings
- Days 2–4: maintainer (Peter) eyeballs; either signals "directional fit" or asks for restructure
- Days 5–10: address restructure asks (may be 1–3 cycles); the "PR sits open while we re-pitch" zone
- Days 10–14: maintainer sign-off + squash-merge
- **Per-PR realistic median: 10–14 days**; tail to 21+ days on contract-introducing PRs that touch the SDK shape

Now do the chain math against the v2 proposal's 4 PRs:
- oc-path: in flight as Hapi PR-2; let's say it merges on the day-of math, day 0.
- snap: depends on oc-path (per `realigned-story.md:127`); opens day 0 once oc-path lands. Median merge: day 14. Tail: day 21.
- PolicyIR: depends on snap loosely (path-constant references oc-path; runtime helpers reference SnapshotStore) per `realigned-story.md:128`. Can open in parallel with snap if 2-PR concurrency allows. Median merge: day 28. Tail: day 35–42.
- Conformance test handshake: per `realigned-story.md:178-179`, "snap's PR can't merge cleanly without PolicyIR's PR also progressing... Plan: open snap's PR first, get conformance to a draft PolicyIR shape, then sequence the PolicyIR PR with the conformance test as evidence that the contract actually works." This is a **two-PR cross-coupled-merge gate** — adds 1–2 cycles of iteration on each side as the conformance test catches contract-shape disagreements. Probable real-world: snap merge slips from day 14 to day 21 because PolicyIR draft shape contradicts something in snap's read-shape.
- guardrails adapter: 0 LoC upstream, downstream-only. No upstream gate.

**Realistic chain merge: day 28 best case, day 42–56 typical, day 70+ tail.** Translation: **6–10 weeks** of upstream-PR-window before all contracts land. The proposal calls this "small focused PRs landing in tight succession." That's not credible at upstream's cadence with bot-reviewer + AI-disclosure + 2-week-LTS friction.

The user has signaled "1–2 weeks" several times for downstream activities. The v2 proposal is 6–10 weeks of upstream-merge-window before *any* downstream trim can begin. **Nothing in the four documents says this honestly.** `realigned-story.md` says "this story doesn't change [the 2-week cadence]" (line 170) but doesn't translate that into a calendar for the contracts themselves.

**Consequence**: the user reads "tight succession" and plans the trim wave to start in 2 weeks. At week 3 only oc-path has merged, PolicyIR is in conformance-test-iteration with snap, the trim wave has nothing to consume, the rust-port post-trim plan slips, Eduardo's deploy timeline (which the user has been pushing forward) hits a contract-not-yet-landed wall.

**Suggested fix**:
1. `realigned-story.md` adds a §Calendar subsection with a real-world median + tail estimate per PR (day-X median, day-Y tail, total chain median + tail) computed from the constraints above. **Honest framing: "the upstream chain is a 6–10 week window; the trim wave cannot begin before week 6 at earliest."**
2. `policy-pre-rfc.md` and `snap-pre-rfc.md` "Asks" sections add an explicit "Cadence ask" — request that Peter signal whether AI-assisted contract-introducing types-only PRs from a Microsoft-affiliated contributor can move faster than the median, or whether 2-week-LTS holds for these too.
3. `realigned-story.md:113-130` sequencing diagram annotates each arrow with calendar-week ranges, not just topological dependency.
4. The downstream-implications section explicitly states "trim wave starts at upstream-chain merge + N days" with N defined.

#### B3 — Trim wave has no reverse-cutover (rollback) story if upstream contract changes mid-trim

`realigned-story.md:135-156` describes the trim wave: delete `claws-sdk/src/{snapshot,governance,compliance,audit}/` (~7,700 LoC), fold into `claws-policy-generator/`, rename `openclaw-snap → claws-snap-server`, etc. The sequencing premise is "contracts upstream → trim downstream → Rust port." The proposal asserts contract-then-trim is the right order but never asks: **what if a contract changes shape after the trim has shipped?**

Concrete scenarios:
1. snap pre-RFC asks about read-shape (`policy-pre-rfc.md:73`, recommend `Uint8Array`). Peter says "actually, prefer `{content, etag, lastModified}` for cache headers." Trim wave has already shipped, deleted the parallel `claws-sdk/src/snapshot/` impl, consumed the `SnapshotStore` interface. Now the upstream PR is open with a different shape. Rollback options: (a) revert the trim — but ~7,700 LoC delete is not a one-commit revert if subsequent work has been built on top; (b) hold the upstream PR until the trim is re-shaped — couples our deploy to upstream merge timing; (c) maintain a downstream-only `SnapshotStore` shim that translates between our trim-time shape and the new upstream shape — adds permanent abstraction debt.
2. PolicyIR open-question §1 (`policy-pre-rfc.md:99`) asks "does Peter agree PolicyIR is a generated artifact riding the snap contract?" If the answer is "no, policy lives on a separate registry surface," then the entire `realigned-story.md` premise inverts. Trim wave has already deleted `claws-sdk/src/governance/` + `compliance/` on the assumption the surviving package is a `PolicyGenerator<TValidated>` impl. If the upstream answer reshapes that, the trim has hollowed out impls without a stable target.
3. PolicyIR's R0–R5 tier labels (`realigned-story.md:175-176`) are flagged for pruning before submission. If they're pruned upstream but the claws compliance tooling still uses them (which it will — they're the SOC2/HIPAA mappings), there's a permanent translation layer between claws-internal R-labels and the upstream `Sensitivity` enum.

**The proposal flags concern (3) as a "cross-contract concern not pre-RFC-blocker" but doesn't operationalize it as a rollback risk.** All three are **pre-trim-wave-blockers**: each turns a clean architectural pivot into a multi-week tangle if contract-change lands after the trim has shipped.

The pundit audit's recommendation Option B ("don't contribute upstream at all") is the safe fallback per `snap-openclaw-design-fit.md:339-341` and the policy audit's parallel recommendation. **The v2 proposal never explicitly says when Option B reactivates.** If upstream rejects PolicyIR, does the trim wave still execute? Does claws-policy-generator still rename? Does the snap contract still get attempted?

**Consequence**: the proposal sequences contract-before-trim correctly but doesn't define gates between them. A bad upstream signal mid-trim is a multi-week delay with no documented response.

**Suggested fix**:
1. `realigned-story.md` adds a §Rollback Gates subsection defining: (a) **"contract uncertain" gate** — trim wave does NOT begin until each upstream contract has an explicit Peter-signal "this is the shape" reply on the channel pre-RFC, not just "interesting"; (b) **"contract changed mid-trim" reaction** — if a shape change is asked after trim begins, the trim PAUSES at the next clean checkpoint, the change is evaluated against the trim's commit graph, and the wave goes back to setup-stage if the change is non-trivial; (c) **"upstream rejection" reaction** — explicit Option B fallback: "if PolicyIR is rejected, claws-policy-generator still renames + absorbs, but the conformance claim becomes 'matches the local PolicyIR shape' not 'matches `@openclaw/plugin-sdk/policy-ir`'."
2. The trim wave plan (when it gets drafted) should have a `bisect_safe_commits.md` that names the every-N-commits clean revert points so a mid-trim contract-change doesn't require unwinding the whole delete.
3. The `claws-rust-port.md` plan's revision (currently `revision_pending: true`) should record the post-trim Rust target as **conditional on contract-stability**, not a fixed surface.

#### B4 — Parallel-implementation cleanup is named, not bounded; tests + downstream consumers + git-hygiene are hand-waved

`realigned-story.md:140-145` lists the deletes:
- `claws-sdk/src/snapshot/` (~1,556 LoC)
- `claws-sdk/src/governance/` (~1,726 LoC)
- `claws-sdk/src/compliance/` (~3,107 LoC)
- `claws-sdk/src/audit/` (~1,500 LoC)

Plus a move:
- `claws-sdk/src/compiler/` (~11,200 LoC) → `packages/claws/src/sdk/` or `packages/claws-cli-sdk/`

Total touch: ~19,000 LoC across delete + move. The proposal treats this as a single-line bullet. The release-eng concerns it doesn't address:

**(a) Tests in the deleted directories.** `claws-sdk/src/governance/`, `compliance/`, and `audit/` each have associated test trees. These are not deletable in lockstep — they encode invariants that the surviving `claws-policy-generator/` will need to prove against the new shape. Plan must specify: which tests **migrate** (rewrite for the new package), which tests **delete entirely** (because the upstream contract obsoletes them), which tests become **conformance tests** (verify the surviving package implements the upstream contract correctly). No such enumeration exists.

**(b) Downstream consumers.** The proposal says lobster-web "consumes via the contract; doesn't care which `SnapshotStore` backs it" (`snap-pre-rfc.md:82`). True at the architectural level. But concretely, lobster-web imports from `@bic/claws-sdk` paths today (per the LBD §3 vendored-stubs convention). Lobster-web's vendored DTOs at `packages/lobster-web/src/vendored/claws-sdk/` are regenerated from `claws-sdk/src/types/` via `tools/lobster-deploy/freeze-dtos.ts`. If `claws-sdk/src/{governance,compliance,audit}/` delete includes type sources that the vendored DTOs re-export (e.g., `Finding`, `GovernanceEvidence`, `AuditBatchEntry`), the freeze pipeline breaks at the next sync. Plan must specify the type-residue: which types stay in `claws-sdk/src/types/`, which move to `claws-policy-generator/src/types/`, which lobster-web's freeze pipeline gets re-pointed at. Same concern applies to `claws-test/` if it imports from any of the deletion targets.

**(c) Git-history hygiene.** A 7,700-LoC delete shaped as one commit is unreviewable; shaped as N feature-by-feature deletes with per-commit test runs is the right discipline, but takes longer and creates an N-commit window where the build is in a half-deleted state. Proposal must specify: (i) staged deletes per concept (snapshot first, governance second, compliance third, audit fourth), (ii) bisect-safe per commit, (iii) `git mv` discipline for the move (compiler → claws-cli-sdk) so blame survives.

**(d) Coverage propagation.** Per the recent Hapi wave context and the cp-5 lobster-web styles still under threshold, the post-trim sdk's coverage gates need recomputation. Existing coverage may be padded by tests in directories about to be deleted; post-trim coverage may dip below project-wide minimums even though logical coverage is unchanged. Plan must commit to a coverage-recomputation pass at trim-wave-start (baseline) and trim-wave-end (delta), and reset thresholds if needed.

**Consequence**: the trim wave as scoped in the proposal is a one-bullet "delete ~7,700 LoC" claim that elides 4 distinct release-eng concerns. Each becomes a multi-day surprise during execution.

**Suggested fix**: when the trim wave plan is drafted (per `claws-rust-port.md`'s Phase 1), it must include explicit subsections on (a) test-migration manifest (per-test: migrate/delete/conformance), (b) downstream-consumer impact analysis (lobster-web freeze pipeline + claws-test imports + any other repo consumers), (c) commit topology (staged-by-concept, bisect-safe, blame-preserving via `git mv`), (d) coverage recomputation gate. The v2 proposal as currently written should add a forward-pointer to these requirements so the trim plan inherits them.

#### B5 — Rust-port plan's R1 panel findings are unaddressed and they carry forward into the post-trim port

`realigned-story.md:152-156` describes the post-trim Rust port: "post-trim Rust port target: probably ~10-12k TS → ~15-18k Rust at conservative 1.5× ratio. ~2-3 weeks at sustainable pace; matches yankee's small/medium estimate and fits within release-eng's 6-week pace option (cp count drops to ~5)."

This claim references the rust-port plan's R1 panel, which (per `.craft/out/panels/claws-rust-port/R1-consolidated.md`) was **MAJOR REVISION REQUIRED** with 4 critical findings:
- **M-CRYPTO-MISLABEL**: TS audit chain is HMAC-SHA256, not Ed25519; canonical-json is NOT RFC 8785. The plan must declare which is normative.
- **M-CUTOVER-ROLLBACK**: Rollback story is broken under audit-chain divergence.
- **M-RB-VIOLATION**: `packages-rs/` violates the RB-repo-boundary spec per repo-steward.
- **Codename discipline**: never addressed.

Plus my own R1 review (claws-release-eng) added 4 BLOCKs and 4 WARNs, including the 9-cp-vs-1-2-week-ambition contradiction and the contract-test corpus drift mode.

**The v2 proposal references the post-trim Rust port as if these findings dissolve when the surface shrinks.** They don't:
- Crypto naming concerns survive; the audit chain in `claws-sdk/src/audit/` is in the trim's delete list (per B4 above), but the policy/compliance evidence signing in `claws-policy-generator/` (which absorbs the audit chain machinery per `realigned-story.md:143`) still uses Ed25519. The HMAC-vs-Ed25519 mislabel migrates with the code, not the package.
- M-CUTOVER-ROLLBACK survives at smaller surface — the same byte-divergent canonicalization concern applies if Rust serializes PolicyIR differently from TS during post-trim port. Same scenario, fewer routes.
- RB-violation survives — `packages-rs/` is a structural concern at the workspace layout level, scope-independent.
- My BLOCK-1/2/3/4 (cutover rollback mechanics, perf bench rigor, retirement window, timeline math) all apply to a smaller post-trim port.

**Consequence**: the realigned-story positions the Rust port as a downstream consequence with a "cp count drops to ~5" rough sizing, but the unaddressed R1 findings make even a 5-cp port not cp-1-dispatchable. The v2 proposal is implicitly committing to a port that cannot start.

**Suggested fix**:
1. `realigned-story.md` adds a §Rust Port Implications subsection that explicitly lists the 4 critical R1 findings and states which the trim wave addresses (e.g., crypto labeling: trim wave audit-chain machinery move to `claws-policy-generator/` is the chance to fix the labeling) and which the rust-port-plan-revision must address (e.g., cutover rollback, RB-boundary, codename).
2. The `claws-rust-port.md`'s `revision_pending: true` flag must move to `revision_required_before_dispatch: true` with a dependency on (a) the trim wave landing, (b) the unaddressed R1 findings closing in the revised plan, and (c) the post-trim contract-stability signal (per B3).
3. The "2-3 weeks at sustainable pace" claim should be retracted in the realigned-story until the plan revision picks an honest scope per my prior R1 BLOCK-4. At the realistic 6-week sustainable pace for ~10-12k TS, the rust-port is **not** within the user's recurring "1-2 weeks" ambition window — say so.

#### B6 — Doc destination is unpinned; channel-shareable artifacts have no repo-of-record; internal-only details aren't scrubbed

`realigned-story.md:182-190` lists the sister docs and `snap-pre-rfc.md:1`, `policy-pre-rfc.md:1`, `guardrails-adapter.md:1` each declare a Status header. But the proposal never addresses:

**(a) Where do the channel-shareable artifacts live as repo-of-record?** Today they're at `.craft/out/proposals/`. `.craft/out/` is wave-output / draft territory by repo convention (compare with `.craft/out/audits/` and `.craft/waves/`). When these get shared at `#clawtributors`, where in the repo do they migrate to as the canonical version that the channel readers can reference back to? Options:
- `docs/openclaw-contributions/` (new dir, repo-canonical) — recommended
- Stay in `.craft/out/proposals/` with a header saying "shared to channel YYYY-MM-DD" — diverge over time as channel feedback drifts the canonical version
- Move to the Hapi wave dir (`waves/260427+hapi-the-bringer+openclaw-upstream/proposals/`) — wave-scoped; doesn't survive wave close

**(b) Internal-only doc separation.** `guardrails-adapter.md:1` declares `Status: internal design doc (not a pre-RFC — net upstream surface is 0 LoC)` and `Target audience: claws + lobster team`. But it contains:
- Specific upstream `:line` citations like `src/plugins/host-hooks.ts:65-72`, `src/plugins/trusted-tool-policy.ts:8-54`, `src/plugins/types.ts:2347` (these are facts; not leaky)
- Internal package paths like `packages/openclaw-guardrails/src/openclaw-adapter.ts` (these are leaky — they reveal claws's internal package layout to anyone who reads the file)
- A reference to "claws governance bundle" with specific subpath LoC counts (these are leaky — reveal internal architecture decisions to anyone who reads the file)
- Specific commit-hash references (none currently in the doc, but `wave.yaml:330` pins HEAD `5e8cc1d9c`; if any upstream-PR doc gets sloppy and pastes that hash, it's a leak signal about which upstream HEAD claws built against — minor but real)

If guardrails-adapter is *accidentally* shared (e.g., the user pastes it to a public channel by mistake, or shares the proposals folder zipped), the path-and-architecture details give an external reader a clean map of claws's internals. The proposal must declare a scrubbing-pass policy: which docs are channel-safe, which need redaction before sharing, and what gets redacted.

**(c) Per-doc shareability disclosure.** Each pre-RFC has a `Target channel: #clawtributors` line. guardrails-adapter has `Target audience: claws + lobster team`. But realigned-story has `Target audience: claws + lobster team; potentially shareable to #clawtributors as the "why" behind the pre-RFCs` (line 5). "Potentially" is not a decision. The realigned-story contains specific LoC counts of internal claws-sdk subdirectories about to be deleted — that's a strong external signal of internal architecture changes that competitors / future contributors / curious readers would find useful.

**Consequence**: without a pinned destination + a scrubbing policy + a per-doc disclosure decision, the proposals are at risk of (1) drifting off-canonical post-share, (2) leaking internal architecture if accidentally shared as a folder, (3) creating ambiguity about which version is "the" version after channel feedback.

**Suggested fix**:
1. **Pin the destination**: `docs/openclaw-contributions/` is the recommended repo-canonical home. Channel-shareable docs (snap-pre-rfc, policy-pre-rfc) move there pre-share with a `_status: shared YYYY-MM-DD to #clawtributors_` header. Internal-only docs (guardrails-adapter, realigned-story) stay in `.craft/out/proposals/` with explicit `_status: internal-only_` and a `_DO NOT SHARE_` banner.
2. **Scrubbing pass**: before any pre-RFC opens, a release-eng review confirms (a) no leaky internal paths, (b) no specific commit hashes other than upstream HEAD, (c) no LoC counts of specific internal subdirectories beyond what's already public via the audits, (d) no AI-tooling-internal artifact references (e.g., `.craft/` paths, agent codenames like Hapi, Isis, yankee, pundit, bandit, whiskey, x-ray — all leak the internal codename discipline that the rust-port R1 already flagged).
3. **Per-doc shareability decision logged**: each doc's frontmatter explicitly records (a) destination state, (b) shareability tier (`channel-safe` / `claws-internal` / `claws-microsoft-only`), (c) scrubbing review date + reviewer.
4. **Footer scrub**: each pre-RFC currently has `Authored 2026-04-29. AI-assisted (planning agents for the Peter's-lens upstream-fit audit + this drafting). All contract types and sketches are derivative of an internal audit at .craft/out/audits/...` — the `.craft/out/audits/` path is an internal-tooling leak. Either (a) keep the AI-assisted disclosure (required per upstream rules) but drop the `.craft/` path, replacing with "internal architecture audit"; or (b) move the audit content into `docs/` first so the citation can be a public path.

---

### HC-WARN (6)

#### W1 — Eduardo coordination unspecified; rename timing collides with first crossing

`realigned-story.md:147-151` plans renames `openclaw-snap → claws-snap-server`, `openclaw-policy → claws-policy-generator`. Per `serve-deploy-bridge.md:130-135`, the runtime closure for any A/B/C deployment is 3 packages (`claws-serve` + `claws-sdk` + `openclaw-workspace`). Neither rename target is on the runtime hot path.

But: per `serve-deploy-bridge.md` H3 (lobster-web first crossing into bic/lobster), Eduardo's filing pipeline (containerize → AKS → Helm → OneCert → KeyVault) ships the deployable claws-serve. If the rename happens **before** Eduardo's first crossing, the package names that show up in his pipeline manifests are `claws-snap-server` and `claws-policy-generator` from day one (clean). If after, his manifests reference `openclaw-snap` and `openclaw-policy` and need a rename pass once the v2 proposal lands.

The proposal doesn't pick a sequencing relationship. `realigned-story.md:166-169` says "Eduardo's deployment-pattern decision — separate audit; serve-deploy-bridge plan owns A/B/C deployment shapes" — punting. But the rename-timing question isn't answered by serve-deploy-bridge; it's a v2-proposal coordination concern.

**Suggested fix**: realigned-story adds a §Rename Sequencing subsection: (a) renames happen in the trim wave, after upstream contracts merge; (b) trim wave timing relative to Eduardo's first crossing — recommend renames land **before** Eduardo's pipeline manifest hits PR (so his manifest references `claws-*` names from start, no follow-up rename PR); (c) if Eduardo's first crossing is on a tighter timeline than the upstream chain, the rename pre-empts the trim — i.e., rename without the contract conformance is a possible bridge state with explicit caveat.

#### W2 — Conformance test cross-PR coupling is a multi-month stall, not a one-time hand-shake

`realigned-story.md:178-179` flags it as a cross-contract concern: "Snap's `policy-snap-policyid-conformance` integration test couples two upstream PRs. The cross-package canonicalizer-version handshake means snap's PR can't merge cleanly without PolicyIR's PR also progressing. Plan: open snap's PR first, get conformance to a draft PolicyIR shape, then sequence the PolicyIR PR with the conformance test as evidence that the contract actually works."

The plan as worded is correct directionally but underweights the iteration cost. The conformance test isn't a one-time pass; it's a moving target as both PRs get review feedback:
- Snap PR opens day 0 with a draft PolicyIR shape stubbed in the test.
- PolicyIR PR opens day 7 with the real shape; conformance test runs against both → fails.
- Snap PR's draft stub gets updated to match real PolicyIR; PolicyIR PR keeps moving; another round of bot-reviewer feedback on both.
- Iteration N: stable, both merge.

Each iteration is a 3–5 day cycle at upstream's cadence (per B2). 2–3 iterations is realistic. So the conformance handshake adds 6–15 days to each PR's merge, **on top of** the per-PR cadence in B2.

**Suggested fix**: realigned-story §Cross-Contract Concerns subsection §"snap-policy conformance" should explicitly note: "expect 2–3 iteration rounds; budget +6–15 days on the chain timeline computed in B2."

#### W3 — Per-PR coverage gates: 100 fixture inputs for canonicalization parity is the right rigor; per-PR coverage gates not yet drafted

`snap-pre-rfc.md:73` open-question §1 references `Uint8Array` as the recommended read shape. The CISO concerns from earlier waves (per `claws-rust-port.md` open-questions about JCS/RFC 8785 and the rust-port R1 M-CRYPTO-MISLABEL finding) made canonicalization-parity a 100-fixture acceptance gate. The v2 proposal carries this implicitly via the conformance test but doesn't make it a per-PR coverage requirement.

For each contract PR (snap, PolicyIR), the bot-reviewer trio + maintainer will ask "where are the tests." Per `wave.yaml:332` the plan Coverage Contract has L0 unit + L1 integration + L2 e2e + L3 acceptance tier targets. The v2 contract PRs don't yet have per-PR test budgets:
- snap PR: contract types unit-test (n=?), reference plugin integration test (n=?), CLI snapshot tests (n=?), `Uint8Array` round-trip canonicalization across 100 fixtures (yes — anchor this concretely)
- PolicyIR PR: contract types unit-test (n=?), `validatePolicyIR` schema-check round-trip across 100 fixtures with the policyId hash, `policy-snap-policyid-conformance` test as the cross-PR gate

**Suggested fix**: each pre-RFC adds a §Per-PR Test Budget table with L0/L1/L2/L3 counts + named test files, anchored to the wave Coverage Contract numbers. snap pre-RFC commits to ≥30 tests; PolicyIR pre-RFC commits to ≥20 tests; conformance test crosses both. The 100-fixture canonicalization gate gets named explicitly in snap pre-RFC §What's NOT in v1 / What IS in v1.

#### W4 — Retirement window for TS through the contract chain is undefined; the previous R1 finding repeats

The rust-port R1 BLOCK-3 was "retirement window is one sentence; no removal-readiness gate." The v2 proposal carries the same gap forward but at a different layer:

- After the trim wave deletes `claws-sdk/src/{snapshot,governance,compliance,audit}/`, the **deleted code's downstream consumers** in lobster-web, claws-test, and any external claws-sdk consumers need a deprecation window where they can re-point. The proposal doesn't define this.
- After the post-trim Rust port at cp-8 (per `claws-rust-port.md`), TS `claws-sdk` + `claws-serve` enter retirement. Same R1 BLOCK-3 concerns apply: what's "one release cycle"? When is removal safe?
- The contract chain's TS->Rust transition is double-stacked: (1) trim wave deletes parallel impls, (2) Rust port replaces remaining impls. The retirement window for each isn't defined; the relationship between them isn't either.

**Suggested fix**: realigned-story §Retirement Window subsection: (a) trim-deleted code retirement: the deleted code is gone immediately (not deprecated-then-removed; it's overlap), but downstream consumers need a 1-cycle deprecation window where the consuming imports continue to resolve via shim re-exports. Define the shim policy explicitly. (b) Rust port retirement: defer to the rust-port plan revision (which must close the R1 BLOCK-3); add forward-pointer.

#### W5 — Post-trim coverage propagation: cp-5 lobster-web styles still under threshold; do they propagate?

Recent commits (cp-7 R1 in the current branch) indicate cp-5 lobster-web styles are still under coverage threshold. The trim wave will affect lobster-web indirectly (vendored DTO regeneration if types move) and directly if any lobster-web import paths into claws-sdk get re-pointed to `claws-policy-generator`. **Coverage gates that already aren't passing pre-trim might dip further post-trim** unless explicitly recomputed.

**Suggested fix**: trim-wave plan adds a `coverage_baseline_at_trim_start` snapshot + `coverage_threshold_at_trim_end` recompute step. The v2 proposal forward-points to this requirement. Specifically: lobster-web's L0 + L1 thresholds get re-baselined post-trim; cp-5-pending styles concerns get explicitly tracked through the trim window.

#### W6 — Concurrent claws feature dev during the upstream window is unaddressed

Per the rust-port R1 WARN-4 ("TS-feature-freeze policy is too soft for the stated cutover model"), the same concern applies to the v2 proposal's 6–10 week upstream window:
- During that 6–10 weeks, claws receives feature work, bug fixes, and security patches.
- Some of that work touches the deletion targets (`claws-sdk/src/{snapshot,governance,compliance,audit}/` and `claws-sdk/src/compiler/`).
- Pre-trim feature work in those directories is wasted effort — it gets deleted at trim time.
- During-trim feature work risks merge conflicts at trim execution.
- Post-trim-pre-Rust-port feature work targets the surviving package shape (`claws-policy-generator/`).

The proposal doesn't define the freeze policy. **Recommendation**: feature-freeze the 4 deletion-target subdirectories from the day the v2 pre-RFCs open at `#clawtributors`. Bug fixes only; no new features. Feature work routes into `claws-policy-generator/` post-trim.

**Suggested fix**: realigned-story §Concurrent Dev Policy subsection. Define three clauses analogous to the rust-port R1 WARN-4 fix: (i) feature work in deletion-target dirs: blocked from pre-RFC date through trim wave end; (ii) bug fixes in those dirs: allowed but each touches the trim-wave-aware codeowners; (iii) security hotfixes: dual-applied to the surviving package post-trim.

---

### HC-NOTE (3)

#### N1 — Sequencing diagram in realigned-story is topology-only; calendar-week annotations would land the timeline argument visually

`realigned-story.md:113-130` shows the sequencing diagram. Adding calendar-week ranges per arrow ("oc-path → snap: ~week 0–3", "snap → PolicyIR: ~week 3–6") makes the B2 timeline argument visible at a glance. Currently a reader scans topology and assumes "fast"; calendar-annotated topology forces honest framing.

**Suggested fix**: amend the diagram with calendar ranges per arrow. Add a "best case / typical / tail" annotation per arrow if precision warrants.

#### N2 — Open-question §5 in realigned-story conflates two questions: which order vs which calendar

`realigned-story.md:163` open-questions §5: "would Peter prefer snap+policy contracts post-oc-path immediately (small, focused PRs landing in tight succession), or batched after the larger Hapi sequence completes (less context-switching for reviewers)?"

This conflates (a) topological ordering (immediately vs after) with (b) calendar pacing (succession vs batched). Peter's answer to (a) is independent of (b). Recommend splitting into two open questions to get cleaner channel signal.

**Suggested fix**: split §5 into §5a "topological ordering" + §5b "calendar pacing relative to other Hapi PRs in flight."

#### N3 — Capability-table membership questions across snap-pre-RFC §5 + policy-pre-RFC §3 are answerable internally; pre-deciding our recommendation strengthens the channel ask

`snap-pre-rfc.md:77` and `policy-pre-rfc.md:101` both ask whether the new contract earns a row in `docs/plugins/architecture.md:34-50`. These are open questions to Peter. But the v2 proposal team can pre-decide a recommendation (e.g., "we recommend snap earns a row because it's a cross-domain primitive; PolicyIR doesn't because it's a payload-shape that consumers solve").

**Suggested fix**: each pre-RFC's open-question §5/§3 takes a position with brief rationale; the channel ask becomes "do you agree" not "what should it be." Reduces review-cycle iteration count per B2.

---

## Strengths

- **The architectural pivot is genuinely correct.** Yankee's "contract not daemon" finding, bandit's "0 LoC upstream" finding, and pundit's "policy lives in snapshots" framing collectively replace ~1665 LoC of likely-rejected daemon-shape with ~250–500 LoC of contract types. From a release-eng "publish reliability over velocity" lens, this is the *right* call: small upstream surface = lower coordination cost = faster downstream cadence on our own pace. The proposal correctly identifies that the original Hapi PR-7 was architecturally hostile to upstream and would have been rejected.

- **Each pre-RFC follows upstream's pre-RFC conventions correctly.** `Status: pre-RFC, seeking directional feedback` framing matches Peter's house style for new contract introductions. AI-assisted disclosure is in the footer per `project_openclaw_pr_rules.md`. Each has a clean "what's NOT in this PR" section that pre-empts the bot-reviewer trio's "scope creep" concerns.

- **The "What's NOT in the contract" sections are the strongest part of each pre-RFC.** `snap-pre-rfc.md:62-68` and `policy-pre-rfc.md:84-94` correctly delimit the contract surface from the convention-bound consumer-specific machinery. This is the discipline Peter rewards.

- **The cross-contract concerns subsection in realigned-story (lines 172–179) honestly flags four risks** — R0–R5 tier labels being claws-specific, HostContext/ProviderLifecycle asymmetry, evaluate(event, ctx) snapshot-id absence, snap-policy conformance test coupling. None of these are pre-RFC-blockers but they're operational risks the proposal acknowledges. That's the right discipline.

- **The four-contract sequencing dependency analysis is correct** — `realigned-story.md:126-130` correctly identifies which contracts depend on which, with no circular deps. snap depends on oc-path; PolicyIR depends loosely on snap (path-constant) and not at all at the type level; guardrails depends on PolicyIR. The composition argument at lines 90–98 (each contract is small *because* of the others) is genuinely insightful.

- **Bandit's adapter design (`guardrails-adapter.md`) is operationally tight.** ~50 LoC adapter with explicit decision-mapping table, explicit composition handling (one composed provider exposed as one upstream policy registration), explicit deletion of `ShellExecProvider` as a duplicate of upstream's native exec-approvals consumer. This document is the closest to "ready to dispatch as a pulse."

- **The realigned-story's §Total upstream surface table (lines 78–84)** showing per-contract LoC + status + total ~380–520 LoC is exactly the framing a channel reader needs to decide "is this in-scope as a single coordinated contribution" — yes, it is. The comparison with the original Hapi PR-7's ~1665 LoC is load-bearing.

---

## Coordination obligations (release-eng-specific risks not flagged in the realigned-story)

The realigned-story §Cross-contract concerns lists four. Release-eng adds these:

1. **Upstream review cycle delay variance.** Per B2, median 14 days, tail 21+. Variance, not point estimate, drives downstream planning. Trim wave plan must use tail estimates, not median.

2. **Concurrent claws feature dev during upstream window** (per W6). 6–10 weeks of feature-freeze on 4 subdirectories needs codeowner enforcement, not just policy.

3. **Coverage gaps in post-trim sdk** (per W5). cp-5 lobster-web styles already under threshold; trim may worsen. Recompute baseline pre-trim, recompute thresholds post-trim.

4. **Rust-port R1 carries forward** (per B5). 4 critical findings unaddressed; "post-trim port is smaller" doesn't dissolve them.

5. **Channel-feedback capture mechanism unspecified.** When Peter replies to the pre-RFC at `#clawtributors`, where does the reply land in the repo? Channel pulls are lossy if not transcribed. Recommend: per-pre-RFC `_channel-replies.md` companion file in `docs/openclaw-contributions/` (per B6's destination decision) capturing each reply with date + summary + claws-side action.

6. **Contract-version semver discipline.** When PolicyIR v1 lands and v2 changes shape later, what's the semver story? `policy-pre-rfc.md:60` declares `version: string` on PolicyIR but doesn't define semver discipline. snap pre-RFC silent. Recommend each contract's pre-RFC declare a versioning policy (semver-major-on-shape-change, additive-fields-allowed-in-minor, etc.).

---

## What I'd like to see before R2

1. **B1 fixed**: Hapi wave amended to record v2-proposal-absorption + which PR-drafts deprecate.
2. **B2 fixed**: realigned-story has a §Calendar subsection with honest 6–10 week framing.
3. **B3 fixed**: realigned-story has §Rollback Gates with the contract-rejection / contract-mid-trim / Option-B-fallback responses defined.
4. **B4 fixed**: trim-wave-plan-requirements forward-pointed in realigned-story (test-migration manifest + downstream-consumer impact + commit topology + coverage recomputation).
5. **B5 fixed**: realigned-story §Rust Port Implications subsection lists 4 critical R1 findings + which the trim addresses + which the rust-port-plan-revision must address; "2-3 weeks at sustainable pace" retracted to honest 5–6 week scope.
6. **B6 fixed**: doc destination pinned (`docs/openclaw-contributions/`); scrubbing pass for guardrails-adapter and realigned-story; per-doc shareability frontmatter added.
7. **W1–W6 actioned**: Eduardo coordination, conformance iteration cost, per-PR test budgets, retirement window, coverage propagation, feature-freeze policy.

If those land, I'd flip to APPROVE. The architecture is right; it's the operational machinery that needs drafting.

---

## Verdict (formal)

**REQUEST-CHANGES**

6 BLOCK / 6 WARN / 3 NOTE.

Architectural recommendation: pivot is sound, proceed with v2 contracts.
Operational recommendation: do not open any pre-RFC at `#clawtributors` until B1 + B2 + B6 are fixed. Specifically: Hapi wave amendment must precede any channel ask; calendar honesty must precede any user-facing timeline framing; doc destination + scrubbing must precede any artifact share.

Implementation-readiness: **NOT YET**. R2 review after the BLOCK fixes lands.
