---
pulse: 80
slug: incremental-stages
plan: claws-compile-dx
depends_on: [11, 12]
governing_roles: [craft:architect, craft:codegen, craft:perf-stress]
scenario_codes: [incremental/S01, incremental/S02, incremental/S03]
stage: implementation
test_tiers:
  L0_unit: 10
  L1_integration: 3
  L2_e2e: 2
  L3_accept: 3
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage src/compiler/host/stage-cache src/compiler/cache"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
    - "cd claws-sdk && npx vitest run --project e2e"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
specs: [CL-04, CL-14]
source: "claws-compile-dx plan H2; findings from incremental/S01-S03"
---

# Pulse 80: Incremental Stages — per-stage caches + `stageTimings`

## Objective

Land the per-stage cache layer (CL-04 §IS.1–§IS.6) that skips unchanged
reader stages and propagates invalidation through downstream stages via the
dependency graph. Surface per-stage outcomes on `CompileResult.stageTimings`
so `claws watch` (pulse 81), the `CompilerEventBus` (pulse 83), and CI
snapshot tests can observe cache behavior. Deliver atomic-emit plumbing
(§IS.7) so partial writes are never observable by operators.

This is the H2 payoff: edits to a single OC file re-run exactly the stages
that depend on it and nothing else, while key/version rotation remains a
single-knob full invalidation.

## Scenario Findings Applied

| Finding | Severity | Disposition in this pulse |
|---------|----------|---------------------------|
| incremental/S01-F02 | major | **AC** — canonical fixture sized for 80% reduction |
| incremental/S01-F07 | warning | **Out of scope** (documented future optimization — IR-identity) |
| incremental/S01-F08 | note | **AC + L0 test** — deterministic JSON snapshot for `stageTimings` |
| incremental/S02-F02 | major | **AC** — 80% wall-clock reduction on SOUL edit critical path |
| incremental/S02-F05 | warning | **AC + L3 test** — semantically meaningful SOUL edits verifiable in emit |
| incremental/S02-F06 | warning | **AC** — canonical SOUL format documented in fixture |
| incremental/S02-F07 | note | **AC + L0 parametrized test** — per-stage scoping for all 9 readers |
| incremental/S03-F03 | major | **AC + test hook** — deterministic `compiler.version` override |
| incremental/S03-F05 | warning | **AC + L2 benchmark** — rotation overhead <10% of baseline |
| incremental/S03-F06 | warning | **Out of scope** (deferred — surgical key-only rotation) |
| incremental/S03-F08 | note | **AC + L2 test** — `cache clear` and key rotation converge |

Spec-resolved findings (S01-F01, F03, F04, F05, F06; S02-F01, F03, F04, F08;
S03-F01, F02, F04, F07) land via the §IS.1 + §IS.7 contract amendments in
CL-04 v1.2 and are verified by the ACs below.

## Deliverables

### Stage cache layer (CL-04 §IS.1–§IS.6)

- [ ] `claws-sdk/src/compiler/host/stage-cache.ts` — NEW. `StageCache`
  class wrapping one on-disk directory per stage under
  `.claws/cache/stages/<stage-name>/`. Methods: `get(key)`, `set(key, value)`,
  `has(key)`, `clear()`. Cache key derivation per §IS.1: SHA-256 of
  normalized input content + `compiler.version` + `keySchemaVersion` + (emit
  only) signing-key identity. *(covers S01-F01/F06, S03-F02/F07)*
- [ ] `claws-sdk/src/compiler/host/stage-cache-key.ts` — NEW. Pure key
  derivation, exported for unit tests. Encodes `{contentHash, compilerVersion,
  keySchemaVersion, signingKeyId?}` into the on-disk cache key string. The
  `keySchemaVersion` constant lives here (bumped when derivation changes).
- [ ] `claws-sdk/src/compiler/host/stage-cache-mtime.ts` — NEW. `mtimeFastPath`
  helper: stat input, compare against stored mtime, return `"unchanged"` |
  `"changed"` | `"missing"`. Only re-hashes content when mtime differs.
  *(covers S01-F04)*
- [ ] `claws-sdk/src/compiler/host/stage-deps.ts` — NEW. Static dependency
  graph per §IS.3: readers (9 leaves) → `modelToIR` (aggregator) →
  `baselineAnalysis` → `enforceR5` → `emit` + `validate`. Exposes
  `upstreamOf(stage): StageName[]` and `downstreamOf(stage): StageName[]`
  for invalidation walks. Downstream cache keys MUST fold in all upstream
  IR byte-hashes. *(covers S01-F03, S02-F04)*
- [ ] `claws-sdk/src/compiler/host/compile.ts` — MODIFY. When the compile-level
  cache misses (§IS.5), run the per-stage path: for each reader, consult its
  stage cache; on hit short-circuit, on miss read + parse. Then run
  `modelToIR` / `baselineAnalysis` / `enforceR5` / `emit` / `validate` with
  downstream cache keys that include upstream byte-hashes. Populate
  `stageTimings` entries for every stage (fresh or cached, per §IS.4).
  Preserve the existing compile-level short-circuit: compile-cache hit
  bypasses stage caches and synthesizes `stageTimings` with
  `cacheHit: true, durationMs: 0`.

### stageTimings type + serialization (CL-04 §IS.4)

- [ ] `claws-sdk/src/compiler/host/types.ts` — MODIFY. Add `StageName` union
  (14 stages: 9 readers + 5 downstream), `StageTiming` interface (`stage`,
  `cacheHit`, `durationMs`, `byteHash`), and `readonly stageTimings:
  readonly StageTiming[]` on `CompileResult`. Match CL-04 §IS.4 exactly.
- [ ] `claws-sdk/src/compiler/host/stage-timings-serialize.ts` — NEW.
  `serializeStageTimings(timings, {roundDurations?: boolean})` returns a
  deterministic JSON string (sorted keys, stable stage order from the union
  declaration). *(covers S01-F08 — snapshot friendliness)*

### Atomic emit + principle observability (CL-04 §IS.7)

- [ ] `claws-sdk/src/compiler/emit/atomic-write.ts` — NEW.
  `atomicWrite(path, bytes)` writes to `<path>.tmp-<pid>-<nonce>`, then
  renames. `sweepStaleTempfiles(emitDir)` called at the start of emit to
  clear orphans from prior interrupted runs. *(covers watch/S03-F02, F07
  via §IS.7; also used by pulse 81/82)*
- [ ] `claws-sdk/src/compiler/emit/emit.ts` — MODIFY. Replace all direct
  `writeFile` calls in the emit path with `atomicWrite`. No in-place writes
  allowed in emit. Sweep stale tempfiles on entry.
- [ ] Principle observability is a verify-only obligation here: the existing
  OC and CC emitters (pulses 7, 8) already render principles inline. This
  pulse's L3 test asserts a newly added SOUL principle appears in emit
  output. *(covers S02-F03, F05)*

### Test hooks

- [ ] `claws-sdk/src/compiler/host/compiler-version.ts` — NEW. Exposes
  `getCompilerVersion()` reading `process.env.CLAWS_COMPILER_VERSION_OVERRIDE`
  when set AND `process.env.NODE_ENV === 'test'`, else the package version.
  The override is test-only — production builds ignore it. *(covers S03-F03)*
- [ ] `claws-sdk/tests/fixtures/canonical-oc-workspace/` — NEW canonical
  fixture sized so the 80% wall-clock target is meaningful (non-trivial
  SOUL with 6+ principles, 20+ tools, 10+ agents, a lobster federation with
  3+ handlers). Every stage must do real enough work that ≤2ms cached-hit
  reads demonstrate short-circuit, not bookkeeping. *(covers S01-F02, S02-F06)*

### Tests (10 L0 / 3 L1 / 2 L2 / 3 L3)

- [ ] `claws-sdk/tests/compiler/host/stage-cache-key.unit.test.ts` — L0 (3):
  same inputs → same key; different `compiler.version` → different key;
  `keySchemaVersion` mismatch → different key.
- [ ] `claws-sdk/tests/compiler/host/stage-cache-mtime.unit.test.ts` — L0 (2):
  unchanged mtime skips re-hash; changed mtime forces re-hash (content
  authoritative, mtime is only a hint).
- [ ] `claws-sdk/tests/compiler/host/stage-deps.unit.test.ts` — L0 (2):
  `downstreamOf('soul')` includes `modelToIR`, `baselineAnalysis`,
  `enforceR5`, `emit`, `validate`; readers have no upstream.
- [ ] `claws-sdk/tests/compiler/host/stage-cache-per-reader.unit.test.ts` —
  L0 (1, parametrized over all 9 readers): each reader's cache key is
  scoped to its own input file hash; changing another reader's input does
  not invalidate it. *(covers S02-F07)*
- [ ] `claws-sdk/tests/compiler/host/stage-timings-serialize.unit.test.ts` —
  L0 (1): deterministic JSON output; sorted keys; round-trip stable across
  invocations. *(covers S01-F08)*
- [ ] `claws-sdk/tests/compiler/emit/atomic-write.unit.test.ts` — L0 (1):
  SIGINT during write leaves no partial at the target path; stale
  tempfile sweep clears orphans.
- [ ] `claws-sdk/tests/compiler/host/compile-incremental.integration.test.ts`
  — L1 (3): second compile after no edit populates `stageTimings` with all
  cacheHit:true; downstream cache key includes upstream byte-hash; key
  rotation invalidates every stage.
- [ ] `claws-sdk/tests/compiler/host/compile-incremental.e2e.test.ts` — L2
  (2): full incremental compile wall-clock ≥80% lower than from-scratch
  on canonical fixture; rotation overhead <10% of baseline. *(covers
  S02-F02, S03-F05)*
- [ ] `claws-sdk/tests/compiler/host/compile-incremental.accept.test.ts` —
  L3 (3): scenario acceptance for incremental/S01 (lobster-only), S02
  (SOUL-only principle reflected in emit), S03 (key rotation invalidates
  all + `cache clear` produces identical from-scratch state).

## Acceptance Criteria

### Per-stage cache architecture (CL-04 §IS.1–§IS.3)

- [ ] Each of the 9 reader stages has its own cache entry under
  `.claws/cache/stages/<stage>/`; entries are scoped by the SHA-256 content
  hash of **only** that stage's input file (not a workspace-wide hash).
  *(incremental/S01-F01)*
- [ ] Cache keys are SHA-256 of `{contentHash, compiler.version,
  keySchemaVersion}` for readers and `{...reader fields, signingKeyId}` for
  emit. Non-emit stages do NOT include signing-key identity. *(S01-F06,
  S03-F02, S03-F07)*
- [ ] Each cache entry on disk carries its `keySchemaVersion`; a read with
  mismatched schema version forces a cache miss rather than deserializing
  an incompatible payload. *(S03-F07)*
- [ ] Downstream stage cache keys (`modelToIR`, `baselineAnalysis`,
  `enforceR5`, `emit`, `validate`) include the `byteHash` outputs of ALL
  upstream stages they consume. A stale upstream IR MUST cause every
  downstream stage to miss. *(S01-F03, S02-F04)*
- [ ] Cache lookup uses mtime fast-path: `stat` the input, compare stored
  mtime, only re-hash content when mtime differs. Content hash remains the
  authoritative correctness check. *(S01-F04)*

### `stageTimings` contract (CL-04 §IS.4)

- [ ] `CompileResult.stageTimings` type matches CL-04 §IS.4 exactly:
  `readonly stageTimings: readonly StageTiming[]` where `StageTiming = {
  readonly stage: StageName; readonly cacheHit: boolean; readonly
  durationMs: number; readonly byteHash: string }`.
- [ ] `StageName` union contains all 14 stages in this order: `soul`,
  `tools`, `agents`, `memory`, `identity`, `user`, `heartbeat`, `skills`,
  `lobster`, `modelToIR`, `baselineAnalysis`, `enforceR5`, `emit`,
  `validate`. Order is part of the contract so iterator-based consumers
  are deterministic.
- [ ] `stageTimings` is always populated — both when per-stage caches serve
  the compile AND when the compile-level cache short-circuits (synthesized
  with `cacheHit:true, durationMs:0`). *(§IS.4, §IS.5)*
- [ ] `byteHash` on each `StageTiming` equals the stage's effective cache
  key input hash, providing traceability from a timing entry back to the
  on-disk cache file. *(watch/S02-F06 spec-resolved; reinforced here)*
- [ ] `serializeStageTimings()` output is deterministic: same input → same
  bytes, sorted keys, stage order from the union declaration. *(S01-F08)*
- [ ] Cached-hit stages report `durationMs ≤ 2` on the canonical fixture —
  the hit path itself is fast (mtime stat + manifest read), not fake
  zero-reported durations. *(incremental scenarios wall-clock contract)*

### Dependency graph + invalidation (CL-04 §IS.2–§IS.3)

- [ ] Editing one reader's input file invalidates exactly that reader's
  cache entry; the other 8 readers cacheHit on the next compile.
- [ ] Downstream stages (`modelToIR`, `baselineAnalysis`, `enforceR5`,
  `emit`, `validate`) ALWAYS re-run on any reader cache miss — they MUST
  NOT cacheHit when any upstream byte-hash has changed. *(S01-F03, S02-F04)*
- [ ] Key rotation (either `compiler.version` bump OR audit-chain signing
  key rotation) invalidates ALL 9 readers AND all 5 downstream stages on
  the next compile — the effective cache key for every stage includes key
  identity as required by §IS.1. *(S03-F01, F02)*
- [ ] `claws cache clear` (pulse 79) and key rotation converge: after
  either, the next compile produces identical emit output and identical
  `stageTimings` structure (all `cacheHit:false`). *(S03-F08)*

### Wall-clock targets (canonical fixture)

- [ ] Canonical fixture is documented and sized so the 80% reduction
  target is meaningful: non-trivial SOUL, tools, agents, lobster content
  such that from-scratch compile is ≥100ms and the 8 cached readers'
  combined ≤16ms is a small fraction. *(S01-F02, S02-F06)*
- [ ] Lobster-only edit: second compile wall-clock ≥80% lower than
  from-scratch baseline on canonical fixture. *(incremental/S01)*
- [ ] SOUL-only edit: second compile wall-clock ≥80% lower than
  from-scratch baseline on canonical fixture. *(S02-F02)*
- [ ] Key rotation: second compile wall-clock within ±10% of from-scratch
  baseline — not significantly faster (would indicate partial caching bug)
  and not significantly slower (would indicate rotation overhead).
  *(S03-F05)*

### Atomic emit + principle observability (CL-04 §IS.7)

- [ ] Every emit path uses tempfile-plus-rename (`<target>.tmp-<pid>-<nonce>`);
  zero remaining in-place writes in the emit pipeline.
- [ ] Stale tempfile sweep runs at emit start; orphans from prior
  interrupted compiles are removed before new emit.
- [ ] A semantically meaningful new SOUL principle (e.g. a new list item
  with non-trivial text) is observable in emit output — rendered as a
  generated comment, exported constant, or runtime-queryable metadata.
  *(S02-F03, F05)*
- [ ] After audit-chain key rotation with all 9 inputs unchanged, emit
  output bytes MUST differ from the pre-rotation bytes (signatures
  embedded in output). Byte-identical emit across a rotation is a test
  failure. *(S03-F04, already spec'd in §IS.7)*

### Test hooks + fixtures

- [ ] `CLAWS_COMPILER_VERSION_OVERRIDE` env var changes the effective
  `compiler.version` ONLY when `NODE_ENV=test`; production builds ignore
  it. Unit test asserts both directions. *(S03-F03)*
- [ ] Parametrized per-reader scoping test exercises all 9 readers with
  the same assertion template (change one input → only that reader
  invalidates). *(S02-F07)*

### Quality gates

- [ ] `claws-sdk` per-file coverage 95/90/95/95 (stmts/branches/funcs/lines)
  on new files.
- [ ] `cd claws-sdk && npx tsc --noEmit` exits 0.
- [ ] `cd claws-sdk && npx vitest run --project unit --coverage` passes.
- [ ] `cd claws-sdk && npx vitest run --project integration` passes.
- [ ] `cd claws-sdk && npx vitest run --project e2e` passes.
- [ ] `npm run build` from repo root exits 0 (no cross-package tsc errors).

## Dependencies

- **Pulse 11** (`cache-compile`, CP-2) — existing compile-level
  `CompilationCache` + content-hash key logic. Stage caches layer on top
  per §IS.5; compile-level cache remains the short-circuit fast path.
- **Pulse 12** (`compile-pipeline-e2e`) — compile pipeline gate this
  pulse extends. Pipeline wiring (readers → modelToIR → analysis → emit →
  validate) is the seam where stage caches slot in.
- **CL-04 v1.2** §Incremental Stages (§IS.1–§IS.7) — all contract
  requirements this pulse implements. §IS.7 atomic-emit obligations are
  delivered here and reused by pulses 81 (watch) and 82 (fleet).
- **CL-14 v1.4** §9 — `CompilerEventBus` `cache.hit` / `cache.miss` /
  `cache.write` events with the `stage?: StageName` discriminator. Pulse
  80 emits these **only when `CompileOptions.events` is populated**; the
  bus implementation itself lands in pulse 83. No events fire without
  `events`. Pulse 80 wires emission sites; pulse 83 owns the listener
  surface.

## Out of Scope

- **IR-identity post-parse optimization** — S01-F07. Hashing the parsed IR
  (not source bytes) could short-circuit downstream when reformatting
  changes source hash but not IR. Deferred to a future DX wave; documented
  in CL-04 §IS.6 cross-references.
- **Surgical key-only rotation** — S03-F06. The current invariant is that
  key rotation invalidates ALL stages. A future optimization could
  preserve reader caches on signing-key-only rotation (readers do not
  embed signatures, so their output is unaffected). Deferred.
- **`CompilerEventBus` listener infrastructure** — owned by pulse 83. This
  pulse wires the emission sites (the compiler calls `bus.emit(...)`
  with correctly-shaped payloads) but the bus class, subpath export, and
  listener registry land in pulse 83.
- **`claws watch` CLI** — owned by pulse 81. This pulse delivers the
  `stageTimings` data watch consumes.
- **`claws cache list` enumeration of stage entries** — pulse 79 lists
  compile-level entries; stage-level enumeration is a small follow-up
  after pulse 79 + 80 both land, tracked in CL-04 §IS.6.

## Notes

### Seams with pulse 83 (event bus)

Per CL-14 §9.3, the `cache.*` events carry an optional `stage?:
StageName` discriminator. Pulse 80 emits:

- `cache.hit` with `stage` set for every per-stage cacheHit.
- `cache.miss` with `stage` set for every per-stage cache miss.
- `cache.write` with `stage` set at the end of each stage's run on a
  successful path only. On compile failure (enforce denied, emit throws,
  validate rejects), NO stage-level `cache.write` fires and NO stage
  cache entry is persisted. *(CL-14 §9.3 `cache.write` success-only rule,
  hot-reload/S01-F07)*

Emission is opt-in: absent `CompileOptions.events`, the compiler MUST NOT
allocate a bus or emit events (§9.3 zero-cost-when-unused).

### Cache key interactions

- **`compiler.version` bump** → all stages miss (§IS.2). Pulse 80 honors
  `CLAWS_COMPILER_VERSION_OVERRIDE` in test mode for deterministic
  benchmark verification.
- **Signing-key rotation** → emit stage key differs (signing-key identity
  in its key per §IS.1); reader stages also miss under the current
  invariant (§IS.2 — all stages invalidate on any key rotation). The
  surgical-rotation optimization (S03-F06) is deferred.
- **`keySchemaVersion` bump** → all stages miss. Treat the version as a
  compile-time constant; change it deliberately when adding a new input
  to the cache-key derivation.
- **claws.json rule-set version change** → stages that consume
  `claws.json` miss; pure file-content readers stay cached (§IS.2).

### Why atomic emit lands here

§IS.7 was added in the CL-04 v1.2 audit specifically because incremental
compile re-emits downstream output on every reader-miss compile. A
partial-write left by a SIGINT during emit would be observed by the next
incremental compile's validate stage or by the operator's editor. The
`atomicWrite` helper and `sweepStaleTempfiles` are shared infrastructure
that pulses 81 (watch — Ctrl-C handling) and 82 (fleet — per-workspace
isolation) both reuse. Landing it here avoids duplicating the contract
across three pulses.

### Canonical fixture sizing

The 80% wall-clock reduction target is meaningful only when cacheable
work is the bulk of the baseline compile. The canonical fixture in
`claws-sdk/tests/fixtures/canonical-oc-workspace/` should target a
from-scratch compile ≥100ms so that 8×2ms = 16ms cached hits + fresh
downstream work still leaves room for ≥80% reduction. A minimal stub
fixture (empty SOUL, no tools) is explicitly NOT the benchmark target —
unit tests use smaller fixtures for correctness; the wall-clock e2e tests
use the canonical fixture for realism.
