---
pulse: 83
slug: compiler-event-bus
plan: claws-compile-dx
depends_on: [12]
governing_roles: [craft:architect, claws:platform-eng, craft:codegen]
scenario_codes: [hot-reload/S01]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage src/compiler/events"
    - "cd claws-sdk && npx vitest run --project integration src/compiler/events"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
specs: [CL-14]
source: "claws-compile-dx plan H5; findings from hot-reload/S01; implements CL-14 v1.4 §9"
---

# Pulse 83: `CompilerEventBus` — hot-reload hook surface ready for Horus

## Objective

Land the typed `CompilerEventBus` hook surface from CL-14 v1.4 §9 — the stable
seam the Horus wave's hot-reload runtime will consume. This pulse ships ONLY
the bus, the emission contract, the payload types, and the public subpath
export. The live-reload runtime consumer (actually subscribing to events and
driving the OC Gateway reload signal) is EXPLICITLY a Horus wave deliverable
per CL-14 §9.6, not Ra.

Every documented event type in §9.2 (twenty discriminated-union variants —
`compile.start`, `read.{start,complete,failed}`, `enforce.{start,denied,complete}`,
`emit.{start,complete,failed}`, `validate.{start,complete,failed}`,
`cache.{hit,miss,write}`, `compile.{complete,failed}`) MUST have an emission
site on the appropriate success OR failure path. The bus MUST be zero-cost
when `CompileOptions.events` is absent, synchronous fire-and-forget when
present, and MUST swallow listener exceptions so a broken consumer cannot
break a compile.

Pattern: `./compiler/events` subpath mirrors the v1.2 `./compiler/emit/ts-builder`
pattern from CL-14 §3.2 — public subpath, extension-only stability framing
in JSDoc, NOT re-exported from the top-level barrel.

## Deliverables

- [ ] `claws-sdk/src/compiler/events/bus.ts` — `CompilerEventBus` class per §9.1
      with typed `on<T>(type, listener)`, `once<T>(type, listener)`,
      `off<T>(type, listener)` overloads using
      `Extract<CompilerEvent, { type: T }>` payload inference. `on` and `once`
      return an unsubscribe function. Thin typed wrapper around Node's
      `EventEmitter`.
- [ ] `claws-sdk/src/compiler/events/types.ts` — `CompilerEvent` discriminated
      union per §9.2 — twenty variants, discriminator `type`, every field
      `readonly`, every variant carries the `workspace: string` identifier
      per §9.3 (amended for fleet-mode routing), every variant carries
      `monotonicNs: bigint` per §9.3 (amended for duration math), optional
      sidecar `wallClockIso: string` allowed but not authoritative.
- [ ] `claws-sdk/src/compiler/events/index.ts` — public barrel re-exporting
      `CompilerEventBus`, `CompilerEvent`, and per-variant type aliases for
      consumers that want a pinned variant (`CompileStartEvent`,
      `ReadCompleteEvent`, etc.). JSDoc on every export framing stability as
      "additive-only across minor versions; event payloads MAY gain fields,
      consumers MUST treat the union as open-set."
- [ ] `claws-sdk/package.json` — add `./compiler/events` subpath under
      `exports` per §9.5 — `import` resolves to
      `./dist/compiler/events/index.js`, `types` resolves to
      `./dist/compiler/events/index.d.ts`. Post-rename this will become
      `@bic/claws-sdk/compiler/events`; until Horus migration lands, it
      is `@bic/claws-sdk/compiler/events` per CL-14 §9.6.
- [ ] `claws-sdk/src/compiler/host/compile.ts` — thread
      `options.events?: CompilerEventBus` through the host. If absent, NO bus
      is allocated and NO events fire (zero-cost opt-in per §9.3). If
      present, emit `compile.start` once at the top, `compile.complete` or
      `compile.failed` once at the tail, and delegate per-stage emission
      downstream.
- [ ] `claws-sdk/src/compiler/host/stage-cache.ts` — emit `cache.hit`,
      `cache.miss`, and `cache.write` at every cache boundary (compile-level
      when `stage` absent; per-stage when `stage` present — one of the nine
      reader stages, per §9.2 `stage?` field). `cache.write` MUST fire ONLY
      on the success path per §9.3 amendment — NO `cache.write` on
      `compile.failed` / `emit.failed` / `validate.failed`.
- [ ] `claws-sdk/src/compiler/host/compile.ts` — thread the bus through the
      nine reader stages (soul, tools, agents, memory, identity, user,
      heartbeat, skills, lobster). Each fires `read.start` and exactly one of
      `read.complete` or `read.failed`.
- [ ] `claws-sdk/src/compiler/enforce/` — fire `enforce.start`, then
      `enforce.denied` IF violations are present, then always
      `enforce.complete` per §9.3. `enforce.denied` does NOT replace
      `enforce.complete`; the pair is emitted so consumers always see a
      terminal `enforce.complete`.
- [ ] `claws-sdk/src/compiler/emit/` — per target, fire `emit.start`, then
      exactly one of `emit.complete` or `emit.failed` per §9.3.
- [ ] `claws-sdk/src/compiler/validate/` — per target, fire `validate.start`,
      then exactly one of `validate.complete` or `validate.failed` per §9.3.
- [ ] `claws-sdk/src/compiler/events/bus.ts` — listener-exception guard:
      every `emit()` call wraps listener invocations in try/catch, logs
      caught errors via the compiler's logger, and MUST NOT propagate them
      back into the compiler (per §9.3). The compile MUST succeed with a
      throwing listener registered identically to a compile with no listener
      registered.
- [ ] `claws-sdk/src/compiler/events/bus.ts` — monotonic-clock helper (e.g.
      `process.hrtime.bigint()`) used for every event's `monotonicNs` field
      per §9.3; wall-clock `wallClockIso` attached as an optional sidecar
      only when a caller-supplied `CompileOptions.now` or the compiler's
      wall-clock reference is available.
- [ ] Unit tests (8 L0) per `bus.ts` and `types.ts`:
      (1) typed `on` narrows payload via `Extract<…>`;
      (2) `once` invokes at most once and then auto-removes;
      (3) `off` detaches a listener;
      (4) unsubscribe function returned by `on` detaches the listener;
      (5) throwing listener caught, compile/bus continues (error logged);
      (6) `emit()` with no listeners registered is a no-op (no allocation
          surprises);
      (7) multiple listeners on the same type invoked in registration order;
      (8) listeners for type `A` NOT invoked when type `B` fires.
- [ ] Integration tests (2 L1) wiring the bus into a real `compile()` call
      against the canonical fixture:
      (1) success path: record every event into an ordered array, assert
          `compile.start` first, `compile.complete` last, every reader fires
          a matched `read.{start,complete}` pair, `enforce.{start,complete}`
          pair fires, every target fires `emit.{start,complete}` and
          `validate.{start,complete}` pairs, `cache.write` fires exactly
          once on the success path;
      (2) failure path: inject a reader failure; assert `read.failed` fires
          for the failing stage, downstream stages still drive their events
          consistently, `compile.failed` fires at the tail, and NO
          `cache.write` is emitted.
- [ ] E2E test (1 L2) `event-bus-full-stage-coverage.e2e.test.ts` matching
      the hot-reload/S01 problem statement on the canonical fixture:
      event-count assertions per reader/emitter/validate registry (not
      hardcoded integers), payload discriminator-shape assertions per
      variant (required fields present, `workspace` present, `monotonicNs`
      present). NOT a byte-for-byte payload snapshot — per audit caveat, a
      snapshot would be brittle to payload evolution under §9.3.
- [ ] L3 scenario acceptance test mapping `hot-reload/S01` problem statement
      onto this pulse's runtime surface. Implementation status in
      `scenarios/hot-reload/S01-event-bus-full-stage-coverage/scenario.yaml`
      flips from `pending` to `implemented` once this pulse's tests go green.
- [ ] `claws-sdk/src/compiler/host/types.ts` — add
      `events?: CompilerEventBus` to `CompileOptions`. JSDoc frames the
      field as opt-in; absence means zero-cost no-bus path.
- [ ] JSDoc on every public export in `claws-sdk/src/compiler/events/`
      mirroring the `ts-builder` extension-only framing: "Exported for
      extension packages (Horus hot-reload consumer, observability
      integrations). Not under the stability guarantees of the public
      `compile()` surface. Event payload fields MAY be added in minor
      versions; consumers MUST treat the union as open-set."

## Acceptance Criteria

Each AC below is a scenario-or-spec finding made explicit. Every finding
from hot-reload/S01 (post-audit dispositions) is encoded as exactly one AC.

### CL-14 §9.1 — typed interface contract

- [ ] `AC-01` `CompilerEventBus` exposes `on<T>`, `once<T>`, `off<T>`
      overloads keyed on `CompilerEvent['type']`. Listener signature is
      `(event: Extract<CompilerEvent, { type: T }>) => void` — TypeScript
      narrows the payload at the call site; a consumer calling
      `bus.on('emit.complete', ev => ev.target)` type-checks clean without
      a manual cast. *(§9.1)*
- [ ] `AC-02` `on` and `once` return an unsubscribe function. Calling the
      returned function detaches the listener identically to calling `off`
      with the same arguments. Covered by unit test (4). *(§9.1)*

### CL-14 §9.2 — event union

- [ ] `AC-03` The `CompilerEvent` discriminated union has exactly twenty
      variants discriminated by `type`, matching §9.2: `compile.start`,
      `read.start`, `read.complete`, `read.failed`, `enforce.start`,
      `enforce.denied`, `enforce.complete`, `emit.start`, `emit.complete`,
      `emit.failed`, `validate.start`, `validate.complete`,
      `validate.failed`, `cache.hit`, `cache.miss`, `cache.write`,
      `compile.complete`, `compile.failed`. A TypeScript `switch (event.type)
      { ... }` over the union with an exhaustiveness `never`-check MUST
      compile clean when every variant is handled and MUST error when any
      variant is missed. *(hot-reload/S01-F02; §9.2)*
- [ ] `AC-04` Every field on every variant is `readonly`. The consumer
      cannot mutate a payload in-place; any attempt to assign to a field is
      a TypeScript error. *(§9.2; §9.7)*
- [ ] `AC-05` The `stage?` field on `cache.hit` / `cache.miss` /
      `cache.write` distinguishes compile-level cache boundaries
      (`stage` absent) from per-stage cache boundaries (`stage` present —
      one of the nine reader `StageName` values). A single `cache.*`
      discriminator remains usable at both granularities. *(§9.2)*

### CL-14 §9.3 — emission contract (post-audit strengthened)

- [ ] `AC-06` `compile.start` fires exactly once at the top of `compile()`,
      before any reader stage runs. *(§9.3; hot-reload/S01 problem)*
- [ ] `AC-07` For each of the nine reader stages, `read.start` fires before
      the stage runs, and exactly one of `read.complete` or `read.failed`
      fires after. No stage skips its pair. *(§9.3; hot-reload/S01 problem)*
- [ ] `AC-08` `enforce.start` fires before enforcement runs. If violations
      are present, `enforce.denied` fires with the violations. `enforce.complete`
      ALWAYS fires at the tail of enforcement, regardless of whether
      `enforce.denied` fired — the pair is terminal so consumers always see
      `enforce.complete`. *(§9.3)*
- [ ] `AC-09` Per emit target, `emit.start` fires before the target runs,
      and exactly one of `emit.complete` or `emit.failed` fires after. No
      target skips its pair. *(§9.3; hot-reload/S01 problem)*
- [ ] `AC-10` Per validate target, `validate.start` fires before validation
      runs, and exactly one of `validate.complete` or `validate.failed`
      fires after. No target skips its pair. *(§9.3; hot-reload/S01 problem)*
- [ ] `AC-11` `cache.hit` / `cache.miss` fire at every cache read boundary
      (compile-level and per-stage, per CL-04 §IS-1 incremental stages).
      *(§9.3)*
- [ ] `AC-12` `cache.write` fires ONLY on the success path. If enforce
      denies OR emit throws OR validate rejects, NO `cache.write` event
      may be emitted and NO cache entry may be persisted for that target.
      An integration test covering the failure path asserts
      `cache.write === 0` and `compile.failed === 1`. *(hot-reload/S01-F07;
      §9.3 amendment)*
- [ ] `AC-13` `compile.complete` fires exactly once at the tail of a
      successful compile; `compile.failed` fires exactly once at the tail
      of a failed compile. Exactly one of the two fires per `compile()`
      invocation. *(§9.3; hot-reload/S01 problem)*
- [ ] `AC-14` Every event payload carries a `workspace: string` identifier
      — the absolute workspace path (or caller-supplied content-hash
      identifier) — so fleet-mode consumers can route interleaved events
      correctly. §9.2's illustrative type definitions elide the field for
      readability; the normative contract is that every variant has
      `workspace`. *(hot-reload/S01-F08; §9.3 amendment)*
- [ ] `AC-15` Every event payload carries a `monotonicNs: bigint`
      timestamp sourced from `process.hrtime.bigint()` (or equivalent
      monotonic clock), NEVER from `Date.now()` or `new Date().getTime()`.
      An optional sidecar `wallClockIso: string` MAY be populated for
      operator logs, but its correctness for duration math is NOT
      guaranteed. *(hot-reload/S01-F09; §9.3 amendment)*
- [ ] `AC-16` Listener errors are caught inside the bus's `emit` call,
      logged via the compiler's logger, and MUST NOT propagate back into
      the compiler. A compile with a throwing listener registered behaves
      identically to a compile with no listener registered — `CompileResult`
      is indistinguishable in both cases. Covered by unit test (5).
      *(hot-reload/S01-F05 resolved; §9.3)*
- [ ] `AC-17` When `CompileOptions.events` is absent, the compiler MUST NOT
      allocate a `CompilerEventBus` and MUST NOT emit events. The hook
      surface is zero-cost opt-in. An integration test asserts no bus
      allocation by running `compile()` without `options.events` and
      confirming no event-related code paths execute (e.g. via a coverage
      assertion that `bus.ts`'s `emit()` is never entered on the no-bus
      path). *(§9.3)*
- [ ] `AC-18` Backpressure semantics are synchronous fire-and-forget from
      the compiler's perspective: listeners are invoked on the emitting
      thread inside the bus's `emit` call. The bus does NOT buffer events
      or drop on overflow. A slow listener slows the compile by its
      callback duration — consumers needing isolation MUST run
      fire-and-forget inside their own listener (e.g. enqueue onto an
      internal async queue and return immediately). Documented in JSDoc
      and in `docs/claws/concepts/compiler-events.md`. *(hot-reload/S01-F04;
      §9.3 amendment)*

### CL-14 §9.4 — ordering and concurrency

- [ ] `AC-19` Events from a single `compile()` call are emitted in-order
      with no interleaving across stages within that compile. An
      integration test records the ordered event array and asserts the
      sequence constraint from hot-reload/S01.problem: `compile.start`
      first; all `read.*` pairs precede `enforce.start`; `enforce.complete`
      precedes any `emit.start`; each `emit.complete` precedes its matching
      `validate.start`; `cache.write` follows all `validate.complete`
      events; `compile.complete` last. *(hot-reload/S01-F03 resolved; §9.4)*
- [ ] `AC-20` Concurrent `compile()` calls each hold their own
      `CompilerEventBus` instance when callers supply one per compile. No
      cross-compile interleaving on per-compile buses. *(§9.4)*
- [ ] `AC-21` If a caller SHARES one `CompilerEventBus` across concurrent
      compiles, the bus does NOT synthesize a correlation ID — the
      `workspace` field (AC-14) IS the correlation key. Documented in
      JSDoc. *(§9.4)*

### CL-14 §9.5 — public subpath export (extension-only pattern)

- [ ] `AC-22` The subpath `./compiler/events` is declared under
      `claws-sdk/package.json#exports` with `import` resolving to the
      compiled JS and `types` resolving to the compiled `.d.ts`. Resolution
      works from an external package: a fixture package importing
      `import { CompilerEventBus, CompilerEvent } from
      '@bic/claws-sdk/compiler/events'` type-checks clean and
      resolves the runtime module. (Post-Horus rename: same assertion
      against `@bic/claws-sdk/compiler/events`.) *(§9.5; plan H5
      validation)*
- [ ] `AC-23` The subpath is NOT re-exported from the top-level
      `claws-sdk/src/index.ts` barrel — the events surface is extension-only
      and MUST NOT leak into the main surface's stability guarantees.
      Mirrors the §3.2 pattern for `./compiler/emit/ts-builder`.
      *(hot-reload/S01-F10 resolved; §9.5)*
- [ ] `AC-24` JSDoc on every public export in `events/index.ts` carries the
      extension-only stability framing ("Additive-only across minor versions;
      event payload fields MAY be added; consumers MUST treat the
      `CompilerEvent` union as open-set when switching on `type` and MUST
      ignore unknown event types"). Matches the `ts-builder` JSDoc
      precedent. *(§9.5)*

### CL-14 §9.6 — Horus wave seam

- [ ] `AC-25` The bus and its types are the ONLY symbols Horus's hot-reload
      consumer will import from `claws-compiler`. No other compiler
      internals are re-exported via `./compiler/events`. A CI lint check
      against deep-path imports from `@bic/claws-sdk/compiler/*`
      (other than `events` and `emit/ts-builder`) is added under the same
      lint family §3.2 documented. *(§9.6; hot-reload/S01-F11 resolved)*

### CL-14 §9.7 — non-goals (negative contracts)

- [ ] `AC-26` The bus does NOT support mutation; payload `readonly` fields
      (AC-04) enforce observer-only semantics. Not tested directly (a
      negative behavior) but guaranteed by the type system. *(§9.7)*
- [ ] `AC-27` The bus does NOT persist, rate-limit, or cross process
      boundaries. These are consumer concerns. Documented in
      `docs/claws/concepts/compiler-events.md` so Horus wave and
      observability consumers know what's in their court. *(§9.7)*

### Test assertion strength (audit caveat 2)

- [ ] `AC-28` The `hot-reload/S01` e2e test asserts event counts derived
      from the reader/emitter/validate registries (e.g.
      `readStartCount === readerRegistry.size`, not hardcoded `9`) and
      asserts payload discriminator shape per variant (required fields
      present, `workspace` present, `monotonicNs` present). It MUST NOT
      use a byte-for-byte payload snapshot — §9.3 adds `workspace` and
      `monotonicNs` to every payload and future minor versions may add
      more fields per §9.5's additive-only contract; a snapshot would be
      brittle. *(hot-reload/S01-F06; audit caveat 2)*

### Coverage gate

- [ ] `AC-29` Per-file coverage on new code in
      `claws-sdk/src/compiler/events/` meets the claws-sdk per-file
      threshold (95/90/95/95 — statements / branches / functions / lines)
      per CL-04 coverage contract. `tsc --noEmit` clean.

## Governing Roles

- `craft:architect` — owns CL-14 §9 contract, sign-off on the emission
  discipline and the Horus seam (the bus is Ra's last obligation to the
  Horus wave before the live-reload runtime work starts).
- `claws:platform-eng` — owns the SDK surface and subpath export mechanics,
  sign-off on the `./compiler/events` subpath declaration, the
  extension-only stability framing, and the JSDoc language.
- `craft:codegen` — owns the pattern alignment with `./compiler/emit/ts-builder`
  (§3.2), sign-off that the two "extension-only" subpaths are consistent in
  shape, framing, and versioning discipline.

## Dependencies

- **Pulse 12 (`compile-pipeline-e2e`)** — the host `compile()` function is
  the emission site for `compile.start` / `compile.complete` /
  `compile.failed` and the conductor for per-stage events. This pulse
  threads the bus through that host without rewriting it.
- **CL-14 v1.4 §9** — authoritative spec for the interface, the event
  union, the emission contract, the ordering guarantees, the subpath
  export, the Horus seam, and the non-goals. Every AC above cites a §9
  clause.
- **CL-14 §3.2** — the `./compiler/emit/ts-builder` precedent for the
  extension-only subpath pattern. `./compiler/events` inherits the exact
  same discipline.
- **Scenario hot-reload/S01** — the source of F04 / F06 / F07 / F08 / F09
  findings that produced the §9.3 amendments this pulse implements.
- **Pulse 80 (`incremental-stages`)** — per-stage cache events fire at the
  boundaries pulse 80 defines; `cache.{hit,miss,write}` with the `stage`
  field populated are emitted from the host paths pulse 80 touches. This
  pulse does NOT re-implement the cache; it emits at the cache boundary
  the incremental design introduces.
- **Pulse 81 (`watch-mode`)** — `claws watch` re-triggers `compile()` with
  the same bus instance across edits; this pulse MUST NOT assume one bus
  per process. Watch mode SHOULD pass the same bus to every `compile()`
  call so consumers see a single ordered event stream across the watch
  session (subject to §9.4's per-compile ordering guarantee per
  `compile()`).

## Test Gates

- **Unit (L0, 8 tests)** — `claws-sdk/src/compiler/events/bus.unit.test.ts`
  — per-method coverage of `on` / `once` / `off` / unsubscribe-return /
  listener-exception-swallowing / no-listener-noop / multi-listener-order /
  type-scoping (listeners for A not invoked when B fires).
- **Integration (L1, 2 tests)** —
  `claws-sdk/src/compiler/events/bus.integration.test.ts` — success path
  records the full ordered event array from a real `compile()` call and
  asserts the hot-reload/S01 ordering constraints; failure path injects a
  reader failure, asserts `read.failed` + `compile.failed` fire,
  `cache.write` does NOT fire, downstream stages still drive events
  consistently.
- **E2E (L2, 1 test)** —
  `claws-sdk/tests/e2e/event-bus-full-stage-coverage.e2e.test.ts` —
  exercises the full canonical fixture, asserts event counts derived from
  registry sizes (not hardcoded), asserts payload discriminator shape per
  variant, asserts `workspace` + `monotonicNs` present on every payload.
- **Acceptance (L3, 1 test)** —
  `scenarios/hot-reload/S01-event-bus-full-stage-coverage/scenario.yaml`
  `implementation_status` flips `pending → implemented` once the e2e
  passes. No scenario edits beyond the status flip and the pulse back-reference.
- **Typecheck** — `cd claws-sdk && npx tsc --noEmit` clean. A separate
  `tsc --noEmit` run against a fixture consumer package validates that
  `import { CompilerEventBus } from '@bic/claws-sdk/compiler/events'`
  resolves at the subpath.
- **Coverage** — per-file 95/90/95/95 on `claws-sdk/src/compiler/events/`
  per the claws-sdk coverage contract.

## Scenario Findings Applied

Findings from `scenarios/hot-reload/S01-event-bus-full-stage-coverage/`
disposed as **pulse** or **test** per the R1 audit. Spec-level findings
were already landed into CL-14 v1.4 by the audit commit; this pulse
implements them as AC above.

| Finding | Severity | Audit disposition | How encoded in this pulse |
|---------|----------|-------------------|---------------------------|
| hot-reload/S01-F06 | warning | **test** | AC-28 — e2e asserts counts derived from reader/emitter/validate registries, not hardcoded; enforced by test harness importing the registries at test time. Audit caveat 2: the same test MUST assert payload discriminator shape, NOT byte-for-byte snapshot, because §9.3's `workspace` + `monotonicNs` additions would make a snapshot brittle. |

All other hot-reload/S01 findings (F01-F05, F07-F11) were **spec** or
**spec (resolved)** dispositions — landed in CL-14 v1.4 §9 by the audit
commit. This pulse's AC-06 through AC-27 implement those clauses
faithfully; no amendment to CL-14 is produced here.
