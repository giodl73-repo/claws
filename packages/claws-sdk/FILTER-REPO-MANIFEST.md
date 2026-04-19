# Filter-Repo Lift Manifest — Ra → Horus Handoff

**Wave**: Ra the Radiant (XCIII) · **Pulse**: 74 (CP-12 final gate) · **Plan**: claws-pre-extraction-packaging
**Handoff target**: `bic/claws` (new Horus repository filtered out of `craftworks`)

This manifest is the input to the first Horus wave's filter-repo run. It
enumerates exactly which refs, paths, and commits carry into `bic/claws/`
and which stay in the `craftworks` monorepo. Companion: `DISPOSITION.md`
(per-file disposition matrix) and `CRAFTWORKS-SWEEP-LOG.md` (`@craftworks/*`
scrub history).

---

## 1. Refs preservation

Filter-repo preserves all commits on `feature/ra-the-radiant-v2` from the Ra
wave-start commit forward, with the rewrite rules in §3 applied. No commits
are squashed during lift — commit identity is preserved so blame and archaeology
continue to work in `bic/claws`.

| Ref | Disposition | Notes |
|-----|-------------|-------|
| `feature/ra-the-radiant-v2` (all Ra commits) | **keep** | Carried forward; identity preserved under rewrite rules. |
| `main` (Ra-merge commits) | **keep** (post-merge) | Merged after Ra close; carried forward. |
| Pre-Ra `main` history | **drop** | Filter-repo starts from the monorepo snapshot at Ra start — prior craftworks-specific commits are not Horus-relevant. |
| Wave-dir tags (`wave/ra/*`) | **drop** | Internal craftworks wave tooling; not Horus-facing. |
| `ra-cp-*` tags (cp-8..cp-12) | **keep** | These mark the 4-package-consolidation milestones and are useful anchor points in `bic/claws`. |
| Per-pulse squash commits | **none** | No squashing; the pulse commit history is load-bearing for review traceability. |

---

## 2. Path-spec list — paths filter-repo carries INTO bic/claws/

The filter-repo run is **additive by pathspec**: only paths listed here
lift into `bic/claws/`. Everything else stays in `craftworks`.

### Core runtime — the 4 consolidated packages

| Source path (craftworks) | Target path (bic/claws) | Disposition source |
|---|---|---|
| `claws-sdk/packages/workspace/**` | `packages/workspace/**` | CP-10 |
| `claws-sdk/packages/guardrails/**` | `packages/guardrails/**` | CP-10 |
| `claws-sdk/packages/policy/**` | `packages/policy/**` | CP-11 P51/P52 |
| `claws-sdk/packages/snap/**` | `packages/snap/**` | CP-11 P53 |

### Lift-as-claws-internal — DISPOSITION.md matrix

Every `lift-as-claws-internal` subtree enumerated in `DISPOSITION.md`
§"The 23 R1-identified subtrees" + §"Top-level `.ts` files" + §"types/"
+ §"The `compiler/` active tree" carries forward under:

| Source path (craftworks) | Target path (bic/claws) |
|---|---|
| `claws-sdk/src/adapter/**` | `claws-sdk/src/adapter/**` |
| `claws-sdk/src/amend/**` | `claws-sdk/src/amend/**` |
| `claws-sdk/src/annotate/**` | `claws-sdk/src/annotate/**` |
| `claws-sdk/src/audit/**` | `claws-sdk/src/audit/**` |
| `claws-sdk/src/config/**` | `claws-sdk/src/config/**` |
| `claws-sdk/src/context/**` | `claws-sdk/src/context/**` |
| `claws-sdk/src/detect/**` | `claws-sdk/src/detect/**` |
| `claws-sdk/src/doctor/**` | `claws-sdk/src/doctor/**` |
| `claws-sdk/src/fleet/**` | `claws-sdk/src/fleet/**` |
| `claws-sdk/src/init/**` | `claws-sdk/src/init/**` |
| `claws-sdk/src/ir/**` | `claws-sdk/src/ir/**` |
| `claws-sdk/src/keys/**` | `claws-sdk/src/keys/**` |
| `claws-sdk/src/maker/**` | `claws-sdk/src/maker/**` |
| `claws-sdk/src/optimize/**` | `claws-sdk/src/optimize/**` |
| `claws-sdk/src/protect/**` | `claws-sdk/src/protect/**` |
| `claws-sdk/src/publish/**` | `claws-sdk/src/publish/**` |
| `claws-sdk/src/scaffold/**` | `claws-sdk/src/scaffold/**` |
| `claws-sdk/src/snapshot/**` | `claws-sdk/src/snapshot/**` |
| `claws-sdk/src/types/**` | `claws-sdk/src/types/**` |
| `claws-sdk/src/util/**` | `claws-sdk/src/util/**` |
| `claws-sdk/src/watch/**` | `claws-sdk/src/watch/**` |
| `claws-sdk/src/workspace/**` (25 lift files; 4 moved files excluded) | `claws-sdk/src/workspace/**` |
| `claws-sdk/src/workspace-edit/**` | `claws-sdk/src/workspace-edit/**` |
| `claws-sdk/src/compiler/**` (15 subdirs: audit, cache, crypto, emit [transitional], enforce, events, fleet, host, ir, readers, sidecar, targets, util, validate, watch) | `claws-sdk/src/compiler/**` |
| `claws-sdk/src/compile/**` (transitional barrel; P51 consumed authoritative logic into `packages/policy/src/compile/`) | `claws-sdk/src/compile/**` |
| `claws-sdk/src/emit/**` (transitional barrel; P51 consumed into `packages/policy/src/emit/`) | `claws-sdk/src/emit/**` |
| `claws-sdk/src/compliance/**` (transitional barrel; P52) | `claws-sdk/src/compliance/**` |
| `claws-sdk/src/governance/**` (transitional barrel; P52) | `claws-sdk/src/governance/**` |
| `claws-sdk/src/compilation-host.ts` | `claws-sdk/src/compilation-host.ts` |
| `claws-sdk/src/version.ts` | `claws-sdk/src/version.ts` |
| `claws-sdk/src/index.ts` | `claws-sdk/src/index.ts` |
| `claws-sdk/tests/**` (test-fixture-workspace + accept + e2e trees) | `claws-sdk/tests/**` |
| `claws-sdk/DISPOSITION.md`, `CRAFTWORKS-SWEEP-LOG.md`, `FILTER-REPO-MANIFEST.md`, `package.json`, `tsconfig*.json`, `vitest.config.ts`, `tsup.config.ts`, `eslint.config.cjs` | `claws-sdk/<same>` |

### bic/claws-internal services

| Source path (craftworks) | Target path (bic/claws) |
|---|---|
| `claws-serve/src/**` | `claws-serve/src/**` |
| `claws-serve/tests/**` | `claws-serve/tests/**` |
| `claws-serve/{package.json, tsconfig*.json, vitest.config.ts, tsup.config.ts}` | `claws-serve/<same>` |
| `claws-lsp/src/**` (renamed to `@bic/openclaw-lsp` per P76) | `claws-lsp/src/**` |
| `claws-lsp/tests/**` | `claws-lsp/tests/**` |
| `claws-lsp/{package.json, tsconfig*.json, vitest.config.ts, tsup.config.ts}` | `claws-lsp/<same>` |
| `claws-cli/src/**` (the `claws` + `claws` CLI surface) | `claws-cli/src/**` |
| `claws-cli/tests/**` | `claws-cli/tests/**` |
| `claws-cli/bin/**` | `claws-cli/bin/**` |
| `claws-cli/{package.json, tsconfig*.json, vitest.config.ts, tsup.config.ts, eslint.config.cjs}` | `claws-cli/<same>` |

### Published OpenClaw-upstream packages

| Source path (craftworks) | Target path (bic/claws) |
|---|---|
| `packages/@bic/claws-sdk/**` | `packages/@bic/claws-sdk/**` |

### Docs that lift

| Source path (craftworks) | Target path (bic/claws) |
|---|---|
| `docs/claws/**` | `docs/claws/**` |
| `docs/claws/**` (if present post-Horus rename) | `docs/claws/**` |
| `README.md` (claws/claws-facing fragments; curation by Horus wave — full copy lifts then is edited) | `README.md` |

### Root workspace metadata

| Source path (craftworks) | Target path (bic/claws) |
|---|---|
| `package.json` (workspaces field; craftworks-only members pruned by Horus wave) | `package.json` |
| `package-lock.json` | regenerated post-filter; not lifted |
| `.gitignore`, `.gitattributes`, `.nvmrc`, `.editorconfig` | `<same>` |
| `tsconfig.base.json`, root `eslint.config.cjs` | `<same>` |

---

## 3. Paths filter-repo DROPS — stay in craftworks

| Path | Reason |
|---|---|
| `.craft/waves/**` | Wave-execution directories are craftworks-native tooling (pipelines, role lenses, pulse plans, panel reviews). `bic/claws` uses its own planning surface post-Horus. |
| `.craft/plans/**` | Plan files reference craftworks-native wave lifecycle and role system. |
| `.craft/pipelines/**` | Pipeline definitions are craftworks-native orchestration. |
| `.craft/roles/**` | Role-tension lenses are craftworks-native review infrastructure. |
| `.craft/out/**` | Scratch directory (agent working files, per-PR scratch outputs). |
| `.craft/scheduled_tasks.lock`, `.craft/*.yaml` (wave-orchestrator state) | Orchestrator state. |
| `.claude/**` | Claude Code harness config (local dev tooling). |
| `plugins/**` | craftworks plugin marketplace sources. |
| `scripts/sync-*.sh`, `scripts/relay/**` | craftworks-internal sync + WorkIQ-relay tooling. |
| `compiler-sdk/**` | Astro compiler package (different product surface). |
| `agent-sdk/**` | Agent runtime (different product surface). |
| `craftworks-sdk/**` | craftworks-branded unified SDK. |
| `guard-cli/**`, `fleet-cli/**`, `forge-cli/**`, `shared-cli/**` | craftworks-branded CLIs outside the claws surface. |
| `docs/tutorials/**` (except claws-specific tutorials that move under `docs/claws/`) | craftworks-branded tutorials. |
| `docs/craft/**` | craftworks plugin docs (meta-tooling). |
| `docs/concepts/**` (non-claws-specific) | Shared concept guides. |
| `docs/CORPUS.md`, `CODEBASE.md`, `CLAUDE.md` (root) | craftworks monorepo-level indexes. |
| `papers/**`, `publications/**` | Research outputs (not product code). |
| `research/**` | Research sandbox. |

---

## 4. Commit-rewrite rules

Applied during filter-repo via `--commit-callback`:

### Author / committer mapping

No rewrites. Commit identity is preserved as-is. Contributors keep their
attribution; `Co-Authored-By: Claude Opus 4.*` trailers are retained so the
audit trail is complete.

### Message-prefix normalization

| Source prefix | Target prefix | Rationale |
|---|---|---|
| `pulse(ra-the-radiant NN):` | `pulse(NN):` | The wave name is craftworks-native; pulse numbers stay for archaeology. |
| `feat(ra cp-NN):` | `feat(cp-NN):` | Same. |
| `fix(ra cp-NN ...):` | `fix(cp-NN ...):` | Same. |
| `feat({pkg}): ... (pulse NN)` | *(unchanged)* | Already Horus-friendly. |
| `chore(wave): ...` | *drop commit* | Wave-orchestration chores are craftworks-native; drop. |

### No commits squashed

Pulse-level commits stay intact. Review commits (R1/R2/R3 fix bundles) stay
as separate commits. The commit graph in `bic/claws` will look identical to
the Ra branch history modulo the prefix normalization above.

---

## 5. `.craft/waves/` disposition — explicit

**The Ra wave directory stays in craftworks. It does NOT lift into bic/claws.**

This is intentional per the director role's Ra-close handoff contract:

- Pulse plans, panel reviews, role lenses, and flair all reference
  craftworks-native infrastructure (atoms, specs, wave stages) that
  doesn't exist in `bic/claws`.
- Horus planning starts fresh in `bic/claws` under whatever planning
  surface it adopts; it does not inherit Ra's wave-execution scaffolding.
- Review history (R1/R2 bundles under `panels/`) is archaeology — kept
  in craftworks for traceability, not carried into the Horus repo.

Filter-repo path-spec explicitly excludes `.craft/**`.

---

## 6. Docs disposition

| Path | Disposition | Notes |
|---|---|---|
| `docs/claws/**` | **lift** | claws/claws product documentation. |
| `docs/claws/proposals/openclaw-upstream/**` | **lift** | Upstream OpenClaw proposals — load-bearing for post-Horus upstream-extraction work. |
| `docs/concepts/compiler/**` | **lift** (under `docs/claws/compiler/concepts/` via path rename) | claws compiler conceptual docs. |
| `docs/craft/**` | **stay** | craftworks plugin/meta-tooling. |
| `docs/tutorials/**` | **stay** (tutorials.zip regenerated by craftworks) | craftworks-branded getting-started. |
| `docs/traces/**` | **stay** | E2E pipeline walkthroughs across craftworks surfaces. |
| `docs/research/**` | **stay** | Research notes. |
| `docs/CORPUS.md` | **stay** | monorepo-level documentation-surface index. |

---

## 7. Horus inputs — 4 enumerated items

The Horus wave consumes this manifest as four inputs:

1. **Refs preservation** — §1 table. Branches + tags that carry; commits all preserved as-is (no squash).
2. **Commit-rewrite rules** — §4. Only message-prefix normalization; no author rewrites.
3. **Path-spec list** — §2 (lift paths) + §3 (drop paths). `.craft/waves/` is explicitly in drop.
4. **Docs disposition** — §6 path-by-path.

---

## 8. Verification commands

Before running filter-repo in the Horus wave, run:

```bash
# Confirm 4-package shape.
ls claws-sdk/packages/
# Expected: guardrails  policy  snap  workspace

# Confirm zero @craftworks/* runtime imports in the lift targets.
grep -rE "from ['\"]@craftworks/" claws-sdk/src claws-sdk/packages claws-serve/src
# Expected: 0 matches

# Confirm zero @openclaw/* runtime imports (emit templates + test assertions are legitimate).
grep -rE "from ['\"]@openclaw/" claws-sdk/src claws-sdk/packages | grep -v "\.tmpl" | grep -v "tests/" | grep -v "template literal"
# Expected: 0 non-template matches

# Typecheck all lift targets.
cd claws-sdk && npx tsc --noEmit
cd claws-serve && npx tsc --noEmit
cd claws-cli && npx tsc --noEmit
cd claws-lsp && npx tsc --noEmit
# Expected: all exit 0

# Run 20-verb + decision-path E2E.
cd claws-sdk/packages/policy && npx vitest run tests/cli-policy-verbs.e2e.test.ts tests/cli-binaryname.integration.test.ts tests/decision-paths.e2e.test.ts tests/cli-acceptance.accept.test.ts
cd claws-sdk/packages/snap && npx vitest run tests/cli-handlers/verbs.e2e.test.ts
# Expected: 36 passed

# Confirm DISPOSITION.md and this manifest exist.
test -f claws-sdk/DISPOSITION.md && echo DISPOSITION ok
test -f claws-sdk/FILTER-REPO-MANIFEST.md && echo MANIFEST ok
```

All verification commands above pass as of Ra CP-12 pulse 74.

---

## 9. Known gaps to resolve in P59 (tracked, not in this manifest)

These are P59's scope and are NOT blockers for filter-repo preparation, but
they MUST land before the actual filter-repo run in the Horus wave:

- **OC-POLICY-E → OC-POLICY-E rename**: diagnostic ID registry updated; 1
  lingering doc-comment in `claws-cli/src/errors/codes.ts:4` to fix.
- **Coverage backfill**: 95/90/95/95 per-file across all 4 packages
  (current: policy 99.03/94.69/100/99.2, snap 98.15/94.19/100/100 — both
  pass; workspace + guardrails per-file status in `DEFERRED.md`).

Horus reviewers: verify these two items are green before triggering filter-repo.

---

**End of manifest.** Panel review target: zero unresolved Majors.
