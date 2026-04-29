# claws surface audit — language-services vs upstream-deferred vs CLI-only

**Date**: 2026-04-28
**Branch**: `feature/isis-the-weaver`
**Scope**: read-only categorization of `packages/claws-sdk/`, `packages/claws-serve/`, `packages/claws/` (CLI) into four buckets driving Phase 1 trim + Phase 3 Rust port scope.
**Inputs**: LBC v0.2 spec, `ClawsHttpClient`, `claws-serve/src/server.ts` route registry, CLI command imports, `openclaw-policy` / `openclaw-snap` / `openclaw-workspace` / `openclaw-guardrails` / `openclaw-lsp` packages, `claws-rust-port` plan, R1 panel review.

---

## TL;DR

| Bucket | Files | LoC (approx) | Description |
|---|---|---|---|
| **LANGUAGE-SERVICES** | ~70 files | **~14.8k LoC** | Read/edit chunks, OC parse, ETag/version, SSE notify, diff render. The Rust port target. |
| **UPSTREAM-DEFERRED** | ~80 files | **~19.5k LoC** | snap (storage/restore/manifest/promote/integrity), policy compile (LLM extract, governance AST, IR build), audit chain (HMAC+verify+wal+witness), keys/ceremony, compliance evidence (SOC2/HIPAA/EU-AI-Act), trust-set, fleet runner. Lives upstream in `openclaw-snap` / `openclaw-policy` / future `openclaw-audit`. Delete from claws once moves complete. |
| **CLI-ONLY** | ~95 files | **~17.5k LoC** | `claws compile` / `init` / `doctor` / `drift` / `comply` / `emit` / `detect` / `protect` / `publish` / `keys` / `scan` / `report`. Stays TS in `packages/claws/` + a slimmed `packages/claws-cli-sdk/`. Never server-bound. |
| **AMBIGUOUS** | ~12 items | **~4.5k LoC** | Audit emission, trust manager (workspace state vs runtime evaluation), version-history, auto-snapshot, validators, governance rule registry. Decision needed per item below. |

**Headline Rust port estimate**: claws-sdk language-services slice (~9k LoC) + claws-serve language-services slice (~5.5k LoC) ≈ **~14.5k LoC TS → ~22k LoC Rust** (conservative 1.5× ratio for verbose error types + serde plumbing).

vs the current rust-port plan's 87k LoC target: **factor of ~6× reduction**.

Realistic timeline at sustainable pace: **5–7 weeks** (vs 9 cp / 9 weeks compressed in the existing plan).

---

## Method

1. Read LBC v0.2 §3 route inventory + `ClawsHttpClient` allow-list (the 26 paths Lobster actually consumes).
2. Read `claws-serve/src/server.ts` (1377 lines) for the live route mount registry; cross-reference 38 route files in `routes/`.
3. Walked every SDK directory; counted LoC; grep'd imports from `claws-serve/src/**` (server-bound) and from `claws/src/commands/**` (CLI-bound).
4. Cross-referenced `packages/openclaw-{snap,policy,workspace,guardrails,lsp}/` to identify duplicated functionality.
5. Spot-checked production graph via `hello-charles-real-browser.e2e.test.ts` + `lobster-journey.e2e.test.ts`.

Bucketing rule: **LANGUAGE-SERVICES** = imported by `claws-serve` AND on the LBC §3 route surface; **UPSTREAM-DEFERRED** = duplicates a package already at `openclaw-*/` OR governance-compile/policy-gen/audit-chain machinery the upstream owns; **CLI-ONLY** = imported only by `packages/claws/src/commands/`; **AMBIGUOUS** = both server-bound AND duplicates something upstream-bound.

---

## claws-serve routes — per-route bucketing

The route registry has 38 route files + 9 middleware. Below is each route or route file with its LBC §3 status and bucket assignment.

### 3.1 reads — bucketed

| Route | File | LoC | Bucket | LBC §3 | Used by web | Rationale |
|---|---|---|---|---|---|---|
| `GET /api/health` | `routes/index.ts` (inline) | n/a | LANGUAGE-SERVICES | §3.1 ✅ | yes | minimal HTTP probe + version-history cursors |
| `GET /api/status` | `status.ts` | 317 | LANGUAGE-SERVICES | §3.1 ✅ | yes | governance-banner read; thin adapter |
| `GET /api/oc/{file}` | `oc-generic.ts` | 220 | LANGUAGE-SERVICES | §3.1 ✅ | yes | core OC file read |
| `GET /api/oc/{file}/section/{heading}` | `oc-generic.ts` | (above) | LANGUAGE-SERVICES | §3.1 ✅ | yes | section read |
| `GET /api/oc/HEARTBEAT.md/schedule` | `schedule.ts` | 166 | LANGUAGE-SERVICES | §3.1 ✅ | yes | parsed Heartbeat schedule view |
| `GET /api/chunks/general/identity` | `chunks-general.ts` | 92 | LANGUAGE-SERVICES | §3.1 ✅ | yes | persona surface (Hello-Charles) |
| `GET /api/chunks/connections` | `chunks-connections.ts` | 187 | LANGUAGE-SERVICES | §3.1 ✅ | yes | tools/skills enumeration |
| `GET /api/chunks/memory` | `chunks-memory.ts` | 78 | LANGUAGE-SERVICES | §3.1 ✅ | yes | memory chunks |
| `GET /api/chunks/groups` | `chunks-groups.ts` | 68 | LANGUAGE-SERVICES | §3.1 ✅ | yes | groups |
| `GET /api/chunks/entitlements` | `chunks-entitlements.ts` | 69 | LANGUAGE-SERVICES | §3.1 ✅ | yes | entitlements |
| `GET /api/chunks/preferences/*` | `chunks-preferences.ts` | 112 | LANGUAGE-SERVICES | §3.1 ✅ | yes | prefs read |
| `GET /api/governance` | `governance.ts` | 184 | LANGUAGE-SERVICES | §3.1 ✅ | yes | governance state read |
| `GET /api/workqueue` | `workqueue.ts` | 146 | LANGUAGE-SERVICES | §3.1 ✅ | yes | task strip read |
| `GET /api/sessions[?type]` | `sessions.ts` | 353 | LANGUAGE-SERVICES | §3.1 ✅ | yes | session model surface |
| `GET /api/trust` | `trust.ts` | 147 | LANGUAGE-SERVICES | §3.1 ✅ | yes | tier badge read (state read; escalation is CLI/admin) |
| `GET /api/oc/snapshots[*]` | `snapshots-namespace.ts` | 900 | **AMBIGUOUS** | §3.1 🟡 | yes | snapshot listing → must read upstream `openclaw-snap` store. The thin HTTP adapter is LANGUAGE-SERVICES; the persistence + manifest internals are UPSTREAM-DEFERRED. See Decisions §1. |
| `GET /api/oc/diff` | `oc-diff.ts` | 996 | **AMBIGUOUS** | §3.1 🟡 | yes | OC-file diff render → 996 LoC includes R5-redaction + irProbe + audit-emit, all of which classify as UPSTREAM-DEFERRED. The diff-render kernel itself is LANGUAGE-SERVICES; the wrapping is upstream. See Decisions §2. |
| `GET /diff` (legacy) | `diff.ts` | 329 | UPSTREAM-DEFERRED | §3.4 (legacy) | no | superseded by `/api/oc/diff`; delete in trim wave |

### 3.2 mutations — bucketed

| Route | File | LoC | Bucket | LBC §3 | Used by web | Rationale |
|---|---|---|---|---|---|---|
| `PATCH /api/oc/{file}` (general) | `oc-generic.ts` | (above) | LANGUAGE-SERVICES | §3.2 ✅ | yes | edit OC file |
| `PATCH /api/oc/SOUL.md` (loop) | `loop-soul.ts` | 275 | LANGUAGE-SERVICES | §3.2 ✅ | yes | section edit + audit emit |
| `PATCH /api/oc/MEMORY.md` (loop) | `loop-memory.ts` | 379 | LANGUAGE-SERVICES | §3.2 ✅ | yes | section edit + audit emit |
| `PATCH /api/chunks/{tab}` | `patch-chunks.ts` | 676 | LANGUAGE-SERVICES | §3.2 ✅ | yes | structured-edit write surface |
| `PATCH /api/chunks/connections/allow-all` | `allow-all.ts` | 553 | LANGUAGE-SERVICES | §3.2 ✅ | yes | bulk tool-allow |
| `POST /api/batch` | `batch.ts` | 393 | LANGUAGE-SERVICES | §3.2 ✅ | yes | atomic multi-op edit |
| `POST /compile` | `compile.ts` | 228 | **AMBIGUOUS** | §3.2 ✅ | yes | the route is LANGUAGE-SERVICES (a thin trigger surface). The compile body (`compileWithViolationGuard` → governance-AST → IR → emit) is UPSTREAM-DEFERRED. See Decisions §3. |
| `POST /api/oc/snapshots` | `snapshots-namespace.ts` | (above) | UPSTREAM-DEFERRED | §3.2 🟡 | yes | capture writes to upstream `openclaw-snap` store; thin HTTP shell only. |
| `POST /api/oc/snapshots/{name}/restore` | `snapshot-restore.ts` | 1506 | UPSTREAM-DEFERRED | §3.2 🟡 | yes | 1506 LoC of R5-classification + manifest-replay + violation-machine — restore is upstream-bound. The route surface stays in LANGUAGE-SERVICES; the body deletes. |
| `POST /api/oc/undo` | `version-history.ts` | 1730 | LANGUAGE-SERVICES (route) + UPSTREAM-DEFERRED (body) | §3.2 🟡 | yes | undo is the version-DAG cursor walk — keep the cursor, delete the deep manifest-replay (lives upstream). 1730 LoC will trim to ~400. |
| `POST /api/oc/redo` | `version-history.ts` | (above) | LANGUAGE-SERVICES (route) + UPSTREAM-DEFERRED (body) | §3.2 🟡 | yes | symmetrical to undo |
| `POST /snapshot` (legacy) | `snapshot.ts` | 588 | UPSTREAM-DEFERRED | §3.4 (legacy) | no | legacy alias; delete |

### 3.3 SSE — bucketed

| Route | File | LoC | Bucket | LBC §3 |
|---|---|---|---|---|
| `GET /api/events` | `events.ts` | 65 | LANGUAGE-SERVICES | §3.3 ✅ |

### 3.4 routes Lobster does NOT consume (server-only / admin / aspirational)

| Route | File | LoC | Bucket | Rationale |
|---|---|---|---|---|
| `POST /api/health/reset` | `admin-reset.ts` | 280 | UPSTREAM-DEFERRED | admin tool; CLI-bound for fleet ops |
| `POST /api/classify/{tool}` | `classify.ts` | 64 | UPSTREAM-DEFERRED | governance-AST classification → upstream policy package |
| `GET /api/sessions/{id}/runs` | `sessions.ts` | (above) | UPSTREAM-DEFERRED | runs = OBO sessions, owned by guardrails+gateway |
| `PATCH /api/sessions/{id}/config` | `session-config.ts` | 530 | LANGUAGE-SERVICES | session-config is workspace edit (TOOLS.md), keeps |
| `PATCH /api/trust/escalate` | `trust.ts` | (above) | UPSTREAM-DEFERRED | JWT trust-tier mgmt → upstream policy/keys |
| `GET /ir` | `ir.ts` | 46 | UPSTREAM-DEFERRED | IR introspection; upstream `openclaw-policy` |
| `GET /diagnostics` | `diagnostics.ts` | 55 | UPSTREAM-DEFERRED | governance diagnostics → policy compile |
| `GET /tensions` | `tensions.ts` | 85 | UPSTREAM-DEFERRED | tension-detect; LSP feature, lives in `openclaw-lsp` |
| `POST /api/invalidate` | `invalidate.ts` | 32 | LANGUAGE-SERVICES | cache invalidation; small/keep |
| `GET /api/ir-resolution` | `ir-resolution.ts` | 186 | UPSTREAM-DEFERRED | IR view; upstream policy |
| `GET /api/oc/.../schema` | `workspace-schema.ts` | 101 | LANGUAGE-SERVICES | schema introspection (read-only, structural) |

### Middleware — bucketed (`claws-serve/src/middleware/*.ts`)

| Middleware | LoC | Bucket | Rationale |
|---|---|---|---|
| `body-limit.ts` / `cors.ts` / `content-type.ts` / `error-handler.ts` / `rate-limit.ts` | ~600 total | LANGUAGE-SERVICES | HTTP plumbing |
| `etag.ts` / `require-if-match.ts` / `validation-middleware.ts` | ~500 | LANGUAGE-SERVICES | concurrency core |
| `dry-run.ts` / `dry-run-sanitize.ts` | ~250 | LANGUAGE-SERVICES | preview-token surface (LBC §5) |
| `time-travel.ts` / `actor.ts` | ~200 | LANGUAGE-SERVICES | OC read-side wiring |
| `commit-on-success.ts` (snapshot persistor) | ~350 | UPSTREAM-DEFERRED | auto-snapshot persistence — moves with snap |
| `audit-emission.ts` | ~280 | UPSTREAM-DEFERRED | symmetric audit emitter; chain emit upstream |
| `violation-gate.ts` | ~120 | LANGUAGE-SERVICES | reads violation state machine; gate is local |

### claws-serve routes — bucket totals

| Bucket | Approximate LoC | Notes |
|---|---|---|
| LANGUAGE-SERVICES | **~5.5k** | read routes + chunks + edit routes + SSE + middleware core |
| UPSTREAM-DEFERRED | **~7.0k** | snapshot capture/restore (~3k), version-history body (~1.3k), legacy diff/snapshot (~900), admin/classify/ir/diagnostics/tensions (~600), commit/audit middleware (~600) |
| AMBIGUOUS | **~1.2k** | snapshots-namespace (route shell), oc-diff (kernel), compile (route) |

`claws-serve` total ≈ 13.7k LoC source → trims to ~5.5k LoC LANGUAGE-SERVICES (factor of 2.5×).

---

## claws-sdk modules — per-directory bucketing

`packages/claws-sdk/src/` has 28 directories, ~480 files, ~66.5k LoC. Below is the bucket per directory.

| Module | LoC | Imported by | Bucket | Rationale |
|---|---|---|---|---|
| `audit/` | 1488 | server (compliance ref) + CLI (`comply.ts`) | UPSTREAM-DEFERRED | HMAC chain + WAL + witness + verify + export. Chain emit = audit pkg upstream; verify = CLI. |
| `compile/` | 7178 | server (`compile.ts` 102 LoC sliver) + CLI (`build`/`compile`/`extract`) | **AMBIGUOUS** | Mostly CLI: LLM extract, intent extractors, governance-AST, conflict detect. ~100 LoC `violation-aware-compile.ts` is server-bound; rest is CLI-ONLY. See Decisions §3. |
| `compiler/` | 11200 | only `compile.ts:cache` referenced (CLI subpath) | CLI-ONLY | Compilation engine: cache, audit (separate from `audit/`), crypto, emit (oc-emitter), enforce, fleet, host, IR, readers, sidecar, targets, validate, watch. Pure CLI — never imported by `claws-serve/src/**`. The biggest single bucket; trims claws-sdk by ~17%. |
| `compliance/` | 3158 | server (audit-chain sink + key-resolver) + CLI (`comply.ts`) | UPSTREAM-DEFERRED | EU-AI-Act + HIPAA + SOC2 evidence builders, artifact-signer (Ed25519). Server uses `createFsAuditChainSink` (~300 LoC); rest is CLI-bound. Sink moves with audit upstream. |
| `detect/` | 864 | CLI (`scan`/`detect`) | CLI-ONLY | Marker registry + governance-pattern detection — codebase-scan tooling. |
| `doctor/` | 1203 | CLI (`doctor.ts`) | CLI-ONLY | Health checks + migrations. |
| `emit/` | 2307 | CLI (`build.ts`) | CLI-ONLY | Plugin emit / skill emit / workflow emit / platform-router. Used to ship platform-bindings (Claude Code, ChatGPT, etc.). |
| `governance/` | 2090 | server (rule-registry + risk-change-audit) + CLI (`build`) | **AMBIGUOUS** | Governance rule registry — server reads rules to gate; CLI builds rule definitions. Could split: registry stays language-services, rule definitions move CLI. See Decisions §4. |
| `init/` | 1311 | CLI (`init.ts`/`uninstall.ts`) | CLI-ONLY | Workspace scaffold / config-create / template stamp. |
| `ir/` | 709 | server (`hashIR` + `gov-analysis`) + CLI (`compile`) | **AMBIGUOUS** | IR types + capability-manifest + audit-event types. Server uses `hashIR` only (~50 LoC); CLI consumes the full IR. Split: types stay server-side, build/serialize move CLI. See Decisions §5. |
| `keys/` | 1758 | CLI (`keys.ts`) | UPSTREAM-DEFERRED | Key ceremony / rotate / generate / revoke / storage. Owned upstream by keys/ceremony package. |
| `snapshot/` | 1400 | server (snapshot-restore + version-history reads manifest) + CLI (`snap.ts`) | UPSTREAM-DEFERRED | snapshot save/restore/diff/integrity/manifest/promote/provenance/storage. Lives in `openclaw-snap` already; migrate fully. The 1400 LoC here is a duplicate. |
| `workspace/` | 6688 | server (heavy) + CLI (light: `watch.ts:AutoSnapshotManager`) | **AMBIGUOUS** | Mixed: chunk-assembler (LANGUAGE-SERVICES, ~770), parser (LS, ~91), heartbeat-parser (LS, ~411), soul-sections (LS, ~288), memory-sections (LS, ~167), schema-builder (LS, ~219), session-config-editor (LS, ~462), trust-manager (LS+ambig, ~590), violation-state (LS, ~641), version-store (LS, ~250), version-resolver (LS, ~467), workqueue-builder (LS, ~243), fs-atomic (LS, ~92), governance-diff (LS+ambig, ~587), auto-snapshot{,-types,-trigger} (UPSTREAM-DEFERRED, ~517), approval-events (UPSTREAM-DEFERRED, ~251). **~5.5k LS + ~1.0k upstream + ~250 ambig**. The single biggest LANGUAGE-SERVICES module. |
| `workspace-edit/` | 2525 | server (heavy) | LANGUAGE-SERVICES | StructuredEditor, ValidationPipeline, VersionManager, R5/Fleet/Governance/DenyRemoval validators. Core ETag + If-Match + write-precondition machinery. |
| `watch/` | 1024 | CLI (`extract-watch`/`watch`) + server (cache-invalidation) | **AMBIGUOUS** | File watcher + auto-recompile. Server uses `cache-invalidation.ts` only (~166 LoC); rest CLI. |
| `adapter/` | 412 | governance-host (CLI) | CLI-ONLY | Hook registry + OC data adapter — CLI tooling. |
| `amend/` | 607 | CLI (`amend.ts`) | CLI-ONLY | OC edit IR previewer/applier — CLI tool. |
| `annotate/` | 1483 | CLI (`annotate.ts`) | CLI-ONLY | Confidence/heuristics/obo-detect/yaml-edge — annotation engine. |
| `config/` | 367 | CLI (`publish.ts`) | CLI-ONLY | claws.json loader. |
| `context/` | 691 | only `compile/` consumes (transitively CLI) | CLI-ONLY | Context DAG + context-press for compile. |
| `fleet/` | 2938 | CLI (`broadcast`/`drift`/`kill`/`report`/`scan`) | CLI-ONLY | Fleet-wide ops: scan, drift, kill, baseline, broadcast. Pure CLI. |
| `maker/` | 3245 | maker tooling (CLI subpath) | CLI-ONLY | Skill marketplace authoring — separate from runtime. |
| `optimize/` | 1314 | CLI (`build.ts`/optimization passes) | CLI-ONLY | Dead-code / merge-checks / pinch optimization passes — compile pipeline only. |
| `protect/` | 1431 | CLI (`protect.ts`) | CLI-ONLY | Budget + identity protection — pre-flight validation tool. |
| `publish/` | 1254 | CLI (`publish.ts`) | CLI-ONLY | Manifest-state + registry-client — publish pipeline. |
| `scaffold/` | 647 | CLI (`init.ts`) | CLI-ONLY | Skill template scaffold. |
| `transforms/` | 161 | CLI | CLI-ONLY | day-30 transform — single CLI helper. |
| `types/` | 517 | server + CLI | LANGUAGE-SERVICES | Shared types: platform, sidecar, snapshots (small), version-history, loss-matrix. Keep all in language-services since the dist tree is type-only. |
| `util/` | 149 | server + CLI | LANGUAGE-SERVICES | canonical-json, fs, levenshtein, normalize, path, text — small shared. |

### claws-sdk — bucket totals

| Bucket | Approximate LoC | Top-level dirs |
|---|---|---|
| LANGUAGE-SERVICES | **~9.0k** | `workspace/` (LS slice ~5.5k) + `workspace-edit/` (2.5k) + `types/` (.5k) + `util/` (.15k) + sliver of `governance/` + sliver of `ir/` |
| UPSTREAM-DEFERRED | **~12.5k** | `audit/` (1.5k) + `keys/` (1.8k) + `snapshot/` (1.4k) + `compliance/` (3.2k) + workspace auto-snapshot (~0.5k) + workspace approval-events (.3k) + bulk of `governance/` rule-defs (~1.3k) + IR build/serialize (~0.5k) + violation-aware-compile sliver (.1k) + admin/classify/ir routes wiring (~0.5k) |
| CLI-ONLY | **~45.0k** | `compiler/` (11.2k) + `compile/` ex-violation-aware (~7.1k) + `fleet/` (2.9k) + `maker/` (3.2k) + `emit/` (2.3k) + `protect/` (1.4k) + `optimize/` (1.3k) + `init/` (1.3k) + `doctor/` (1.2k) + `publish/` (1.3k) + `annotate/` (1.5k) + `detect/` (.9k) + `watch/` ex-cache-invalidation (~.85k) + `context/` (.7k) + `adapter/` (.4k) + `amend/` (.6k) + `scaffold/` (.65k) + `config/` (.37k) + `transforms/` (.16k) + minor |
| AMBIGUOUS | **~3.0k** | `compile/violation-aware` + `governance/registry` + `ir/types` + `workspace/governance-diff` + `workspace/trust-manager` (split) |

**claws-sdk total**: 66.5k LoC → trims to ~9k LANGUAGE-SERVICES + ~3k AMBIGUOUS retained = **~12k post-trim** (factor of 5.5× reduction).

---

## claws (CLI) commands — confirmation

`packages/claws/src/commands/` (29 files, ~9.0k LoC). Each command's import roots:

| Command | SDK modules consumed |
|---|---|
| `amend.ts` | `amend/`, `compile/`, `governance/`, `ir/` |
| `annotate.ts` | `annotate/` |
| `broadcast.ts` | `fleet/` |
| `build.ts` | `compile/`, `governance/`, `ir/`, `emit/`, `types/` |
| `cache.ts`, `cache/*` | `compile/` (LLMCache), `compiler/cache/` |
| `check.ts` | `compile/`, `governance/`, `ir/` |
| `compile.ts` | `compile/`, `governance/`, `ir/` |
| `comply.ts`, `comply-eu-ai-act.ts` | `audit/`, `compliance/`, `ir/`, `types/` |
| `doctor.ts` | `doctor/` |
| `drift.ts` | `fleet/` |
| `extract.ts`, `extract-watch.ts` | `compile/`, `watch/` |
| `fleet-compile.ts` | `compiler/fleet/` |
| `init.ts`, `uninstall.ts` | `init/`, `scaffold/` |
| `keys.ts` | `keys/` |
| `kill.ts` | `fleet/` |
| `protect.ts` | `protect/` |
| `publish.ts` | `publish/`, `config/` |
| `report.ts` | `fleet/` |
| `scan.ts` | `fleet/` |
| `snap.ts` | `snapshot/` |
| `watch.ts` | `compiler/watch/`, `workspace/` (AutoSnapshotManager only) |

**Conclusion**: every CLI command consumes one or more of `compile/`, `compiler/`, `fleet/`, `init/`, `scaffold/`, `keys/`, `protect/`, `publish/`, `audit/`, `compliance/`, `emit/`, `doctor/`, `detect/`, `annotate/`, `amend/`, `optimize/`, `maker/`, `adapter/`, `context/`, `watch/`. None of these are imported by `claws-serve/src/**` except for narrow slivers (`compile/violation-aware-compile`, `compiler/cache` is not even server-imported). The CLI-ONLY bucketing is internally consistent.

---

## Cross-package: what's already upstream

| Upstream package | LoC | Functionality | Duplicated in claws-sdk |
|---|---|---|---|
| `openclaw-snap` | **1.6k** | SnapshotStore + filesystem/in-memory/server backends + canonicalize/canonicalHash | Yes — `claws-sdk/src/snapshot/` (1.4k) is a parallel implementation |
| `openclaw-policy` | **6.2k** | Policy generator (analyze→canonicalize→generate→emit→runtime) + trust-set + nonce-store + seq-counter + governance/runtime | Partially — `claws-sdk/src/compile/governance-ast.ts` + `compiler/` overlap |
| `openclaw-workspace` | **2.7k** | AST + canonicalize + path + path-canonical + staging | Partially — `claws-sdk/src/workspace/parser.ts` + canonical-json overlap |
| `openclaw-guardrails` | **3.1k** | Approvals + audit + budget + handle-binding + identity + secrets + SIEM + shell-exec-provider | Partially — `claws-sdk/src/protect/` (1.4k) overlaps; CLI bound |
| `openclaw-lsp` | **3.2k** | Language server (semantic-tokens, tension/cross-file, server, providers) | Partially — `claws-sdk/src/detect/` (.9k) overlaps |

**Surface that should move to upstream packages, sized**:
- `claws-sdk/src/snapshot/` (1.4k) → `openclaw-snap`
- `claws-sdk/src/audit/` (1.5k) → new `openclaw-audit` package (or fold into `openclaw-guardrails/audit/`)
- `claws-sdk/src/compliance/` (3.2k) → `openclaw-policy/compliance/` (already has the directory)
- `claws-sdk/src/keys/` (1.8k) → upstream keys package (none today; create at openclaw-keys)
- `claws-sdk/src/governance/` rule definitions (~1.3k) → `openclaw-policy/governance/`
- `claws-sdk/src/compile/governance-ast.ts` + `extract.ts` + LLM extractors (~3k) → `openclaw-policy/compile/`

**Total upstream-bound delete**: ~12.5k LoC from claws-sdk.

---

## Production graph reachability

`hello-charles-real-browser.e2e.test.ts` boots claws-serve + lobster-web in real browser, asserts Charles's name shows.

The actual page-render-critical path:
1. `GET /api/health` (smoke probe)
2. `GET /api/chunks/general/identity` (identity chunk → Charles name surfaces)
3. `GET /api/governance` (banner state)
4. `GET /api/events` (SSE; non-blocking)

`lobster-journey.e2e.test.ts` adds:
5. `GET /api/oc/SOUL.md` + `PATCH /api/oc/SOUL.md` (section edit)
6. `POST /compile` (recompile)
7. `GET /api/oc/snapshots` + `POST /api/oc/snapshots/{name}/restore` (snapshot rail)
8. `POST /api/oc/undo` / `POST /api/oc/redo`
9. `GET /api/workqueue`, `GET /api/sessions`, `GET /api/trust`, `GET /api/chunks/{*}`

**Cross-reference with bucketing**: every route the production graph hits is either LANGUAGE-SERVICES or its body is UPSTREAM-DEFERRED (snapshots/undo/redo/compile). No CLI-ONLY route ever appears in a browser flow. **The trim is safe** — the routes the user reaches stay; the engines underneath them re-home upstream.

---

## Decisions needed (AMBIGUOUS bucket)

### 1. `snapshots-namespace.ts` (route) + `snapshot/` (sdk) — split route from store

**Question**: keep the HTTP wrapper `GET /api/oc/snapshots` / `POST /api/oc/snapshots/{name}/restore` inside claws-serve, or remove and have lobster-web call upstream `openclaw-snap` directly?

**Tentative**: **keep the wrapper, remove the store**. claws-serve continues exposing the LBC §3.1 🟡 routes; behind the route, the storage + manifest read+write happens via upstream `openclaw-snap` (via in-process SDK call or HTTP-to-snap-server). Two reasons: (a) lobster-web's auth model + ETag/If-Match flow lives in claws-serve and shouldn't fan out to two backends; (b) LBC stays a single-server contract.

**Trade-off**: keeps a thin claws-serve wrapper (~200 LoC) language-service code; eliminates ~1500 LoC restore body (UPSTREAM-DEFERRED via in-process delegation to `openclaw-snap.restoreSnapshot()`).

### 2. `oc-diff.ts` (996 LoC) — kernel vs wrapper

**Question**: the diff route bundles file-text-diff (LANGUAGE-SERVICES, ~250 LoC) with R5-redaction + irProbe + audit-emit (UPSTREAM-DEFERRED, ~750 LoC). Split or move whole?

**Tentative**: **split**. Keep `unifiedDiff(a, b) → DiffEnvelope` in language-services. Move R5-redaction + audit-emit out — once policy + audit move upstream, the redaction layer becomes a wrapping middleware on top of the kernel.

**Trade-off**: clean kernel; redaction middleware lives in `openclaw-policy/runtime` long-term. Saves ~750 LoC from claws-serve.

### 3. `compile/` SDK module + `POST /compile` route — what stays in claws

**Question**: 7178 LoC of compile machinery (LLM extract, intent, governance-AST, conflict detect). The route is 228 LoC (LANGUAGE-SERVICES — a thin trigger surface). The body lives in upstream `openclaw-policy/compile/` (which already has `analyze` / `canonicalize` / `extract` / `governance-ast`).

**Tentative**: **route stays, body upstreams**. `POST /compile` becomes a thin HTTP adapter that delegates to `@bic/openclaw-policy/compile.generate()`. The 7k LoC `compile/` module deletes from claws-sdk after upstream `openclaw-policy/compile/` reaches feature parity.

**Trade-off**: claws-serve `/compile` survives as language-service; claws-sdk loses 7k LoC. The CLI re-imports the same `@bic/openclaw-policy/compile` package — single source of truth.

### 4. `governance/` rule registry — split definitions from runtime registry

**Question**: rule definitions (R0–R8, FAIL_MODE rules, fleet-precedence) are policy artifacts (UPSTREAM). The registry that loads + queries them is runtime-language-services.

**Tentative**: **split**. `rule-registry.ts` (read-only registry) + `rules/index.ts` types stay in claws-sdk language-services (~300 LoC). Definitions (`rules/r5-r5locked.ts` + ~1.3k LoC of rule files) move upstream to `openclaw-policy/governance/rules/`.

**Trade-off**: claws-serve gates against rules without owning their definition; matches the architecture R1 panel asked for in M-CRYPTO-MISLABEL (the policy half is normative).

### 5. `ir/` — types vs build

**Question**: ~50 LoC of `hashIR` + types is server-bound (`audit-event.ts` + `governance-ir.ts` types). The other 660 LoC (gov-analysis builder, capability-manifest builder, validate-fail-modes, conflict-report build) is CLI-bound.

**Tentative**: **types-only stay; builders move CLI**. The server reads types/hashIR; the CLI builds IR objects.

**Trade-off**: claws-sdk language-services keeps ~150 LoC of IR types. The 560 LoC of builders re-homes to `packages/claws/src/sdk-ir/` or `openclaw-policy/ir/`.

### 6. `audit/` chain — emit vs verify

**Question**: emit (server-side `auditChainSink`) is server-bound; verify (CLI `comply.ts`) is CLI-bound.

**Tentative**: **both move upstream** to a new `openclaw-audit` package (or `openclaw-guardrails/audit/`). claws-serve imports `auditChainSink` from upstream; CLI imports `verifyChainIntegrity` from the same upstream package.

**Trade-off**: deletes 1.5k LoC from claws-sdk; introduces a new upstream package boundary (1 hop).

### 7. `keys/` — entirely upstream

**Question**: 1.8k LoC of key-management exists only as CLI commands; no claws-serve consumer.

**Tentative**: **delete from claws-sdk**, move to upstream keys package. The `claws keys` CLI re-imports.

**Trade-off**: clean CLI boundary; matches the OpenClaw upstream relationship pattern.

### 8. `workspace/trust-manager.ts` (590 LoC) — server-bound or upstream?

**Question**: `TrustManager` is consumed by `routes/trust.ts` + `routes/session-config.ts` (server-bound) but signs JWTs using a key that's a security-sensitive runtime concern.

**Tentative**: **language-services for now; upstream after policy/keys land**. Today the trust manager lives in claws-sdk because nothing upstream owns it. Once `openclaw-policy/trust-set/` matures past the loader-only state (currently 185 LoC loader), the trust manager moves there.

**Trade-off**: keeps claws-serve self-contained for the Isis wave; defers the move to whenever upstream catches up.

### 9. `workspace/auto-snapshot{,-trigger,-types}.ts` (517 LoC) — upstream-bound

**Question**: auto-snapshot is the workspace-edit→snapshot capture trigger, currently in claws-sdk.

**Tentative**: **move to `openclaw-snap`** as `auto-snapshot/` subdirectory. claws-serve middleware (`commit-on-success.ts`) re-imports.

**Trade-off**: keeps the snapshot domain unified upstream.

### 10. `workspace/governance-diff.ts` (587 LoC) — split

**Question**: governance-diff combines structural diff (LS) with violation-output rendering (could be either).

**Tentative**: **all language-services for now; revisit after policy upstream completes**. Structural file diff is a language service; violation projection can stay until policy moves.

**Trade-off**: keeps the route working end-to-end; defers boundary draw.

### 11. `version-history.ts` (route, 1730 LoC) — undo/redo cursor vs replay body

**Question**: the cursor walking (DAG traversal, `undoCursor`/`redoCursor` state machine, denial taxonomy) is LANGUAGE-SERVICES. The replay body (manifest read + R5 classify + atomic-write group) is UPSTREAM-DEFERRED (snapshot domain).

**Tentative**: **split into two files post-trim**. Keep `version-history-cursor.ts` (~400 LoC) in claws-serve language-services; `version-history-replay.ts` (~1300 LoC) moves to wrap upstream `openclaw-snap.restoreToVersion()`.

**Trade-off**: enables the Rust port to scope undo/redo as a cursor walk (cheap) instead of a manifest-replay engine (expensive).

### 12. `compile/violation-aware-compile.ts` (102 LoC) — server-bound sliver

**Question**: this single file is the only server-bound piece of `compile/`.

**Tentative**: **move to claws-serve directly** as `claws-serve/src/lifecycle/violation-aware-compile.ts`. The rest of `compile/` is purely CLI.

**Trade-off**: lets `claws-sdk/src/compile/` move wholly out of claws-sdk into either CLI tree or `openclaw-policy`.

---

## Recommended trim diff (Phase 1)

Files / directories to `git rm` from `packages/claws-sdk/src/` once upstream parity lands:

```
packages/claws-sdk/src/audit/              (1.5k LoC — moves to openclaw-audit)
packages/claws-sdk/src/keys/               (1.8k LoC — moves to openclaw-keys)
packages/claws-sdk/src/snapshot/           (1.4k LoC — already lives in openclaw-snap)
packages/claws-sdk/src/compliance/         (3.2k LoC — moves to openclaw-policy/compliance)
packages/claws-sdk/src/compile/llm/        (1.4k LoC — moves to openclaw-policy/compile/llm)
packages/claws-sdk/src/compile/intent/     (1.3k LoC — moves to openclaw-policy/compile/intent)
packages/claws-sdk/src/compile/governance-ast.ts + extract.ts + parse.ts + analyze.ts + manifest.ts + conflicts/ + conflicts-ir.ts
                                             (~3k LoC — moves to openclaw-policy/compile)
packages/claws-sdk/src/compile/cache.ts + phase-cache.ts + types.ts (some) + index.ts (rewrite)
                                             (~1.3k LoC — these stay in CLI tree as compile-helper module)
packages/claws-sdk/src/governance/rules/   (~1.3k LoC — moves to openclaw-policy/governance/rules)
packages/claws-sdk/src/ir/conflict-report.ts + gov-analysis.ts + validate-fail-modes.ts + capability-manifest.ts
                                             (~560 LoC — moves to CLI/openclaw)
packages/claws-sdk/src/workspace/auto-snapshot{,-types,-trigger}.ts + approval-events.ts
                                             (~770 LoC — moves to openclaw-snap)

packages/claws-serve/src/routes/snapshot.ts          (588 — legacy POST /snapshot, delete)
packages/claws-serve/src/routes/diff.ts              (329 — legacy GET /diff, delete)
packages/claws-serve/src/routes/admin-reset.ts       (280 — admin/CLI surface, move to CLI)
packages/claws-serve/src/routes/classify.ts          (64 — admin classify, delete)
packages/claws-serve/src/routes/ir.ts                (46 — IR introspection, move to openclaw-policy/lsp)
packages/claws-serve/src/routes/diagnostics.ts       (55 — same)
packages/claws-serve/src/routes/tensions.ts          (85 — already in openclaw-lsp)
packages/claws-serve/src/routes/ir-resolution.ts     (186 — IR view, delete)
```

**Phase 1 deletion total**: ~19.5k LoC LoC from claws-sdk + ~1.6k LoC from claws-serve = **~21k LoC removed from claws** (after upstream parity is reached).

CLI-ONLY content remains in the tree but **moves out of claws-sdk** into a new `packages/claws-cli-sdk/` (or stays in `packages/claws/src/sdk/`) so the language-services slice has no CLI dependencies leaking through.

---

## Lean serve route inventory (post-trim)

The ~12 routes that survive in claws-serve as LANGUAGE-SERVICES:

```
GET  /api/health                                   (probe + version cursors)
GET  /api/status                                   (governance state read)
GET  /api/oc/{file}                                (OC file read, time-travel via ?at=)
GET  /api/oc/{file}/section/{heading}              (OC section read)
GET  /api/oc/HEARTBEAT.md/schedule                 (parsed schedule view)
GET  /api/chunks/{tab}                             (chunks: identity, connections, memory, groups, entitlements, preferences/*)
GET  /api/chunks/general/identity                  (persona)
GET  /api/governance                               (governance state)
GET  /api/workqueue                                (task strip)
GET  /api/sessions                                 (session list)
GET  /api/trust                                    (trust tier read)
GET  /api/oc/snapshots                             (thin wrapper → openclaw-snap)
GET  /api/oc/snapshots/{name}                      (thin wrapper)
GET  /api/oc/diff                                  (diff kernel)
GET  /api/events                                   (SSE)

PATCH /api/oc/{file}                               (general OC edit)
PATCH /api/oc/SOUL.md (loop)                       (sectioned soul edit)
PATCH /api/oc/MEMORY.md (loop)                     (sectioned memory edit)
PATCH /api/chunks/{tab}                            (structured edit)
PATCH /api/chunks/connections/allow-all            (bulk allow)
PATCH /api/sessions/{id}/config                    (session config edit)
POST  /api/batch                                   (atomic multi-op)
POST  /api/oc/snapshots                            (thin wrapper → openclaw-snap)
POST  /api/oc/snapshots/{name}/restore             (thin wrapper → openclaw-snap)
POST  /api/oc/undo                                 (cursor walk; replay → openclaw-snap)
POST  /api/oc/redo                                 (same)
POST  /compile                                     (thin wrapper → openclaw-policy)
```

Total: **~26 endpoints** (down from ~38 today).

---

## Lean sdk module inventory (post-trim)

The ~8 directories that survive in `claws-sdk/src/` as language-services kernel:

```
workspace/             chunk-assembler, parser, heartbeat-parser, soul-sections,
                       memory-sections, schema-builder, schema-types,
                       session-config-editor, session-config-types,
                       session-tool-resolver, session-types, trust-manager,
                       version-store, version-resolver, violation-state,
                       violation-types, workqueue-builder, fs-atomic, governance-diff
                       (~5.5k LoC)
workspace-edit/        StructuredEditor, ValidationPipeline, VersionManager,
                       R5/Fleet/Governance/DenyRemoval validators, lossless,
                       error-messages, errors, types, validation, versioning
                       (~2.5k LoC)
governance/            rule-registry + types (registry only; rule defs move upstream)
                       (~0.3k LoC)
ir/                    governance-ir types + audit-event types only
                       (~0.15k LoC)
types/                 platform, sidecar, snapshots (small), version-history,
                       loss-matrix
                       (~0.5k LoC)
util/                  canonical-json, fs, levenshtein, normalize, path, text
                       (~0.15k LoC)
adapter/               oc-data-adapter only (governance-host moves to CLI)
                       (~0.15k LoC)
[index.ts re-exports, version.ts]
                       (~0.05k LoC)
```

Total: **~9.3k LoC** (down from 66.5k LoC today — factor of 7×).

---

## Estimate for Rust port (post-trim, post-separate)

| Layer | TS LoC | Rust LoC (1.5×) | Notes |
|---|---|---|---|
| `claws-sdk` language-services slice | ~9.3k | ~14k | workspace + workspace-edit + types + util |
| `claws-serve` language-services slice | ~5.5k | ~8k | routes (read + chunks + edit + SSE) + middleware (etag + dry-run + commit + cors + body-limit + violation-gate) |
| Cross-cutting Rust bindings (axum, serde, tokio plumbing) | n/a | ~1–2k | typically smaller than handcrafted TS plumbing |
| **Total Rust port target** | **~14.8k** | **~22–24k** | |

**Comparison vs current rust-port plan's 87k LoC**: factor of **~4× reduction in port scope** (LoC count), or **~6× reduction in LoC-to-port** (since ~58k of TS = CLI-ONLY + UPSTREAM-DEFERRED, neither of which ports).

**Realistic timeline at sustainable pace**:

| Pace | Duration | Notes |
|---|---|---|
| Sustainable (~3k Rust LoC/week incl. tests) | **7–8 weeks** | matches release-eng's "9-week + soak" option |
| Compressed (~5k Rust LoC/week) | **5 weeks** | matches release-eng's "6-week full port" with parallelism |
| Sidecar MVP | **2 weeks** | health + status + identity + governance + 1 PATCH route only — release-eng option (i) |

Recommended: **6-week pace** with the contract-test corpus in flight from week 1, real production cutover in week 7. cp count drops from 9 to **5–6** (cp-1 foundation + cp-2 reads + cp-3 chunks/edits + cp-4 SSE/events + cp-5 mutations + cp-6 cutover).

---

## Verification used

- LBC v0.2 spec at `docs/lobster/specs/LBC-claws-serve-contract.md` lines 96–177 (route inventory §3)
- `packages/lobster-web/src/services/ClawsHttpClient.ts` lines 96–125 (allow-list, source of truth for "what the web app calls")
- `packages/claws-serve/src/server.ts` route registry lines 700–1260 (live mount points)
- `packages/claws-serve/src/routes/index.ts` lines 188–237 (CLAWS_SERVE_VERSION = 0.36.0; prefix scaffold)
- `wc -l` for every file under `packages/claws-sdk/src/**`, `packages/claws-serve/src/**`, `packages/claws/src/**`, `packages/openclaw-{snap,policy,workspace,guardrails,lsp}/src/**`
- Grep: `from '@bic/claws-sdk/...` against `packages/claws/src/commands/` (CLI imports)
- Grep: `from '../../../claws-sdk/...` against `packages/claws-serve/src/` (server imports)
- `packages/claws-test/tests/hello-charles-real-browser.e2e.test.ts` (production smoke; only `/api/health` directly)
- `packages/claws-test/tests/lobster-journey.e2e.test.ts` (production journey)
- `packages/openclaw-policy/src/index.ts` + `packages/openclaw-snap/src/index.ts` (upstream surface)
- `.craft/plans/claws-rust-port.md` (existing plan + R1 pivot section)
- `.craft/out/panels/claws-rust-port/R1-consolidated.md` (R1 panel findings — crypto-mislabel, cutover-rollback, RB-violation, codename discipline)
- `.craft/plans/serve-deploy-bridge.md` (sister deploy plan — A/B/C deployment patterns)

LoC counts are file-level `wc -l`; totals rounded to nearest 0.1k. Bucket assignments are conservative — the AMBIGUOUS bucket is intentionally generous so Phase 1 trim can avoid the ambiguous items until decisions §1–§12 land.
