---
slug: hapi-amendment-to-contract-first
preset: claws
area: release / upstream
status: Draft
revision_pending: false
created: 2026-04-29
---

# hapi-amendment-to-contract-first — Realign Hapi Wave to v2 Contract-First Proposal

<!-- Plan to amend the in-progress hapi-the-bringer wave so it aligns with the
     v2 proposal package's contract-first stance. Hapi was drafted before v2;
     PR-3, PR-5, PR-6 took daemon/parallel-package shapes that contradict v2.
     This plan retires/reshapes those PRs and preserves the parts of hapi that
     are compatible with v2 (PR-1, PR-2, PR-4). Plan-writing only — execution
     is gated on R2 review of the v2 proposal package. -->

## Headlines

1. **H1: Hapi wave plan + wave.yaml + PROGRESS.md amended to retire daemon-shape PRs and align remaining PRs to v2 proposal** — `claws-openclaw-upstream.md` plan headlines H2/H3/H4 retired; H5/H1/H6 retained; new "v2 absorption" stage table row added; `wave.yaml` checkpoints cp-3 (PR-3), cp-4 (PR-5), cp-5 (PR-6) reshaped or marked superseded; `PROGRESS.md` adds the v2 absorption row described in `realigned-story.md` §"Hapi wave coordination."
   - Validation: `wave.yaml` parses clean; the existing 5-checkpoint structure either reshaped in-place OR a new `v2_proposal_absorption` block records the supersession with pointers to v2 contract PRs
   - Validation: `PROGRESS.md` shows v2-proposal-absorption row in the stage checklist
   - Validation: plan `claws-openclaw-upstream.md` either has retired headlines struck-through with redirect notes OR a new sister plan owns the contract-first headlines and the original plan flips to "Superseded" with cross-link

2. **H2: hapi worktree branches cleaned up — daemon-shape work retained as cherry-pick candidates for v2 wave; obsolete pulse + PR-draft files moved to `superseded/`** — local-only branch `feature/hapi-the-bringer` preserved at its current head (single commit `96a034a5` ahead of trunk; nothing pushed); existing PR-5 + PR-6 + PR-3 drafts move to `pr-drafts/superseded/` with header notes pointing at the v2 pre-RFCs; new placeholder PR-drafts authored at `pr-drafts/v2-snap-contract.md` and `pr-drafts/v2-policy-ir.md` matching the v2 pre-RFC shapes; useful library work in `packages/openclaw-snap/` and `packages/openclaw-policy/` flagged for cherry-pick into the post-trim downstream rename targets (`claws-snap-server/`, `claws-policy-generator/`).
   - Validation: `pr-drafts/superseded/` exists and contains the three retired drafts with pointer headers
   - Validation: cherry-pick candidate list documented in the amendment's "What stays" section, file-level
   - Validation: no force-push, no branch deletion — daemon work survives in git history for reference

3. **H3: hapi-related upstream PRs coordinated — confirmed zero open public PRs at `openclaw/openclaw` from the hapi branch; if any draft PRs slipped public, retract or redirect them with a comment pointing at the v2 pre-RFCs** — verified at amendment-execute time via `gh pr list --repo openclaw/openclaw --author <handle> --state all`; expected result is empty (cp-2 has not yet dispatched per `wave.yaml` `cp-2.status: ready`); if non-empty, every public draft gets a polite close-or-redirect comment.
   - Validation: `gh pr list --repo openclaw/openclaw --author giodl73-repo --state all` output captured and pasted into the amendment record
   - Validation: any open public PR has a closing comment referencing `snap-pre-rfc.md` / `policy-pre-rfc.md`
   - Validation: zero PRs left in a "stale draft" state at upstream

## Summary

The hapi-the-bringer wave (`feature/hapi-the-bringer` in worktree `C:\src\claws`) was drafted 2026-04-27 around the OneDrive 2026-04-18 contribution proposal: four parallel `@openclaw/*` packages plus two surgical OC-core PRs. That proposal predates the v2 proposal package developed 2026-04-29 (`realigned-story.md`, `snap-pre-rfc.md`, `policy-pre-rfc.md`, `guardrails-adapter.md`), which collapsed the upstream surface from chunky daemon-shape packages into three small contract PRs (~390–510 LoC total) plus a downstream-only guardrails adapter. Hapi PR-5 (policy generator + 9-verb subcommand) and PR-6 (snap registry + 11-verb subcommand + HTTP server) directly contradict v2's contract-first stance: snap upstream is a `SnapshotStore` SDK contract + reference plugin, not a daemon; PolicyIR upstream is types-only, not a generator. PR-3 (guardrails) similarly contradicts v2 — upstream already ships `registerTrustedToolPolicy` + `runTrustedToolPolicies`, so guardrails has 0 LoC upstream and lives downstream as a ~50 LoC adapter, not as an upstream package with six runtime subpaths.

The hapi wave was drafted in good faith. Circumstances changed when the audits landed (`snap-openclaw-design-fit.md`, `policy-openclaw-design-fit.md`, `guardrails-openclaw-design-fit.md`) and the v2 proposal package was authored. This amendment realigns hapi to v2 without discarding the work that is still useful: the workspace foothold (PR-1), the OC-4 surgical fix (PR-2), the OC-7 surgical fix (PR-4), and most of the cp-1 prep artifacts (adapter audits, bot-preempt checklist, post-merge verification runbook, scenarios, findings) all survive intact and continue to anchor the downstream contract PRs that v2 introduces.

This is a planning amendment, not a code-shipping wave. Execution is gated on R2 review of the v2 proposal package passing AND must complete before any v2 PR-1 (snap contract) opens at upstream, so hapi's retired drafts do not collide with v2's contract drafts.

## Current state

The hapi worktree as of 2026-04-29:

| Artefact | State | Notes |
|---|---|---|
| Branch `feature/hapi-the-bringer` | local only | NOT pushed to `gim-home` or `origin`; one wave-specific commit ahead of trunk: `96a034a5 feat(craft): seed Hapi the Bringer wave for openclaw upstream contribution` |
| Stage `kickoff` | completed | 4-role plan review, all APPROVE-WITH-WARNINGS |
| Stage `setup` | completed | baseline build green; UG-upstream v0.2 amendment drafted |
| Stage `scenarios` | completed | 24 scenarios, 75 findings |
| Stage `planning` | completed | 11 pulses, 5 checkpoint plans, R1 panel APPROVE-WITH-WARNINGS |
| Stage `implementation` | in progress | cp-1 closed; cp-2 marked `ready` but not dispatched |
| Checkpoint cp-1 (prep artifacts) | completed | adapter-audits guide, bot-preempt checklist, post-merge-verification runbook, lint package code (47/47 tests green), spec amendment v0.3, scenarios Phase 6 |
| Checkpoint cp-2 (PR-1 workspace + lint) | ready (not dispatched) | no upstream PR opened yet |
| Checkpoints cp-3..cp-5 | not started | PR-2 / PR-3 / PR-4 / PR-5 / PR-6 still draft-only |
| `pr-drafts/PR-1.md` | written, working-tree edits unstaged | workspace + lint + oc://config URI scheme; LARGELY ALIGNED with v2 (oc-path is the v2 leaf utility) |
| `pr-drafts/PR-2.md` | written | OC-4 stripFrontMatter raw-preserve (~1 line). ALIGNED with v2 (no architectural conflict) |
| `pr-drafts/PR-3.md` | written | `@openclaw/guardrails` upstream package with `GuardrailProvider` + `FileIngestProvider` peer interfaces + 6 runtime subpaths. CONTRADICTS v2 — upstream already ships `registerTrustedToolPolicy`; guardrails should be 0 LoC upstream + ~50 LoC downstream adapter |
| `pr-drafts/PR-4.md` | written | OC-7 conjunctive merger (`hooks.ts:889-893`). ALIGNED with v2 (no architectural conflict) |
| `pr-drafts/PR-5.md` | written | `@openclaw/policy` package with generator + 9-verb subcommand group + R5/RESTRICTED runtime invariants + emitted gateway-plugin. CONTRADICTS v2 — PolicyIR upstream is types-only (~80–150 LoC); generator stays downstream |
| `pr-drafts/PR-6.md` | written | `@openclaw/snap` daemon-shape: 11-verb subcommand group + HTTP server with `/v1/resolve` + `serve` mode + content-addressable registry. CONTRADICTS v2 — snap upstream is `SnapshotStore` contract (~30 LoC) + reference plugin (~100 LoC) + CLI verb (~150 LoC), not a top-level daemon package |
| `pulses/01..11+*.md` | written | mostly intact; pulse 08 (PR-5 policy) and pulse 09 (PR-6 snap) supersede; pulse 06 (PR-3 guardrails) supersede |
| Working-tree changes | uncommitted staged + unstaged | mid-renumber from 7-PR to 6-PR scheme: `PR-7.md` deleted, pulses 06..12 renamed down to 05..11, several PR drafts modified, `PROGRESS.md` and `cp-1.md`..`cp-5.md` modified |
| Public PRs at `openclaw/openclaw` | none | confirmed via branch listing (`feature/hapi-the-bringer` not pushed); `cp-2.dispatch_plan.step 4` is the trigger and has not run |
| Source code in `packages/openclaw-{workspace,guardrails,policy,snap,lsp}` | shared with main trunk | inherited via the merge of horus's package work; not hapi-specific |

The honest read: **nothing has been pushed to upstream-public from this wave.** The amendment can rewrite the upstream-facing PR drafts without retraction cost. The internal artefacts that already landed in `docs/upstream/` during cp-1 (adapter-audits guide, bot-preempt checklist, post-merge-verification runbook, spec amendment v0.3) remain useful; v2's contract PRs will cite the same guides.

## What stays

| Item | Why kept | Action |
|---|---|---|
| Plan headline H1 (`@openclaw/workspace`) | oc-path leaf utility is the v2 chain's first contract per `realigned-story.md` §"The four contracts (1. oc-path)"; hapi PR-1 IS the v2 oc-path PR | KEEP — PR-1 dispatches as the v2 chain's day-0 PR |
| Plan headline H5 (OC-4 + OC-7 surgical PRs) | Pure core surgical fixes; orthogonal to contract-first vs daemon-first axis | KEEP — PR-2 (OC-4) and PR-4 (OC-7) dispatch unchanged |
| Plan headline H6 (bot pre-empt + adapter audits) | Reusable artefacts; v2 contract PRs will cite the same guides | KEEP — cp-1 already shipped; v2 wave inherits |
| `pr-drafts/PR-1.md` (workspace + lint + oc://config URI) | aligns with v2 oc-path contract; lint surface is independent value (closes 27+ real upstream issues) | KEEP — minor edit to add v2-chain-context paragraph to PR description |
| `pr-drafts/PR-2.md` (OC-4 stripFrontMatter) | core surgical, ~1 line; orthogonal to v2 axis | KEEP — dispatch unchanged in cp-3 |
| `pr-drafts/PR-4.md` (OC-7 conjunctive merger) | core surgical, ~5 lines; orthogonal to v2 axis | KEEP — dispatch unchanged in cp-4 |
| Pulses 01–04 (cp-1 prep artefacts + cp-2 PR-1) | already executed (cp-1) or directly serving a kept PR (cp-2) | KEEP — no edits needed |
| Pulse 05+pr2-oc4-stripfrontmatter | serves PR-2 which is kept | KEEP |
| Pulse 07+pr4-oc7-conjunctive-merger | serves PR-4 which is kept | KEEP |
| `cp-1` checkpoint (prep artefacts) | completed | KEEP — completion record preserved |
| `cp-2` checkpoint (PR-1 workspace) | ready, not dispatched | KEEP — dispatches as v2 chain day-0 PR |
| `docs/upstream/guides/adapter-audits.md` | applies to v2 contract PRs as well | KEEP — possibly extend with v2-chain-specific section in a follow-on |
| `docs/upstream/guides/bot-preempt-checklist.md` | applies to all upstream PRs | KEEP |
| `docs/upstream/guides/post-merge-verification.md` | applies to all upstream merges | KEEP |
| `specs/drafts/UG-upstream.amend.md` v0.3 | revised OC-PR roadmap; v2 amendment will append a §14 superseding the §1 roadmap with v2 contract chain | KEEP + v0.4 amendment in the v2 wave (out of scope for this plan) |
| `scenarios/scenarios.md` (24 scenarios + Phase 6 lint) | Phase 6 + Phase 1 (bot-preempt) directly applicable; Phases 2–4 partially applicable | KEEP — flag Phase 2/3 governance scenarios as "applies to downstream `claws-policy-generator/` post-rename" |
| `scenarios/FINDINGS.md` (117 findings) | retained as audit trail | KEEP |
| `packages/openclaw-{workspace,policy,snap,guardrails}/` source code | downstream consumers; will be renamed per v2 (`claws-snap-server`, `claws-policy-generator`, etc.) and trimmed; the code body is reusable as the downstream `SnapshotStore` impl + `PolicyGenerator` impl + `GuardrailProvider` adapter | KEEP — flag for cherry-pick into the post-trim downstream rename targets |

## What changes

| Item | Why retired/reshaped | Action |
|---|---|---|
| Plan headline H2 (`@openclaw/guardrails` upstream package) | upstream already ships `registerTrustedToolPolicy` per realigned-story §"5. guardrails (no upstream PR)"; new package would duplicate existing slot | RETIRE — replace with downstream `claws-guardrails/openclaw-adapter.ts` work item (no upstream PR) |
| Plan headline H3 (`@openclaw/policy` package + 9-verb subcommand group) | v2 PolicyIR is types-only (~80–150 LoC) per `policy-pre-rfc.md`; generator stays downstream; CLI verbs stay downstream | RETIRE upstream-package framing — replace with v2 PolicyIR types contract + downstream `claws-policy-generator/` rename |
| Plan headline H4 (`@openclaw/snap` package + 11-verb subcommand group + HTTP server) | v2 snap is `SnapshotStore` contract + reference plugin + `openclaw snap` CLI verb (~280 LoC total) per `snap-pre-rfc.md`; daemon-shape lives downstream as `claws-snap-server/` | RETIRE upstream-daemon framing — replace with v2 snap contract PR + downstream `claws-snap-server/` rename |
| `pr-drafts/PR-3.md` (`@openclaw/guardrails` upstream package) | adds parallel `GuardrailProvider` + `FileIngestProvider` peer interfaces upstream when upstream already has the slot via `registerTrustedToolPolicy`; `sourcePluginId` adversarial-defense work survives but lives downstream | FOLD — move to `pr-drafts/superseded/PR-3-guardrails-upstream-package.md`; useful content (sourcePluginId override, hash-chained audit, RFC 8785 JCS) folds into `guardrails-adapter.md` design doc and into a downstream `claws-guardrails/` rename + adapter authoring task |
| `pr-drafts/PR-5.md` (`@openclaw/policy` daemon-ish package + 9-verb subcommand) | generator is convention-bound (claws-specific SOUL.md/TOOLS.md/AGENTS.md parse); v2 ships PolicyIR types only | RESHAPE — supersede with `pr-drafts/v2-policy-ir.md` (matches `policy-pre-rfc.md` shape: ~135–205 LoC types + optional runtime helpers + `ctx.snapshotId` extension); move existing draft to `superseded/`; cherry-pick generator code into post-trim `claws-policy-generator/` |
| `pr-drafts/PR-6.md` (`@openclaw/snap` daemon-shape, 11-verb + HTTP server) | upstream's existing precedent (`extensions/diagnostics-prometheus`, `extensions/webhooks`) is plugin-mounted on gateway HTTP listener, not new top-level daemon packages | RESHAPE — supersede with `pr-drafts/v2-snap-contract.md` (matches `snap-pre-rfc.md` shape: `SnapshotStore` ~30 LoC + reference plugin under `extensions/snapshot/` ~100 LoC + `openclaw snap` CLI verb ~150 LoC); move existing draft to `superseded/`; cherry-pick FsSnapshotStore-shaped code into post-trim `claws-snap-server/` |
| Pulse 06+pr3-openclaw-guardrails | serves the retired PR-3 | SUPERSEDE — move to `pulses/superseded/`; redirect note points at v2 guardrails-adapter (no upstream pulse needed; downstream-only work) |
| Pulse 08+pr5-openclaw-policy | serves the retired PR-5 | SUPERSEDE — replace with new pulse `08+v2-policy-ir-contract.md` matching the `policy-pre-rfc.md` shape; old pulse moves to `pulses/superseded/` |
| Pulse 09+pr6-openclaw-snap | serves the retired PR-6 | SUPERSEDE — replace with new pulse `09+v2-snap-contract.md` matching the `snap-pre-rfc.md` shape; old pulse moves to `pulses/superseded/` |
| `wave.yaml` `cp-3.description` | mentions `@openclaw/guardrails` upstream package | EDIT — replace with "PR-2 OC-4 stripFrontMatter (kept) + downstream `claws-guardrails/` rename + adapter task (no upstream PR)" |
| `wave.yaml` `cp-4.description` | mentions `@openclaw/policy` upstream daemon | EDIT — replace with "PR-4 OC-7 conjunctive merger (kept) + v2 PolicyIR types contract PR + `ctx.snapshotId` extension" |
| `wave.yaml` `cp-5.description` | mentions `@openclaw/snap` upstream daemon | EDIT — replace with "v2 snap contract PR + downstream rename `openclaw-snap` → `claws-snap-server` + downstream rename `openclaw-policy` → `claws-policy-generator` + scope-flip + acceptance fixtures" |
| `wave.yaml` adds `v2_proposal_absorption:` block | new — records (a) PR-3/PR-5/PR-6 deprecated in favor of v2 contract PRs, (b) PR-1/PR-2/PR-4 survive as-is, (c) v2 pre-RFC channel-asks gate the rewritten dispatch | ADD — block per `realigned-story.md` §"Hapi wave coordination" step 1 |
| `PROGRESS.md` adds v2-absorption row | per `realigned-story.md` §"Hapi wave coordination" step 2 | ADD — "v2-proposal-absorption — pending — gates implementation-stage cp-3/cp-4/cp-5 dispatch" |
| Plan `claws-openclaw-upstream.md` | drafted around 6-PR daemon-shape contribution | EITHER (a) flip status to "Superseded" and create sister plan `claws-openclaw-upstream-v2-contract-first.md` carrying the v2 chain headlines, OR (b) revise in-place as v0.3 with retired headlines struck-through and new contract-first headlines added — choose at amendment-execute time per the user's preference (open question, see "Risk" §1) |
| Wave name / deity / branding | `Hapi the Bringer` references the original 4-package contribution scope | KEEP unchanged — branding is incidental; wave can deliver a different shape under the same name without renaming |

## Coordination

### Order of operations (when this amendment executes)

1. **Verify pre-condition**: v2 proposal package R2 review status = APPROVE; otherwise stop and wait. Read `.craft/out/panels/v2-proposal/R2-consolidated.md` (does not yet exist; this is what gates the amendment).
2. **Verify upstream-public state**: run `gh pr list --repo openclaw/openclaw --author <handle> --state all` from the hapi worktree to confirm zero open PRs from `feature/hapi-the-bringer`. Capture output. Expected empty.
3. **Land v2 proposal package docs** in main monorepo (`.craft/out/proposals/{realigned-story,snap-pre-rfc,policy-pre-rfc,guardrails-adapter}.md` already exist as of 2026-04-29; nothing to do unless they have moved).
4. **Edit hapi `wave.yaml`** to add `v2_proposal_absorption:` block + reshape cp-3/cp-4/cp-5 descriptions per "What changes" table. Stage but do not commit yet.
5. **Edit hapi `PROGRESS.md`** to add the v2-absorption stage row.
6. **Move retired PR-drafts** to `pr-drafts/superseded/` (PR-3, PR-5, PR-6) with header notes pointing at the v2 pre-RFCs in `.craft/out/proposals/`.
7. **Author new PR-drafts** at `pr-drafts/v2-snap-contract.md` and `pr-drafts/v2-policy-ir.md` matching the v2 pre-RFC shapes. The `ctx.snapshotId` extension can ride in `v2-policy-ir.md` per `policy-pre-rfc.md` Ask §4.
8. **Move retired pulse files** to `pulses/superseded/` (06+pr3-guardrails, 08+pr5-policy, 09+pr6-snap). Author new pulses `08+v2-policy-ir-contract.md` and `09+v2-snap-contract.md` aligned to the new PR drafts.
9. **Commit hapi-side amendment** as a single commit on `feature/hapi-the-bringer` with subject `wave(hapi): amend to v2 contract-first per .craft/out/proposals/`.
10. **Edit main-monorepo plan** `claws-openclaw-upstream.md` per the EITHER/OR choice in "What changes" table (final row). Cross-link the v2 proposal package and this amendment plan from the predecessor's notes.
11. **Update `PLANS.md` / `WAVES.md` / `ATOMS.md`** in the main monorepo to reflect the supersession, if those indexes track plan/wave status. (Out of scope for this amendment if the indexes aren't auto-updated; flag as a follow-on housekeeping task.)
12. **Brief reviewers** (the 4 stage-review roles per `wave.yaml` `stages: scenarios.reviews + implementation.reviews + delivery.reviews`) that the wave's upstream-facing scope changed. Lightweight FYI message; no formal R2 of the amended hapi plan needed because the v2 proposal already absorbed R1 review of the contract-first stance.

### Communication needs

- **Internal**: brief the wave's review roles (`claws:claws-release-eng`, `claws:claws-repo-steward`, `claws:ciso`, `claws:compliance`, `claws:gateway-eng`) with a short note pointing at this amendment + the v2 proposal package.
- **External (`#clawtributors` channel at `openclaw/openclaw`)**: NO action needed — nothing pushed yet. The v2 wave will open the channel-asks when its pre-RFCs dispatch.
- **External (`openclaw/openclaw` PRs)**: NO action needed — confirmed zero open PRs from this branch. Re-confirm at amendment-execute time.

## Risk

1. **Open question on plan reshape (in-place vs sister plan)**: should `claws-openclaw-upstream.md` flip to `Superseded` with a new `claws-openclaw-upstream-v2-contract-first.md` carrying the v2 chain headlines, or be revised in-place as v0.3? In-place is simpler (one source of truth) but loses some R1 review history; sister plan preserves history but creates two related plans. **Resolve before amendment-execute** by checking with the user. Default if no input: in-place v0.3 revision with retired headlines struck-through (cleaner and matches the convention in cp-1's UG-upstream §-renumber).

2. **Reviewer goodwill**: nothing has been pushed to upstream-public, so there are no external reviewer relationships to mend. Internally, the four wave-review roles already approved the kickoff/setup/scenarios/planning stages with knowledge of the original 6-PR shape; they should be briefed once on the change but no formal R2 is required because v2's pre-RFC is the substrate truth.

3. **Calendar — every week amending hapi is a week not landing v2 contracts**: the amendment is scoped to ~1 day of execution work (1 commit on hapi, 1 commit on main monorepo, ~12 file moves + edits, no code changes). Per `realigned-story.md` §"Calendar honesty," v2's chain is 6–10 weeks of upstream review cycle, so a 1-day amendment is not on the critical path. Risk is the amendment is *not* sequenced before v2 PR-1 dispatches — if v2 PR-1 dispatches first while hapi PR-3/PR-5/PR-6 drafts are still live in the wave dir, future readers will be confused about which is canonical. **Mitigation**: H1 + H2 must complete before any v2 PR-1 dispatches at upstream.

4. **Lost work in the rewrite**: PR-3's `sourcePluginId` adversarial-defense, PR-5's R5/RESTRICTED runtime invariants and generation-time invariant rejection, PR-6's `resolvePolicy --at <timestamp>` e-discovery temporal query, and PR-6's signed-handle audit envelope are all valuable contributions that need a downstream home post-amendment. **Mitigation**: explicit cherry-pick candidate list in this plan's "What stays" table; v2 pre-RFCs (`snap-pre-rfc.md`, `policy-pre-rfc.md`, `guardrails-adapter.md`) explicitly absorb these as downstream concerns. Confirm at amendment-execute time that the cherry-pick list is complete.

5. **Working-tree uncommitted edits at hapi worktree**: `git status` shows in-progress staged + unstaged renames from a 7-PR to 6-PR scheme already underway (`PR-7.md` deleted, pulses renumbered down). Amending a worktree mid-edit risks conflicts. **Mitigation**: at amendment-execute time, first commit OR stash the in-progress rename so the amendment lands on a clean working tree; do not interleave the two changes.

6. **Cherry-pick window for downstream package code**: hapi `packages/openclaw-{workspace,policy,snap,guardrails}/` has live code (lint engine + 47 tests, generator + R5 invariants, snap registry + audit chain). This code's destination per v2 is the downstream rename targets (`claws-policy-generator/`, `claws-snap-server/`). The trim wave (separate, post-v2-merge) executes the actual rename. Hapi must NOT delete this code as part of the amendment; it stays in place until trim. **Mitigation**: amendment is doc-only on the hapi side; package code is left in place.

7. **`packages/openclaw-guardrails/` upstream-asymmetry**: per `realigned-story.md`'s repo-steward HC-BLOCK 3 flag, the rename rule is either all-renamed or explicit about why guardrails is special. If amendment-execute goes with all-renamed, the trim plan does the mechanical follow-up. **Mitigation**: keep `packages/openclaw-guardrails/` named as-is in the amendment; trim plan locks it.

## Coverage Contract

This is a planning amendment, not a code-shipping wave. Verification = **reading the amended hapi plan + diff against original**.

### Specs
- N/A — no spec changes. UG-upstream v0.4 amendment (if needed for the v2 contract chain) is out of scope and lands as part of the v2 wave.

### Concept Guides
- [ ] `.craft/plans/claws-openclaw-upstream.md` — UPDATE: either flip to Superseded with sister plan, or revise in-place as v0.3 with retired headlines struck-through (decision per Risk §1)
- [ ] `C:\src\claws\.craft\waves\260427+hapi-the-bringer+openclaw-upstream\wave.yaml` — UPDATE: add `v2_proposal_absorption:` block, edit cp-3/cp-4/cp-5 descriptions per "What changes" table
- [ ] `C:\src\claws\.craft\waves\260427+hapi-the-bringer+openclaw-upstream\PROGRESS.md` — UPDATE: add v2-absorption row to stage checklist

### Tests (reference-only verification)
- [ ] Manual: read amended `wave.yaml` and confirm `v2_proposal_absorption:` block records the supersession with pointers to `.craft/out/proposals/{realigned-story,snap-pre-rfc,policy-pre-rfc,guardrails-adapter}.md`
- [ ] Manual: `pr-drafts/superseded/` directory exists and contains `PR-3-guardrails-upstream-package.md`, `PR-5-policy-package.md`, `PR-6-snap-daemon.md` with header notes pointing at v2 pre-RFCs
- [ ] Manual: `pr-drafts/v2-snap-contract.md` and `pr-drafts/v2-policy-ir.md` exist and match the contract shapes documented in `snap-pre-rfc.md` and `policy-pre-rfc.md` respectively
- [ ] Manual: `gh pr list --repo openclaw/openclaw --author <handle> --state all` returns empty (or, if non-empty, every result has a closing comment redirecting to v2 pre-RFCs)
- [ ] Manual: hapi-side amendment lands as a single commit `wave(hapi): amend to v2 contract-first per .craft/out/proposals/` on `feature/hapi-the-bringer`; commit message references this plan + the v2 pre-RFCs

## Sequencing

- **AFTER** R2 review of v2 proposal package (`.craft/out/panels/v2-proposal/R2-consolidated.md`) returns APPROVE. Without that gate, the amendment is anchored to a moving target.
- **AFTER** cp-1 of hapi closes (already done — `wave.yaml` `cp-1.status: completed`). Confirmed state as of 2026-04-29.
- **BEFORE** any v2 PR-1 (snap contract) opens at `openclaw/openclaw`. Otherwise hapi's retired PR drafts and v2's contract drafts will both reference the upstream simultaneously and confuse future readers.
- **BEFORE** cp-2 of hapi dispatches (cp-2 is `ready` but not dispatched per `wave.yaml`). cp-2 / PR-1 is workspace + lint, which IS the v2 oc-path PR; either the amendment lands first and then cp-2 dispatches as the v2 chain's day-0 PR, or cp-2 dispatches as-planned and the amendment cleans up the daemon PRs only. Either order works for cp-2 specifically since PR-1 survives intact, but landing the amendment first gives the wave a single canonical record before any external dispatch.
- **PARALLEL TO**: ongoing isis-the-weaver wave (cp-7 R1 panel artifacts shipped 2026-04-29 per main-monorepo recent commits). The two waves share git state but run independently per `wave.yaml` `branch_cohabitation.status: reversed-2026-04-28`.

## Out of Scope

- **Authoring the v2 contract PRs themselves** — that's a separate wave (the v2 wave). This amendment only realigns hapi; it does NOT draft the v2 snap contract PR, the v2 PolicyIR PR, or the `ctx.snapshotId` extension PR. Those are owned by the v2 wave's planning + implementation stages.
- **Retroactively fixing any merged commits** — nothing has merged at upstream from this branch. Internal commits (cp-1's adapter-audits guide, bot-preempt checklist, post-merge-verification runbook, scenarios Phase 6, lint code) stay as-is; they remain useful and are not contradicted by v2.
- **Changing the hapi wave's deity / branding / metadata** — `name: "Hapi the Bringer"`, `deity: hapi`, `epithet: the-bringer` stay unchanged. The wave can deliver a different shape under the same name.
- **Trim wave plan drafting** — separate plan; the trim wave executes the `claws-sdk/src/{snapshot,governance,compliance,audit}/` deletes + the `openclaw-snap` → `claws-snap-server` + `openclaw-policy` → `claws-policy-generator` renames after v2 contracts merge. Out of scope for this amendment.
- **Rust port re-scoping** — separate plan (`claws-rust-port.md`); already flagged `revision_pending: true`. This amendment does not touch the Rust port plan.
- **OpenClaw upstream releases / cadence coordination** — owned by `project_openclaw_upstream.md` and the gim-home maintainer relationship. The amendment respects but does not change that cadence.
- **Lobster-web roadmap coordination** — Eduardo's domain per `project_lobster_ownership.md`. This amendment does not touch lobster-web or the serve-deploy-bridge.
- **`@openclaw/*` npm publish coordination** — gated on upstream merge + Microsoft public-release path; happens in a follow-up plan post-trim.

## Notes

- This plan is the concrete next action listed in `realigned-story.md` §"Hapi wave coordination" steps 1–5. The v2 proposal package authored 2026-04-29 explicitly flagged the steps as out-of-scope for the v2 docs-only fix-pass; this amendment is where they execute.
- The hapi worktree is at `C:\src\claws`; this amendment plan lives in the main monorepo at `C:\src\claws\.craft\plans\` because it is a planning artefact for cross-wave coordination, not a hapi-internal artefact. The execution ITSELF will edit files in both worktrees (hapi-side: wave.yaml, PROGRESS.md, pr-drafts/, pulses/; main-side: this plan + the predecessor plan + index updates).
- Per house convention (`.craft/plans/` + frontmatter + headlines), this plan is in standard shape and can be picked up by `/claws-start` or `/claws-pulse` once the user authorizes execution. **Recommendation: do NOT auto-execute.** This is a coordination amendment; user should review the v2 proposal package R2 panel verdict and confirm Risk §1 (in-place vs sister plan) before dispatching.

## Open questions to resolve before amendment-execute

1. **Risk §1**: in-place v0.3 revision of `claws-openclaw-upstream.md` vs sister plan + Superseded flip? Default if no input: in-place v0.3.
2. **`packages/openclaw-guardrails/` rename in trim wave**: stays as `openclaw-guardrails` (current state, repo-steward flagged) or renames to `claws-guardrails` (per `realigned-story.md` §"Renames + new packages")? Trim plan locks it; not blocking for this amendment.
3. **PR description edit on PR-1**: does the amendment add a v2-chain-context paragraph to `pr-drafts/PR-1.md` (so PR-1 ships with explicit v2-chain framing), or does PR-1 stay as-is and v2 chain context lives in v2's PR-2 (snap contract) description? **Recommendation**: add a small "Wave context" paragraph to PR-1's PR description noting it is the day-0 PR of the v2 contract chain (`oc-path` per `realigned-story.md`).
4. **Internal monorepo `PLANS.md` / `WAVES.md` / `ATOMS.md` index updates**: are these auto-tracked or do we manually edit? If manual, add as a follow-on task in the amendment's `Out of Scope` resolution.

## Footer

Authored 2026-04-29 by giodl@microsoft.com. Drafted as the concrete next-action artefact for the hapi-the-bringer wave per `realigned-story.md` §"Hapi wave coordination." Plan-writing only; execution gated on v2 proposal R2 review verdict + answers to the four open questions above.
