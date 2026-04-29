# Hapi the Bringer — Progress

**Wave dir**: `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/`
**Branch**: `feature/hapi-the-bringer` (own worktree at `C:\src\claws-hapi`; no longer cohabiting with isis-the-weaver as of 2026-04-28)
**Plans**: [`claws-openclaw-upstream`](../../plans/claws-openclaw-upstream.md) (primary) · [`claws-workspace-lint`](../../plans/claws-workspace-lint.md) (sister, added 2026-04-28 — JSONC lint surface in @bic/openclaw-workspace)
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
  - [x] HC-BLOCK applications routed: F-17 + F-22 → PR-3 (OC-7) scope; F-26 → PR-4 generator validation; F-38 → adapter-audits.md is now hard dependency for PR-2
  - [x] Test tier deltas applied to plan Coverage Contract: L1 integration 12→18 (+audit-stream adapter, +crash-safety), L3 acceptance 6→8 (+SOC2 +HIPAA rubric mapping)
  - [ ] Adapter-audits guide content (H6 deliverable) — written in pulses stage; not blocking scenarios advance
- [x] **planning** — pulse decomposition + checkpoint plans (review pending)
  - [x] **11 pulses** written at `pulses/01..11+{slug}.md` covering: cp-1 prep artifacts (3) + cp-2 Wave A workspace foothold (1 upstream PR: PR-1 = workspace + lint + oc://config URI + doctor migration emit) + cp-3 Wave B small surgical + governance (2: PR-2 OC-4 + PR-3 guardrails) + cp-4 Wave C merger + generator (2: PR-4 OC-7 + PR-5 policy) + cp-5 Wave D registry + closeout (3: PR-6 snap + scope-flip + acceptance fixtures). 6 upstream PRs total (was 7 before 2026-04-28 merge of PR-2 oc://config into PR-1).
  - [x] **5 checkpoint plans** at `checkpoints/cp-1.md` through `cp-5.md` with dispatch order, gate criteria, review panels
  - [x] **Restructured 2026-04-27** per user direction "lets make B PR 2": PR-1 absorbed `replaceConfigFile` lossless conversion + oc:// diagnostic shape extension; NEW PR-2 ships `oc://config/...` URI scheme extension; OC-4 + OC-7 + guardrails + policy + snap renumbered downstream. 7 upstream PRs total (was 6); still respects 10-PR cap and 2-PR-open culture. Workspace earns its keep THREE ways in cp-2.
  - [x] **Re-merged 2026-04-28** after lint surface absorbed into PR-1 made the original PR-2 oc://config split vestigial: PR-2 oc://config + doctor migration emit folded back into PR-1; downstream PRs renumbered up. 6 upstream PRs total. Workspace earns its keep FOUR ways in PR-1 (lossless emit + 13-code lint + URI vocabulary + cross-OS canonicalize).
  - [x] Plan Coverage Contract Test Tier targets (L0=24, L1=18, L2=8, L3=8) reflected in pulse TDD test sections — total 58 tests, plus 4 new scenarios for PR-1's lossless-conversion invariants and PR-2's URI scheme parser
  - [x] Acceptance fixture targets: 41 fixtures across 6 series (bot-preempt 13, governance 11, adapter 4, oc4 1, pkg-invariants 10, compliance 2)
  - [x] Pulse review panel R1 complete: architect, type-system, dragon, testing — all 4 verdicts APPROVE-WITH-WARNINGS (1 HC-BLOCK, 12 HC-WARN, 11 HC-NOTE)
  - [x] R1 fixes applied: A1 HC-BLOCK (pulse 06 PR-2→PR-2 rename); W1 (pulse 08 depends_on); W2 (pulse 11 depends_on); W6 (pulse 04 addresses_findings expanded); W8 (pulse 01 verification gate now greps for substantive content); W9 (pulse 11 scope-flip contingency matrix); W12 (pulse 12 fixture census assertions)
  - [x] R1 deferred to PR-DRAFT writing: W3, W4, W5, W7, W10, W11, N4–N7 (these belong in PR description language, not pulse content; addressed during PR-DRAFT skeleton authoring)
  - [x] PR-DRAFT skeletons written at `pr-drafts/PR-1.md` through `PR-6.md` — each carries: core-not-extension justification, before/after, what ships, test plan, bot-preempt checklist (filled out), metrics, migration/risk. Type-safety findings (W3, W4, W5) addressed: `DiagnosticLocation` discriminated union explicit in PR-1; `ParsedOcUri` discriminated kind explicit in PR-2; `sourcePluginId` lenient mode runtime-only doc + `getSourcePluginId()` accessor in PR-3. OC-7 spec choice (W7) addressed in PR-4. Three-ways pitch validated in PR-1 with explicit table (W10).
- [ ] **implementation** — open and shepherd 7 PRs at `github.com/openclaw/openclaw`
  - [x] cp-1: prep artifacts merged into our `docs/upstream/` (3 guides + spec amendment + lint code + scenarios Phase 6 landed 2026-04-28; R1 + R2 panels closed; wave.yaml `cp-1.status: completed`)
  - [ ] cp-2 (Wave A): PR-1 (workspace + lint + oc://config URI scheme + doctor migration emit) merged at openclaw/openclaw
  - [ ] cp-3 (Wave B): PR-2 (OC-4 stripFrontMatter) + PR-3 (guardrails) merged at openclaw/openclaw
  - [ ] cp-4 (Wave C): PR-4 (OC-7 merger) + PR-5 (policy) merged at openclaw/openclaw
  - [ ] cp-5 (Wave D): PR-6 (snap) merged at openclaw/openclaw + internal scope-flip + acceptance fixtures
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

## Branch / worktree note

As of 2026-04-28 this wave runs in its own worktree at `C:\src\claws-hapi`
on branch `feature/hapi-the-bringer`. Earlier cohabitation arrangement with
isis-the-weaver was reversed; merge ordering at delivery time is independent.

## Stage rewind 2026-04-28

Planning + scenarios re-opened in response to user direction: PR-1's
`@openclaw/workspace` package needs a substantive justification beyond
"AST + comment preservation." Added a sister plan
[`claws-workspace-lint`](../../plans/claws-workspace-lint.md) to ship a
**13-code JSONC config lint surface** in our claws-side
`@bic/openclaw-workspace`, validated against real `openclaw/openclaw`
config-failure issues (27 distinct issue numbers across 7 evidence-backed
bug classes — full table in the new plan). Detection-only in PR-1;
class-by-class fixers ship in follow-up PRs.

Catalog corrections applied 2026-04-28 after issue-tracker evidence pull:
- DROPPED `OC_CFG_BOM_PRESENT` (#14998 shows `$schema` editor convention is legitimate; can't treat metadata markers as defects).
- ADDED `OC_CFG_REDACTED_PLACEHOLDER` (ERROR) — 10 evidence issues, data-corruption class.
- ADDED `OC_CFG_LEGACY_FIELD` (WARN) — split from DEPRECATED; covers known-migrated-away fields with auto-migration available.
- ADDED `OC_CFG_PLUGIN_ID_COLLISION` (WARN) — #20478, #64946.
- ADDED `OC_CFG_SECRET_REF_AMBIGUOUS` (NOTE) — #62438 false-positive class.
- Net: 10 → 13 codes; lossless write path is now backed by 5 closeable bug-class arguments, not just "comments preserved."

Perf goal tightened from "≤10× stringify" to **"plain JSON parity-or-faster
via short-circuit; JSONC ≤2×; 50ms hard ceiling on 1MB."**

JSONC parser + emit + short-circuit substrate has landed at
`packages/openclaw-workspace/src/ast/jsonc/` (4 files, recursive-descent,
soft error recovery, leaf-mutation emit).

Lint module + 13 rules + DI'd `LintSchema` interface have landed at
`packages/openclaw-workspace/src/lint/` (3 engine files + 13 rule files +
shared walker). Every `LintFinding` carries an `ocUri` field
(`oc://config/<path>`) populated by the engine; the URI is also woven
into the human-readable message text so plain-log surfaces (CI, stderr)
carry the deep-linkable form. Companion `oc-config-uri.ts` proto
landed at `src/path/` — formal canonicalization of the scheme follows
in PR-2.

Subpath exports added: `./ast/jsonc`, `./lint`. Type-check + 5 smoke
tests green (redacted-placeholder catch, duplicate-key catch, trailing-
comma consistency, schema-rule gating, did-you-mean for unknown-field).

**Lint surface complete claws-side as of 2026-04-28.** All 13 rules
implemented + tested:
- Per-rule coverage: 26 tests (positive + negative for each code) — green
- Real-config issue replay: 12 fixtures + tests, one per evidence-cited
  issue (#14998, #20478, #22272, #31251, #48415, #59070, #60334, #61683,
  #62281, #62438, #65565, #72872) — green
- Smoke suite: 5 end-to-end tests (redacted-placeholder catch, duplicate-
  key catch, trailing-comma consistency, schema-rule gating, did-you-mean) — green
- **43 lint tests total, all passing**; `tsc --noEmit` clean

Companion artifacts:
- `tests/lint/fixtures/EVIDENCE.md` — frozen evidence snapshot (27
  distinct issue numbers cited across 7 evidence-backed bug classes)
- `tests/lint/fixtures/openclaw-test-schema.ts` — minimal openclaw-shaped
  `LintSchema` used by issue-replay tests; demonstrates the DI seam
- `scripts/regen-lint-evidence.ts` — advisory script (not CI-gated; per
  user direction 2026-04-28). Optional pre-PR-push: prints live
  open/closed counts per evidence class to stdout for the human to
  compare against `EVIDENCE.md` and decide whether to manually refresh.

**Spec amendment landed 2026-04-28 (v0.3 of `UG-upstream.amend.md`)**:
- §12 — Workspace lint diagnostic catalog: 13-code normative table with
  severity, source (AST/Schema/both), engine semantics, evidence base,
  oc:// URI weaving rules
- §13 — Class-by-class fixer roadmap: 13-row order table with risk +
  per-code fixer-PR contract (title prefix, scope cap, fix-then-re-lint
  validation); `OC_CFG_REDACTED_PLACEHOLDER` intentionally has no fixer
- ATOMS amendment extended with 7 new atoms (`atom:UG/lint-catalog`,
  `lint-severity`, `schema-DI`, `parse-emit-short-circuit`,
  `oc-config-uri`, `closeable-issue-evidence`, `fixer-roadmap`) — total
  16 atoms (3 retained + 6 from v0.2 + 7 from v0.3)

**Scenarios stage Phase 6 landed 2026-04-28**:
- 15 scenarios SC-37..SC-51 covering schema-DI semantics, oc:// URI
  population, 12 issue replays (one per evidence-cited issue), and the
  fixer-roadmap contract
- 16 findings F-102..F-117 catalogued (1 HC-BLOCK on F-113 redaction-
  corruption, 9 HC-WARN, 6 HC-NOTE); cumulative headline tally now
  **117 findings (6 HC-BLOCK / 39 HC-WARN / 72 HC-NOTE)** — recounted
  per cp-1 R1 panel finding (repo-steward B2 fix)
- Test tier delta updated: +4 L0 + +12 L1 + +1 L3 = +17 tests over Phase
  5; total scenarios target 87 tests (was 70). All Phase 6 tests
  already validated claws-side (43/43 green at pulse 5 close).
- Series-level fixture targets gained `lint-issue-replay: 12 fixtures`
  (already shipped at `packages/openclaw-workspace/tests/lint/fixtures/issues/`)

**cp-1 R1 panel + remediation closed 2026-04-28**:

R1 panel (6 reviewers: gateway-eng, compliance, release-eng, repo-steward,
architect, testing) at `panels/cp-1/R1-{role}.md` produced consolidated
verdict **REQUEST-CHANGES** (gated by repo-steward) with 7 HC-BLOCK,
30 HC-WARN, 30 HC-NOTE. All 7 BLOCKers remediated 2026-04-28 in the same
session:

- **B1** PR-numbering inconsistency → reconciled across 5 files (UG-upstream §8/§9, PROGRESS.md cp-2..cp-5 list, all 3 guides' frontmatters + body inline references). Ground truth = pulses + pr-drafts. Scheme at the time of B1: PR-1 workspace+lint, PR-2 oc://config URI, PR-3 OC-4 stripFrontMatter, PR-4 guardrails, PR-5 OC-7 merger, PR-6 policy, PR-7 snap. Subsequently re-merged 2026-04-28: oc://config URI folded back into PR-1; downstream renumbered up — final scheme PR-1, PR-2 OC-4, PR-3 guardrails, PR-4 OC-7, PR-5 policy, PR-6 snap.
- **B2** FINDINGS.md tally off by 50 → recounted via grep, headline now correctly **117 findings (6 HC-BLOCK / 39 HC-WARN / 72 HC-NOTE)** with methodology note.
- **B3** UG-upstream.amend.md v0.3 frontmatter half-extends v0.2 → title bumped to v0.3, Reader's guide rewritten to "what changed in v0.2 + v0.3" with 7 material changes enumerated.
- **B4** `regen-lint-evidence.ts` stub-as-CI-gate contradiction → downgraded to advisory script (per user direction "i dont think we need this"); plan + script TSDoc reflect the simpler contract.
- **B5** PR-1 false "regex zero hits" attestation → §3.2 carve-out semantics formalized (safe carve-outs vs NEVER-SAFE phrases); new `scripts/scan-pr-body.sh` enforces NEVER-SAFE detection while permitting backtick-wrapped anchor refs; PR-1 description re-attests in qualified form. Script tested against PR-1: exit 0.
- **B6** type-mismatch null-anything semantics + missing test → null-as-disable carve-out documented in TSDoc; `OC_CFG_MISSING_REQUIRED_FIELD` extended to fire on present-but-null at required keys (closes the silent gap); 2 new tests in rules-coverage.
- **B7** did-you-mean distance-3 cap untested → 2 boundary tests added (distance-3 accepts suggestion; distance-4 rejects, falls through to "gateway will reject" message).

Plus 3 cross-confirmed HC-WARNs:
- repo-steward W1 hook-count citation rot (36→35 in adapter-audits.md §2.1)
- repo-steward W4 + release-eng W1 index.ts JSDoc out of sync with exports
- release-eng W1 PR-1 "earns its keep" table missing `/lint` and `/ast/jsonc`

Final state: `tsc --noEmit` clean, **47/47 lint tests passing** (was 43, +4 new tests for B6/B7), `scan-pr-body.sh` exits 0 on PR-1. Ready for R2 re-pass before cp-2 opens.

**cp-1 prep guides landed 2026-04-28** at `docs/upstream/guides/`:
- `adapter-audits.md` (20.3KB) — emitted-plugin registration audit
  cites `hook-types.ts:936-942` (PluginHookRegistration shape) +
  Commander v14.0.3 CLI dispatcher; audit-stream wire-shape audit has
  field-by-field mapping table for CEF/NDJSON/syslog/SARIF (the F-38
  HC-BLOCK gate is now closed); runtime-gated enforcement model
  documented per F-45; re-audit cadence per §5.
- `bot-preempt-checklist.md` (11.5KB) — 10 operating constraints
  enumerated from UG-upstream §2.1; copy-paste per-PR checklist with
  pre-flight commands; reviewer-comment patterns table with anchor PRs;
  citation anchors back to spec.
- `post-merge-verification.md` (14.8KB) — runbook with `gh api` /
  `gh run list` commands; per-headline validators H1-H5; codemod
  validation gate (W1) for after PR-3 merges; failure modes; CHANGELOG
  record format.

All three pass their pulse-spec grep verification gates. F-38 HC-BLOCK
(adapter-audits §3 wire-shape) and F-45 HC-WARN (runtime-gated enforcement
docs) now have their apply targets in place — every prior-phase finding
that routed to "Adapter-audits guide" or "Bot-preempt-checklist" is
applied.

Next stages (resume now possible):
- cp-1 closure: spawn cp-1 review panel (gateway-eng, compliance,
  release-eng, repo-steward, architect, testing) at `panels/cp-1/` and
  collect verdicts before flipping cp-1 → completed in `wave.yaml`
- After cp-1 closes, cp-2 opens PR-1 (single upstream PR: workspace + lint
  + oc://config URI scheme + doctor migration emit) at
  `github.com/openclaw/openclaw`
