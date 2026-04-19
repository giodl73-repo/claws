---
slug: claws-repo-ops
preset: "claws"
plan: "3 headlines: port doc-validation system (surface-matrix, gap-detector, known-gaps) into devtools/repo-ops/doc-validator/ so atoms have authoritative doc obligations; port domain.manifest + accept-test runner into devtools/repo-ops/accept-runner/ so atoms have authoritative scenario obligations; publish atoms registry at docs/concepts/atoms-registry.md as the oracle both gates validate against + add no-craftworks CI gate with allowlist. All code bic/claws-native, zero craftworks mentions."
area: claws
status: Draft
phase: horus
revision: R1-findings-applied
atoms: [atom:claws-repo-boundary, atom:repo-ops, atom:doc-validation, atom:accept-test, atom:atoms-registry, atom:no-craftworks-gate, atom:doc-scrubber, atom:atom-scaffolder]
specs: [CL-13, CL-NEW-canonicalizer-byte-identical]
---

> **R1 revision note (2026-04-19)**: This plan was revised following R1 panel reviews (architect, conformance, operations — 30 findings across 15 themes A-O, consolidated at `.craft/waves/260416+horus-the-heir+claws-migration/panels/plan-repo-ops/R1-consolidated.md`). Major changes: (a) CL-13 rename amendment filed at `specs/drafts/CL-13-amendment-rename-to-claws.md` and cited in Coverage Contract; (b) 2-package split collapsed to 1 package with subpaths; (c) moved from `packages/` to `devtools/` (non-published, internal); (d) atom schema extended to preserve Authority/Mirrors/Reuses/Spec fields and adds `status` + `scenario-source` exemption + semantic series-ids decoupled from runner types; (e) no-craftworks gate given scope + allowlist; (f) scrubber ported to Node.js `scrub-doc.mjs`; (g) `claws doctor` composition semantics specified; (h) per-runner Zod schemas + scaffolder command + orphan-detection sweep added; (i) test tier expanded 48/14/6 → 76/21/8. CP renumbering cascade (Theme F) is flagged pending separate sweep by the team lead across REPLAN.md + plans 4/5/6.

# claws-repo-ops — Validation Gates, Atoms Registry, Scrubbing Protocol

## Why this plan exists

CP-2 `claws-repo-migration` lifts content out of craftworks into bic/claws. Lifting raw content isn't enough — the docs may be outdated, may reference craftworks internals, and the validation systems that kept them honest (doc-validation + accept-tests) live in craftworks and need to travel too. Without those systems on the bic/claws side, the repo starts out honest and drifts.

**This plan ports two gates + an oracle**:

1. **Doc-validation gate** — surface contracts + gap detector. Every atom declares the docs it needs (guide? deck? tutorial?); every doc declares the atoms it serves; gap detector fails the build if declarations and reality don't match.
2. **Accept-test gate** — domain manifests + scenario runner. Every atom declares a scenario series; every scenario proves an atom's behaviour; accept-tests fail the build if a scenario lies.
3. **Atoms registry (`docs/concepts/atoms-registry.md`)** — the single source of truth both gates consult. Adding an atom means declaring both obligations. No atom ships without both (or a documented exemption).

Plus a **no-craftworks enforcement** with scope + allowlist — the new repo cannot mention craftworks in active code; a short, CODEOWNERS-gated allowlist covers attribution/migration docs.

Plus a **code + doc scrubber** (`scrub-doc.mjs`) and an atom **scaffolder** (`claws make atom`) so the registry stays cheap to extend and migrations stay mechanical.

## Headlines

### H1 — Port doc-validation into `devtools/repo-ops/src/doc-validator/`

The doc-validation system from craftworks (`craftworks-sdk/src/domains/docs/`) lifts into the `/doc-validator` subpath of a single `@bic/repo-ops` package (see H4 for the single-package structure). All 7 core files port with adaptations:

- `surface-matrix.ts` — the 11-surface lookup table (surfaces × visibilities × docTypes → requirement levels). Surface names stay (guide/deck/tutorial/trace/spec/story/howto/example/research/index/root) because these are generic doc-system concepts.
- `doc-domain-schema.ts` — Zod schema for per-atom doc obligations. Adapts atom-layer identifiers to claws's extended atom taxonomy (see H3 atoms registry).
- `doc-manifest-schema.ts` — Zod schema for `docs/*/doc-manifest.yaml` — docs declare what they serve.
- `gap-detector.ts` — diffs required × declared; emits 15 gap types (each with `{code, severity, message, hint, docsLink}` for CI diagnostics). Pure function, no I/O.
- `known-gaps-schema.ts` — schema for `docs/known-gaps.yaml` (acknowledged temporary gaps; each gap cites a plan that will close it).
- `doc-sync-integration.ts` — `assessConceptGuides()`, `assessPitchDecks()` — CLI-facing entry points called by `claws doctor`.
- `tests/*.unit.test.ts` — port + re-express test cases against bic/claws atoms.

**Validations**:
- Every claws atom in `docs/concepts/atoms-registry.md` has a `surface-contract.yaml` in `docs/specs/contracts/{atom-id}.yaml`
- Every `docs/*/doc-manifest.yaml` references only atoms declared in `docs/concepts/atoms-registry.md`
- `claws doctor --check docs` runs the gap detector and exits non-zero on unacknowledged gaps; runtime budget < 3s on a ~200-doc tree (Windows dev machine)
- `.github/workflows/doc-validation.yml` runs `claws doctor --check docs` on every PR
- Unit tests cover: all 15 gap types, known-gap acceptance, surface-matrix lookup, manifest loader edge cases, hint-rendering correctness
- No `@craftworks/*` or bare `craftworks` string in active code (CI-enforced per H5; allowlist governs exceptions)

### H2 — Port domain manifest + accept-test runner into `devtools/repo-ops/src/accept-runner/`

The accept-test system from craftworks (`claws-sdk/tests/accept/`) lifts into the `/accept-runner` subpath of `@bic/repo-ops`. Core files port with minor adaptation:

- `manifest-runner.ts` — generic dispatcher; `runFromManifest(path)` is domain-agnostic; no rewrite needed beyond import paths.
- `scenario-loader.ts` — discovers `{series}/{S##-name}/scenario.yaml`; Zod-validates; Windows-rigor pass (long paths, case-sensitive matching, symlink rejection per Theme J).

**Runners (renamed to semantic, domain-grounded names — Theme E)**:
- `compile-sim` — generator round-trip (full compile pipeline) *(name retained — already semantic)*
- `e2e-loop-sim` — full decide/track/enforce+review loop (**was**: `harness-sim`; plan 4's harness is its primary consumer but the runner name names the behaviour)
- `approval-flow-sim` — approval-handle lifecycle + envelope stickiness (**was**: `approval-sim`)
- `host-shape-sim` — preset matrix across openclaw / lobster / aether host shapes (**was**: `preset-sim`)
- `pinch-sim` — rule-level checks *(name retained — already semantic)*
- `emit-sim` — artifact validation *(name retained — already semantic)*
- `security-sim` — A2A trust, injection defense, provenance (**name retained** — already semantic; ties into guardrails)
- **Drop `fleet-sim`** — pre-drop safety: `claws doctor --check atoms --dry-run-drop fleet-sim` runs first; asserts zero orphan scenarios + zero orphan atoms reference the runner before allowing the drop. Rationale: `fleet-sim` was a stub in craftworks intended to test multi-plugin fleet coordination; claws does not currently ship multi-plugin fleet composition (C60-C64 fleet atoms cover the concept at CLI level, not runner level). If a future wave adds fleet composition scenarios, a new semantic runner (e.g., `fleet-composition-sim`) lands then — there is nothing to carry forward. Pre-drop scan: `rg "runner: fleet-sim" design/claws/scenarios/` expected zero hits.

**Per-runner Zod schemas (Theme K)**: each runner ships a typed Zod schema for its `expect` block, validated at scenario-load time. Top-level `scenario.yaml` schema stays permissive (`z.record(z.string(), z.unknown())`) for forward-compat; a dispatcher selects the concrete schema by runner-name or by the series → runner mapping in `manifest.yaml`. Unknown keys fail with a named diagnostic; missing required keys fail with a named diagnostic. 7 small Zod schemas + one dispatcher, collectively contributing ~28 L0 tests (4 per runner minimum).

- `manifest.yaml` — top-level registry of **semantic series-ids** (Theme E) mapped to runners + min counts (see §Manifest.yaml shape below).
- `tests/accept/` entry points — one per series, 3-line import pattern (`runFromManifest(...)`).

**Validations**:
- `manifest.yaml` lists every accept-test series by semantic id with runner + min count
- Every `docs/concepts/atoms-registry.md` atom has a matching series-id (or an explicit `scenario-source: unit-test` exemption per Theme F)
- Every series has ≥ its declared min count of scenarios
- `.github/workflows/accept-tests.yml` runs `vitest run --project accept` on every PR
- Unit tests cover: runFromManifest happy path, missing-series error, min-count enforcement, malformed scenario.yaml, per-runner schema happy + error + schema-dispatch lookup
- Runtime budget < 5s on a ~350-scenario tree (Windows)
- No `@craftworks/*` or bare `craftworks` string in active code

### H3 — Atoms registry (`docs/concepts/atoms-registry.md`) is the oracle both gates validate against

`docs/concepts/atoms-registry.md` is the single source of truth. The location mirrors the sibling concept-guide pattern (plan 5's `docs/concepts/governance/...`, plan 4's `docs/testing/...`) — the registry is itself a concept guide that describes how atoms are authored and declared, with the canonical atom table as its payload. A one-paragraph "Registry location rationale" in the guide explains: the registry is read by `claws doctor`, tracked as authority, and serves as the narrative entry-point for contributors adding an atom.

#### Extended atom schema (Theme D)

The schema preserves all existing `design/claws/ATOMS.md` fields AND adds the obligation-tracking fields the oracle needs. Every atom row has:

**Required (preserved from existing claws ATOMS.md — authority / mirror invariants)**:
- `id` — `atom:{slug}` (e.g., `atom:guardrail-provider`)
- `slug` — the identifier suffix
- `name` — human-readable display name
- `authority` — where the canonical definition lives (one per atom; mirrors stay consistent)
- `mirrors` — list of mirror locations that must stay consistent with authority
- `reuses` — list of atoms this extends/reuses (cross-registry refs to `docs/ATOMS.md` A## atoms remain permitted during migration; post-migration they become `atom:{slug}` refs)
- `spec` — governing spec IDs (`CL-01` through `CL-13` and later; `CL-NEW-*` draft references permitted until promotion)

**Required (new for oracle)**:
- `layer` — layer bucket (e.g., `compiler`, `security`, `runtime`, `cli`, `governance`, `workspace`, `testing`, `ops`)
- `visibility` — `public | internal | private`
- `docType` — `concept | process | command | spec | domain`
- `status` — `draft | stable | deprecated` (**Theme D + architect F-09**; deprecated atoms list `replaces: atom:{new-slug}`; gates ignore deprecated atoms for coverage requirements but retain them in the registry)
- `surfaces` — list of required doc surfaces per the 11-surface matrix (declared in `docs/specs/contracts/{atom-id}.yaml`)
- `scenario` — discriminated union capturing the scenario obligation:
  - `{ source: 'series', series: string[] }` — atom's behaviour proven by accept-test series at `tests/accept/scenarios/{series-id}/`; the series-ids are semantic and decoupled from runner types (see Theme E)
  - `{ source: 'unit-test' }` — exemption (**Theme F / conformance F-06**): atom's behaviour is proven by the implementing package's unit tests rather than a top-level scenario series
  Zod shape: `z.discriminatedUnion('source', [z.object({source: z.literal('series'), series: z.array(z.string())}), z.object({source: z.literal('unit-test')})])`. The discriminated union eliminates the prior 10-required-always + 3-conditional field-counting ambiguity; there are exactly 13 fields, and `scenario` is one of them.

#### Atom port scope

- **Port all 82 existing atoms** from `design/claws/ATOMS.md` (C01-C121, minus any intentionally archived ones). Identity mapping preserved: every existing ID is retained; every existing slug is retained. Authority locations may shift from `design/claws/specs/CL-*.md` (craftworks-side) to `docs/specs/CL-*.md` (bic/claws-side) in lock-step with spec-file migration under CP-2, but the atom-slug never renames as part of the port.
- **Add 15 new atoms** sourced from the openclaw-upstream proposal (many already in ATOMS.md as C118-C121). The 11 new atoms NOT yet in ATOMS.md — `atom:file-ingest-provider`, `atom:provider-lifecycle`, `atom:snap-registry`, `atom:policy-generator`, `atom:approval-handle`, `atom:canonicalizer`, `atom:host-preset`, `atom:e2e-harness`, `atom:scope-flip`, `atom:no-craftworks-gate`, `atom:doc-scrubber`, `atom:atom-scaffolder` — are marked `status: draft` at port time and flip to `stable` at CP-5 deploy once their authority specs are signed.
- **0 dropped** — the port is additive; any existing atom whose spec was retired before Horus is ported with `status: deprecated` and its `replaces` field pointing at the successor (if any). Explicit deprecation preserves historical references in git log, older PRs, and mirrored documents.

A dedicated subsection of `docs/concepts/atoms-registry.md` documents the port: 82 existing atoms ported via identity mapping, 15 new atoms added (3 marked `source: openclaw-upstream`), 0 dropped, and the Authority/Mirrors consistency rule inherited from craftworks.

#### Sample atom rows (selected; full registry ports all 82 + 15)

| id | slug | name | layer | visibility | docType | status | surfaces | scenario-source | scenario-series |
|---|---|---|---|---|---|---|---|---|---|
| `atom:guardrail-provider` | `guardrail-provider` | GuardrailProvider | governance | public | spec | stable | guide, spec, howto | series | `series:governance-decision`, `series:tool-at-risk-approval` |
| `atom:file-ingest-provider` | `file-ingest-provider` | FileIngestProvider | governance | public | spec | draft | guide, spec | series | `series:file-ingest-review` |
| `atom:provider-lifecycle` | `provider-lifecycle` | ProviderLifecycle | governance | public | spec | draft | guide, spec | series | `series:provider-lifecycle-init` |
| `atom:snap-registry` | `snap-registry` | Snap Registry | workspace | public | spec | draft | guide, spec, howto | series | `series:preset-matrix` (host-shape-sim) |
| `atom:policy-generator` | `policy-generator` | Policy Generator | workspace | public | command | draft | guide, spec, command | series | `series:compile-roundtrip`, `series:governance-decision` |
| `atom:audit-chain` | `audit-chain` | Audit Chain (HMAC/Ed25519) | governance | public | spec | stable | guide, spec, howto | series | `series:security-provenance`, `series:tool-at-risk-approval` |
| `atom:approval-handle` | `approval-handle` | Approval Handle | governance | public | spec | draft | guide, spec | series | `series:tool-at-risk-approval`, `series:file-ingest-review` |
| `atom:canonicalizer` | `canonicalizer` | RFC 8785 JCS Canonicalizer | workspace | public | spec | draft | guide, spec | series | `series:compile-roundtrip` |
| `atom:host-preset` | `host-preset` | Host Preset (openclaw/lobster/aether) | testing | internal | domain | draft | guide, example | series | `series:preset-matrix`, `series:tenant-isolation` |
| `atom:e2e-harness` | `e2e-harness` | E2E Harness | testing | internal | domain | draft | guide, howto | series | `series:governance-decision` |
| `atom:scope-flip` | `scope-flip` | `--scope` Flag (openclaw publish rewrite) | cli | public | command | draft | guide, command | series | `series:preset-matrix` |
| `atom:repo-ops` | `repo-ops` | repo-ops Package (doc-validator + accept-runner + atoms-registry + scrubber) | ops | internal | domain | draft | guide | unit-test | — |
| `atom:doc-validation` | `doc-validation` | Doc-Validation Gate | ops | internal | domain | draft | spec, howto | unit-test | — |
| `atom:accept-test` | `accept-test` | Accept-Test Gate | ops | internal | domain | draft | spec, howto | unit-test | — |
| `atom:atoms-registry` | `atoms-registry` | Atoms Registry | ops | internal | domain | draft | spec | unit-test | — |
| `atom:no-craftworks-gate` | `no-craftworks-gate` | No-Craftworks Gate + Allowlist | ops | internal | domain | draft | spec, howto | unit-test | — |
| `atom:doc-scrubber` | `doc-scrubber` | Doc + Code Scrubber (scrub-doc.mjs) | ops | internal | domain | draft | spec, howto | unit-test | — |
| `atom:atom-scaffolder` | `atom-scaffolder` | Atom Scaffolder (`claws make atom`) | ops | internal | command | draft | guide, command | series | `series:atom-scaffold-roundtrip` |

(…plus the 82 existing claws atoms ported via identity mapping.)

The 6 ops atoms listed with `scenario-source: unit-test` are exempt from requiring a top-level scenario series; their behaviour is covered by the implementing package's L0 unit tests. The exemption is a first-class field in the schema — not a special-case in the validator — so exemption audit is mechanical.

Adding an atom means **three edits in one PR**: `docs/concepts/atoms-registry.md` entry + `docs/specs/contracts/{atom-id}.yaml` + (if `scenario-source: series`) `tests/accept/scenarios/{series-id}/` directory with at least 1 scenario. The gates refuse to merge a PR that does less. To make this cheap, the plan ships a scaffolder (see H6).

**Validations**:
- `docs/concepts/atoms-registry.md` parses as structured markdown; each atom row has all 13 fields; the `scenario` field is a discriminated union (`{source: 'series', series}` OR `{source: 'unit-test'}`) — no partial/half-set shapes accepted by the Zod validator
- Authority/mirrors consistency: when authority changes, `claws doctor --check atoms` flags any mirror with stale content (hash-based; via CL-NEW-canonicalizer for content-addressable comparison)
- Every row's surface obligations appear in a contract YAML file (registry → contract direction)
- **Bidirectional sweep (Theme M)**: every contract YAML has an atom-registry entry (contract → registry, orphan-contract detection); every scenario series directory has an atom-registry entry with matching series-id (orphan-scenario detection)
- **Pre-drop safety**: `claws doctor --check atoms --dry-run-drop <runner-or-series>` simulates the drop and reports any atoms that would be orphaned; exits non-zero if any
- Unit tests cover: registry parser happy/malformed, contract cross-ref, scenario cross-ref, orphan detection (both directions), `--dry-run-drop` reporter, status-field filter (deprecated atoms skipped for coverage)
- CI: `claws doctor --check atoms` runs on every PR; runtime budget < 1s

### H4 — Single `@bic/repo-ops` package at `devtools/repo-ops/` with subpaths (Themes B + C)

Repo-ops is test infrastructure for the repo, not a contribution-path product. It does NOT live under `packages/` (where `@bic/openclaw-*` + `@bic/claws-*` contribution + internal-compiler packages sit). It lives under `devtools/` as a single `@bic/repo-ops` package marked `"private": true` in `package.json`, excluded from publish workflows, and named to signal its internal role.

Package structure (mirrors the `@openclaw/guardrails` subpath pattern from proposal §1):

```
devtools/
└── repo-ops/
    ├── package.json                   (@bic/repo-ops, "private": true)
    ├── src/
    │   ├── index.ts                   (top-level barrel re-exporting subpath barrels)
    │   ├── doc-validator/
    │   │   ├── index.ts
    │   │   ├── surface-matrix.ts
    │   │   ├── doc-domain-schema.ts
    │   │   ├── doc-manifest-schema.ts
    │   │   ├── known-gaps-schema.ts
    │   │   ├── gap-detector.ts
    │   │   └── doc-sync-integration.ts
    │   ├── accept-runner/
    │   │   ├── index.ts
    │   │   ├── manifest-runner.ts
    │   │   ├── scenario-loader.ts
    │   │   ├── schemas/
    │   │   │   ├── compile-sim.schema.ts
    │   │   │   ├── e2e-loop-sim.schema.ts
    │   │   │   ├── approval-flow-sim.schema.ts
    │   │   │   ├── host-shape-sim.schema.ts
    │   │   │   ├── pinch-sim.schema.ts
    │   │   │   ├── emit-sim.schema.ts
    │   │   │   ├── security-sim.schema.ts
    │   │   │   └── dispatcher.ts
    │   │   └── runners/
    │   │       ├── compile-sim.ts
    │   │       ├── e2e-loop-sim.ts
    │   │       ├── approval-flow-sim.ts
    │   │       ├── host-shape-sim.ts
    │   │       ├── pinch-sim.ts
    │   │       ├── emit-sim.ts
    │   │       └── security-sim.ts
    │   ├── atoms-registry/
    │   │   ├── index.ts
    │   │   ├── registry-parser.ts    (reads docs/concepts/atoms-registry.md)
    │   │   ├── cross-ref.ts          (bidirectional sweep; orphan detection)
    │   │   └── dry-run-drop.ts       (pre-drop safety check)
    │   ├── scrubber/
    │   │   ├── index.ts
    │   │   ├── scrub-rules.ts        (regex table; shared with scripts/scrub-doc.mjs)
    │   │   ├── scrub-file.ts         (idempotent, CRLF-preserving, deterministic report)
    │   │   └── runtime-code-scrub.ts (handles .ts/.tsx/.mjs/.js — Theme H + architect F-06)
    │   └── no-craftworks/
    │       ├── index.ts
    │       ├── allowlist-schema.ts   (Zod for .no-craftworks-allowlist.yaml)
    │       ├── walker.ts             (Node.js regex walker via @nodelib/fs.walk — Theme J)
    │       └── report.ts             (scope + exit-code + fix-hint)
    ├── atom-templates/
    │   ├── atoms-registry-row.md.hbs
    │   ├── surface-contract.yaml.hbs
    │   └── scenario.yaml.hbs
    └── test/
        ├── unit/
        │   ├── doc-validator/*.unit.test.ts
        │   ├── accept-runner/
        │   │   ├── manifest-runner.unit.test.ts
        │   │   ├── scenario-loader.unit.test.ts
        │   │   ├── schemas/*.unit.test.ts
        │   │   └── runners/*.unit.test.ts
        │   ├── atoms-registry/*.unit.test.ts
        │   ├── scrubber/*.unit.test.ts
        │   └── no-craftworks/*.unit.test.ts
        ├── integration/
        │   ├── doc-validator.integration.test.ts
        │   ├── accept-runner.integration.test.ts
        │   ├── atoms-registry.integration.test.ts
        │   ├── scrubber.integration.test.ts
        │   ├── no-craftworks.integration.test.ts
        │   └── doctor-perCheck.integration.test.ts
        └── e2e/
            └── doctor-orchestration.e2e.test.ts
```

`@bic/repo-ops/*` subpath imports are the consumption surface (e.g., `import { gapDetector } from '@bic/repo-ops/doc-validator'`). The top-level `src/index.ts` re-exports the subpath barrels for callers that want `import { gapDetector } from '@bic/repo-ops'`. All subpaths share one TypeScript project, one Zod version, and one atoms-registry reader — the "atoms registry as oracle" invariant is load-bearing and requires co-location.

**Publish policy**: `"private": true`, no `prepublishOnly` hook. The `.github/workflows/publish.yml` already skips `devtools/**`. Added belt-and-braces: a dedicated check in the publish pipeline asserts `devtools/repo-ops/package.json` has `"private": true` — prevents accidental unflipping.

**Scope-flip exclusion**: Ra's `claws policy generate --scope=openclaw` flip logic walks `packages/openclaw-*/` only; `devtools/` is outside its scan. No special-case logic needed.

### H5 — `no-craftworks` CI gate with scope + allowlist (Theme G)

The gate's scope is explicit (not "any match anywhere"):

**In-scope files** (gate runs on these):
- `docs/**` (except `docs/contributing/migration.md` — see allowlist below)
- `packages/**/src/**`, `packages/**/test/**`
- `devtools/**/src/**`, `devtools/**/test/**`
- `scripts/**`
- `tests/**`
- `*.yaml`, `*.yml`, `*.json` (at any depth in-scope)
- `*.md` (at any depth in-scope)
- Active code file extensions: `.ts`, `.tsx`, `.mjs`, `.js`, `.cjs`, `.json`, `.yaml`, `.yml`, `.md`

**Out-of-scope** (gate does not scan):
- `.git/**` — immutable history; CP-2 filter-repo rewrites were the authoritative history pass
- `dist/**`, `build/**`, `node_modules/**` — generated / vendored
- Binary files (extension-based skip): `.pdf`, `.png`, `.jpg`, `.gif`, `.ico`, `.woff`, `.woff2`, `.ttf`, `.otf`
- `CHANGELOG.md` (see allowlist for carve-out rationale)

**Allowlist** (`.no-craftworks-allowlist.yaml` at repo root):

```yaml
version: 1
# Allowlist entries describe legitimate craftworks references that survive by necessity.
# Adding an entry requires CODEOWNERS approval by the `@bic/claws-release-eng` team.
# The atoms-registry oracle flags any entry that is stale (no longer needed).
entries:
  - path: MIGRATION.md
    pattern: 'craftworks'
    reason: |
      Root-level migration narrative explaining the lift from bic/claws
      to bic/claws. Required attribution; cannot be removed.
    reviewer: '@bic/claws-release-eng'
    expires: null  # permanent
  - path: LICENSE
    pattern: 'craftworks'
    reason: 'Copyright attribution if present in original MIT license.'
    reviewer: '@bic/claws-release-eng'
    expires: null
  - path: NOTICE
    pattern: 'craftworks'
    reason: 'Third-party attribution file if present.'
    reviewer: '@bic/claws-release-eng'
    expires: null
  - path: scripts/scrub-doc.mjs
    pattern: '@craftworks/|craftworks'
    reason: |
      Scrubber script MUST contain the regex it enforces. Excluding its own
      source is required for the gate to be self-consistent.
    reviewer: '@bic/claws-release-eng'
    expires: null
  - path: .no-craftworks-allowlist.yaml
    pattern: 'craftworks'
    reason: |
      Allowlist file itself names the pattern it allows. Self-reference exempt.
    reviewer: '@bic/claws-release-eng'
    expires: null
  - path: docs/contributing/migration.md
    pattern: 'craftworks'
    reason: |
      Contributor-facing narrative documenting the migration origin. Required
      for git archaeology / onboarding context.
    reviewer: '@bic/claws-release-eng'
    expires: null
  - path: devtools/repo-ops/src/**
    pattern: '@craftworks/|craftworks'
    reason: |
      Scrubber + no-craftworks gate source MUST name the regex it enforces.
      Scoped to devtools/repo-ops/src/** so it does not widen.
    reviewer: '@bic/claws-release-eng'
    expires: null
  - path: devtools/repo-ops/test/**
    pattern: '@craftworks/|craftworks'
    reason: |
      Gate tests use fixtures that contain the string to verify the gate fires.
    reviewer: '@bic/claws-release-eng'
    expires: null
```

**CODEOWNERS**: `.no-craftworks-allowlist.yaml` is owned by `@bic/claws-release-eng` (single team). Any edit requires team approval. `.github/CODEOWNERS` adds the entry as a boundary-critical path (matches CL-13 §9 2-maintainer rule for boundary-critical PRs).

**Gate enforcement (Node.js, not bash — Theme J)**: implemented in `devtools/repo-ops/src/no-craftworks/walker.ts` using `@nodelib/fs.walk` for cross-platform determinism. Windows grep under Git Bash is not relied upon. The walker:
1. Reads `.no-craftworks-allowlist.yaml` and compiles entries
2. Enumerates in-scope files (respecting scope rules above)
3. For each file, runs the regex scan
4. Filters out matches covered by an allowlist entry
5. Emits a structured report (`{file, line, match, allowlistHit: boolean, allowlistReason}`)

**`claws doctor --check no-craftworks`** invokes the walker with `--strict` mode (default): fails on any non-allowlisted match. A secondary mode `--stale-audit` (run monthly via cron, not on every PR) flags allowlist entries with zero active matches (stale entries) — these are removed in a release-eng PR.

**Exit codes**:
- 0: clean
- 2: non-allowlisted match found (distinct from generic gate failure per Theme I)

**Runtime budget**: < 2s on the full repo tree (Windows).

### H6 — `claws make atom <slug>` scaffolder (Theme L / ops F-06)

The 3-file PR tax (atoms-registry + surface-contract + scenario dir) is high friction. Scaffolder:

```bash
claws make atom <slug> \
  --layer <layer> \
  --visibility <public|internal|private> \
  --doc-type <concept|process|command|spec|domain> \
  --surfaces <comma-list> \
  --scenario-source <series|unit-test> \
  --scenario-series <series:semantic-id> \
  [--authority <path>] \
  [--status <draft|stable|deprecated>] \
  [--dry-run] \
  [--no-editor]
```

Writes 3 files from `devtools/repo-ops/atom-templates/`:
1. `docs/concepts/atoms-registry.md` — inserts a new row at the correct layer
2. `docs/specs/contracts/{slug}.yaml` — scaffolds surface-contract with narrative placeholders
3. (if `scenario-source: series`) `tests/accept/scenarios/{series-id}/S01-{slug}-happy-path/scenario.yaml` + `fixtures/` placeholder

If `--no-editor` is not set, opens all 3 files in an editor chosen by this Windows-aware cascade:
1. `$EDITOR` env var (POSIX convention; honored on Windows too)
2. `%VISUAL%` env var (Windows/legacy DOS convention)
3. `code` on PATH (VS Code — most likely for a Windows dev machine)
4. `Start-Process <file>` (Windows shell association — opens whatever the user set for `.md` / `.yaml`)
5. `notepad.exe` (last-resort fallback; mismatched for YAML but never misses)

`--dry-run` prints the unified diff without writing and skips the editor step entirely.

**Validation** (scaffolder's own L2 round-trip test — Theme L):
- Scaffold a test atom with all field combinations
- Run `claws doctor --check atoms` on the scaffolded output
- Assert clean pass
- Run `claws doctor --check atoms --dry-run-drop series:{scaffold-series}`; assert orphan detection reports the scaffolded atom

### H7 — Node.js doc + code scrubber (`scripts/scrub-doc.mjs` — Themes H + J / architect F-06 / ops F-02)

`scripts/scrub-doc.sh` from the current plan was a Windows portability landmine. The port is `scripts/scrub-doc.mjs` (Node.js ESM), invoked as `node scripts/scrub-doc.mjs <paths...>` or `node scripts/scrub-doc.mjs --stdin`. Implementation lives in `devtools/repo-ops/src/scrubber/` and is re-exported by the thin `scripts/scrub-doc.mjs` wrapper.

**Scrub rules** (shared `devtools/repo-ops/src/scrubber/scrub-rules.ts`):
1. **Import rewrite** (runtime code + YAML + JSON):
   - `@craftworks/openclaw-*` → `@bic/openclaw-*` (contributed-staged scope)
   - `@craftworks/claws-*` → `@bic/claws-*` (internal-only scope)
   - `@craftworks/*` (other) → flag for manual review (drop or reword)
2. **Terminology translation** (Markdown + narrative):
   - Bare `craftworks` as org-reference → drop ("the claws repo" → "the monorepo") unless inside an allowlist-protected file
   - `phase:` → `checkpoint:` (claws calls them CPs; only in narrative prose)
   - `wave:` → drop (craftworks ceremony; narrative only)
3. **Runtime-code scrub** (new — architect F-06): applies to `.ts`, `.tsx`, `.mjs`, `.js`, `.cjs` — not just `.md`. Rewrites imports, flags `// @craftworks/*` historical-lineage comments for manual conversion to audit-chain evidence notes.
4. **Currency + audience checks**: human-judgement during CP-2 landing (NOT automated; scrubber reports candidates only).
5. **No-craftworks gate** — the automated grep from H5 runs as the final scrub step.

**Scrubber properties**:
- **Idempotent**: running twice yields the same output (Theme H requirement)
- **CRLF-preserving**: detects original line ending per file and preserves on write (Windows rigor — Theme J)
- **BOM-preserving**: UTF-8 BOM markers survive
- **Deterministic report**: `{filesChanged, rulesMatched: {ruleId: count}, warnings: [{file, line, rule, suggestion}]}` emitted to stdout as JSON (or human-readable with `--format human`)

**L0 tests** (Theme H + ops F-09, 7 tests total):
- CRLF preservation on a CRLF-input file
- LF preservation on an LF-input file
- BOM preservation on a UTF-8-with-BOM file
- Idempotence (run twice, assert byte-equal output)
- Import rewrite correctness (`@craftworks/openclaw-*` → `@bic/openclaw-*`)
- Runtime-code scrub on `.ts` file (import + lineage-comment detection)
- Deterministic report shape (fixture-golden comparison)

### H8 — `claws doctor` multi-check composition (Theme I / ops F-03)

```bash
claws doctor                        # all checks, default order, collect-all
claws doctor --check docs           # single check
claws doctor --check accept
claws doctor --check atoms
claws doctor --check no-craftworks
claws doctor --fail-fast            # stop on first failure
claws doctor --format json          # machine-readable (default: human)
claws doctor --format human
claws doctor --dry-run-drop <runner-or-series>  # pre-drop safety (via --check atoms)
```

**Composition semantics (explicit)**:
- **Sequential order**: `atoms → docs → accept → no-craftworks` (atoms first: it's the oracle the others consult; if atoms malformed, downstream checks emit cascading false-failures that obscure the root cause)
- **Fail mode**: `collect-all` by default (run every check, report aggregate) — CI needs this; `--fail-fast` for local dev iteration
- **Exit codes**:
  - `0` — all checks pass
  - `1` — one or more gate failures (doc/accept/atom) — CI fails with the report
  - `2` — `no-craftworks` violation (distinct for SIEM triage per Theme I)
  - `3` — infrastructure error (missing config file, walker crash, file-system error) — CI triages as "retry or escalate", not "fix the gate output"
- **Concurrency**: sequential by default; `--parallel` is a later optimization gated on measured runtime
- **Output format**: `--format json` emits `{checks: [{id, status, findings: [...], runtimeMs}], aggregate: {status, runtimeMs}}`; `--format human` pretty-prints with fix-hints

**Runtime budgets** (ops F-04):
- `--check atoms`: < 1s
- `--check docs`: < 3s (on ~200-doc tree)
- `--check accept`: < 5s (on ~350-scenario tree)
- `--check no-craftworks`: < 2s
- Total `claws doctor` clean: < 15s on Windows, < 8s on Linux CI

Budgets are measured + logged per-check; regressions > 30% surface in CI as a warning (not failure).

**Content-addressable cache** at `.claws-cache/doctor/` (added to `.gitignore` by the CP-2 migration + explicit entry reinforcement in CP-4 `bic-operations`). Spec:

- **Keys**: hash-based, not mtime-based (Windows NTFS 1-second mtime resolution + Defender touching FILETIME on scan would produce stale cache hits). Cache key = `sha256(content bytes)` of the input set, per-check.
- **Eviction**: LRU, max 100 entries OR max 50 MB (whichever trips first); oldest-entry eviction emits `CACHE_EVICT_LRU` telemetry line.
- **Corruption recovery**: if a cache entry fails JSON-parse or hash-verify on read, the entry is deleted + the check runs fresh + emits `CACHE_CORRUPT_RECOVERED` telemetry.
- **Inspection**: `claws doctor --cache-stats` subcommand prints entry count / total bytes / oldest entry age / hit-rate-since-boot.
- **Bypass**: `claws doctor --no-cache` forces full run (useful for debugging regressions where cache may lie).

## Scope

### Packages (bic/claws layout, post-amendment)

```
bic/claws/                                (renamed from bic/claws per CL-13 amendment)
├── packages/                             (published product packages — NOT repo-ops)
│   ├── openclaw-workspace/               (@bic/openclaw-workspace — contributed)
│   ├── openclaw-guardrails/              (@bic/openclaw-guardrails — contributed)
│   ├── openclaw-policy/                  (@bic/openclaw-policy — contributed)
│   ├── openclaw-snap/                    (@bic/openclaw-snap — contributed)
│   ├── claws-compiler/                   (@bic/claws-sdk — internal)
│   ├── claws-cli/                        (@bic/claws-cli — binary: claws)
│   └── ...                               (other @bic/claws-* internal packages)
├── devtools/                             (non-published, internal)
│   └── repo-ops/                         (@bic/repo-ops — "private": true)
│       ├── src/
│       │   ├── doc-validator/
│       │   ├── accept-runner/
│       │   ├── atoms-registry/
│       │   ├── scrubber/
│       │   └── no-craftworks/
│       ├── atom-templates/
│       └── test/
├── scripts/
│   └── scrub-doc.mjs                     (Node.js; thin wrapper over devtools/repo-ops/src/scrubber)
└── .no-craftworks-allowlist.yaml         (CODEOWNERS-gated)
```

### CLI surface

Extend the `claws` CLI with `doctor` multi-check plus `make atom`:

```bash
claws doctor                                         # all checks (Theme I)
claws doctor --check <docs|accept|atoms|no-craftworks>
claws doctor --fail-fast | --format json | --format human
claws doctor --dry-run-drop <runner-or-series>       # pre-drop safety (Theme M)
claws make atom <slug> --layer <...> ...             # scaffolder (Theme L, H6)
```

### Docs (bic/claws layout — Theme F / conformance F-10)

```
docs/
├── concepts/
│   ├── atoms-registry.md                 # Theme E: the oracle + registry (not root-level)
│   ├── doc-validation.md                 # 15-gap-type reference + fix-hints
│   ├── accept-test-system.md             # manifest + runner + scenario anatomy
│   └── no-craftworks-gate.md             # scope, allowlist model, CODEOWNERS rules
├── contributing/
│   ├── adding-an-atom.md                 # 3-file PR shape + scaffolder walkthrough
│   ├── doc-scrub-checklist.md            # 5-step protocol (1-2+5 automated, 3-4 human)
│   ├── migration.md                      # post-migration contributor context (allowlist-protected)
│   └── windows-setup.md                  # LongPathsEnabled + case-sensitivity (Theme J)
├── specs/
│   ├── contracts/                        # surface-contracts per atom
│   │   ├── guardrail-provider.yaml
│   │   ├── file-ingest-provider.yaml
│   │   └── ...
│   └── ...                               # spec .md files (CL-01..CL-13)
├── doc-manifest.yaml                     # top-level manifest (root)
└── {domain}/doc-manifest.yaml            # per-subdir manifest
```

### Tests (bic/claws layout)

```
tests/
└── accept/
    ├── scenarios/
    │   ├── manifest.yaml                 # series-id registry (semantic ids — Theme E)
    │   └── {series-id}/
    │       └── S##-{name}/
    │           ├── scenario.yaml
    │           └── fixtures/
    └── entry-points/
        └── {series-id}.accept.test.ts    # 3-line imports
```

### `manifest.yaml` shape (Theme E — semantic series → runner mapping)

```yaml
version: 1
series:
  governance-decision:
    runner: e2e-loop-sim
    min: 4
    description: |
      Provider authorization flow: preAuthorize + postAudit + approval routing
      + audit cross-linking. Atoms: guardrail-provider, audit-chain.
  tool-at-risk-approval:
    runner: approval-flow-sim
    min: 5
    description: |
      Approval handle lifecycle for R-tier-elevated tool invocations.
      Atoms: approval-handle, audit-chain.
  file-ingest-review:
    runner: approval-flow-sim
    min: 3
    description: |
      File-ingest approval symmetric to tool-at-risk.
      Atoms: file-ingest-provider, approval-handle.
  provider-lifecycle-init:
    runner: e2e-loop-sim
    min: 2
    description: 'ProviderLifecycle.init + onSnapshotPromoted + onStageModeChanged.'
  preset-matrix:
    runner: host-shape-sim
    min: 3
    description: 'openclaw / lobster / aether host shapes run the same behavioural suite.'
  tenant-isolation:
    runner: host-shape-sim
    min: 3
    description: 'Per-tenant preset variant; cross-tenant isolation invariants.'
  compile-roundtrip:
    runner: compile-sim
    min: 4
    description: 'Generator emits → policy plugin consumes → byte-identical round-trip.'
  security-provenance:
    runner: security-sim
    min: 3
    description: 'A2A trust, injection defense, provenance-based R-tier escalation.'
  atom-scaffold-roundtrip:
    runner: compile-sim
    min: 1
    description: 'claws make atom → claws doctor --check atoms clean pass.'
```

Runner names (`e2e-loop-sim`, `approval-flow-sim`, `host-shape-sim`, `compile-sim`, `security-sim`, `pinch-sim`, `emit-sim`) are decoupled from series-ids. An atoms-registry entry names `series:governance-decision`; the `manifest.yaml` resolves which runner implements it. Runner renames/splits no longer cascade across the atoms registry.

### CI

```
.github/workflows/
├── doc-validation.yml                    # runs `claws doctor --check docs` on PR
├── accept-tests.yml                      # runs `vitest run --project accept` on PR
├── atoms-oracle.yml                      # runs `claws doctor --check atoms` on PR
├── no-craftworks.yml                     # runs `claws doctor --check no-craftworks` — strict + allowlist
└── doctor.yml                            # runs full `claws doctor` in collect-all mode (overnight + on merge)
```

Composition: `doctor.yml` is the top-level gate on merges; per-check workflows are fast PR-time gates.

**`doctor.yml` artifact persistence**: composite `doctor` run emits `--format json`; the workflow step uploads the JSON to `actions/upload-artifact@v4` (named `doctor-results-{sha}`, retention 90 days) AND writes a Markdown summary to `$GITHUB_STEP_SUMMARY` so the PR checks tab surfaces gap counts + severity without a download. External dashboards are out-of-scope for this plan; they consume the artifact API in a later ops wave.

### Doc + code scrubbing protocol (applied during CP-2 migration + verified here — Theme H + architect F-06)

Each migrated doc + code file passes through a 5-step scrub before landing in bic/claws:

1. **Content + import rewrite** — `@craftworks/openclaw-*` → `@bic/openclaw-*`; `@craftworks/claws-*` → `@bic/claws-*`; other `@craftworks/*` flagged; "craftworks" as org-reference dropped or allowlisted; `phase:` → `checkpoint:`; `wave:` dropped in narrative. Applies to BOTH docs (`.md`) AND runtime code (`.ts`, `.tsx`, `.mjs`, `.js`, `.cjs`).
2. **Terminology translation** — atom: references remain; phase/wave ceremony stripped; historical-lineage comments converted to audit-chain notes.
3. **Currency check** — reader asks "does this describe a world that still exists?" Delete stale content; don't re-publish outdated guides. (Human judgement.)
4. **Audience check** — docs in bic/claws serve engineers working in bic/claws. Craftworks-internal ceremony (pulses, stages, flair) gets stripped. (Human judgement.)
5. **No-craftworks gate** — automated walker on the final output. Any non-allowlisted match fails the scrub.

`scripts/scrub-doc.mjs` automates steps 1-2 + 5 (runtime code + docs + no-craftworks walker in one pass). Steps 3-4 are human judgement during CP-2 landing; scrubber reports candidates.

### Test tier targets (expanded — Theme O / conformance F-07 / ops F-09)

| Tier | Count | Focus |
|------|-------|-------|
| L0 unit | **76** (was 48) | doc-validator: 15 (15-gap-type, surface-matrix lookups 4, manifest loader 5, known-gaps loader 3, schema invalid inputs 5, hint-rendering 2). accept-runner: 42 (manifest-runner 6, scenario-loader 5, dispatcher 3, **per-runner × 7 = 6 each**: happy, missing-scenario, malformed-expect, runner-specific assertion fail, fixture-load error, cleanup-after-failure = 42 runner tests. atoms-oracle: 7 (parser, contract cross-ref, scenario cross-ref, orphan contract, orphan scenario, status-field filter, dry-run-drop). scrubber: 7 (CRLF, LF, BOM, idempotence, import-rewrite, runtime-code scrub, report shape). no-craftworks: 5 (in-scope/out-of-scope walker, allowlist apply, stale-entry detect, exit-code-2 assertion, Windows regex-walker parity). |
| L1 integration | **21** (was 14) | doc-validator + real docs tree (3), accept-runner + real scenarios (3), atoms-oracle end-to-end including bidirectional sweep (3), scrubber + migration pipeline with golden fixture (3), no-craftworks CI dry-run via `act` (3), **per-check doctor e2e (4)**, **scaffolder round-trip (2)**: `claws make atom` → `claws doctor --check atoms` clean pass + `--dry-run-drop` orphan report. |
| L2 e2e | **8** (was 6) | full `claws doctor` (all checks, collect-all) on clean repo (1), full `claws doctor` with injected atom missing contract (fails with hint) (1), `claws doctor` with injected orphan scenario (fails with hint) (1), migration-pipeline-applies-scrubber-to-fixture-doc (1), atoms-registry round-trip (1), **clean-repo-to-first-atom bootstrap via scaffolder (1)**, **orphan-detection after intentional atom removal (1)**, **CI-simulation e2e via `act` running doctor.yml end-to-end (1)**. |

Per-file coverage floor: 95/90/95/95 (stmts/branches/funcs/lines). Enforced per-package via `vitest.config.ts` in `devtools/repo-ops/`.

**Windows-specific coverage** (Theme J / ops F-05) — L0/L1 split:
- L0: Windows path normalization in scrubber (1), Windows long-path rejection/acceptance in scenario-loader (1), case-sensitive matching forcing on Windows (1)
- L1: Scenario-loader discovers a scenario with path > 200 chars and asserts it loads (1), `.no-craftworks-allowlist.yaml` with CRLF line endings parses correctly (1)

(Counted within the 76/21/8 totals above.)

**Residue-grep regex coverage** (Theme O / amendment-linked, 4 L0 tests):
- Canonical regex matches `@craftworks/` import
- Canonical regex does NOT match allowlist-protected file
- 3-pass form (source + cross-scope + allowlist) correctness per CL-13 amendment §Validation
- Evidence file schema round-trip

## Coverage Contract

### Specs
- [ ] **CL-13 amendment (rename to claws)** — draft at `.craft/waves/260416+horus-the-heir+claws-migration/specs/drafts/CL-13-amendment-rename-to-claws.md` (filed). Amendment covers: `bic/claws` → `bic/claws` repo remote; `claws` → `claws` CLI binary; scope decomposition into `@bic/openclaw-*` contributed (4 pkgs) + `@bic/claws-*` internal (8 pkgs); updated §Validation 3-pass residue-grep regex; §6.1 artifact-path renames. **IN SCOPE: Horus Stage 3** (NOT deferred per team-lead no-deferrals directive 2026-04-19).
- [ ] **CL-13 amendment (repo-ops oracle)** — separate draft to be filed in Stage 3 covering the "atoms-registry as oracle for doc + accept gates" invariants this plan introduces. Kept separate from the rename amendment so each has a single motivating concern (v1.6 → v1.7 = rename; v1.7 → v1.8 = oracle). Outline in companion amendment section of `CL-13-amendment-rename-to-claws.md`.
- [ ] **CL-NEW-canonicalizer-byte-identical** — consumed by repo-ops for content-addressable hashing of surface-contract YAMLs and atoms-registry mirror-consistency checks. Cited by draft filename (NOT `CL-15`) per Theme N / conformance F-04; spec-number promotion is the spec-number coordinator's job at CP-5 deploy.

### Concept guides (bic/claws docs/)
- [ ] `docs/concepts/atoms-registry.md` — the registry + how atoms are authored, extended schema documentation (13 fields including discriminated-union `scenario` field + `status` lifecycle), port manifest (82 + 15 + 0)
- [ ] `docs/concepts/doc-validation.md` — 15 gap types with one canonical example per type + the fix + `--fix=suggest` mode (ops F-10)
- [ ] `docs/concepts/accept-test-system.md` — manifest + runner + scenario anatomy, per-runner Zod schema reference, runtime budgets
- [ ] `docs/concepts/no-craftworks-gate.md` — scope (in/out), allowlist model, CODEOWNERS rules, exit-code-2 distinction, Windows walker notes
- [ ] `docs/contributing/adding-an-atom.md` — the 3-file PR shape + scaffolder walkthrough + exemption (`scenario-source: unit-test`) rules
- [ ] `docs/contributing/doc-scrub-checklist.md` — the 5-step protocol for migrated content (docs + runtime code)
- [ ] `docs/contributing/windows-setup.md` — `LongPathsEnabled` registry requirement, Node 18+, case-sensitive matching expectations (Theme J)
- [ ] `docs/contributing/migration.md` — post-migration contributor context (allowlist-protected file; may mention "craftworks" once per section for lineage)

## Dependencies

- **CL-13 amendment (rename)** — this plan authors the amendment and depends on its signing at CP-5 deploy
- **claws-repo-migration (CP-2)** — blocks on this plan's landing target (bic/claws); no dependency inversion
- **claws-bic-operations** (CI + CODEOWNERS) — wires the 5 workflows this plan creates (`doc-validation.yml`, `accept-tests.yml`, `atoms-oracle.yml`, `no-craftworks.yml`, `doctor.yml`) + the `@bic/claws-release-eng` CODEOWNERS entry for the allowlist. Bic-operations' Deliverables list must be amended to include these 5 workflows — flagged to team-lead for cascade sweep.
- **claws-e2e-sim-harness (plan 4)** — explicit boundary: plan 4 consumes `@bic/repo-ops/accept-runner` for its L1 fixture-loading tests only. Plan 4 does NOT re-implement `scenario-loader`; it imports the shared loader. Plan 4's harness-specific `fixture-copier.ts` handles harness-internal fixture shaping (not scenarios). Documented in Dependencies on both sides (architect F-10).
- **claws-sim-approval-flows (plan 5)** — consumes `approval-flow-sim` runner type from this plan; no code-level dependency (runners + atoms live in this plan).
- **claws-sim-host-presets (plan 6)** — consumes `host-shape-sim` runner type from this plan; same.
- **Schema-drift inventory (ops F-07)** — before port: every Zod schema lifted from craftworks has its type-dependencies inventoried in `devtools/repo-ops/src/doc-validator/LIFT-MANIFEST.md`. Port-time rule: if a ported schema references a type that doesn't exist in bic/claws yet, create it in `@bic/openclaw-*` first OR inline-define as a local interface. No `z.any()` or `as any` to unblock.
- **`LIFT-MANIFEST.md` shape + lifecycle** — the manifest is a structured Markdown file with one H2 section per lifted file. Each section lists: source path (craftworks-relative, historical), destination path (bic/claws-relative), external type dependencies (package + type name), ported status (`not-started` / `in-progress` / `complete`), ported-at timestamp, ported-by commit-sha. Ownership: `@bic/claws-release-eng` team CODEOWNERS. Lifecycle: file exists during CP-3 port work; at CP-8 wave-close it's either (a) archived to `docs/research/lift-manifest-archive.md` if history is useful, or (b) deleted if no residual value (decision made at close). Documented in `docs/concepts/doc-validation.md`.
- **Peer-version pinning**: `@bic/repo-ops` pins `@bic/openclaw-*` via `devDependencies` (repo-ops is internal-only, so these are not peer deps in the published sense). CI gates mismatch via a workflow step.

## Out of scope

- **Runtime code behaviour** — repo-ops is infrastructure; the 4 `@bic/openclaw-*` packages + 8 `@bic/claws-*` packages own runtime.
- **Wave/plan/pulse ceremony** — bic/claws uses standard GitHub PRs, not craftworks wave ceremony (allowlist-protected `migration.md` explains lineage).
- **Fleet-sim runner** — dropped in H2 with pre-drop safety scan; redesign if needed post-Horus via a new semantic runner.
- **Auto-scrub of git history** — filter-repo `--replace-text` during CP-2 handled history; in-Horus scrub is forward-only on present-day content.
- **Replacing the `@bic/claws-rubric` package** — stays as-is; not a repo-ops concern.
- **Parallelizing `claws doctor` checks** — later optimization gated on measured runtime; sequential-by-default documented in H8.
- **CL-15 reservation** — this plan does NOT claim a canonical CL number for the canonicalizer spec; citation is by draft filename. Spec-number coordinator reserves at CP-5.

## Ordering note (Theme F — CP renumbering cascade, APPLIED)

This plan inserts at **CP-3**, shifting downstream checkpoints by 1. The cascade was applied by the team-lead in a coordinated sweep (commit 480e34a0d):

- ✅ **REPLAN.md** — CP table updated 7 → 8 CPs, claws-repo-ops inserted as CP-3
- ✅ **Plan 4 (`claws-e2e-sim-harness`)** — all `CP-5 deploy` references rewritten to semantic `wave close / deploy stage`; zero hard-coded CP-N references remain
- ✅ **Plan 5 (`claws-sim-approval-flows`)** — same semantic rewrite applied
- ✅ **Plan 6 (`claws-sim-host-presets`)** — `CP-7` wave close → `CP-8`
- ✅ **`claws-bic-operations`** — Deliverables list extended with 5 new workflows (doc-validation, accept-tests, atoms-oracle, no-craftworks, doctor) + CODEOWNERS entry for `.no-craftworks-allowlist.yaml`
- ✅ **`wave.yaml`** — 8 CPs, claws-repo-ops at CP-3

**8-CP sequence (final)**: pre-extraction (CP-1) → repo-migration (CP-2) → **repo-ops (CP-3)** → bic-operations (CP-4) → e2e-sim-harness (CP-5) → sim-approval-flows (CP-6) → sim-host-presets (CP-7) → close (CP-8).

## Severity + traceability notes

Every finding in R1 (30 total: 10 BLOCK / 13 WARN / 7 NOTE) maps to a theme (A-O) in `R1-consolidated.md` and is addressed in this revision:

- **Theme A (wave-wide naming drift)**: CL-13 amendment drafted; Coverage Contract cites it; residue-grep regex + evidence paths updated in amendment.
- **Theme B (two packages vs one)**: Collapsed to 1 package with 5 subpaths (doc-validator / accept-runner / atoms-registry / scrubber / no-craftworks).
- **Theme C (packages/ vs devtools/)**: Moved to `devtools/repo-ops/` with `"private": true`; scope-flip exclusion documented.
- **Theme D (atom schema divergence)**: Extended schema preserves Authority/Mirrors/Reuses/Spec; adds Visibility/DocType/status/surfaces/scenario-source/scenario-series. Port scope: 82 existing + 15 new + 0 dropped.
- **Theme E (runner-type as series-id)**: Atoms declare semantic series-ids (`series:governance-decision`, etc.); manifest.yaml maps series → runner. Runner names made semantic (`e2e-loop-sim`, `approval-flow-sim`, `host-shape-sim`).
- **Theme F (CP renumbering cascade)**: Flagged to team-lead for separate sweep; this plan does NOT silently renumber.
- **Theme G (no-craftworks scope + allowlist)**: `.no-craftworks-allowlist.yaml` with entries, CODEOWNERS-gated; exit-code-2 distinction.
- **Theme H (Windows-safe scrubber)**: `scripts/scrub-doc.mjs` (Node.js) with CRLF/BOM preservation + idempotence + deterministic report + runtime-code pass.
- **Theme I (doctor composition)**: Explicit order, fail-mode, exit codes, runtime budgets, format flags.
- **Theme J (Windows-first rigor)**: Long paths, case-sensitive, symlinks rejected, `@nodelib/fs.walk` walker, antivirus-latency budget.
- **Theme K (per-runner Zod schemas)**: 7 typed schemas + dispatcher; top-level permissive; ~28 L0 tests.
- **Theme L (scaffolder)**: `claws make atom <slug>`; L2 round-trip test.
- **Theme M (bidirectional orphan detection)**: `--check atoms` sweeps both directions; `--dry-run-drop` pre-drop safety.
- **Theme N (CL-15 reservation)**: Cite by draft filename; no unilateral CL-number claim.
- **Theme O (test tier expansion)**: 48/14/6 → 76/21/8 with per-runner + per-check + scaffolder + CI-simulation breadth.

Plus the non-theme WARN/NOTE findings:
- Architect F-05 (fleet-sim drop): explicit rationale + pre-drop orphan scan in H2.
- Architect F-06 (runtime-code scrub): H7 covers `.ts/.tsx/.mjs/.js/.cjs` explicitly.
- Architect F-09 (atom status field): added to schema in H3; deprecated atoms skip coverage.
- Architect F-10 (plan 4 fixture boundary): Dependencies section declares plan 4 consumes `@bic/repo-ops/accept-runner` for L1 fixture loading only.
- Ops F-04 (runtime budgets): per-check budgets in H8.
- Ops F-07 (Zod schema drift): LIFT-MANIFEST.md + no-`any` rule in Dependencies.
- Ops F-10 (fix hints / `--fix=suggest`): 15 gap types get `{code, severity, message, hint, docsLink}` shape; `--fix=suggest` prints unified diff; `--fix=apply --yes` applies trivial fixes.
- Conformance F-06 (4 ops atoms without scenario series): exemption field `scenario-source: unit-test` (now 6 ops atoms exempt in H3).
- Conformance F-10 (`docs/atoms.md` location): moved to `docs/concepts/atoms-registry.md` with rationale paragraph.
