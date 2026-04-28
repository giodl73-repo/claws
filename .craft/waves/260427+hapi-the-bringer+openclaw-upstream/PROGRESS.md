# Hapi the Bringer — Progress

**Wave dir**: `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/`
**Branch**: `feature/isis-the-weaver` (cohabiting with the lobster-foundation wave by user direction; no new branch cut)
**Plan**: [`claws-openclaw-upstream`](../../plans/claws-openclaw-upstream.md)
**Pipeline**: `claws` (8 stages)
**Started**: 2026-04-27

## Plan summary

| Plan | Headlines | Status |
|---|---|---|
| `claws-openclaw-upstream` | H1: `@openclaw/workspace` merged · H2: `@openclaw/guardrails` merged · H3: `@openclaw/policy` + 9-verb subcommand group merged · H4: `@openclaw/snap` + 11-verb subcommand group merged · H5: OC-4 + OC-7 surgical PRs merged · H6: bot pre-empt checklist + adapter audits as reusable artifacts | Active |

## Stage checklist

- [x] **kickoff** — wave skeleton + plan-flip + plan reviews (4 roles, all APPROVE-WITH-WARNINGS)
  - [x] Wave directory created at `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/`
  - [x] `wave.yaml` written with 4 provisional checkpoints
  - [x] Plan status flipped Draft → Active, `wave:` field populated
  - [x] Plan review panel R1: all 4 reviewers complete (claws-release-eng, claws-compliance, claws-ciso, claws-gateway-eng) at `panels/plan-claws-openclaw-upstream/R1-claws-{role}.md`
  - [x] Consolidated findings written to `panels/plan-claws-openclaw-upstream/R1-consolidated.md` — 3 HC-BLOCK, 10 HC-WARN, 10 HC-NOTE across 4 reviewers; all 4 verdicts APPROVE-WITH-WARNINGS
  - [x] Plan-amendment items applied: B1 (scope-flip moved into scope), W1 (codemod validation gate), W2 (post-merge verification runbook), N3 (branch cohabitation merge order in wave.yaml), W8 (OC-7 wording — field is already object-only, fix is array adoption at `hooks.ts:889-893`), W9 (OC-1/2/6 workaround residual-gap note: runtime-gated, not write-blocked)
  - [x] Kickoff status flipped to `completed` with `reviewDecision: approved-with-warnings`
- [x] **setup** — baseline green, spec amendment drafted, review-driven fixes applied
  - [x] `npm run build` baseline confirmed green (exit 0, 2026-04-27T19:50:00Z)
  - [x] Spec amendment drafted: `specs/drafts/UG-upstream.amend.md` — covers revised OC-PR roadmap + 5 new sections (B2 trust-set, W3 approval-events, W4 temporal-query, W6 sourcePluginId, W9 runtime-gated)
  - [x] Diagnostic registries: no new codes this wave (governance diagnostics live in @openclaw/policy)
  - [x] Setup-stage review R1 by `claws:claws-repo-steward` complete (verdict: REQUEST-CHANGES → APPROVE-WITH-WARNINGS after fixes)
  - [x] R1 fixes applied:
    - **HC-BLOCK 1** (missing bot-preempt-checklist guide): inlined operating-constraints table in §2.1 of the amendment so the spec is self-contained; companion guide stays as H6 deliverable
    - **HC-BLOCK 2** (missing frontmatter): YAML frontmatter added to amendment with version, applies_to, source_version, drives_r1_findings
    - **HC-BLOCK 3** (ATOMS.md out of sync): companion `specs/drafts/ATOMS.amend.md` written — 6 new atoms registered (bot-reviewer-constraints, runtime-gated-enforcement, trust-set-lifecycle, approval-audit-events, audit-attribution, temporal-queries)
    - **HC-WARN 1** (CHANGELOG): companion `specs/drafts/CHANGELOG.amend.md` written for end-of-section append at deploy time
    - **HC-WARN 2** (section-numbering reader's guide): added explicit "Reader's guide — what changed in v0.2" preamble explaining the §-renumber + which v0.1 sections remain in force unchanged
    - **HC-WARN 3** (OC-7 scenario brief reword): rewrote §11's W7 entry as "OC-7 merger crash-safety" with concrete plugin-A-appends-then-plugin-B-throws scenario language
    - **HC-NOTE 1** (Extends CL-11 restate): added to amendment frontmatter
    - **HC-NOTE 2** (contribution-workflow.md flag): added new §11.1 Companion-guide flag
- [x] **scenarios** — 24 scenarios across 4 phases, 75 findings catalogued
  - [x] `scenarios/scenarios.md` — 4-phase catalog: bot-preempt (5), governance correctness (8), package invariants + e-discovery (8), compliance rubric coverage (2), plus W7/W9 deferred items integrated
  - [x] `scenarios/FINDINGS.md` — 75 findings (4 HC-BLOCK, 14 HC-WARN, 17 HC-NOTE classified per house rules; balance are explicit cross-references)
  - [x] HC-BLOCK applications routed: F-17 + F-22 → PR-4 (OC-7) scope; F-26 → PR-5 generator validation; F-38 → adapter-audits.md is now hard dependency for PR-3
  - [x] Test tier deltas applied to plan Coverage Contract: L1 integration 12→18 (+audit-stream adapter, +crash-safety), L3 acceptance 6→8 (+SOC2 +HIPAA rubric mapping)
  - [ ] Adapter-audits guide content (H6 deliverable) — written in pulses stage; not blocking scenarios advance
- [x] **planning** — pulse decomposition + checkpoint plans (review pending)
  - [x] **12 pulses** written at `pulses/01..12+{slug}.md` covering: cp-1 prep artifacts (3) + cp-2 Wave A workspace foothold (2: PR-1 + PR-2 oc-uri-scheme-config) + cp-3 Wave B small surgical + governance (2: PR-3 OC-4 + PR-4 guardrails) + cp-4 Wave C merger + generator (2: PR-5 OC-7 + PR-6 policy) + cp-5 Wave D registry + closeout (3: PR-7 snap + scope-flip + acceptance fixtures)
  - [x] **5 checkpoint plans** at `checkpoints/cp-1.md` through `cp-5.md` with dispatch order, gate criteria, review panels
  - [x] **Restructured 2026-04-27** per user direction "lets make B PR 2": PR-1 absorbed `replaceConfigFile` lossless conversion + oc:// diagnostic shape extension; NEW PR-2 ships `oc://config/...` URI scheme extension; OC-4 + OC-7 + guardrails + policy + snap renumbered downstream. 7 upstream PRs total (was 6); still respects 10-PR cap and 2-PR-open culture. Workspace earns its keep THREE ways in cp-2.
  - [x] Plan Coverage Contract Test Tier targets (L0=24, L1=18, L2=8, L3=8) reflected in pulse TDD test sections — total 58 tests, plus 4 new scenarios for PR-1's lossless-conversion invariants and PR-2's URI scheme parser
  - [x] Acceptance fixture targets: 41 fixtures across 6 series (bot-preempt 13, governance 11, adapter 4, oc4 1, pkg-invariants 10, compliance 2)
  - [x] Pulse review panel R1 complete: architect, type-system, dragon, testing — all 4 verdicts APPROVE-WITH-WARNINGS (1 HC-BLOCK, 12 HC-WARN, 11 HC-NOTE)
  - [x] R1 fixes applied: A1 HC-BLOCK (pulse 06 PR-2→PR-3 rename); W1 (pulse 08 depends_on); W2 (pulse 11 depends_on); W6 (pulse 04 addresses_findings expanded); W8 (pulse 01 verification gate now greps for substantive content); W9 (pulse 11 scope-flip contingency matrix); W12 (pulse 12 fixture census assertions)
  - [x] R1 deferred to PR-DRAFT writing: W3, W4, W5, W7, W10, W11, N4–N7 (these belong in PR description language, not pulse content; addressed during PR-DRAFT skeleton authoring)
  - [x] PR-DRAFT skeletons written at `pr-drafts/PR-1.md` through `PR-7.md` — each carries: core-not-extension justification, before/after, what ships, test plan, bot-preempt checklist (filled out), metrics, migration/risk. Type-safety findings (W3, W4, W5) addressed: `DiagnosticLocation` discriminated union explicit in PR-1; `ParsedOcUri` discriminated kind explicit in PR-2; `sourcePluginId` lenient mode runtime-only doc + `getSourcePluginId()` accessor in PR-4. OC-7 spec choice (W7) addressed in PR-5. Three-ways pitch validated in PR-1 with explicit table (W10).
- [ ] **implementation** — open and shepherd 6 PRs at `github.com/openclaw/openclaw`
  - [ ] cp-1: prep artifacts merged into our `docs/upstream/`
  - [ ] cp-2 (Wave A): PR-1 (workspace) + PR-2 (OC-4) merged at openclaw/openclaw
  - [ ] cp-3 (Wave B): PR-3 (guardrails) + PR-4 (OC-7) merged at openclaw/openclaw
  - [ ] cp-4 (Wave C): PR-5 (policy) + PR-6 (snap) merged at openclaw/openclaw
- [ ] **testing** — post-merge verification at openclaw/openclaw trunk
  - [ ] H1–H4 validation criteria green against trunk after each merge
  - [ ] H5 OC-4 + OC-7 regression tests pass on trunk
  - [ ] Adapter audits re-checked against post-merge trunk; deltas recorded
- [ ] **record** — internal CHANGELOG + spec deployment
  - [ ] `docs/upstream/CHANGELOG.md` updated with all six merge SHAs
  - [ ] `specs/drafts/UG-upstream.amend.md` applied to `docs/upstream/specs/UG-upstream.md`
  - [ ] `guides/bot-preempt-checklist.md` and `guides/adapter-audits.md` deployed to `docs/upstream/guides/`
  - [ ] CODEBASE.md / PLANS.md / WAVES.md / ATOMS.md updated
- [ ] **delivery** — wave close + retrospective
  - [ ] All H1–H6 validation criteria checked
  - [ ] `claws-openclaw-upstream` plan flipped Active → Implemented
  - [ ] Wave status flipped active → completed

## Key constraints (read every cycle)

- **Upstream repo**: `github.com/openclaw/openclaw` at HEAD `5e8cc1d9c` (pinned for audit baseline)
- **PR cap**: 10 per author — auto-close at 11
- **Open concurrency**: 2 PRs at a time matches upstream's culture
- **Reviewer trio**: Greptile + Copilot + chatgpt-codex bots — pre-empt their P1/P2/P3 categories
- **Auto-close labels**: `r:third-party-extension`, `r:skill` — every PR description must lead with core-not-extension justification
- **Public API additions** require: `plugin-sdk-api-baseline.sha256` refresh, `docs/sdk-overview.md` table refresh, Swift protocol model regen for gateway changes
- **CHANGELOG rule**: new entries at end of target section, not mid-section
- **`CLAUDE.md` is authoritative** — read before opening any PR

## Branch cohabitation note

This wave shares the `feature/isis-the-weaver` branch with the (currently in
implementation) `260424+isis-the-weaver+lobster-foundation` wave. Hapi's
commits land alongside Isis's. Merge ordering and any rebases are decided
at delivery time, not now.
