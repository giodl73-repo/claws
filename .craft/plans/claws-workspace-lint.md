---
slug: claws-workspace-lint
preset: "claws"
plan: "Build a 13-code JSONC config lint surface in @bic/openclaw-workspace, validate against real openclaw config issues, prove the pattern claws-side before PR-1 upstreams it as part of @openclaw/workspace"
area: extraction
status: Active
wave: 260427+hapi-the-bringer+openclaw-upstream
specs: [UG-upstream]
created: 2026-04-28
stages:
  scenarios:
    reviews: [claws:gateway-eng, claws:claws-repo-steward]
  implementation:
    reviews: [claws:gateway-eng, claws:claws-release-eng]
  delivery:
    reviews: [claws:claws-release-eng, claws:claws-repo-steward]
---

# claws-workspace-lint — JSONC config lint surface in `@bic/openclaw-workspace`

<!--
  Sister plan to claws-openclaw-upstream. That plan ships @openclaw/workspace
  upstream as PR-1; this plan ships the LINT SURFACE that justifies the
  package's existence beyond "AST + comment preservation." Built claws-side
  first against real openclaw configs, then upstreamed via the same PR-1
  with citation evidence (specific openclaw/openclaw issue numbers).

  Direction confirmed 2026-04-28: workspace package needs a substantive
  reason to land in core; "lossless config writes" alone reads as plumbing.
  Adding a lint surface that closes 5+ live config-bug classes — backed
  by issue counts — turns PR-1 from plumbing into a feature ship.
-->

## Headlines

1. **H1: 13-code JSONC lint catalog landed in `@bic/openclaw-workspace/lint`** — every code traces to ≥1 real `openclaw/openclaw` issue (or to a structural defect class with named victims); cosmetic codes labeled NOTE; data-corruption codes labeled ERROR. Detection-only; fixers ship in follow-up PRs class-by-class.
   - Validation: `lint(parseJsonc(source), { schema })` returns typed `LintFinding[]` with code, severity, range, message, did-you-mean (where applicable)
   - Validation: each rule has at least one passing fixture from `tests/lint/fixtures/` reproducing a real openclaw config issue pattern
   - Validation: schema-aware rules accept a DI'd `LintSchema` interface; AST-only rules fire without it

2. **H2: JSONC parser + emit substrate ships at byte-identical round-trip** — hand-written recursive-descent parser; offset-bearing nodes; ordered comment array; soft error recovery (parse never throws on malformed input). Emit returns source verbatim for unmutated input; supports leaf-mutation while preserving surrounding bytes.
   - Validation: `emitJsonc(parseJsonc(s)) === s` for any clean source
   - Validation: `emitJsoncWithMutation` replaces only the targeted leaf range; surrounding bytes byte-identical
   - Validation: unterminated strings / block comments / unexpected chars produce diagnostics, not exceptions

3. **H3: Plain-JSON short-circuit lands at parity-or-faster than `JSON.stringify`** — when input has no comments, no BOM, no trailing commas, no parse diagnostics, `isPlainJson(doc)` returns true; the write path can fall through to native stringify for byte-identical output without walking the AST. The 99% common case never pays AST cost.
   - Validation: `isPlainJson` returns true for plain JSON test fixtures, false for any JSONC-only feature present
   - Validation: bench fixture confirms parity wall-clock vs `JSON.stringify(_, null, 2)` on 100KB plain JSON
   - Validation: AST path on 100KB JSONC stays within 2× stringify (down from prior 10× target)

4. **H4: Real-config validation harness against openclaw fixtures** — checked-in fixtures from `openclaw/openclaw` config-failure issues (#14998, #22272, #20478, #31251, #48415, #59070, #61683, #9627, #11355, #57567, #60334, #62438) reproduce the failure mode; lint catches it. Fixtures live as `tests/lint/fixtures/issue-{N}.jsonc` with expected findings.
   - Validation: each fixture's expected-findings list matches the real issue's failure mode
   - Validation: `npm test` exit-zero with all fixtures passing
   - Validation: a "what would have been caught" report tallies findings per fixture for use in PR-1 description

5. **H5: PR-1 description carries data-driven justification** — pitch leads with closeable-issue list (5+ real issues lint catches today), not "AST + comment preservation." Stats table cites issue counts. Each lint code labels its evidence issue numbers in the rule's TSDoc so reviewers can verify.
   - Validation: PR-1 description has a "Closes / addresses" section listing issues with brief description
   - Validation: each rule file has `@evidence` JSDoc tag with issue numbers
   - Validation: evidence regen script (`scripts/regen-lint-evidence.ts`) re-pulls issue stats so PR-1 numbers stay fresh up to push time

## Summary

PR-1 currently pitches `@openclaw/workspace` as a substrate for lossless `replaceConfigFile` round-trip — comments + ordering + indent preserved across `openclaw update` cycles. That's necessary but not sufficient justification. Reviewers (Greptile / Copilot / chatgpt-codex) reading the PR will ask "why core, not extension?" The strongest answer cites real bugs the package closes, with issue numbers.

This plan adds a 13-code JSONC config lint surface to the package, validated against real openclaw config-failure issues. The lint engine is schema-agnostic; schema-aware rules consume a DI'd `LintSchema` interface so the same engine works with our internal `OpenClawConfig` schema in tests and with upstream's Zod schema once PR-1 merges. Detection-only; fixers ship class-by-class in follow-up PRs.

Built in `C:\src\claws\packages\openclaw-workspace\` first. Once the lint catalog passes against fixtures, PR-1 (`pulses/04+pr1-openclaw-workspace.md`) updates its scope to include the lint surface. PR description leads with the closeable-issue list, citing data.

## Evidence base — `openclaw/openclaw` config-issue stats (pulled 2026-04-28)

| Lint code | Severity | Source | Evidence issues | Class |
|---|---|---|---|---|
| `OC_CFG_UNKNOWN_FIELD` | WARN | Schema + AST | #14998, #22272, #59070, #65565, #62455, #60334, #72527, #68664, #72872, #47002, #57270, #44943, #62182 (13 issues) | **Top hit — startup-blocking** |
| `OC_CFG_REDACTED_PLACEHOLDER` | ERROR | AST | #13495, #44357, #62281, #21573, #13210, #12078, #60917, #68423, #66832, #59945 (10 issues) | **Data corruption** |
| `OC_CFG_TRAILING_COMMA_INCONSISTENT` | NOTE | AST | #48415 (Control UI saves invalid JSON5) | Round-trip |
| `OC_CFG_DUPLICATE_KEY` | WARN | AST | #20478 (channels + bundled), #31251 (plugin clobbers `dmPolicy`) | Silent semantic drift |
| `OC_CFG_DEPRECATED_FIELD` | WARN | Schema | #57567 (v3.24→v3.28), #60334 (legacy keys rejected) | Upgrade-class |
| `OC_CFG_LEGACY_FIELD` | WARN | Schema | #60334, #57567, #62182 — known migrated-away with auto-migration | Upgrade-path |
| `OC_CFG_PLUGIN_ID_COLLISION` | WARN | Schema + AST | #20478, #64946 | Plugin-ecosystem |
| `OC_CFG_MISSING_REQUIRED_FIELD` | WARN | Schema | #59070, #61683 (gateway aborts startup) | Startup-blocking |
| `OC_CFG_TYPE_MISMATCH` | WARN | Schema + AST | General pattern, no single canonical issue | Validation |
| `OC_CFG_SECRET_REF_AMBIGUOUS` | NOTE | Schema + AST | #62438 (`secret_token_in_config` false positive on `${VAR}`) | False-positive class |
| `OC_CFG_TRAILING_WHITESPACE` | NOTE | AST | (cosmetic; no issue evidence) | Cosmetic |
| `OC_CFG_MIXED_INDENT` | NOTE | AST | (cosmetic; no issue evidence) | Cosmetic |
| `OC_CFG_DEAD_COMMENT` | NOTE | Schema + AST | (cosmetic; no issue evidence; useful post-migration) | Cosmetic |

**Aggregate evidence**: 27 distinct issue numbers across the seven evidence-backed codes. `Unrecognized-key`-class issues alone show 13 distinct bug reports — the dominant pattern. Redaction-placeholder corruption shows 10 — directly fixed by lossless write path; lint is the fail-safe. Searched `repo:openclaw/openclaw is:issue` with config-related keywords; full set captured at `tests/lint/fixtures/EVIDENCE.md` (built during scenarios stage).

`OC_CFG_BOM_PRESENT` was DROPPED from the proposed catalog after evidence review: #14998 shows editors *want* to attach `$schema` metadata for autocomplete; treating BOM-style markers as defects punishes a legitimate editor workflow. Workspace package will instead pass them through transparently and add an explicit allow-list for known-friendly markers.

## Coverage Contract

### Specs
- [ ] UG-upstream § 11.2 (NEW) — Workspace lint diagnostic catalog: 13-code enumeration with severity, source (AST / Schema / both), evidence-issue links, did-you-mean rules
- [ ] UG-upstream § 11.3 (NEW) — Class-by-class fixer roadmap: each lint code's future fixer-PR scope outlined as separate work item
- [ ] ATOMS amendment — atoms `lint-class`, `lint-severity`, `did-you-mean`, `parse-emit-short-circuit`, `schema-DI`, `closeable-issue-evidence`

### Concept Guides
- [ ] `docs/workspace-lint-catalog.md` — public API doc for the lint surface; consumers' guide for wiring `LintSchema` and rendering `LintFinding[]`
- [ ] `tests/lint/fixtures/EVIDENCE.md` — frozen snapshot of issue evidence pulled 2026-04-28; format `<issue-N>: <title> → <lint-code(s)> → <fixture-path>`

### Tooling
- [ ] `scripts/regen-lint-evidence.ts` — **advisory script (not CI-gated)**. Optional pre-PR-push refresh: re-pulls openclaw issue counts via `gh` CLI and prints a per-class summary so the author can decide whether to manually edit `EVIDENCE.md` and the PR description before pushing. Not wired into CI; not a release gate. The wave authors keep citation freshness as a manual discipline. Rationale: openclaw's tracker churns fast enough (~100 open config-titled at last pull) that any threshold we'd set for "drift fail" is arbitrary; the human author reading the diff before push is the right gate.

### Scenario Coverage
- [ ] `claws/lint/jsonc-roundtrip-byte-identical` — parse + emit on clean source = byte-identical
- [ ] `claws/lint/short-circuit-detection` — `isPlainJson` correctly classifies plain vs JSONC inputs
- [ ] `claws/lint/leaf-mutation-preserves-surroundings` — `emitJsoncWithMutation` only changes targeted byte range
- [ ] `claws/lint/issue-{N}-replay` — one scenario per evidence issue (~12 scenarios), each replays the failure pattern from a real config and asserts the lint catches it

### Test Tier targets

| Tier | Count | Series |
|---|---|---|
| L0 unit | 26 | parser (8), emit (3), short-circuit (2), per-rule unit (13) |
| L1 integration | 12 | rule + parser end-to-end against real config fixtures (12) |
| L2 e2e | 2 | claws-side `bic doctor`-equivalent surface invokes lint and renders findings |
| L3 acceptance | 3 | `lint` API stable shape; severity tier conformance; evidence-regen reproducibility |
| **Total** | **43** | |

### Acceptance criteria

The plan flips `Active → Implemented` when:

- All 13 rules implemented with at least one passing real-config fixture per evidence-backed rule
- JSONC parser passes round-trip suite on hand-crafted + real-world config fixtures
- Short-circuit detection passes binary classification suite
- `npm run build` green at workspace package level; `npm run test` exit-zero
- `tests/lint/fixtures/EVIDENCE.md` cites every issue number used in the catalog table; one fixture per cited issue
- PR-1 description (pulse 04 / pr-drafts/PR-1.md) updated to lead with the closeable-issue list
- Plan flip recorded in `PROGRESS.md`'s wave checklist

## Out of scope

- **Auto-fixers** — every lint code's fixer ships in a class-by-class follow-up PR after PR-1 merges. PR-1 detects only.
- **Workspace-file lint** (TOOLS.md, AGENTS.md, SOUL.md) — out of scope for this plan; the workspace-file URI vocabulary is in PR-1's `/path` subpath, but lint *for those files specifically* is a future plan (no pulse exists yet).
- **Runtime gateway integration** — the lint engine is library-shaped; wiring into `openclaw doctor` happens via PR-1's claws-side proof + the upstream PR's gateway integration, not in this plan.
- **`OC_CFG_BOM_PRESENT`** — dropped per evidence review (see Evidence base note).

## Risk

- **Schema availability**: 6 of 13 rules need a `LintSchema` source (the OpenClawConfig Zod schema). Today that schema lives upstream in openclaw-core, not in claws. Mitigation: claws-side test fixtures use a hand-authored `TestSchema` that mirrors a representative subset; PR-1 description documents the DI seam so upstream wiring is mechanical.
- **False-positive risk on real configs**: lint that wrongly fires on legitimate configs makes `doctor` annoying. Mitigation: every rule has a "known-good" fixture as well as a "known-failing" one; the known-good must produce zero findings.
- **Issue-evidence drift**: openclaw issue tracker moves fast (~100 OPEN config-titled issues at last pull). A cited issue could close, get re-titled, or split. Mitigation: `scripts/regen-lint-evidence.ts` re-pulls evidence at PR-1 push time so the description's numbers are current.
