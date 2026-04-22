# CL-14 — Emitter Architecture

> **Status: Retired** — Succeeded by the per-package spec scheme in
> `c:\src\claws\docs\`. Successor: `workspace/specs/WSE-emitter.md`.
> Content preserved for historical reference. Do not amend.

**Version**: 1.5
**Source**: Ra wave CP-4 R1 review / CP-2 R1 review (user directive 2026-04-16) / Pulse 12.5 `emit-ast-codegen` / claws-compile-dx plan H5
**Atom**: `atom:claws-emitter-architecture` (C118)
**Atom ID**: C118
**Reviewer roles**: craft:codegen, craft:architect, claws:platform-eng, craft:dragon, craft:conformance
**Dependencies**: CL-04 (Compilation Pipeline), CL-06 (Platform Ecosystem), CL-08 (Package Architecture and Graduation Model), CL-13 (Repo Boundary)
**Compliance scope**: Output-integrity — generated code determinism, compile-time safety of emitted TypeScript, SOC2-adjacent via auditor-readable emit output

---

## Summary

Specifies the architectural contract every claws emitter must satisfy, regardless
of target platform. Emitters that produce TypeScript MUST generate output via the
TypeScript Compiler API AST factory (`ts.factory.*`), not via template-string
concatenation. Emitters that produce JSON / Markdown / YAML MUST use typed
builder interfaces backed by schema validation (Zod or equivalent).

The canonical justification is the product's codegen moat: claws's
differentiation rests on high-fidelity, verifiable code generation across seven
platforms. Template-string codegen cannot satisfy that claim. This spec
establishes the quality bar so every future emitter — free-tier OC, free-tier
Claude Code, paid-tier Bedrock / CrewAI / LangGraph / Cursor / Copilot, and any
subsequently added targets — inherits it from day one.

## Scope

- Defines the TypeScript emit contract (AST factory, tsc-strict round-trip, marker
  header, determinism, zero-`@craftworks/` invariant)
- Defines the non-TypeScript emit contract (typed builder interfaces, schema
  validation, diagnostic emission for empty inputs)
- Defines the shared helper module `compiler/emit/ts-builder.ts`, its visibility
  boundary, and how paid-tier emitters in separate packages consume it
- Defines the tsc-strict round-trip e2e gate every TS-producing emitter must
  declare
- Defines how emitter scenarios traceback to this spec (`emit-ast/S01..` shared
  scenario family)

## Non-goals

- The list of supported emit targets — owned by CL-06 (Platform Ecosystem)
- Which targets are free-tier vs paid-tier — owned by CL-08 (Package
  Architecture and Graduation Model)
- How emitters are registered or dispatched — owned by CL-04 (Compilation
  Pipeline) §Phase 5 EMIT
- Output file layout per platform — owned by per-platform specs (OC format in
  CL-09, Claude Code format is platform-native)
- Package naming, repo topology, and registry — owned by CL-13 (Repo Boundary);
  see §4 below for how this spec's typescript-as-dep requirement crosses the
  Horus migration boundary

---

## §1 — TypeScript emit contract

Every emitter whose output includes `.ts` files MUST satisfy all of the
following.

### §1.1 AST factory construction

The TypeScript source of every emitted `.ts` file is constructed from
`ts.SourceFile` nodes assembled via `ts.factory.create*` (e.g.
`createVariableStatement`, `createFunctionDeclaration`, `createClassDeclaration`,
`createExportAssignment`, `createObjectLiteralExpression`,
`createSwitchStatement`). String concatenation of TypeScript source fragments
(template literals, string interpolation, string concatenation) is prohibited in
the emit path. One narrow exception: the marker header line (§1.4) may be
prepended as a string because `ts.factory` cannot reliably attach a
line-leading `//` comment above the first statement.

**Enforcement**: A CI lint rule flags template-literal TypeScript source
strings in `compiler/emit/**` source files. The rule is **aspirational pending
implementation** (tracked as follow-up under pulse 12.5); until the lint
ships, this clause is enforced by review (every PR adding or modifying an
emitter MUST be reviewed by `craft:codegen`) and by the §1.3 round-trip gate
(which catches any template-string regression that produces broken output).
The round-trip gate does NOT catch template-string emitters whose output
happens to compile — that class of regression is what the lint rule is
specifically designed to prevent.

### §1.2 Printer determinism

Printing an AST to a source string MUST use a single `ts.createPrinter`
instance configured as:

```typescript
ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false,
  omitTrailingSemicolon: false,
});
```

All three keys MUST be set explicitly; reliance on TypeScript-version defaults
is prohibited. This printer instance is shared across every emitter that
produces TypeScript so that output is byte-identical for byte-identical input.

### §1.3 tsc-strict round-trip gate

Every emitter whose output includes `.ts` files MUST declare an L2 e2e test
that:

1. Runs `compile()` against a canonical fixture.
2. Collects every emitted `.ts` file into a temporary directory.
3. Constructs a `ts.createProgram` with the following `compilerOptions`:

```typescript
{
  strict: true,
  noUncheckedIndexedAccess: true,
  noFallthroughCasesInSwitch: true,
  exactOptionalPropertyTypes: true,
  isolatedModules: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  lib: ['lib.es2022.d.ts'],
}
```

The four strict-adjacent flags (`noUncheckedIndexedAccess`,
`noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`, `isolatedModules`)
are NOT covered by `strict: true` alone and MUST be set explicitly. They catch
the exact failure modes template-string codegen allowed to slip: unchecked
`Map.get()` / array index results, fall-through switch cases, optional-field
drift between IR and emit, and per-file compilation boundary violations.

The `lib` option pins the global type-library files available to the gate.
Though `target: ES2022` causes TypeScript to default to the ES2022 lib when
`lib` is omitted, that default is implicit — a future TypeScript change
could shift it. Setting `lib: ['lib.es2022.d.ts']` explicitly pins the
globals (`Promise`, `Map`, `Set`, `ReadonlyMap`, `ReadonlySet`) the emitted
code depends on, so the gate's semantic-diagnostic surface is stable across
TypeScript upgrades. This is the same reason §1.2 requires all three printer
keys to be set — no reliance on implicit defaults anywhere in the emit
toolchain.

4. Asserts zero entries in `program.getSyntacticDiagnostics()` and
   `program.getSemanticDiagnostics()`.

The test file is named `emit-tsc-roundtrip.e2e.test.ts` (or per-emitter suffix
when multiple TS-producing emitters coexist). The test MUST exercise every
`.ts` file the emitter produces, not just the top-level `index.ts` — every
handler file, every generated class file, every imported internal module
contributes.

**Enforcement**: This gate is non-negotiable. A failing round-trip blocks
merge; the gate MUST NOT be skipped, `.skip`-ed, or moved to a separate
optional suite.

### §1.4 Marker header

Every emitted `.ts` file MUST begin with a single-line comment on line 1
identifying its origin:

```
// claws-governance:{target}:v{compiler.version}
```

where `{target}` is the stable emit-target identifier (e.g. `oc-gateway`,
`claude-code`) and `{compiler.version}` is the IR's `compiler.version` field
(NOT wall-clock time). The marker is prepended AFTER AST-to-string printing
because `ts.factory` comment attachment to leading statements is unreliable.

`{compiler.version}` is sourced from the IR's `compiler.version` field as
populated at read time. Its value MUST NOT be re-read during emit; if the
package version were to change between stages of a single compile, the IR's
snapshot is authoritative. This is enforced by CM-4's cache key: the content
hash includes `compiler.version`, so a version change invalidates the cache.

### §1.5 Determinism

Two `compile()` calls on byte-identical input MUST produce byte-identical
emitted output. Timestamps in emitted output (e.g. `compiledAt`) MUST be
derived from deterministic input — the content hash prefix or a
caller-supplied `options.now` — NEVER from `new Date()` or `Date.now()`.
This clause subsumes the CM-7 fix landed in commit `571b937d0`.

**Determinism scope**: "byte-identical output" is asserted across:
  - the **same** `compiler.version` (the IR's stamped version)
  - the **same** `typescript` major.minor range (`ts.version` stays within a
    single minor family during a given compile session)

`typescript` printer output can drift across minor versions (e.g. whitespace
normalization changes); this is acceptable risk because the runtime `ts`
version is pinned in `package.json` and the CI matrix validates the
deterministic contract against the pinned version. A consumer bumping
`typescript` outside the pinned range is outside the determinism warranty
and SHOULD re-run their compile suite.

### §1.6 Zero-craftworks invariant

Every emitted `.ts` file MUST be scanned by `verifyNoCraftworksRefs` (from
`compiler/util/craftworks-scan.ts`) before being returned as part of
`EmitResult.files`. If any match is found, the emitter MUST fail-closed:

1. The emitter throws `CompilationDeniedError` (or returns an `EmitResult`
   with `files: []` and a severity-`error` `CompileDiagnostic`), depending on
   which contract matches the emitter's call site. The host's `compile()`
   wraps the emitter call and surfaces the error as a structured diagnostic.
2. No partial files are returned. The emit output for this target is **zero
   files**, not "the files that passed up to the point of violation."
3. Subsequent emit targets in a multi-target compile are still attempted
   (the failure is per-target), but the overall compile is marked unsuccessful
   if any target fails.

"Fail-closed" explicitly means: no files written to disk, no files in
`EmitResult.files`, a structured error visible to the caller. It does NOT
mean: partial-files + diagnostic.

---

## §2 — Non-TypeScript emit contract

Every emitter whose output includes `.json`, `.md`, `.yaml`, or other
non-TypeScript formats MUST satisfy:

### §2.1 Typed builder interfaces

Template functions accept typed input interfaces (TypeScript interfaces or Zod
schemas), NOT arbitrary `Record<string, unknown>`. If the input shape is
malformed, the builder throws a clear error with a specific field reference,
NOT silently producing `undefined` or empty output.

### §2.2 Schema validation for structured formats

Every emitted JSON file MUST be validated against a Zod schema (or equivalent)
BEFORE writing to disk. If validation fails:

1. The emitter catches the Zod error (Zod throws on `.parse`; Zod-safe is
   `.safeParse`). Either API is acceptable, but the emitter MUST NOT let a
   raw `ZodError` propagate out of the emit path.
2. The emitter constructs a `CompileDiagnostic` of severity `error` referencing
   the failing field path from the Zod issue list.
3. The emitter fails-closed per §1.6 — no partial-file writes.
4. If the SCHEMA itself throws (a Zod schema definition is broken — not the
   input), that's a programming error and MUST NOT be silently swallowed. The
   emitter MUST let such errors surface as uncaught exceptions; the host
   `compile()` converts them to severity-`error` diagnostics with a
   "schema-compilation failure" classifier.

### §2.3 Diagnostic emission for empty inputs

When a required IR field is empty (e.g. `soul.principles.length === 0`), the
emitter MUST:

1. Emit the rendered output using a documented sentinel (e.g.
   `_No principles declared._` for Markdown).
2. ALSO emit a `CompileDiagnostic` of severity `warning` (or `info`) naming the
   empty field and its IR source.

Silent rendering of "empty state" text without a diagnostic is prohibited.

**Enterprise reject mechanism**: A compile invocation MAY pass
`CompileOptions.strictness: 'enterprise'` (or similar — the exact option name
is owned by CL-04). When set, severity-`warning` diagnostics from empty
governance fields are promoted to severity-`error`, causing the compile to
fail-closed. This converts "warn only" to "fail-closed" for compliance
surfaces (SOC2, regulatory review) that require every governance field to be
explicitly populated rather than sentinel-filled.

The strictness option and its promotion semantics are defined by CL-04 §Phase
5 EMIT; CL-14 §2.3 establishes the contract that emitters MUST emit the
diagnostic, and CL-04 defines whether the diagnostic blocks the compile or
only warns.

### §2.4 Determinism

Identical to §1.5 — byte-identical input produces byte-identical output. Object
key ordering in emitted JSON MUST be deterministic (sort keys or use a stable
serializer).

---

## §3 — Shared helper module: `ts-builder.ts`

`claws-sdk/src/compiler/emit/ts-builder.ts` is the canonical helper for AST
construction. It MUST expose typed sub-builders for every pattern any emitter
(free-tier or paid-tier) needs:

### §3.1 Required sub-builders

- **SourceFile assembly**: `createSourceFile`, `printStatements`,
  `printWithMarker(source, marker)` (the marker-header utility from §1.4)
- **Imports**: `defaultImport` (single default-specifier form),
  `namedImport` (single- and multi-specifier forms, including type-only
  imports via a `typeOnly` flag)
- **Typed constants**: `typedConst` with explicit `ts.TypeNode`; `constDecl`
  for inferred-type form
- **Literal constructors**: Map literals (`newMapOfStringTo`), Set literals
  (`newSetOfString`, `newSetLiteral`), tuple literals, JSON-like expression
  (`jsonExpr`), object literals (`objectLit`), array literals (`arrayLit`),
  `new`-expressions without type arguments (`newExpr`), template strings
  (`templateStr`)
- **Expression primitives**: identifier references (`id`), string/number/
  boolean/null literals (`str`, `num`, `bool`, `nullLit`), `typeof` /
  logical-not (`typeofExpr`, `notExpr`), binary expressions (`binary` with
  a named `BinaryOp` union covering `===`, `==`, `!==`, `!=`, `<`, `<=`,
  `>`, `>=`, `+`, `&&`, `||`, `??`), property access (`propAccess`), call
  expressions (`call`)
- **Exports**: `exportDefaultObject`, `exportedFunction`, `exportedAsyncFunction`
- **Type surface**: `stringLiteralUnion`, `typeAlias`, `discriminatedUnion`,
  `readonlyMapType`, `readonlySetOfStringType`, `numberType`,
  `stringOrNullish`, `stringOrNull`, `booleanType`, `stringType`, `voidType`,
  `unknownType`, `promiseType`, `arrayType`, `typeLiteral` (with per-entry
  `readonly` support)
- **Control flow**: `ifStmt`, `ternary`, `returnStmt`, `asConstSatisfies`
- **Statement primitives**: `exprStmt`
- **Local helpers**: `localFunction`, `param`

Every sub-builder the OC emitter needs is in this list. Paid-tier emitters
that need additional patterns (e.g. class declarations, try/catch,
switch/case) MUST add sub-builders rather than opening a raw `ts.factory`
path — the "template strings were easier" anti-pattern returns if any
emitter starts composing raw factory calls directly.

Every sub-builder takes typed IR inputs (e.g. `ToolDeclarationIR[]`,
`AgentIR[]`) — never raw strings that could inject TypeScript source.

The sub-builder list is NOT scoped to what OC today needs — it anticipates the
patterns paid-tier emitters will need. Shipping only what-OC-needs has been
explicitly flagged as the "template strings were easier" anti-pattern; every
pattern OC's current output uses is a required sub-builder.

### §3.2 Visibility boundary

`ts-builder.ts` is exported via a **public subpath** `./compiler/emit/ts-builder`
for consumption by paid-tier emitter packages. This is required because
CL-13 §1 places paid-tier emitters in a separate package
(`@bic/claws-sdk`), which cannot import from an "internal-only" module in a
different package (`@bic/claws-sdk`).

**Intended audience**: `ts-builder` is exported for "claws-sdk
extensions only" — claws-internal or bic-internal emitter packages that
implement CL-14. It is NOT a general-purpose TypeScript AST library for
consumer code, and its API is not under the stability guarantees of the public
`compile()` surface. Breaking changes to `ts-builder.ts` between minor
versions of claws-compiler are permitted with release notes.

The subpath is documented as "extension-only" in the package README and in
CL-06; CI verifies no non-emitter consumer imports the subpath (a lint rule
check against `@bic/claws-sdk/compiler/emit/ts-builder` imports outside
of known emitter implementations).

Earlier drafts of this spec (CL-14 v1.0) said ts-builder was "not publicly
exported." That framing was inconsistent with the CL-13 package split and has
been revised in v1.1.

The `./compiler/emit/ts-builder` subpath is one of two "extension-only"
public subpaths this spec defines. The other is `./compiler/events`, added
in v1.3 for the `CompilerEventBus` hook surface — see §9.5. Both subpaths
follow the same pattern: publicly exported for extension packages, not
covered by the stability guarantees of the public `compile()` surface,
additive-only across minor versions.

### §3.3 Consumption by paid-tier emitters

When paid-tier emitters (Bedrock, CrewAI, LangGraph, Cursor, Copilot) are
built in `@bic/claws-sdk`, they MUST:

1. Import from `@bic/claws-sdk/compiler/emit/ts-builder`
2. NOT reimplement the AST construction patterns in §3.1
3. Register themselves via the emit registry (CL-04 §Phase 5 EMIT)
4. Declare their own `emit-tsc-roundtrip.e2e.test.ts` per §1.3

Any paid-tier emitter PR that imports `typescript` directly without going
through `ts-builder` MUST be rejected in review — it represents a fork of the
shared pattern and will drift.

---

## §4 — `typescript` as dependency

`@bic/claws-sdk` (formerly `@bic/claws-sdk`, renamed under the
Horus migration per CL-13) MUST declare `typescript` in `dependencies`
(not `devDependencies`). The TypeScript Compiler API is a runtime requirement
for emit.

"Runtime" here means: runtime of the compiler host (the process executing
`compile()`), NOT runtime of the emitted OC plugin. The OC plugin itself is
plain JavaScript/TypeScript that runs inside the OC Gateway and has no
`typescript` dependency. Only the claws-compiler that PRODUCES the plugin
needs `typescript` at its own runtime.

### §4.1 Horus migration interlock

The Horus migration (per CL-13) renames `claws-sdk` → `claws-compiler` and
relocates packages from `@craftworks/*` / `@gim-home/*` to `@bic/*`. The
typescript-as-dep requirement follows the package through the migration:

- **Pre-Horus**: `@bic/claws-sdk` — typescript in `dependencies` (lands
  in Ra CP-2 via commit 28df5cfa3).
- **Post-Horus**: `@bic/claws-sdk` — typescript remains in
  `dependencies`.
- Paid-tier `@bic/claws-sdk` (which extends claws-compiler) — transitively
  receives typescript via its dep on claws-compiler; does NOT add its own
  direct dep.

During the migration's `ExactPatchPin` state (CL-13 §7 state 5), consumers
pin an exact patch version of claws-compiler; that pin transitively pins the
typescript version for that release.

### §4.2 Version floor

The expected version floor is `^5.0.0` (`ts.factory` stabilized in TS 4.0,
but the `moduleResolution: 'Bundler'` used by §1.3 requires TS 5.0+).
Determinism warranty per §1.5 holds within a single TS major.minor; consumer
bumps outside that range MAY produce byte-drift and SHOULD trigger a compile
re-run.

---

## §5 — Scenario family

Emit scenarios that trace against this spec are prefixed `emit-ast/`:

- `emit-ast/S01` — TypeScript emit path is AST-constructed (no template
  strings)
- `emit-ast/S02` — tsc-strict round-trip gate catches regressions
- `emit-ast/S03` — emit output is byte-deterministic across runs
- `emit-ast/S04` — marker header is present on line 1 of every emitted `.ts`
- `emit-ast/S05` (paid-tier) — additional emitters inherit the bar from
  ts-builder without re-implementing AST construction
- `emit-schema/S01` — non-TypeScript emit uses schema-validated typed builders
- `emit-schema/S02` — empty-input diagnostics are emitted alongside sentinel
  rendering

The `emit-schema/*` scenarios are placeholder slots pending the CC emitter
quality pass (task #15 in the Ra agent team). Until task #15 lands, §2
compliance is verified by review rather than by scenario test.

Each scenario accumulates findings the same way design scenarios do: per
reviewer round, with severity-classified findings. Scenarios are authored in
`design/claws/scenarios/emit-ast/` and `design/claws/scenarios/emit-schema/`.

---

## §6 — Migration path for existing emitters

### §6.1 OC emitter

Pulse 12.5 (`emit-ast-codegen`) rewrites the OC emitter from template strings
to `ts-builder.ts`-based AST construction. Landed in Ra CP-2 via commits
`28df5cfa3` (rewrite) and `a5cd208fb` (R1 refinements — stricter tsc flags +
explicit printer config + expanded sub-builder list).

### §6.2 Claude Code emitter

Claude Code emits no TypeScript — its output is CLAUDE.md (Markdown) and
settings.json (JSON). The CC quality pass (task #15) applies §2 (typed
builders + Zod schema for settings.json + diagnostic emission for empty
inputs). Target: fast-follow after pulse 12.5 lands cleanly. Until task #15
ships, CC remains on typed-string builders + runtime validation; §2.2 schema
validation is a forward obligation, not a present capability.

### §6.3 Paid-tier emitters

Bedrock, CrewAI, LangGraph, Cursor, and Copilot emitters do not yet exist in
the free-tier-only `@bic/claws-sdk` (their pulse 9 scaffolding was
deleted as orphan in CM-9). When they are built, each inherits this spec
from day one — no template-string implementation is acceptable.

The deleted pulse 9 commit (`92f3d47ba`) is marked as
**reference-only — DO NOT cherry-pick verbatim**. Its discriminated-union
type surface (`HandlerRequest`, `HandlerResponse`) may inspire the paid-tier
type design, but its template-string handler output is explicitly prohibited
by §1.1. Any paid-tier emitter PR attempting to cherry-pick the deleted
commit's handler code without rewriting the TS generation path MUST be
rejected in review.

**Enforcement gap**: there is no automated guard today that blocks a
cherry-pick of `92f3d47ba`. Closing that gap is tracked as a follow-up under
§7.1's lint-rule work — the lint rule that forbids template-literal TS
source strings also catches the cherry-pick case because the deleted commit's
output path is exactly template-literal concatenation.

---

## §7 — Enforcement

### §7.1 CI gates

- `emit-tsc-roundtrip.e2e.test.ts` runs on every PR touching
  `claws-sdk/src/compiler/emit/` OR `claws-sdk/src/compiler/util/` OR
  `claws-sdk/src/compiler/ir/` (the three module boundaries that emit output
  depends on). The gate is not filtered solely by `compiler/emit/` — a
  change to shared utilities can silently affect generated TypeScript.
- `graduation.accept.test.ts` continues to enforce zero-`@craftworks/` at the
  source level.
- **Follow-up lint rule (pending)**: a CI lint pass MUST flag
  template-literal TypeScript source strings in `claws-sdk/src/compiler/emit/`
  and in any `@bic/claws-sdk` paid-tier emitter package. This is aspirational
  pending implementation — the lint rule's absence is the known gap that
  §1.1 and §6.3 call out.

### §7.2 Review checklist

Any PR adding a new emitter (free-tier or paid-tier) MUST be reviewed by
`craft:codegen` and `claws:platform-eng` specifically against this spec's
§1 + §2 + §3 checklist. The reviewers verify:

- AST factory is used for every `.ts` file (§1.1)
- All three printer config keys are set (§1.2)
- Round-trip gate with all nine compilerOptions is declared (§1.3)
- Marker header is on line 1 (§1.4)
- Determinism test is present (§1.5)
- `verifyNoCraftworksRefs` is wired (§1.6)
- For non-TS output: Zod schema validation (§2.2) and empty-input diagnostic
  (§2.3) are present
- For paid-tier: import from `ts-builder` subpath (§3.3), not direct
  typescript import

---

## §8 — Related specs (back-links)

CL-14 constrains how emitters in other specs' scope MUST behave. The following
specs should reference CL-14 as a forward-facing constraint:

- **CL-04 (Compilation Pipeline)** — §Phase 5 EMIT should reference CL-14
  for emit contract details; registration and dispatch remain CL-04's scope.
- **CL-06 (Platform Ecosystem)** — the per-platform emit target list should
  note that every target's emitter MUST satisfy CL-14, and that paid-tier
  emitters in `@bic/claws-sdk` MUST use the `ts-builder` subpath per §3.2.
- **CL-08 (Package Architecture and Graduation Model)** — the MIT-vs-proprietary
  source split discussion should note that CL-14 §1–§3 applies on both sides
  of the split; the quality bar is license-agnostic.
- **CL-13 (Repo Boundary)** — §7 state-machine (Horus migration) inherits the
  typescript-as-dep requirement from CL-14 §4.1.

Back-link amendments to CL-04/CL-06/CL-08 are queued as part of this spec's
ratification (CL-13 is Horus-wave scope and user-owned). Until those
amendments land, this §8 is the one-way cross-reference.

---

## §9 — CompilerEventBus

The compiler MUST emit structured events at every compile stage so downstream
consumers (the Horus wave's hot-reload integration, observability tooling, CI
reporters) can observe the compile without modifying compiler internals. The
event bus is a HOOK surface, not a plugin system — listeners observe, they
do not mutate.

This section specifies the hook contract Ra ships in the claws-compile-dx
plan (H5); the live-reload runtime that consumes the bus is explicitly a
Horus-wave deliverable (see §9.6).

### §9.1 Interface contract

The bus is a thin typed wrapper around Node's `EventEmitter`. Typed
`on`/`once`/`off` overloads enable `Extract<CompilerEvent, { type: T }>`
payload inference:

```typescript
export class CompilerEventBus {
  on<T extends CompilerEvent['type']>(
    type: T,
    listener: (event: Extract<CompilerEvent, { type: T }>) => void
  ): () => void;  // returns unsubscribe function

  once<T extends CompilerEvent['type']>(
    type: T,
    listener: (event: Extract<CompilerEvent, { type: T }>) => void
  ): () => void;

  off<T extends CompilerEvent['type']>(
    type: T,
    listener: (event: Extract<CompilerEvent, { type: T }>) => void
  ): void;
}
```

`on` returns an unsubscribe function; callers MAY call the returned function
to detach the listener without threading the listener reference to `off`.

### §9.2 Event union

The event union's discriminator is `type`. Payloads are fully typed and every
field is `readonly`:

```typescript
export type CompilerEvent =
  | { type: 'compile.start'; contentHash: string; targets: readonly EmitTarget[]; cacheEnabled: boolean; now: string }
  | { type: 'read.start'; stage: StageName; inputPath: string }
  | { type: 'read.complete'; stage: StageName; cacheHit: boolean; durationMs: number; byteHash: string }
  | { type: 'read.failed'; stage: StageName; error: string }
  | { type: 'enforce.start'; violationCount: number }
  | { type: 'enforce.denied'; violations: readonly R5Violation[]; severity: ViolationSeverity }
  | { type: 'enforce.complete'; durationMs: number }
  | { type: 'emit.start'; target: EmitTarget }
  | { type: 'emit.complete'; target: EmitTarget; files: readonly EmittedFile[]; durationMs: number }
  | { type: 'emit.failed'; target: EmitTarget; error: string }
  | { type: 'validate.start'; target: EmitTarget }
  | { type: 'validate.complete'; target: EmitTarget; report: ValidationReport; durationMs: number }
  | { type: 'validate.failed'; target: EmitTarget; report: ValidationReport }
  | { type: 'cache.hit'; key: string; stage?: StageName }   // stage? for per-stage cache hits
  | { type: 'cache.miss'; key: string; stage?: StageName }
  | { type: 'cache.write'; key: string; stage?: StageName; sizeBytes: number }
  | { type: 'cache.evicted'; key: string; stage?: StageName; reason: 'lru' | 'quota' | 'ttl' | 'clear'; sizeBytes: number }
  | { type: 'compile.complete'; durationMs: number; result: CompileResult }
  | { type: 'compile.failed'; durationMs: number; diagnostics: readonly CompileDiagnostic[] }
  | { type: 'compile.cancelled'; durationMs: number; reason: string };

// `ViolationSeverity` is the governance-surface type
// (`claws-sdk/src/compiler/enforce/types.ts#ViolationSeverity`) shared with
// fail-closed enforcement — 'critical' | 'high' | 'medium'. The
// `enforce.denied.severity` field summarizes the underlying R5Violation
// severities so consumers switch on the same vocabulary the enforcement
// subsystem uses internally; a disjoint CI-severity union ('error' | 'warning')
// would fork the type and make consumer code guess which union applies.
```

The union enumerates exactly **twenty** variants — a fixed set that
`CompilerEventBus` assertions and the `events-exhaustive` integration test
pin. Additive growth is permitted under §9.5 stability (minor version);
removal or rename of a variant is a major-version change.

The `stage?` field on `cache.*` events distinguishes compile-level cache
boundaries (stage absent) from per-stage cache boundaries (stage present,
one of the nine reader stages). This keeps a single `cache.*` discriminator
usable at both granularities without forking the event type.

**Severity vocabulary (v1.5 amendment)**. The `enforce.denied.severity`
union uses `ViolationSeverity` (`'critical' | 'high' | 'medium'`) — the
same union fail-closed enforcement reports internally. Prior versions of
this spec (v1.4 and earlier) declared `'critical' | 'error' | 'warning'`
(CI-severity vocabulary). The implementation shipped against
`ViolationSeverity` from inception, so the v1.5 amendment aligns the spec
with the live seam; no consumer change is required if the consumer was
written against the runtime payload. Consumers written against v1.4's spec
text MUST update their `switch` arms from `'error'|'warning'` to
`'high'|'medium'`.

**Rationale for two new variants (v1.5 amendment)**. The 20-event target
the CP-4 exit criterion carries had been stated by multiple pulses but
undelivered by two variants. `compile.cancelled` pairs with watch-mode
cancellation flows (SIGINT during an in-flight compile, `AbortSignal`
interrupt, compile-queue stale-discard); it is distinct from
`compile.failed` because no diagnostics are produced — the compile was
interrupted before a terminal event could fire. `cache.evicted` fires
when the compile-level or stage-level cache evicts an entry under
pressure (LRU, quota, TTL, or explicit `cache clear`); advisory only —
consumers MUST NOT treat it as a correctness signal because the next
compile will simply rebuild the entry.

### §9.3 Emission contract

Every emitter MUST fire events at stage boundaries when
`CompileOptions.events?: CompilerEventBus` is provided:

- `compile.start` fires exactly once per `compile()` call, before any reader
  stage runs.
- Every reader stage fires `read.start` and exactly one of `read.complete` or
  `read.failed`.
- `enforce.start`, then `enforce.denied` IF violations are present, then
  `enforce.complete`. `enforce.denied` does NOT replace `enforce.complete` —
  the pair is emitted so consumers always see a terminal `enforce.complete`.
- Per target: `emit.start`, then exactly one of `emit.complete` or
  `emit.failed`.
- Per target: `validate.start`, then exactly one of `validate.complete` or
  `validate.failed`.
- `cache.hit` / `cache.miss` / `cache.write` at every cache boundary —
  compile-level and per-stage (per the incremental-compile design in CL-04
  §Incremental Stages).
- `compile.complete` or `compile.failed` fires exactly once at the end.

**`cache.write` fires ONLY on the success path.** If the compile fails
(enforce denies, emit throws, validate rejects), NO `cache.write` event
may be emitted and NO cache entry may be persisted. The failure path
surfaces via `compile.failed` / `emit.failed` / `validate.failed`; consumers
relying on `cache.write` to detect a durable compile outcome MUST see it
only when the compile produced a persisted cache entry. *(Source:
hot-reload/S01-F07)*

Events are fire-and-forget. Listener errors are caught by the bus and logged
but MUST NOT propagate back into the compiler. The bus itself does not throw
— a listener registering a bad shape or throwing inside its callback cannot
break the compile.

When `CompileOptions.events` is absent, the compiler MUST NOT allocate a bus
or emit events — the hook surface is opt-in and has zero cost when not used.

**Backpressure semantics** *(Source: hot-reload/S01-F04)*: The bus is
**synchronous fire-and-forget from the compiler's perspective**. Listeners
are invoked on the emitting thread (§9.4) inside the bus's `emit` call,
but because §9.3 guarantees listener exceptions are caught and §9.7
establishes that listeners are observers (not gatekeepers), a slow or
stalled listener DOES slow the compile by its own callback duration.
Consumers that need isolation (e.g. a remote-log-writing hot-reload
gateway) MUST themselves run fire-and-forget inside their listener
(e.g. enqueue the event onto an internal async queue and return
immediately). The bus does NOT buffer events or drop on overflow —
high-frequency event storms (e.g. per-stage `cache.hit` bursts across
a large fleet compile) are the consumer's concern to throttle.

**Payload carries `workspace` identifier** *(Source: hot-reload/S01-F08)*:
Every `CompilerEvent` payload MUST carry a `workspace: string` field
identifying the workspace the event pertains to. In fleet mode (CL-01
§claws fleet compile), multiple workspaces compile concurrently; their
events interleave on any shared bus. The `workspace` field is a stable
identifier — the absolute workspace path or a content-hash — so consumers
can route events correctly. §9.2's event-union types MUST be read as
"every variant includes a `workspace` field" even though the illustrative
type definitions above elide it for readability; the normative contract
is `workspace` is present on every event.

**Monotonic timestamps** *(Source: hot-reload/S01-F09)*: Event
timestamps are sourced from a **monotonic clock** (e.g. `process.hrtime`
or `performance.now()` expressed in nanoseconds since compile start),
NEVER from `Date.now()` or `new Date().getTime()`. Wall-clock timestamps
can jump backward on NTP sync, producing negative durations when a
consumer computes `emit.complete.ts - emit.start.ts`. The event type
exposes monotonic timestamps via a `monotonicNs: bigint` field;
wall-clock, when useful for operator logs, is provided as an optional
sidecar field (`wallClockIso: string`) whose correctness for duration
math is NOT guaranteed.

### §9.4 Ordering and concurrency

- Events from a single `compile()` call are emitted in-order. No interleaving
  across stages within a single compile.
- Multiple concurrent `compile()` calls each hold their own
  `CompilerEventBus` instance when `CompileOptions.events` is populated by
  the caller. The bus is safe for synchronous listeners — listener
  invocations happen on the emitting thread, so no locking or queueing is
  required.
- If a caller elects to SHARE one `CompilerEventBus` across concurrent
  compiles, listeners MUST distinguish compiles by a correlation ID the
  caller threads through the event payload (e.g. by including a
  caller-owned ID in `CompileOptions`). Correlation is a CALLER concern —
  the bus does not synthesize correlation IDs, because a bus that generated
  its own IDs would create ambiguity for callers that already have a
  compile identifier.
- There is no deadlock risk: listeners run synchronously on the emitting
  thread and cannot re-enter `compile()`.

### §9.5 Public subpath export

Like `ts-builder` (§3.2), `CompilerEventBus` is exported via a public
subpath so extension packages can consume it across the package boundary:

```json
// package.json#exports
"./compiler/events": {
  "import": "./dist/compiler/events/index.js",
  "types": "./dist/compiler/events/index.d.ts"
}
```

**Intended audience**: extension packages, observability integrations, and
the Horus wave's hot-reload consumer. The event payload surface is NOT
under the stability guarantees of the public `compile()` surface — event
payloads MAY gain fields between minor versions. Back-compat is
additive-only: no field is removed or renamed within a major version, and
no event type is removed or renamed within a major version. New event
types MAY be added in a minor version.

Consumers importing from `./compiler/events` SHOULD treat the
`CompilerEvent` union as open-set when switching on `type` — unknown event
types SHOULD be ignored rather than fail the listener.

This subpath follows the same "extension-only" pattern §3.2 established for
`./compiler/emit/ts-builder` — publicly exported for known extension
consumers, breaking changes permitted with release notes, not re-exported
from the top-level barrel.

### §9.6 Horus wave integration seam

The Horus wave's hot-reload plan consumes this event bus to:

- Subscribe to `emit.complete` → write emitted files to a live OC Gateway
  watched directory.
- Subscribe to `validate.failed` → surface errors to the developer without
  restarting the session.
- Subscribe to `compile.complete` → trigger an OC Gateway reload signal.

**Ra's obligation**: ship the typed bus, the subpath export, and the emission
contract in §9.3.

**Horus's obligation**: consume the bus to deliver the live-reload runtime.

The bus is the ONLY stable seam between Ra-compiler and Horus-runtime. Horus
MUST NOT import `CompilerEventBus` from anywhere other than
`@bic/claws-sdk/compiler/events` (or the pre-rename
`@bic/claws-sdk/compiler/events` during the Horus migration window).
Any Horus-side import that reaches into internal paths of the compiler
package MUST be rejected in review — the whole point of the subpath is to
lock the seam.

### §9.7 Non-goals

- The bus does NOT support mutation. Listeners observe; they do not modify
  compile inputs or outputs. Attempting to reach through an event payload
  to mutate a shared IR node is a programming error — the payload's
  `readonly` fields are the contract, and consumers relying on structural
  mutability are outside the warranty.
- The bus does NOT persist events. Observability persistence (replay,
  time-series storage, audit log rehydration) is a consumer concern.
- The bus does NOT rate-limit or sample. If a consumer wants to throttle
  high-frequency events (e.g. per-stage `cache.hit` bursts across a large
  fleet compile), it does so in its own listener.
- The bus does NOT cross process boundaries. It is in-process only. For IPC,
  consumers serialize events themselves — the event union is JSON-safe
  (every field is a primitive, a readonly array of primitives, or a typed
  payload that is itself JSON-safe), so serialization is straightforward,
  but the bus provides no transport.

---

## Version history

- **1.4 (2026-04-16)**: Scenario findings audit (claws-compile-dx R1 — hot-reload/S01):
  - §9.3: `cache.write` MUST fire ONLY on success (never on compile.failed /
    emit.failed / validate.failed paths).
  - §9.3: backpressure semantics made explicit — bus is synchronous
    fire-and-forget from the compiler; listener isolation is the consumer's
    responsibility (no bus-side buffering or drop-on-overflow).
  - §9.3: every event payload MUST carry a `workspace: string` identifier
    for fleet-mode event routing; §9.2 type definitions elide the field for
    readability but the normative contract is "every variant has `workspace`".
  - §9.3: timestamps MUST be monotonic (`monotonicNs: bigint`); wall-clock
    (`wallClockIso: string`) is an optional sidecar whose correctness for
    duration math is NOT guaranteed.
  - Source: `.craft/waves/260412+ra-the-radiant+claws-graduation/panels/claws-compile-dx-findings-audit/R1-audit.md`
- **1.3 (2026-04-16)**: §9 CompilerEventBus added (claws-compile-dx plan H5
  — Ra ships the hook interface, Horus wave consumes it). New public
  subpath `./compiler/events` joins `./compiler/emit/ts-builder` as a
  second "extension-only" export; §3.2 cross-references §9.5. Event
  payload surface documented as additive-only across minor versions;
  listener errors caught by the bus and MUST NOT propagate. Non-goals
  explicitly enumerated: no mutation, no persistence, no rate-limiting,
  no IPC. Horus wave integration seam locked: Horus MUST NOT import
  `CompilerEventBus` from any path other than
  `@bic/claws-sdk/compiler/events`.
- **1.2 (2026-04-16)**: Phase 2 code-review follow-up (CC-2 / CC-3 / CC-4
  from `panels/emit-ast-code-r1/R1-consolidated.md`).
  - §1.3: added `lib: ['lib.es2022.d.ts']` as a 10th compilerOption. Rationale
    added explaining that `lib` is implicitly derived from `target` but MUST
    be pinned explicitly for stability across TypeScript upgrades — the
    same "no implicit defaults" discipline §1.2 applies to the printer.
    Matches the existing `emit-tsc-roundtrip.e2e.test.ts` configuration,
    eliminating the code-vs-spec drift flagged in the R1 review.
  - §1.6: no text change, but the CC-2 wiring landed — `verifyNoCraftworksRefs`
    is now invoked from `BaseEmitter.finalizeFiles` and every concrete
    emitter routes its `EmitResult` through it before returning. The
    invariant is now enforced in-path rather than by downstream review,
    matching the "fail-closed" phrasing that was aspirational in v1.1.
  - §3.1: sub-builder list expanded to match the builders oc-emitter
    actually calls after the CC-3 refactor. New entries: `defaultImport`,
    `namedImport` (with `typeOnly`), `constDecl`, `objectLit`, `arrayLit`,
    `newExpr`, `templateStr`, `id`, `str`, `num`, `bool`, `nullLit`,
    `typeofExpr`, `notExpr`, `binary` (with `BinaryOp` union), `propAccess`,
    `call`, `exprStmt`, `stringOrNull`, `stringType`, `voidType`, `unknownType`,
    `promiseType`, `arrayType`, `typeLiteral`. Goal: zero direct `ts.factory.*`
    call sites in `oc-emitter.ts` for value/expression/statement composition;
    the remaining direct calls are one-off method/arrow-function/type-node
    shapes with no general-purpose sub-builder equivalent.
- **1.1 (2026-04-16)**: R1 panel refinements. 5-role panel (architect,
  codegen, conformance, dragon, platform-eng) returned 21 Majors across the
  v1.0 draft. Amended:
  - §Dependencies: CL-08 name corrected ("Package Architecture and
    Graduation Model", not "Freemium Boundary"); CL-13 added.
  - §Non-goals: CL-04 section reference corrected to "§Phase 5 EMIT" (from
    "§Emit Stage").
  - §1.1: enforcement clause added — explicit acknowledgment that lint rule
    is aspirational pending implementation, gap filled by review + §1.3.
  - §1.2: "all three keys MUST be set explicitly" clarified.
  - §1.3: expanded compilerOptions to include `noUncheckedIndexedAccess`,
    `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`,
    `isolatedModules`. Explicit "exercise every emitted `.ts` file" clause
    added.
  - §1.4: `{compiler.version}` sourcing clarified; cache-key interlock noted.
  - §1.5: determinism scope defined (`compiler.version` + TS major.minor).
  - §1.6: "fail-closed" precisely defined (zero files, not partial + diag).
  - §2.2: Zod error handling specified; schema-itself-broken case handled
    separately from input-broken case.
  - §2.3: enterprise reject mechanism specified (`CompileOptions.strictness`
    promotes warnings to errors, owned by CL-04).
  - §3: renamed from "internal helper" to "shared helper module"; §3.2
    rewrites visibility boundary to reflect CL-13 package split (ts-builder
    IS publicly exported via subpath for extension consumption, documented
    as extension-only); §3.1 sub-builder list expanded to match what OC
    emitter actually uses + what paid-tier will need.
  - §3.3 added: explicit consumption contract for paid-tier emitters.
  - §4: "runtime" semantics clarified (host runtime, not emitted artifact
    runtime); §4.1 added for Horus migration interlock; §4.2 added for
    version floor discussion.
  - §6.1 landed-commit references added.
  - §6.3: cherry-pick guidance strengthened; enforcement gap explicitly
    named rather than hidden.
  - §7.1: CI gate path filter expanded to `compiler/{emit,util,ir}/`.
  - §7.2: review checklist made explicit and tied to specific spec sections.
  - §8 added: back-link plan to CL-04/CL-06/CL-08/CL-13.
  - Throughout: `@gim-home/claws-sdk` / `@gim-home/claws-compiler` renamed
    to `@bic/claws-sdk` / `@bic/claws-sdk` per 2026-04-16 bic-internal
    pivot.
- **1.0 (2026-04-16)**: Initial spec. Emerged from Ra wave CP-2 R1 review and
  user directive after the CP-2 pulse 7/8 implementation was found to rely on
  template-string TypeScript emission. Pulse 12.5 added to Ra wave to retrofit
  OC emitter; task #15 scheduled for CC quality pass. Supersedes informal
  codegen conventions from pulse 7/9 era.
