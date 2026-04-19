---
slug: claws-pre-extraction-packaging
preset: "claws"
plan: "Consolidate code into 4 target packages (@bic/openclaw-{guardrails,workspace,policy,snap}), absorb the 6 openclaw-governance orphan packages + guardrail-spec, and remove every @craftworks/* runtime import. Output: claws-sdk/packages/ that filter-repo can lift into bic/claws as-is. Executes across Ra II CP-8..CP-12."
area: claws
status: Implemented
phase: horus
atoms: [atom:claws-repo-boundary, atom:claws-publish, atom:upstream-contrib, atom:claws-sdk, atom:claws-serve, atom:claws-lsp]
---

# claws Pre-Extraction Packaging — Consolidate, Absorb, Decouple

## Summary

Before Horus runs filter-repo, consolidate today's scattered source into four target packages with sub-path-based internal structure (`@bic/openclaw-{guardrails,workspace,policy,snap}`), absorb the 6 openclaw-governance orphan packages + the flat `spec/` package as subpaths of `guardrails`, and remove every `@craftworks/*` runtime import. Internal CLI binary, repo name, and role directory rename `claws` → `claws`; runtime packages stay under `@bic/openclaw-*` (rename to `@openclaw/*` once Peter greenlights the upstream scope). Plan executes across Ra II CP-8 through CP-12 (~19 pulses).

## Headlines

1. **H1: `claws-sdk/packages/` is the 4-package tree after CP-11.**
   `@bic/openclaw-guardrails` (interfaces + 6 subpaths), `@bic/openclaw-workspace` (path + ast + canonicalize subpaths), `@bic/openclaw-policy` (generator + helpers), `@bic/openclaw-snap` (registry + HTTP server). Filter-repo lifts this tree directly into `bic/claws/packages/`.
   - Validation: `ls claws-sdk/packages/` returns exactly 4 directories
   - Validation: each package has `package.json` declaring `@bic/openclaw-<name>` as its `"name"` field
   - Validation: each package's `src/index.ts` exports match the subpath inventory in §Authoritative 4-package inventory

2. **H2: Zero `@craftworks/*` runtime imports across every claws package.**
   Each target package's `package.json` declares only `@bic/*` and standard-library dependencies. `claws-sdk/` + `claws-serve/` source trees are swept (measured 22 files / 27 occurrences in claws-sdk; 37 files / 64 occurrences in claws-serve).
   - Validation: `grep -r '@craftworks/' claws-sdk/packages/` returns zero
   - Validation: `grep -r '@craftworks/' claws-serve/src/` returns zero on the routes that stay bic/claws-internal
   - Validation: CI guard script `scripts/ci/no-craftworks-runtime-imports.sh` fails the build on any regression

3. **H3: All 20 subcommand verbs (9 policy + 11 snap) work E2E against a fixture workspace via the internal `claws` binary.**
   - Validation: CP-12 fixture E2E test at `claws-sdk/tests/fixtures/canonical-oc-workspace/` exits 0 for every verb
   - Validation: `claws policy check/generate/watch/comply/test/sim/report/verify/diff` all produce expected output
   - Validation: `claws snap stage {on,off}/status/diff/discard/upload/list/checkout/promote/rollback/serve` all produce expected output

4. **H4: Downstream waves read from `bic/claws` only.**
   Wepwawet (openclaw-core upstream extraction) draws its PRs from `bic/claws`, not from craftworks. Dependency graph after Horus: `craftworks │ bic/claws → openclaw-core-fork`; the two sides of the `│` never cross.
   - Validation: `openclaw-upstream-extraction.md` source-inventory table references only `bic/claws/packages/*` paths
   - Validation: no Wepwawet plan references a `claws-sdk/` or `claws-serve/` or `@craftworks/*` path

## Coverage Contract

### Specs

- [ ] Main upstream spec (`docs/claws/proposals/openclaw-upstream/openclaw-upstream-spec.md`) consistent with 4-package shape
- [ ] Package specs: `guardrails.md`, `workspace.md`, `policy.md`, `snap.md` each describe the delivered package shape verbatim
- [ ] CLI specs: `policy-commands.md` (9 verbs), `snap-commands.md` (11 verbs) match the CP-12 E2E test assertions

### Concept Guides

- [ ] `docs/claws/concepts/pre-extraction-migration.md` — NEW — walks the filter-repo boundary: what stays craftworks-side, what lifts to bic/claws, what's deferred
- [ ] `docs/claws/migration/cli-carveout.md` — UPDATE — already exists; verify every row reflects the 4-package shape + `claws` binary name

### Scenario Coverage

- [ ] `docs/claws/proposals/openclaw-upstream/scenarios/scenario-guardrails-subpaths.md` (CP-9) — subpath tree-shake test
- [ ] `docs/claws/proposals/openclaw-upstream/scenarios/scenario-canonicalize-cross-consumer.md` (CP-9) — byte-parity across policy/snap/guardrails-audit
- [ ] `docs/claws/proposals/openclaw-upstream/scenarios/scenario-snap-promote-precondition.md` (CP-9) — promote + self-consistency check

### Test Tier Targets

| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | ≥60 | Each of 4 packages has unit tests for its subpath surfaces; canonicalize alone needs ≥20 RFC 8785 conformance fixtures |
| L1 integration | ≥20 | Peer-dep pairs (guardrails/audit ↔ workspace/canonicalize; policy ↔ workspace; snap ↔ workspace/canonicalize); CLI handlers against library surfaces |
| L2 e2e | ≥20 | The 20 CLI verbs E2E against the fixture workspace — one test per verb minimum |
| L3 acceptance | 1 | Full Horus-ready gate: package shape + @craftworks zero + CI guards all green |

## Execution phases (Ra II checkpoint mapping)

The plan executes across five Ra II checkpoints (CP-8 through CP-12):

| Phase | Ra CP | Name | What |
|-------|-------|------|------|
| 0 | CP-8 | Spec Polish | Proposal-doc consistency sweep across `docs/claws/proposals/openclaw-upstream/` + invented-contract audit. Cross-ref hygiene, subpath naming, stale-count fixes, deck regeneration. No source-tree changes. 2 pulses + gate (3 total). |
| 1 | CP-9 | Shape Scenarios | Three design-probe scenarios validating the 4-package shape before consolidation: `@openclaw/guardrails` subpath boundaries (tree-shake test), `@openclaw/workspace/canonicalize` cross-consumer byte-parity, `snap promote` precondition against the shared canonicalizer. Findings filed under `docs/claws/proposals/openclaw-upstream/scenarios/`. 3 pulses + gate. |
| 2 | CP-10 | Foundation Consolidation | Create `claws-sdk/packages/workspace/` (path + ast + canonicalize subpaths) and `claws-sdk/packages/guardrails/` (interfaces + 6 absorbed runtime subpaths). Atomic `@openclaw/*` → `@bic/openclaw-*` rename during orphan absorption. 3 pulses + gate. |
| 3 | CP-11 | Core Consolidation + @craftworks Decoupling + CLI Handlers | Create `claws-sdk/packages/policy/` and `claws-sdk/packages/snap/`. Create `cli-handlers/` subtrees in both packages (9 policy + 11 snap verbs). `@craftworks/*` runtime-import removal across claws-sdk (22 files / 27 occurrences) + claws-serve (37 files / 64 occurrences). Rename `claws-lsp` → `@bic/openclaw-lsp` (6-point cascade). 6 pulses + gate. |
| 4 | CP-12 | CLI + E2E + Horus-Ready | Emitter scope-prefix flag, CLI E2E against fixture (20 verbs green), coverage backfill + OC-POLICY-E → OC-POLICY-E commit-level sed. Final Ra close gate + Horus handoff gate. 3 pulses + gate. |

Total: ~19 pulses across 5 checkpoints. CP-8 and CP-9 are proposal-doc + validation work with no source-tree impact; CP-10 onward touches `claws-sdk/packages/` for the first time.

## Authoritative 4-package inventory

One row per target package. Every other count in this plan (and the upstream proposal) cites this table. Source column matters for filter-repo — anything not assembled as a single `claws-sdk/packages/<x>/` tree pre-Horus will land malformed.

| # | Target package (internal) | Upstream name (aspirational) | Subpaths | Source | Status |
|---|---------------------------|------------------------------|----------|--------|--------|
| 1 | `@bic/openclaw-guardrails` | `@openclaw/guardrails` | `(default)` = interfaces; `/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets` | `C:\src\openclaw-governance\spec\` (flat, contains the guardrail-spec package — `spec/src/`, `spec/package.json`) + `C:\src\openclaw-governance\packages\{approval-events,audit-chain,budget-meter,identity-bridge,secret-scanner,siem-emitter}\` (subpaths) | **exists as 6 orphan packages + 1 flat spec** — consolidate + rename during absorption |
| 2 | `@bic/openclaw-workspace` | `@openclaw/workspace` | `/path`, `/ast`, `/canonicalize` | `claws-sdk/src/workspace/` (for `/path`), `design/astro/grammars/openclaw-*.peg` (11 files, for `/ast`), new (for `/canonicalize`) | **partial** — path consolidates from claws-sdk; ast ships full library (PEG grammars + typed AST + parse/emit + grammars-as-strings exports, per user directive to revert to full-library shape); canonicalize is new code (~150 LOC RFC 8785 JCS) |
| 3 | `@bic/openclaw-policy` | `@openclaw/policy` | `(default)` + `/runtime` + `/types` + `cli-handlers/` (internal) | `claws-sdk/src/{compile,emit,compliance,governance}/` | **distributed — needs consolidation pulse** |
| 4 | `@bic/openclaw-snap` | `@openclaw/snap` | — + `cli-handlers/` (internal) | `claws-serve/` minus non-upstream routes — see route table below | **carve-out pulse** |

Total: **4 packages**. Naming posture: `@bic/openclaw-*` on GHE Packages until Peter greenlights `@openclaw/*`; one-pass rename recipe in `docs/SCOPE-HANDOVER.md`. Internal CLI binary is `claws` (was `claws`); internal repo post-Horus is `bic/claws`.

**Package consolidation vs the earlier 11-package shape**: the R1+R2 panel reviews flagged "11 packages is too many — platform disguised as a menu." The earlier 11-leaf list (each runtime primitive as its own `@openclaw/*` package) collapses into `guardrails` (6 subpaths) and `workspace` (3 subpaths). One install each. Each subpath stands alone semantically; consumers tree-shake what they don't use.

## Non-consolidated `claws-sdk/src/` subtrees — filter-repo disposition

`claws-sdk/src/` contains ~23 subdirectories beyond the 4 that consolidate into target packages (`compile`, `emit`, `compliance`, `governance`, `workspace`). Every subtree must have a named disposition so filter-repo knows what to lift and what to drop:

| Subtree | Disposition | Notes |
|---|---|---|
| `adapter/`, `config/`, `context/`, `util/` | **lift as claws-internal** | bic/claws product infrastructure — not upstreamable |
| `amend/`, `annotate/`, `init/`, `protect/`, `scaffold/` | **lift as claws-internal** | authoring affordances for the claws CLI — not upstreamable |
| `audit/` | **merge into packages/guardrails/audit/** | if it overlaps with the orphan audit-chain package; otherwise lift as claws-internal |
| `detect/`, `fleet/`, `ir/`, `optimize/` | **lift as claws-internal** | claws product features |
| `doctor/`, `upgrade/`, `watch/` | **merge into packages/policy/cli-handlers/** | these feed `claws doctor`, `claws upgrade`, `claws policy watch` — policy-adjacent |
| `keys/` | **lift as claws-internal** | HMAC key rotation is a claws ops concern |
| `maker/` | **lift as claws-internal** | scaffolding/make helpers |
| `publish/`, `snapshot/` | **merge into packages/snap/** | snapshot concerns consolidate into snap |
| `workspace-edit/` | **lift as claws-internal** | LSP-adjacent editing; stays with `@bic/openclaw-lsp` |
| `compiler/` (active 15-subdir tree, verified 2026-04-18) | **lift as claws-internal; one subdir merges into packages/policy** | `compiler/emit/` shadows `src/emit/` — P51 (policy-consolidation-1) merges `compiler/emit/` contents into `packages/policy/src/emit/` during consolidation. Remaining 14 subdirs (parser, optimizer, dialect/*, etc.) lift as `bic/claws`-internal — not upstreamable. |

CP-11 pulse 54 (sdk @craftworks removal) is ALSO responsible for this disposition map: every file it touches gets categorized under one of the buckets above. Completion criterion: zero `claws-sdk/src/` files without a named disposition.

## workspace-ast v1 posture (full library)

Per user directive (2026-04-18) reverting an earlier grammar-strings-only proposal: `@bic/openclaw-workspace/ast` ships as a **full library**, not grammar-strings-only. Shape:

- **PEG grammars** from `design/astro/grammars/openclaw-*.peg` (11 files on disk as of 2026-04-18; count verified by fresh grep). Exported both as compiled parsers and as raw string constants (`grammars: Record<WorkspaceFileKind, string>`).
- **Typed AST node definitions** — per-kind types for SOUL/USER/AGENTS/TOOLS/IDENTITY/SKILL/…
- **`parse(kind, content)`** — returns `{ ast, diagnostics }`; lossless round-trip guarantee for well-formed input.
- **`emit(kind, ast)`** — round-trips to byte-identical markdown for well-formed input; canonical shape for newly-authored AST.
- **`WorkspaceFileKind` enum** — owned here; `workspace/path` imports type-only.

PEG runtime choice is a P47 decision (peggy 3.x is the current assumption); decided concretely before pulse execution so emitted parser artifacts have provenance.

## claws-serve → snap route table

`claws-serve/src/routes/` has 30+ route files; snap ships 9 endpoints. Every route accounted for:

| claws-serve route | → snap | Notes |
|---|---|---|
| `snapshot.ts` (list/get/put/promote/rollback) | **kept** | core snap surface |
| `compile.ts` | **dropped (upstream); kept claws-internal** | governance generation stays local, not a snap endpoint |
| `classify.ts` | **dropped (upstream); kept claws-internal** | oc-path classifier endpoint |
| `diagnostics.ts`, `diff.ts` | **dropped (upstream); kept claws-internal** | LSP-adjacent + workspace-diff surfaces |
| `invalidate.ts` | **dropped (upstream); kept claws-internal** | cache invalidate |
| `chunks-*.ts` (6 files, verified 2026-04-18) | **dropped (upstream); kept claws-internal** | chunk editing surface — bic/claws product |
| `loop-*.ts`, `sessions.ts`, `session-config.ts` | **dropped (upstream); kept claws-internal** | agent-runtime concerns |
| `trust.ts`, `allow-all.ts` | **dropped (upstream); kept claws-internal** | trust model |
| `ir.ts`, `ir-resolution.ts` | **dropped (upstream); kept claws-internal** | policy-IR HTTP — generator-local upstream |
| `tensions.ts`, `governance.ts` | **dropped (upstream); kept claws-internal** | governance views |
| `batch.ts`, `workqueue.ts`, `schedule.ts` | **dropped (upstream); kept claws-internal** | batching |
| `patch-chunks.ts`, `oc-generic.ts`, `workspace-schema.ts` | **dropped (upstream); kept claws-internal** | editing + schema |
| `admin-reset.ts`, `error-sanitize.ts` | **dropped (upstream); kept claws-internal** | ops |
| `status.ts`, `health.ts`, `events.ts` | **merged into snap `/v1/healthz`** | subset goes upstream as liveness only |
| `/v1/resolve` (new composition of `oc://` URI in snap) | **kept — new** | composes `@bic/openclaw-workspace/path` server-side |

Net: ~8 route groups stay bic/claws-internal (hosted on a separate server process or the same binary with two servlets — final location decided in CP-11 pulse 53); 1 snapshot + 1 health + 1 resolve lift to `@bic/openclaw-snap`. Absorption pulse must produce **both** trees — the snap package AND the internal route retention. No over-lift (upstream shipping internal routes) and no under-lift (internal product losing its routes).

## Scope

### Consolidation — `@bic/openclaw-workspace`

- New package at `claws-sdk/packages/workspace/`
- Three subpaths:
  - `/path` — consolidates `claws-sdk/src/workspace/` (oc-path.ts, chunk-assembler, chunk-types, oc-files) + diagnose helper if exists; else stub as "TBD: diagnose — land in follow-up pulse"
  - `/ast` — full library: compiled PEG parsers + typed AST + `parse(kind, content)` + `emit(kind, ast)` + `grammars` string exports + `WorkspaceFileKind` enum. Backed by 11 `.peg` files under `design/astro/grammars/openclaw-*.peg`. PEG runtime: peggy 3.x (decided in P47).
  - `/canonicalize` — new ~150-LOC RFC 8785 JCS helper with byte-identical-across-platforms CI test

### Consolidation — `@bic/openclaw-guardrails`

- New package at `claws-sdk/packages/guardrails/`
- Default export: GuardrailProvider + FileIngestProvider interfaces absorbed from `C:\src\openclaw-governance\spec\` (the flat `spec/` directory IS the guardrail-spec package). Also absorbs `ShellExecProvider` reference impl that ships in that tree.
- Six subpaths absorbed from `C:\src\openclaw-governance\packages\<x>\`: `/audit` (audit-chain), `/approvals` (approval-events), `/budget` (budget-meter), `/identity` (identity-bridge), `/siem` (siem-emitter), `/secrets` (secret-scanner)
- Atomic rename all `@openclaw/*` package.json names and intra-tree imports → `@bic/openclaw-guardrails` (default or subpath-specific) during absorption
- After absorption, `C:\src\openclaw-governance\` is archivable

### Consolidation — `@bic/openclaw-policy`

- New package at `claws-sdk/packages/policy/` (single package, default export + `/runtime` + `/types` + internal `cli-handlers/`)
- Generator pipeline (parse → extract → analyze → emit) from `claws-sdk/src/compile/` + `claws-sdk/src/emit/`
- Operational helpers (YAML scenario runner, rubric evaluator, report renderer, mock gateway, audit verify) from `claws-sdk/src/compliance/` + `claws-sdk/src/governance/`
- PolicyIR types (in `/types` subpath for consumers that don't need the runtime)
- Runtime helpers (`asHookResult`, `issueHandle`, `propagatedSensitivity`, `matchDenyRules`) in `/runtime` subpath
- Canonicalize is NOT a subpath of policy — policy imports from `@bic/openclaw-workspace/canonicalize` at peer-dep level
- CLI handlers (internal subtree): `cli-handlers/{check,generate,watch,comply,test,sim,report,verify,diff}.ts` — 9 verbs

### Consolidation — `@bic/openclaw-snap`

- New package at `claws-sdk/packages/snap/` (peer of `policy`; zero runtime dep on `policy`)
- Pulls in `claws-serve/` HTTP server code per the route table above (kept + merged-healthz + new /v1/resolve); drops claws-internal routes
- HTTP-only surface (no library-first working-tree API — that was reverted from the spec; handlers talk to the server via HTTP, not named exports on the library)
- Pluggable storage (in-memory / filesystem reference impl / object-storage adapters)
- Auth context reader (hosts plug `@bic/openclaw-guardrails/identity` in front)
- Endpoints per upstream spec §4: `/v1/snapshots`, `/v1/snapshots/:id`, `/v1/snapshots/:id/promote`, `/v1/snapshots/:id/rollback`, `/v1/policy/current`, `/v1/resolve`, `/v1/snapshots/:id/resolve`, `/v1/healthz`
- Promotion precondition: `.openclaw/policy/policy-ir.json` must be present in the snapshot's files AND self-consistent per canonicalizer (returns 409 on failure); `promotion.requirePolicy: false` escape for pure-snap hosts
- CLI handlers (internal subtree): `cli-handlers/{stage-on,stage-off,status,diff-staged,discard-stage,upload,list,diff,checkout,promote,rollback,discard,serve}.ts` — 11 verbs (stage-on/stage-off land as one shared file)

### CLI surface — internal `claws` binary

The `claws` binary (bic/claws's internal OpenClaw-equivalent) hosts **two** flat subcommand groups: `policy` and `snap`. Handlers live alongside each package per §Consolidation above. When Wepwawet contributes upstream, the same library functions invoke from the `openclaw` CLI with `binaryName` parameterized for help text — no fork.

Global meta commands: `claws doctor` grows policy-specific checks (becomes `openclaw doctor` upstream); `claws upgrade` grows policy-artifact migration (becomes `openclaw upgrade` upstream). No `claws policy doctor` or `claws snap doctor` duplication.

### Decoupling — `@craftworks/*` removal

- For each claws subtree (`claws-sdk/src/`, `claws-serve/src/`):
  - Run `grep -r '@craftworks/' <path>` — collect every import
  - For each import, decide: inline (single-use), move to a claws-owned utility (shared), or drop (dead)
  - Update `package.json` dependencies + tsconfig paths
- CI guard: `scripts/ci/no-craftworks-runtime-imports.sh` — fails CI on any regression
- Sizing (measured 2026-04-18): claws-sdk = 22 files / 27 occurrences; claws-serve = 37 files / 64 occurrences

### `claws-lsp` rename → `@bic/openclaw-lsp`

Six touch-point cascade (CP-11 pulse 54 must enumerate all six):

1. `claws-lsp/package.json` — `"name": "@bic/openclaw-lsp"`
2. `claws-lsp/src/*` — any internal imports referencing the old name
3. `claws-sdk/package.json` devDependencies — rename the `@bic/openclaw-lsp` reference
4. `claws-sdk/tsconfig.json` + `vitest.config.ts` — path mappings if present
5. Any `docs/claws/` reference
6. LSP server config in editor-integration scripts (if tracked)

`@bic/openclaw-lsp` is **bic/claws-internal**. Not upstreamed. Scope-handover flag (`--scope @openclaw`) does NOT affect this package — it stays `@bic/openclaw-*` permanently.

## Deliverables

### Phase 0 — CP-8 Spec Polish (doc-only)

- [ ] `docs/claws/proposals/openclaw-upstream/` grep for bare old package names returns zero (all `@openclaw/{audit-chain,approval-events,...}` references use subpath form)
- [ ] Stale counts ("11 packages", "8 runtime libs") eliminated from brief + spec + deck
- [ ] Deck regenerated with `policy-dark` theme (`openclaw-upstream-deck.pptx` + `.pdf`)
- [ ] Invented-contract audit closed: each §1.4a / §1.4b / §1.4 / `/staging` / `promotion.requirePolicy` / gateway-TTL / per-session-sequence item is either (a) kept with consistent language across all files, or (b) reverted cleanly to original shape with the concern moved to §10 Open Items

### Phase 1 — CP-9 Shape Scenarios (design-probe)

- [ ] `scenario-guardrails-subpaths.md` — tree-shake test + subpath peer-dep verification; ≥5 findings
- [ ] `scenario-canonicalize-cross-consumer.md` — fixture set + byte-parity assertion across policy + snap + guardrails/audit; ≥5 findings
- [ ] `scenario-snap-promote-precondition.md` — end-to-end promote with self-consistency check + `promotion.requirePolicy: false` escape; ≥5 findings
- [ ] Every scenario-level Major finding has a named resolution path (answered or deferred to pre-CP-10 spec amendment)

### Phase 2 — CP-10 Foundation Consolidation

- [ ] `claws-sdk/packages/workspace/` exists with 3 subpaths (`/path`, `/ast`, `/canonicalize`), all tests green, 95/90/95/95 per-file coverage (or named DEFERRED.md entries)
- [ ] `claws-sdk/packages/guardrails/` exists with default export + 6 subpaths, all tests green, 95/90/95/95 per-file coverage
- [ ] All `@openclaw/*` orphan-package names renamed to `@bic/openclaw-*` atomically during absorption (verified by `grep -r '@openclaw/' claws-sdk/packages/` = 0)
- [ ] `C:\src\openclaw-governance\` tree archivable
- [ ] Canonicalize byte-parity CI green on Linux + Windows

### Phase 3 — CP-11 Core Consolidation + Decoupling + CLI Handlers

- [ ] `claws-sdk/packages/policy/` exists — generator half (`/src/compile`, `/src/emit`) + operational-helpers half (`/src/compliance`, `/src/governance`) consolidated; `/runtime`, `/types` subpaths exported; cli-handlers subtree with 9 verbs
- [ ] `claws-sdk/packages/snap/` exists — carved from `claws-serve/` per route table; `SnapshotStore` interface + `startServer` HTTP entry point exported; cli-handlers subtree with 11 verbs
- [ ] `@craftworks/*` runtime imports removed from `claws-sdk/src/` (22 files / 27 occurrences) and `claws-serve/src/` (37 files / 64 occurrences)
- [ ] CI guard script `scripts/ci/no-craftworks-runtime-imports.sh` lands and wires into CI
- [ ] 23 non-consolidated `claws-sdk/src/` subtrees each have a named disposition per §Non-consolidated subtrees table (lift / merge / drop)
- [ ] `claws-lsp` rename to `@bic/openclaw-lsp` complete across 6 touch points
- [ ] `claws-serve/` non-upstream routes land in their final bic/claws-internal location (decision documented in CP-11 pulse 53)

### Phase 4 — CP-12 CLI + E2E + Horus-Ready

- [ ] `claws policy generate --scope @openclaw` produces byte-different `gateway-plugin.ts` (imports only) vs default `@bic/openclaw` output; `policy-ir.json` + `audit-manifest.json` byte-identical across scopes
- [ ] All 9 `claws policy` verbs + all 11 `claws snap` verbs work end-to-end against `claws-sdk/tests/fixtures/canonical-oc-workspace/`
- [ ] `claws doctor` + `claws upgrade` extended with policy-aware checks (no `claws policy doctor` duplication)
- [ ] Coverage backfill: every 95/90/95/95 gap in DEFERRED.md from CP-10/CP-11 has a test pulse or a named deferral to Horus operations (no permanent grandfather clauses)
- [ ] Diagnostic-ID rename (OC-POLICY-E → OC-POLICY-E) executed as commit-level sed + commit BEFORE filter-repo
- [ ] `docs/claws/` references updated to consolidated packages
- [ ] Wepwawet extraction-plan (`openclaw-upstream-extraction.md`) source inventory points at `bic/claws/packages/*`, zero references to `claws-sdk/` or craftworks paths
- [ ] **Filter-repo lift manifest** produced — enumerates exactly which subtrees lift into `bic/claws` and which stay craftworks-side; becomes the input to Horus filter-repo run
- [ ] `DEFERRED.md` final review: every entry has a named owner + Horus-operations timeline, or it's resolved

## Out of scope

- Actual filter-repo run (that's `claws-repo-migration` plan's job, lives in the separate Horus wave)
- Publishing packages to GHE (Horus implementation stage)
- Writing new feature code — this plan is consolidation / absorption / decoupling of what exists
- openclaw-core integration PRs (Wepwawet's scope)
- MEMORY.md lifecycle design, first-class OC metadata implementations

## Dependencies / blocks

- Ra CP-7 must close clean (no active claws-sdk refactoring in flight that would conflict)
- `claws-bic-operations.md` plan takes this plan's output (4-package tree) as input — scope-handover, CODEOWNERS, CI matrix all size on the 4 packages this plan produces
- `openclaw-upstream-extraction.md` (Wepwawet) draws its source inventory from `bic/claws/packages/` post-Horus — CP-12 deliverable verifies that pointer is correct

## Success criteria

- `ls claws-sdk/packages/` returns exactly 4 entries: `guardrails`, `workspace`, `policy`, `snap`
- `grep -rnE "from ['\"]@craftworks\|^import.*@craftworks" claws-sdk/packages/ claws-serve/src/ --include='*.ts' --exclude='*.unit.test.ts'` returns zero across the routes that stay bic/claws-internal (runtime-import gate — narrowed from literal substring per P56 amendment; substring refs in CL-14 scanner sources, regression test fixtures, and doc attestations are exempt)
- `grep -rnE "from ['\"]@openclaw/\|^import.*@openclaw/" claws-sdk/packages/ --include='*.ts' --exclude='*.unit.test.ts'` returns zero (runtime-import gate — all renamed to `@bic/openclaw-*`; emitted-output assertions and doc references to `@openclaw/policy/runtime` per `policy.md` scopePrefix are exempt — see P56 amendment)
- `C:\src\openclaw-governance\` is archivable (absorbed + no longer authoritative)
- CP-12 gate passes: all 20 CLI verbs work E2E against the fixture; panel review on final state returns zero unresolved Majors
- Wepwawet extraction-plan's source-inventory table has every "target" row pointing to `bic/claws/packages/<name>/`, zero craftworks references

## Notes

- **Binary-name posture**: internal CLI is `claws` (renamed from `claws` during the 4-package collapse). When Wepwawet re-homes handlers upstream, `openclaw` takes the same handler library with `binaryName` parameterized for help text. Eventually `claws` either becomes a thin wrapper delegating to the installed `openclaw` binary, or retires entirely — decision deferred to post-Wepwawet.
- **Scope-prefix posture**: `@bic/openclaw-*` is the internal GHE Packages name. Upstream aspirational name is `@openclaw/*`. Emitter flag (`claws policy generate --scope @openclaw`) swaps the emitted `gateway-plugin.ts` import names for pre-submission builds. `@bic/openclaw-lsp` is internal-only and stays at `@bic/` permanently.
- **Package naming rationale**: 4-package shape (guardrails + workspace + policy + snap) replaces the earlier 11-leaf proposal. Subpath exports preserve tree-shaking while reducing install count. Consensus Major from R1+R2 panel reviews.
- **Non-consolidated subtrees**: CP-11 pulse 54 is responsible for assigning a disposition to every `claws-sdk/src/` subtree outside the 4 consolidation targets. See §Non-consolidated subtrees. Filter-repo fails loud if any subtree is un-categorized at CP-12 gate time.
