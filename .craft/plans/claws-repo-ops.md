---
slug: claws-repo-ops
preset: "claws"
plan: "3 headlines: port doc-validation system (surface-matrix, gap-detector, known-gaps) into packages/repo-ops/doc-validator/ so atoms have authoritative doc obligations; port domain.manifest + accept-test runner into packages/repo-ops/accept-runner/ so atoms have authoritative scenario obligations; publish atoms registry at docs/atoms.md as the oracle both gates validate against + add no-craftworks CI gate. All code bic/claws-native, zero craftworks mentions."
area: claws
status: Draft
phase: horus
atoms: [atom:claws-repo-boundary, atom:repo-ops, atom:doc-validation, atom:accept-test, atom:atoms-registry]
specs: [CL-13, CL-15]
---

# claws-repo-ops — Validation Gates, Atoms Registry, Scrubbing Protocol

## Why this plan exists

CP-2 `claws-repo-migration` lifts content out of craftworks into bic/claws. Lifting raw content isn't enough — the docs may be outdated, may reference craftworks internals, and the validation systems that kept them honest (doc-validation + accept-tests) live in craftworks and need to travel too. Without those systems on the bic/claws side, the repo starts out honest and drifts.

**This plan ports two gates + an oracle**:

1. **Doc-validation gate** — surface contracts + gap detector. Every atom declares the docs it needs (guide? deck? tutorial?); every doc declares the atoms it serves; gap detector fails the build if declarations and reality don't match.
2. **Accept-test gate** — domain manifests + scenario runner. Every atom declares a scenario domain; every scenario proves an atom's behaviour; accept-tests fail the build if a scenario lies.
3. **Atoms registry (`docs/atoms.md`)** — the single source of truth both gates consult. Adding an atom means declaring both obligations. No atom ships without both.

Plus a **no-craftworks enforcement** — the new repo cannot mention craftworks. CI grep fails on any occurrence in docs, code, config, or git metadata.

## Headlines

### H1 — Port doc-validation into `packages/repo-ops/doc-validator/`

The doc-validation system from craftworks (`craftworks-sdk/src/domains/docs/`) lifts into a dedicated `@bic/repo-ops-doc-validator` package in the new repo. All 7 core files port with adaptations:

- `surface-matrix.ts` — the 11×15 lookup table (11 surfaces × 3 visibilities × 5 docTypes → requirement levels). Surface names stay (guide/deck/tutorial/trace/spec/story/howto/example/research/index/root) because these are generic doc-system concepts.
- `doc-domain-schema.ts` — Zod schema for per-atom doc obligations. Adapts atom-layer identifiers to claws's atom taxonomy (see H3 atoms registry).
- `doc-manifest-schema.ts` — Zod schema for `docs/*/doc-manifest.yaml` — docs declare what they serve.
- `gap-detector.ts` — diffs required × declared; emits 15 gap types. Pure function, no I/O.
- `known-gaps-schema.ts` — schema for `docs/known-gaps.yaml` (acknowledged temporary gaps; each gap cites a plan that will close it).
- `doc-sync-integration.ts` — `assessConceptGuides()`, `assessPitchDecks()` — CLI-facing entry points called by `claws doctor`.
- `tests/*.unit.test.ts` — port + re-express test cases against bic/claws atoms.

**Validations**:
- Every claws atom in `docs/atoms.md` has a `surface-contract.yaml` in `docs/specs/contracts/{atom-id}.yaml`
- Every `docs/*/doc-manifest.yaml` references only atoms declared in `docs/atoms.md`
- `claws doctor --check docs` runs the gap detector and exits non-zero on unacknowledged gaps
- `.github/workflows/doc-validation.yml` runs `claws doctor --check docs` on every PR
- Unit tests cover: all 15 gap types, known-gap acceptance, surface-matrix lookup, manifest loader edge cases
- No `@craftworks/*` or `craftworks` string anywhere in ported files (CI-enforced)

### H2 — Port domain manifest + accept-test runner into `packages/repo-ops/accept-runner/`

The accept-test system from craftworks (`claws-sdk/tests/accept/`) lifts into `@bic/repo-ops-accept-runner`. Core files port with minor adaptation:

- `manifest-runner.ts` — generic dispatcher; `runFromManifest(path)` is domain-agnostic; no rewrite needed beyond import paths.
- `scenario-loader.ts` — discovers `{series}/{S##-name}/scenario.yaml`; Zod-validates.
- Runners port individually per claws's domains:
  - `compile-sim` — generator round-trip (full compile pipeline)
  - `harness-sim` — plan 4 harness fixture validation
  - `approval-sim` — plan 5 approval flow scenarios
  - `preset-sim` — plan 6 preset matrix scenarios
  - `pinch-sim` — rule-level checks (kept generic)
  - `emit-sim` — artifact validation (kept generic)
  - `security-sim` — A2A trust (kept generic; ties into guardrails)
  - Drop `fleet-sim` (stub in craftworks; redesign if needed in a later wave)
- `manifest.yaml` — top-level registry of series + runner assignments + min counts.
- `tests/accept/` entry points — one per series, 3-line import pattern (`runFromManifest(...)`).

**Adaption**: runner signatures align to claws's `scenario.yaml` permissive schema (`z.record(z.string(), z.unknown())` for `expect`); each runner owns its expect-block shape.

**Validations**:
- `manifest.yaml` lists every accept-test series with runner + min count
- Every `docs/atoms.md` atom has a matching scenario series in `tests/accept/scenarios/{series}/`
- Every series has ≥ its declared min count of scenarios
- `.github/workflows/accept-tests.yml` runs `vitest run --project accept` on every PR
- Unit tests cover: runFromManifest happy path, missing-series error, min-count enforcement, malformed scenario.yaml
- No `@craftworks/*` or `craftworks` string anywhere

### H3 — Atoms registry (`docs/atoms.md`) is the oracle both gates validate against

`docs/atoms.md` is the single source of truth. For each atom:

- **Identity**: `atom:{slug}` (e.g., `atom:guardrail-provider`)
- **Layer**: layer bucket (e.g., `governance`, `workspace`, `testing`, `cli`)
- **Visibility**: `public` | `internal` | `private`
- **DocType**: `concept` | `process` | `command` | `spec` | `domain`
- **Surface obligations** (per H1): declared in `docs/specs/contracts/{atom-id}.yaml` — which of 11 surfaces required
- **Scenario obligation** (per H2): declared by presence of `tests/accept/scenarios/{series}/` with series name matching atom slug

**Atoms tracked** (initial set, lifted + augmented):

| Atom | Layer | Visibility | DocType | Surfaces required | Scenario series |
|---|---|---|---|---|---|
| `atom:guardrail-provider` | governance | public | spec | guide + spec + howto | harness-sim + approval-sim |
| `atom:file-ingest-provider` | governance | public | spec | guide + spec | harness-sim + approval-sim |
| `atom:provider-lifecycle` | governance | public | spec | guide + spec | harness-sim |
| `atom:snap-registry` | workspace | public | spec | guide + spec + howto | preset-sim (lobster/aether) |
| `atom:policy-generator` | workspace | public | command | guide + spec + command | compile-sim + harness-sim |
| `atom:audit-chain` | governance | public | spec | guide + spec + howto | approval-sim |
| `atom:approval-handle` | governance | public | spec | guide + spec | approval-sim |
| `atom:canonicalizer` | workspace | public | spec | guide + spec | harness-sim |
| `atom:host-preset` | testing | internal | domain | guide + example | preset-sim |
| `atom:e2e-harness` | testing | internal | domain | guide + howto | harness-sim |
| `atom:scope-flip` | cli | public | command | guide + command | preset-sim (cross-preset) |
| `atom:repo-ops` | ops | internal | domain | guide | (self-hosted: doc-validator + accept-runner) |
| `atom:doc-validation` | ops | internal | domain | spec + howto | (covered by accept-runner unit tests) |
| `atom:accept-test` | ops | internal | domain | spec + howto | (covered by accept-runner unit tests) |
| `atom:atoms-registry` | ops | internal | domain | spec | (covered by doc-validator unit tests) |

Adding an atom means three edits in one PR: `docs/atoms.md` entry + `docs/specs/contracts/{atom-id}.yaml` + `tests/accept/scenarios/{series}/` directory with at least 1 scenario. The gates refuse to merge a PR that does less.

**Validations**:
- `docs/atoms.md` parses as structured markdown; each atom row has all 6 fields
- Every row's surface obligations appear in a contract YAML file
- Every row's scenario series (if non-empty) appears in `manifest.yaml`
- Unit test: construct a registry with missing surface contract → gap-detector flags; construct one with missing scenario series → accept-runner flags
- CI: `claws doctor --check atoms` runs both checks on every PR

## Scope

### Packages (bic/claws layout)

```
packages/
└── repo-ops/
    ├── doc-validator/
    │   ├── src/
    │   │   ├── index.ts                  (public API)
    │   │   ├── surface-matrix.ts
    │   │   ├── doc-domain-schema.ts
    │   │   ├── doc-manifest-schema.ts
    │   │   ├── known-gaps-schema.ts
    │   │   ├── gap-detector.ts
    │   │   └── doc-sync-integration.ts
    │   ├── test/
    │   │   └── unit/
    │   │       ├── surface-matrix.unit.test.ts
    │   │       ├── gap-detector.unit.test.ts
    │   │       └── ...
    │   └── package.json             (@bic/repo-ops-doc-validator)
    └── accept-runner/
        ├── src/
        │   ├── index.ts
        │   ├── manifest-runner.ts
        │   ├── scenario-loader.ts
        │   └── runners/
        │       ├── compile-sim.ts
        │       ├── harness-sim.ts
        │       ├── approval-sim.ts
        │       ├── preset-sim.ts
        │       ├── pinch-sim.ts
        │       ├── emit-sim.ts
        │       └── security-sim.ts
        ├── test/
        │   └── unit/
        │       ├── manifest-runner.unit.test.ts
        │       ├── scenario-loader.unit.test.ts
        │       └── runners/*.unit.test.ts
        └── package.json             (@bic/repo-ops-accept-runner)
```

### CLI surface

Extend the `claws` CLI with `doctor` subcommand's `--check` options:

```bash
claws doctor                        # all checks
claws doctor --check docs           # doc-validation gap detector
claws doctor --check accept         # accept-test manifest consistency
claws doctor --check atoms          # atoms registry oracle sanity
claws doctor --check no-craftworks  # grep-level enforcement
```

### Docs (bic/claws layout)

```
docs/
├── atoms.md                              # the registry
├── specs/
│   ├── contracts/                        # surface-contracts per atom
│   │   ├── guardrail-provider.yaml
│   │   ├── file-ingest-provider.yaml
│   │   └── ...
│   └── ...
├── doc-manifest.yaml                     # top-level manifest (root)
└── {domain}/doc-manifest.yaml            # per-subdir manifest
```

### Tests (bic/claws layout)

```
tests/
└── accept/
    ├── scenarios/
    │   ├── manifest.yaml                 # series registry
    │   └── {series}/
    │       └── S##-{name}/
    │           ├── scenario.yaml
    │           └── fixtures...
    └── entry-points/
        └── {series}.accept.test.ts       # 3-line imports
```

### CI

```
.github/workflows/
├── doc-validation.yml                    # runs `claws doctor --check docs` on PR
├── accept-tests.yml                      # runs `vitest run --project accept` on PR
├── atoms-oracle.yml                      # runs `claws doctor --check atoms` on PR
└── no-craftworks.yml                     # grep-level enforcement — fails on ANY match
```

### Doc-scrubbing protocol (applied during CP-2 migration + verified here)

Each migrated doc passes through a 5-step scrub before landing in bic/claws:

1. **Content rewrite** — `@craftworks/*` → `@bic/openclaw-*` or `@bic/repo-ops-*` depending on reference; "craftworks" as org → drop (repo is standalone); "craft-cli" / "compiler-sdk" / "agent-sdk" → drop or reword if the referenced thing exists on our side, delete if not.
2. **Terminology translation** — "atom:" references remain (atoms lifted); "phase:" → "checkpoint:" (claws calls them CPs); "wave:" references drop (craftworks ceremony).
3. **Currency check** — reader asks "does this describe a world that still exists?" Delete stale content; don't re-publish outdated guides.
4. **Audience check** — docs in bic/claws serve engineers working in bic/claws. Craftworks-internal ceremony (pulses, stages, flair) gets stripped.
5. **No-craftworks gate** — automated grep on the final output. Any "craftworks" or "@craftworks/" string fails the scrub.

A `scripts/scrub-doc.sh` helper automates steps 1-2 + 5; steps 3-4 are human judgement during CP-2 landing.

### Test tier targets

| Tier | Count | Focus |
|------|-------|-------|
| L0 unit | 48 | doc-validator: 12 (per-gap-type 15, surface-matrix 4 lookups, manifest loader 5, known-gaps loader 3, schema invalid inputs 5). accept-runner: 25 (manifest-runner 6, scenario-loader 5, per-runner happy + error × 7 = 14). atoms-oracle: 5 (registry parser, contract cross-ref, scenario cross-ref, missing entries, circular refs). scrubber: 6 (content rewrite rules, no-craftworks detection). |
| L1 integration | 14 | doc-validator + real docs tree (3), accept-runner + real scenarios (3), atoms-oracle end-to-end (2), scrubber + migration pipeline (3), no-craftworks CI dry-run (3). |
| L2 e2e | 6 | `claws doctor --check docs/accept/atoms/no-craftworks` full runs (4); migration-pipeline-applies-scrubber-to-fixture-doc (1); atoms-registry-round-trip (1). |

Per-file coverage floor: 95/90/95/95 (stmts/branches/funcs/lines).

## Coverage Contract

### Specs
- [ ] CL-13 (repo boundary) — extended with atoms registry as oracle for doc + accept gates. Draft at `.craft/waves/260416+horus-the-heir+claws-migration/specs/drafts/CL-13-amendment-repo-ops-oracle.md` (to be drafted in Stage 3 alongside other spec amendments).
- [ ] CL-15 (canonicalizer — new spec from sibling plan) — repo-ops leverages canonicalizer for contract YAML hashing + atoms-registry hashing (change detection).

### Concept guides (bic/claws docs/)
- [ ] `docs/concepts/atoms-registry.md` — what atoms are, how the registry works, how to add one
- [ ] `docs/concepts/doc-validation.md` — how the gap detector works, the 11 surfaces, known-gaps lifecycle
- [ ] `docs/concepts/accept-test-system.md` — manifest + runner + scenario anatomy
- [ ] `docs/contributing/adding-an-atom.md` — the three-file PR shape required to add an atom
- [ ] `docs/contributing/doc-scrub-checklist.md` — the 5-step protocol for migrated content

## Out of scope

- **Runtime code behaviour** — repo-ops is infrastructure; the 4 `@bic/openclaw-*` packages own runtime.
- **Wave/plan/pulse ceremony** — bic/claws uses standard GitHub PRs, not craftworks wave ceremony.
- **Fleet-sim runner** — stub in craftworks; redesign if needed post-Horus.
- **Auto-scrub of git history** — filter-repo `--replace-text` rewrites history during CP-2; in-Horus scrub is forward-only on present-day content. (Past commits stay rewritten via CP-2's filter-repo pass.)
- **Replacing the @bic/claws-rubric package** — it stays as-is if lifted; not a repo-ops concern.

## Dependencies

- Blocks on `claws-repo-migration` (CP-2) landing — repo-ops lives in bic/claws, not monorepo
- `claws-bic-operations` (CP-4) wires the CI workflows that activate these gates — repo-ops builds the gates; bic-operations turns them on
- `claws-e2e-sim-harness` (plan 4) may reference `packages/repo-ops/accept-runner` for fixture validation in its L1 tests
- Spec amendments (CL-13 amendment) complete in Stage 3 Horus — no deferrals

## Ordering note

This plan should land as **CP-3** in the Horus checkpoint sequence, between `claws-repo-migration` (CP-2) and `claws-bic-operations` (renumbered to CP-4). The sim plans shift to CP-5 / CP-6 / CP-7, with close at CP-8.
