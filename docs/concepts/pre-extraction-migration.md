# Pre-Extraction Migration

<!-- atom:claws-repo-boundary -->

## The short version

Today, everything lives in one tree: `C:\src\craftworks\`. Post-Horus, that tree becomes two: `craftworks` keeps the wave system, the craft plugin, and the craftworks-branded SDKs; `bic/claws` carries the claws product -- the four consolidated OpenClaw packages, the `claws-sdk/src/` internals, `claws-serve`, `claws-lsp`, and the `claws-cli` surface. The Ra wave landed the inventory work: 4 packages consolidated, 39 subtrees classified, zero `@craftworks/*` runtime imports left in the lift targets. The Horus wave runs the actual filter-repo cut, using [`FILTER-REPO-MANIFEST.md`](../../../claws-sdk/FILTER-REPO-MANIFEST.md) as its input. This guide walks the boundary: every path has a named disposition, and this page is the reader-facing map.

---

## Why draw the line now

The extraction is not a cleanup pass. It exists because three forces converge at the Horus gate.

| Force | What it requires |
|---|---|
| **Upstream contribution path** | The four `@openclaw/*` packages (workspace, guardrails, policy, snap) must be consumable by any OpenClaw implementation -- not tied to `@craftworks/*` runtime imports. See [upstream-contrib.md](upstream-contrib.md). |
| **`@craftworks/*` decoupling** | The Ra wave's P54 sweep removed every runtime `@craftworks/*` import from `claws-sdk/src/`, `claws-sdk/packages/`, and the serve-layer routes that lift. `bic/claws` has no dependency on the claws repo at runtime. |
| **Pre-upstream consolidation** | Before Peter greenlights the `@openclaw/*` rename, the packages must already be 4-shaped and coherent. The Ra wave delivered that shape; Horus carries it across the repo boundary without re-shuffling. |

Drawing the line now (rather than after upstream contribution) means `bic/claws` ships as a self-contained product from day one. Wepwawet (openclaw-core upstream extraction) then draws its PRs from `bic/claws`, never from `craftworks`. Ra plan headline H4 is explicit: the two sides of that bar never cross.

---

## The lift line — three categories

Every path in the craftworks tree has one of five dispositions. The filter-repo run is **additive by pathspec**: only paths classified as `LIFT-AS-IS` or `LIFT-AS-CLAWS-INTERNAL` move into `bic/claws/`. Everything else stays in `craftworks`, gets merged into a consolidated package, or is explicitly deferred to a later wave.

| Disposition | Meaning | Count |
|---|---|---|
| **LIFT-AS-IS** | The 4 consolidated `@bic/openclaw-*` packages + `claws-lsp` (post-rename). Path is preserved; content is already Horus-ready. | 5 destinations |
| **LIFT-AS-CLAWS-INTERNAL** | Subtree stays in `claws-sdk/src/` under `bic/claws`. Not upstreamable to public OpenClaw packages, but load-bearing for the `bic/claws` product. | 39 subtrees (per `DISPOSITION.md` §P75) |
| **MERGE-INTO-PACKAGE** | Authoritative logic was already consumed into one of the 4 consolidated packages by a prior Ra pulse. Source tree remains as a transitional barrel until the Horus cutover flips external consumers onto the `@bic/openclaw-*` package names. | 1 (`compiler/emit/` via P51) |
| **STAYS-CRAFTWORKS** | Wave system, craftworks-branded SDKs and CLIs, craft plugin docs, research outputs. Not Horus-relevant. | See §"What stays craftworks-side" |
| **DEFERRED** | Scheduled for a later wave post-Horus. Not in the filter-repo run. | 4 product surfaces (see §"What's deferred") |
| **DROP** | Dead code with zero live consumers. | 0 (per `DISPOSITION.md` §P75 summary) |

The authoritative enumeration lives in [`claws-sdk/FILTER-REPO-MANIFEST.md`](../../../claws-sdk/FILTER-REPO-MANIFEST.md) (refs + path-spec list + commit-rewrite rules) and [`claws-sdk/DISPOSITION.md`](../../../claws-sdk/DISPOSITION.md) (per-file matrix for the `claws-sdk/src/` subtrees). This page summarizes both; the manifest is the source of truth the Horus wave consumes.

---

## What lifts as-is (4 packages + 1 peer)

The core runtime -- the output of Ra's CP-10 and CP-11 consolidation -- carries under `packages/` in `bic/claws`. Per `FILTER-REPO-MANIFEST.md` §2 "Core runtime":

| Source path (craftworks) | Target path (bic/claws) | Delivered in | Why it lifts as-is |
|---|---|---|---|
| `claws-sdk/packages/workspace/**` | `packages/workspace/**` | CP-10 | Path + AST + canonicalize subpaths. Upstream-shaped; zero `@craftworks/*` imports; subpath boundary clean (CP-9 scenario `scenario-guardrails-subpaths` validated tree-shake). |
| `claws-sdk/packages/guardrails/**` | `packages/guardrails/**` | CP-10 | Absorbs the 6 orphan openclaw-governance packages + flat `spec/` package as subpaths (`/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets`). Rename `@openclaw/*` → `@bic/openclaw-*` already applied. |
| `claws-sdk/packages/policy/**` | `packages/policy/**` | CP-11 P51/P52 | Consolidates `claws-sdk/src/{compile,emit,compliance,governance}/` authoritative logic + 9-verb `cli-handlers/` (check/generate/watch/comply/test/sim/report/verify/diff). |
| `claws-sdk/packages/snap/**` | `packages/snap/**` | CP-11 P53 | Carves out `claws-serve/` upstream routes + auto-snapshot primitives from `workspace/`. 11-verb `cli-handlers/` (stage on/off, status, diff, discard, upload, list, checkout, promote, rollback, serve). |
| `claws-lsp/**` | `claws-lsp/**` | CP-11 P76 (rename) | Renamed to `@bic/openclaw-lsp` via the 6-point cascade. Tests + build config lift intact. |

There is also one already-published package outside `claws-sdk/packages/`:

| Source path (craftworks) | Target path (bic/claws) |
|---|---|
| `packages/@bic/claws-sdk/**` | `packages/@bic/claws-sdk/**` |

Per `FILTER-REPO-MANIFEST.md` §2 "Published OpenClaw-upstream packages".

---

## What lifts as claws-internal

The `claws-sdk/src/` tree contains subtrees that are essential to the `bic/claws` product but are not upstreamable OpenClaw primitives. They are too coupled to `bic/claws`-specific CLI / LSP / serve consumers, or too product-specific (fleet broadcast, kill-switch, governance-key lifecycle) to belong in a neutral OpenClaw package. These lift under their current paths into `bic/claws/claws-sdk/src/**`.

The authoritative count per `DISPOSITION.md` §P75 summary is **39 dispositions**: 21 R1-identified subtrees + 3 top-level `.ts` files + 1 steward addition (`types/`) + 14 `compiler/` subdirs.

### R1-identified subtrees (21)

| # | Subtree | Why it's claws-internal (per `DISPOSITION.md`) |
|---|---|---|
| 1 | `adapter/` | `GovernanceHost` + hook-registry bridge — policy already re-exports what it needs. |
| 2 | `amend/` | `claws amend` governed-amendment feature — product-specific authoring affordance. |
| 3 | `annotate/` | Heuristic annotation engine for `claws annotate` — skill-metadata inference, not shared. |
| 4 | `audit/` | HMAC-SHA256 chaining + WAL + witness — distinct data model from `packages/guardrails/src/audit/`. |
| 5 | `config/` | `ClawsConfig` Zod schema + loader + bypass — product-specific configuration. |
| 6 | `context/` | Content-addressed DAG for fleet structural sharing + PRESS compression. |
| 7 | `detect/` | Platform marker detection (OpenClaw, Cursor, Claude Code, Copilot, Bedrock, LangGraph, CrewAI). |
| 8 | `doctor/` | `claws doctor` — workspace health diagnostics, not policy-family CLI. |
| 9 | `fleet/` | Fleet scan/classify/drift/baseline/broadcast/kill — product-flagship, `bic/claws`-specific. |
| 10 | `init/` | `claws init` orchestrator + templates — workspace bootstrap. |
| 11 | `ir/` | `GovernanceIR` — foundational product IR shape; not yet defined outside `@bic/claws`. |
| 12 | `keys/` | Governance key lifecycle (generate/store/register/rotate/revoke/schedule). |
| 13 | `maker/` | Skill scaffolding + annotation + import engine for `claws maker`. |
| 14 | `optimize/` | Governance optimization passes (dead-code elimination, pinch profiles, DataFrame materialization). |
| 15 | `protect/` | PROTECT command group — budget + secrets vault + identity + alerts + limits. |
| 16 | `publish/` | Publish pipeline targeting the `@bic/claws` manifest registry. |
| 17 | `scaffold/` | Skill scaffolding primitives (skill-kit dependency check, risk caps, template generation). |
| 18 | `snapshot/` | `claws snap` CLI for governance bundle promotion — distinct from `packages/snap/` (HTTP server). |
| 19 | `util/` | Tiny shared utility barrel (path/normalize/levenshtein/text/fs/canonical-json). |
| 20 | `watch/` | File-watching infrastructure for `claws watch` (debouncer + auto-recompile). |
| 21 | `workspace-edit/` | Lossless structured edits through the CAP settings UI write path — coupled to `bic/claws` file layout. |

### Top-level `.ts` files (3) and `types/` (1)

| File/subtree | Role |
|---|---|
| `src/compilation-host.ts` | `ICompilationHost` interface — implemented by `claws-lsp` and `claws-serve`. |
| `src/version.ts` | `CLAWS_COMPILER_VERSION` constant. |
| `src/index.ts` | Root barrel; re-exports the subpaths advertised in `package.json:exports`. |
| `src/types/` | Sidecar layout + platform + loss-matrix types — `@bic/claws-sdk/types` subpath. |

### The `compiler/` active tree (14 lift + 1 merge)

Per `DISPOSITION.md` "The `compiler/` active tree (steward M2, 15 subdirs)":

| # | Subtree | Disposition |
|---|---|---|
| C1 | `compiler/audit/` | lift-as-claws-internal |
| C2 | `compiler/cache/` | lift-as-claws-internal |
| C3 | `compiler/crypto/` | lift-as-claws-internal |
| C4 | `compiler/emit/` | **merge-into-package** (policy; P51 consumed authoritative logic) |
| C5 | `compiler/enforce/` | lift-as-claws-internal |
| C6 | `compiler/events/` | lift-as-claws-internal |
| C7 | `compiler/fleet/` | lift-as-claws-internal |
| C8 | `compiler/host/` | lift-as-claws-internal |
| C9 | `compiler/ir/` | lift-as-claws-internal |
| C10 | `compiler/readers/` | lift-as-claws-internal |
| C11 | `compiler/sidecar/` | lift-as-claws-internal |
| C12 | `compiler/targets/` | lift-as-claws-internal |
| C13 | `compiler/util/` | lift-as-claws-internal (the `craftworks-scan.ts` leak-scanner — must stay where `base-emitter.ts` imports it) |
| C14 | `compiler/validate/` | lift-as-claws-internal |
| C15 | `compiler/watch/` | lift-as-claws-internal |

`compiler/emit/` is the sole `merge-into-package` row. The authoritative logic already lives in `packages/policy/src/emit/` (consumed by Ra CP-11 P51). The `src/compiler/emit/` tree remains as a transitional barrel because `claws-cli`, `claws-serve`, and accept tests still import via `@bic/claws-sdk/compiler/emit/*`. Deletion of this barrel lands with the Horus cutover plan, not before.

### Transitional barrels (not deleted pre-Horus)

Per `FILTER-REPO-MANIFEST.md` §2, the following `claws-sdk/src/` trees lift under the same path because external consumers still import them via their subpath barrels:

| Source path | Why it lifts transitional |
|---|---|
| `claws-sdk/src/compile/**` | P51 consumed authoritative logic into `packages/policy/src/compile/`; barrel stays live. |
| `claws-sdk/src/emit/**` | P51 consumed into `packages/policy/src/emit/`; barrel stays live. |
| `claws-sdk/src/compliance/**` | P52 consumed; barrel stays live. |
| `claws-sdk/src/governance/**` | P52 consumed; barrel stays live. |
| `claws-sdk/src/workspace/**` | Post-CP-10 R1 UM5 state: 25 lift-as-claws-internal + merge-elsewhere files remain; 4 moved files (oc-path, chunk-types, oc-files, types) already deleted. |

### The `bic/claws`-internal services

These are first-class packages in `bic/claws` but live outside `packages/`:

| Source path (craftworks) | Target path (bic/claws) | Role |
|---|---|---|
| `claws-serve/src/**`, `tests/**`, config | `claws-serve/<same>` | HTTP service; routes that lift to `packages/snap/` were carved out in CP-11 P53, remainder stays claws-internal. |
| `claws-cli/src/**`, `tests/**`, `bin/**`, config | `claws-cli/<same>` | The `claws` + `claws` CLI surface — delegates to `packages/policy/cli-handlers/` and `packages/snap/cli-handlers/`. |

---

## What stays craftworks-side

Per `FILTER-REPO-MANIFEST.md` §3 "Paths filter-repo DROPS", the following stay in the claws repo. They are either not openclaw-shaped AND not `bic/claws` product, or they are monorepo-level tooling that has no role in the claws product.

| Path | Why it stays |
|---|---|
| `.craft/waves/**` | Wave-execution directories are craftworks-native tooling (pipelines, role lenses, pulse plans, panel reviews). `bic/claws` adopts its own planning surface post-Horus. Explicit per `FILTER-REPO-MANIFEST.md` §5. |
| `.craft/plans/**` | Plan files reference craftworks-native wave lifecycle and role system. |
| `.craft/pipelines/**` | Pipeline definitions are craftworks-native orchestration. |
| `.craft/roles/**` | Role-tension lenses are craftworks-native review infrastructure. |
| `.craft/out/**`, `.craft/*.lock`, `.craft/*.yaml` | Orchestrator scratch + state. |
| `.claude/**` | Claude Code harness config (local dev tooling). |
| `plugins/**` | craftworks plugin marketplace sources. |
| `scripts/sync-*.sh`, `scripts/relay/**` | craftworks-internal sync + WorkIQ-relay tooling. |
| `compiler-sdk/**` | Astro compiler (different product surface — see [sdk-architecture](../../craft/concepts/sdk-architecture.md)). |
| `agent-sdk/**` | Agent runtime (different product surface). |
| `craftworks-sdk/**` | craftworks-branded unified SDK. |
| `guard-cli/**`, `fleet-cli/**`, `forge-cli/**`, `shared-cli/**` | craftworks-branded CLIs outside the claws surface. |
| `docs/tutorials/**` (except claws-specific) | craftworks-branded getting-started content. |
| `docs/craft/**` | craftworks plugin/meta-tooling docs. |
| `docs/concepts/**` (non-claws) | Shared concept guides. |
| `docs/CORPUS.md`, `CODEBASE.md`, `CLAUDE.md` (root) | craftworks monorepo-level indexes. |
| `papers/**`, `publications/**`, `research/**` | Research outputs — not product code. |

### `.craft/waves/` — explicit

Per `FILTER-REPO-MANIFEST.md` §5, this is the intentional call at director-level:

> The Ra wave directory stays in craftworks. It does NOT lift into bic/claws.

Three reasons, documented there:

- Pulse plans, panel reviews, role lenses, and flair all reference craftworks-native infrastructure (atoms, specs, wave stages) that doesn't exist in `bic/claws`.
- Horus planning starts fresh in `bic/claws` under whatever planning surface it adopts; it does not inherit Ra's wave-execution scaffolding.
- Review history (R1/R2 bundles under `panels/`) is archaeology — kept in craftworks for traceability, not carried into the Horus repo.

Filter-repo path-spec explicitly excludes `.craft/**`.

---

## What's deferred

Four product surfaces are classified as `DEFERRED` -- scheduled for post-Horus waves, not part of the filter-repo run. They are not listed in `FILTER-REPO-MANIFEST.md` §2 (lift paths) and are not in the `claws-sdk/packages/` consolidation inventory.

| Surface | Why deferred |
|---|---|
| **Companion (supervisor app)** | Kill-switch + fleet supervisor lives in a future companion app; explicitly out of scope for Ra (per [cli-carveout.md](../migration/cli-carveout.md) row "kill"). Post-Horus wave to land it as its own lift target. |
| **TUI (ClawPilot)** | The terminal UI layer sits above `claws-cli` — planned as a distinct post-Horus package once the CLI surface stabilizes. |
| **VSCode extension** | Editor surface that wraps `claws-lsp` -- separate release cadence, separate marketplace posture, separate wave. |
| **Eval API** | Public evaluation surface -- policy-eval contract is still being shaped against the dreaming maintenance loop and is not Horus-ready. |

Nothing in this list is **dropped**. Each has a post-Horus wave slot reserved. The filter-repo run is additive; a later wave will carry these into `bic/claws` (or a satellite repo) on its own manifest.

---

## The FILTER-REPO-MANIFEST.md file

The authoritative input to the Horus wave's filter-repo run is [`claws-sdk/FILTER-REPO-MANIFEST.md`](../../../claws-sdk/FILTER-REPO-MANIFEST.md). This guide is the reader-facing summary; the manifest is what `git filter-repo` actually consumes. It is organized in nine sections:

| Section | What Horus uses it for |
|---|---|
| §1 Refs preservation | Which branches and tags carry into `bic/claws`. `feature/ra-the-radiant-v2` (all Ra commits, identity preserved); `ra-cp-*` tags (cp-8..cp-12); pre-Ra `main` history drops; wave-dir tags drop. No squashing — pulse commit history is load-bearing for review traceability. |
| §2 Path-spec list (lift paths) | The pathspec argument to filter-repo. Tabulated across 5 groups: core runtime (4 packages), lift-as-claws-internal (per §"What lifts as claws-internal" above), `bic/claws`-internal services (`claws-serve`, `claws-lsp`, `claws-cli`), published `@bic/claws-sdk`, and docs paths. |
| §3 Paths filter-repo DROPS | Explicit drop list -- `.craft/**`, `.claude/**`, `plugins/**`, the other SDKs, the other CLIs, `docs/craft/**`, research outputs, monorepo-level indexes. |
| §4 Commit-rewrite rules | Message-prefix normalization (`pulse(ra-the-radiant NN):` → `pulse(NN):`; `feat(ra cp-NN):` → `feat(cp-NN):`; `chore(wave): ...` commits drop). **No author/committer rewrites**; `Co-Authored-By: Claude Opus 4.*` trailers retained. |
| §5 `.craft/waves/` disposition | Explicit: Ra wave directory stays in craftworks. Rationale documented (see §"`.craft/waves/` — explicit" above). |
| §6 Docs disposition | Path-by-path: `docs/claws/**` lifts, `docs/claws/proposals/openclaw-upstream/**` lifts (load-bearing for upstream extraction), `docs/craft/**` stays, `docs/tutorials/**` stays, etc. |
| §7 Horus inputs | Summarizes the four items Horus consumes as inputs (refs, rewrite rules, path-specs, docs). |
| §8 Verification commands | The 6-command gate that runs before the filter-repo cut: `ls claws-sdk/packages/`, `grep -rE "@craftworks/"` returns zero, `grep -rE "@openclaw/"` returns zero non-template matches, `tsc --noEmit` exits 0 in all 4 lift targets, 20-verb E2E passes, `DISPOSITION.md` + `FILTER-REPO-MANIFEST.md` exist. All six pass as of Ra CP-12 pulse 74. |
| §9 Known gaps (tracked) | Two items Horus reviewers must verify green before triggering filter-repo: OC-POLICY-E rename cleanup + per-file coverage backfill. Not blockers for the manifest itself. |

The companion `claws-sdk/CRAFTWORKS-SWEEP-LOG.md` documents the `@craftworks/*` scrub history (CP-11 P54).

---

## See also

- [Upstream contribution strategy](upstream-contrib.md) -- why `@openclaw/*` exists as a neutral package family, and the stabilize-extract-propose lifecycle.
- [`claws-cli` → `openclaw` carve-out mapping](../migration/cli-carveout.md) -- every `claws` subcommand's fate under extraction (kept/renamed/merged/dropped), at subcommand granularity rather than repo granularity.
- [`claws-sdk/FILTER-REPO-MANIFEST.md`](../../../claws-sdk/FILTER-REPO-MANIFEST.md) -- Horus-input manifest (refs + path-specs + commit-rewrite rules + verification commands).
- [`claws-sdk/DISPOSITION.md`](../../../claws-sdk/DISPOSITION.md) -- per-file disposition matrix for the 39 `claws-sdk/src/` subtrees + workspace-file-level matrix from pulse 47.
- [`claws-sdk/CRAFTWORKS-SWEEP-LOG.md`](../../../claws-sdk/CRAFTWORKS-SWEEP-LOG.md) -- companion log for the `@craftworks/*` scrub that unblocked the consolidation (CP-11 P54).
- [Diagnostic ID registry](../migration/diagnostic-id-registry.md) -- CLAWS-E → OC-POLICY-E rename table (CP-12 P59).
- [Plan: claws-pre-extraction-packaging](../../../.craft/plans/claws-pre-extraction-packaging.md) -- the Ra-II plan that delivered the 4-package shape across CP-8 through CP-12.
