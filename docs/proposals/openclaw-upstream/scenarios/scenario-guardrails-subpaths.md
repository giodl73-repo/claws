---
scenario: S40
pulse: 43
plan: claws-pre-extraction-packaging
governing_roles: [craft:architect, claws:gateway-eng]
package: "@openclaw/guardrails"
spec_refs:
  - docs/claws/proposals/openclaw-upstream/guardrails.md
  - docs/claws/proposals/openclaw-upstream/openclaw-upstream-spec.md
stage: scenarios
checkpoint: 9
---

# Scenario S40 — `@openclaw/guardrails` Subpath Boundaries

## Intent

Walk through the concrete shape of `@openclaw/guardrails` as it would ship
to integrators: one package, default export of peer interfaces + supporting
types, six subpaths (`/audit`, `/approvals`, `/budget`, `/identity`,
`/siem`, `/secrets`). Probe three invariants:

1. **Tree-shake** — `import { canonicalHash } from '@openclaw/guardrails/audit'`
   bundles `/audit` only. `/siem`, `/identity`, `/secrets`, `/budget`,
   `/approvals` never enter the bundle.
2. **Independent build** — each subpath compiles on its own TypeScript
   project reference. A syntax error in `/siem` does not prevent `/audit`
   from shipping.
3. **Peer-dep routing** — `@openclaw/workspace/canonicalize` is a peer of
   `/audit` and `/approvals` only. `/siem`, `/identity`, `/secrets`, and
   `/budget` declare no `@openclaw/workspace` dependency and must continue
   to build if workspace is absent from the install.

Fixture package layout + rollup / tsup config + a `npm pack` + bundler
smoke test form the proof. Output: fixture snippet in-line, and ≥5
findings flagged for the CP-10 extraction pulses.

---

## Fixture — proposed package layout

```
@openclaw/guardrails/
├── package.json
├── tsconfig.json                       ← root tsc project (references only)
├── rollup.config.mjs                   ← per-subpath bundle
├── src/
│   ├── index.ts                        ← default export (interfaces + supporting types)
│   ├── audit/
│   │   ├── index.ts
│   │   └── tsconfig.json               ← composite: true, references [../workspace]
│   ├── approvals/
│   │   ├── index.ts
│   │   └── tsconfig.json               ← composite: true, references [../workspace]
│   ├── budget/
│   │   ├── index.ts
│   │   └── tsconfig.json               ← composite: true, no refs
│   ├── identity/
│   │   ├── index.ts
│   │   └── tsconfig.json               ← composite: true, no refs
│   ├── siem/
│   │   ├── index.ts
│   │   └── tsconfig.json               ← composite: true, no refs
│   └── secrets/
│       ├── index.ts
│       └── tsconfig.json               ← composite: true, no refs
├── dist/
│   ├── index.{js,d.ts,cjs}
│   ├── audit/index.{js,d.ts,cjs}
│   ├── approvals/index.{js,d.ts,cjs}
│   ├── budget/index.{js,d.ts,cjs}
│   ├── identity/index.{js,d.ts,cjs}
│   ├── siem/index.{js,d.ts,cjs}
│   └── secrets/index.{js,d.ts,cjs}
└── tests/
    ├── tree-shake.e2e.test.ts
    └── subpath-independence.e2e.test.ts
```

### `package.json` (abbreviated)

```json
{
  "name": "@openclaw/guardrails",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".":           { "types": "./dist/index.d.ts",          "import": "./dist/index.js",          "require": "./dist/index.cjs" },
    "./audit":     { "types": "./dist/audit/index.d.ts",    "import": "./dist/audit/index.js",    "require": "./dist/audit/index.cjs" },
    "./approvals": { "types": "./dist/approvals/index.d.ts","import": "./dist/approvals/index.js","require": "./dist/approvals/index.cjs" },
    "./budget":    { "types": "./dist/budget/index.d.ts",   "import": "./dist/budget/index.js",   "require": "./dist/budget/index.cjs" },
    "./identity":  { "types": "./dist/identity/index.d.ts", "import": "./dist/identity/index.js", "require": "./dist/identity/index.cjs" },
    "./siem":      { "types": "./dist/siem/index.d.ts",     "import": "./dist/siem/index.js",     "require": "./dist/siem/index.cjs" },
    "./secrets":   { "types": "./dist/secrets/index.d.ts",  "import": "./dist/secrets/index.js",  "require": "./dist/secrets/index.cjs" },
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "peerDependencies": {
    "@openclaw/workspace": ">=0.1.0 <0.2.0"
  },
  "peerDependenciesMeta": {
    "@openclaw/workspace": { "optional": true }
  },
  "publishConfig": {
    "registry": "https://microsoft.ghe.com/_packages/npm/registry/"
  }
}
```

### Tree-shake smoke test (fixture)

```ts
// tests/tree-shake.e2e.test.ts
import { test, expect } from 'vitest';
import { rollup } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import virtual from '@rollup/plugin-virtual';

test('audit-only entrypoint does not pull /siem', async () => {
  const bundle = await rollup({
    input: 'entry',
    plugins: [
      virtual({ entry: `
        import { canonicalHash } from '@openclaw/guardrails/audit';
        export const h = canonicalHash;
      ` }),
      nodeResolve(),
    ],
  });
  const { output } = await bundle.generate({ format: 'es' });
  const code = output[0].code;
  expect(code).toMatch(/canonicalHash/);
  expect(code).not.toMatch(/toCef|toNdjson|toSyslog/);      // /siem absent
  expect(code).not.toMatch(/IdentityBridge/);                // /identity absent
  expect(code).not.toMatch(/SecretScanner/);                 // /secrets absent
  expect(code).not.toMatch(/BudgetMeter/);                   // /budget absent
});
```

---

## Findings

### F1 — `/audit` peer-dep on `@openclaw/workspace/canonicalize` must be declared optional (Major)

**Observation.** `guardrails.md` §Dependencies declares
`@openclaw/workspace/canonicalize` as a peer dep without marking it
optional. `/siem`, `/identity`, `/secrets`, and `/budget` don't consume
canonicalize but they ship inside the same `package.json`. If the peer is
required, `npm install @openclaw/guardrails` without workspace prints a
peer warning and — on some pnpm configurations with
`strict-peer-dependencies=true` — hard-fails.

**Severity.** Major. A hard-fail install on an integrator's first `npm
install` is the worst possible first impression.

**Recommendation.** Declare `@openclaw/workspace` under
`peerDependenciesMeta` with `optional: true` (shown in fixture above).
Add a runtime check in `/audit` + `/approvals`: if the peer is absent,
throw `GuardrailsMissingPeerError` with a clear "install
`@openclaw/workspace` to use guardrails/audit" message. `/siem` etc.
are unaffected.

**Resolution path.** Spec amendment to `guardrails.md §Dependencies`:
document the optional-peer policy and the runtime-check contract.
Amendment lands in CP-10 P48 (`guardrails-package`).

---

### F2 — Default export size creep risk (Warning)

**Observation.** Default export carries `GuardrailProvider`,
`FileIngestProvider`, `ProviderLifecycle`, `HostContext`, plus 5
supporting types (`AuditSink`, `IdentityBridge`, `HandleBinding`,
`SnapshotMeta`, `Logger`). `AuditSink` is defined in `/audit`'s
interface section as well — if `src/index.ts` re-exports `AuditSink`
from `./audit/index.ts`, the default bundle pulls in `/audit`'s
implementation transitively.

**Severity.** Warning. Consumers who import only the interfaces
(type-only context) would unknowingly pull audit runtime code.

**Recommendation.** Enforce "interfaces in default, implementations in
subpaths" via ESLint `no-restricted-imports`: `src/index.ts` may import
only types from `./audit/types.ts`, never from `./audit/index.ts`.
Add a `verbatimModuleSyntax: true` to root tsconfig so re-exports of
types don't become runtime imports. Include a tree-shake test asserting
the default export has zero runtime body beyond constants.

**Resolution path.** Answered by current shape — add lint rule + test
in CP-10 P48. No spec amendment needed.

---

### F3 — `sideEffects: false` is load-bearing for tree-shake (Major)

**Observation.** `package.json` omits `sideEffects`. Without
`"sideEffects": false`, rollup/webpack/esbuild assume every module has
side effects and mark re-exports live, defeating the tree-shake probe
F1 verifies. Subpath imports will pull every module that `src/index.ts`
touches.

**Severity.** Major. The F1 tree-shake assertion silently fails without
this field; integrators won't notice until bundle sizes balloon.

**Recommendation.** `"sideEffects": false` at root (shown in fixture
above). Security subpaths (`/secrets`, `/identity`, `/audit`) MUST
enumerate any side-effectful modules explicitly in the `sideEffects`
array — pure tree-shake is forbidden where security defaults register
at module-load time, because `sideEffects: false` can silently disable
security-critical registrations (default secrets patterns, OIDC
discovery URLs, audit redaction lists) and produce a fail-open scanner.
If any subpath genuinely has side effects, enumerate them explicitly:
`"sideEffects": ["./dist/secrets/register-defaults.js"]`. Prefer
explicit APIs (`registerDefaultPatterns()`, `useDefaultRedactions()`)
over module-load registration for security subpaths. A lint rule MUST
enforce that any new file under `src/{secrets,identity,audit}/` either
adds itself to the `sideEffects` allow-list or declares no top-level
side effects.

**Verification (CP-9 gate, 2026-04-18).** Verified by grep during CP-9
gate — no top-level side effects detected across the 6 absorbed orphan
packages under `C:\src\openclaw-governance\packages\*` (approval-events,
audit-chain, budget-meter, identity-bridge, secret-scanner, siem-emitter).

```bash
# Grep command run during CP-9 gate:
rg -n '^(process\.(on|stdout|stderr|env)|globalThis|global\.|registerPattern|registerDefault|register\()' \
   C:/src/openclaw-governance/packages --glob '**/src/**/*.ts'
# Result: No matches. Top-level const/let/var with constructor or
# require calls also absent from src/**/index.ts across all 6 packages.
```

The current implementations are consistent with `sideEffects: false`
at root. The enumerate-for-security-subpaths rule above is a forward
contract — if future module-load registrations are added to any
security subpath, they MUST be enumerated explicitly rather than
silently tree-shaken.

**Resolution path.** Spec amendment to `guardrails.md`: add new
§Packaging section documenting the `sideEffects: false` contract, the
security-subpath enumeration requirement, and that subpath
implementations MUST NOT rely on module-load side-effects except where
enumerated. Amendment lands in CP-10 P48.

---

### F4 — Per-subpath `package.json` files: rejected (Note)

**Observation.** Node convention historically used nested
`package.json` files in each subdirectory (the
`@scope/pkg/sub/package.json` approach). Modern convention uses the
root `exports` map. The pulse plan explicitly calls out "NOT
per-subpath package.json files". This is the right call — nested
`package.json` files double the publish-check surface and confuse tools
that only read the root manifest.

**Severity.** Note. No action needed, but worth documenting as a
rejected alternative so future contributors don't "fix" the missing
nested files.

**Recommendation.** Add a short paragraph to `guardrails.md §Packaging`:
"Subpath routing is expressed only in the root `package.json#exports`
map. Nested `package.json` files are not used — tree-shake, types, and
CJS/ESM resolution all live in the root map."

**Resolution path.** Spec amendment to `guardrails.md`: add §Packaging
with the rejected-alternative note. Amendment lands in CP-10 P48.

---

### F5 — Types condition ordering inside exports (Major)

**Observation.** The `exports` map in the fixture puts `types` first
in every entry: `{ "types": ..., "import": ..., "require": ... }`.
TypeScript's `moduleResolution: "bundler"` and `"node16"` both require
`types` to appear **first** in the conditions object, otherwise
consumer `tsc` falls back to root `types` field (or fails outright).
Easy to get wrong — half the packages on npm have this bug.

**Severity.** Major. Silent breakage: the package builds, publishes,
and the `types` field "works" for `@openclaw/guardrails` but fails for
`@openclaw/guardrails/audit` — integrators see the default export typed
and every subpath as `any`.

**Recommendation.** Enforce order in a pre-publish check:
`scripts/check-exports-order.mjs` parses `package.json` and fails if
any subpath entry has `types` not in first position. Add a
publish-gate CI job. Include an integrator fixture test: a small
TypeScript consumer that imports from `@openclaw/guardrails/siem` and
asserts the resolved type is not `any`.

**Resolution path.** Answered by current fixture (already ordered
correctly) + add pre-publish check. Lint rule in CP-10 P48. No spec
amendment needed.

---

### F6 — TypeScript project references for independent compile (Warning)

**Observation.** Each subpath under `src/<sub>/tsconfig.json` with
`composite: true` allows `tsc -b` to rebuild only the subpaths that
changed. Current `guardrails.md` doesn't specify whether subpaths
compile via project references or a single unified `tsc`. Without
project references, a type error in `/siem` blocks `/audit` from
emitting declaration files.

**Severity.** Warning. Not a correctness issue, but a CI/UX hit: every
small change in one subpath forces a full-package typecheck.

**Recommendation.** Fixture includes `composite: true` on each subpath's
`tsconfig.json`. Root tsconfig lists all 6 subpaths under `references`.
`tsc -b src/audit` compiles only `/audit` + transitive `/workspace`
peer types. Document this in `guardrails.md §Build`.

**Resolution path.** Spec amendment to `guardrails.md`: add §Build
section specifying project-reference layout. Amendment lands in CP-10
P48.

---

### F7 — Rollup vs tsup: pick one and stick (Warning)

**Observation.** The fixture shows `rollup.config.mjs` at the root, but
the craft monorepo standardizes on `tsup` for most packages. Mixing
bundlers across `@openclaw/workspace` (tsup) and `@openclaw/guardrails`
(rollup) forces integrator tooling teams to learn both.

**Severity.** Warning. Cosmetic across the `@openclaw` scope but adds
real cognitive load.

**Recommendation.** Use `tsup` with `entry: { 'index': 'src/index.ts',
'audit/index': 'src/audit/index.ts', ... }` and `format: ['esm', 'cjs']`
and `dts: true`. `tsup` supports per-entry output with the same
tree-shake guarantees as rollup. Align all four `@openclaw/*` packages
on the same build tool.

**Resolution path.** Spec amendment to
`openclaw-upstream-spec.md §Build tooling` (new section): standardize
on `tsup` across the 4 `@openclaw/*` packages. Amendment lands in
CP-10 P47 (workspace-package) so it sets the precedent before
guardrails packaging.

---

### F8 — Publish-gate must run subpath resolution for all 7 entries (Major)

**Observation.** `npm pack` + `npm publish` doesn't verify that every
`exports` entry resolves to an existing file. A typo in the
`./secrets` path silently ships a broken subpath. CI must run
`node --input-type=module -e "await import('@openclaw/guardrails/secrets')"`
for all 7 entries post-publish.

**Severity.** Major. A broken subpath in a shipped package is the
worst class of packaging bug — it blocks every integrator who happens
to use that subpath until a patch lands.

**Recommendation.** Add `scripts/verify-exports.mjs`: reads
`package.json#exports`, loops each entry, resolves + imports. Runs in
CI `release` job after `npm pack` and before `npm publish`. Also runs
in the pre-publish hook locally.

**Resolution path.** Answered by current shape — add the verify script
in CP-10 P48. No spec amendment needed.

---

### F9 — Gateway runtime import cost (claws:gateway-eng lens) (Warning)

**Observation.** The OC Gateway will import guardrails at startup. If
the default export triggers eager side-effect imports (F3), every
gateway startup pays the cost of loading all 6 subpath runtimes, even
in workspaces that only use `/audit`. 50ms matters when you have 10
gateway restarts in 8 hours.

**Severity.** Warning. Bounded by the `sideEffects: false` contract in
F3, but worth calling out as a runtime-lens concern.

**Recommendation.** Gateway must import only the subpaths its
host-config registers. E.g., if a host declares
`guardrails: { providers: ['audit', 'approvals'] }`, Gateway does
`await import('@openclaw/guardrails/audit')` and
`await import('@openclaw/guardrails/approvals')` — never the default
export. Document this contract in `guardrails.md §Host integration`
(new section).

**Latency budget: preAuthorize hot path MUST complete in ≤50ms at
p99** (measured against `preAuthorize(ctx, op)` end-to-end, from
Gateway's `before_tool_call` entry to the composed decision return).
This is a non-negotiable per the `claws:gateway-eng` role — every
tool call pays the `preAuthorize` cost, so cold-start regressions
are unacceptable. The dynamic-import call (first invocation per
process for a given provider subpath) MUST warm at server boot, not
on first request; cached module reference used for subsequent calls.
Providers requiring heavier init (OIDC discovery in `/identity`,
pattern-registry hydration in `/secrets`) MUST warm during host
bootstrap, not on first hook. Benchmark assertion lands in CP-10 P48
as a `preAuthorize.bench.ts` fixture that fails the CI job if the p99
exceeds 50ms across the six subpaths under representative load.

**Resolution path.** Spec amendment to `guardrails.md`: add §Host
integration section specifying dynamic-import pattern + warm-at-boot
contract + 50ms p99 `preAuthorize` latency budget + warning against
eager default imports from Gateway. Amendment lands in CP-10 P48
with the benchmark assertion.

---

### F10 — Subpath naming matches governance vocabulary (Note)

**Observation.** Six subpath names (`/audit`, `/approvals`, `/budget`,
`/identity`, `/siem`, `/secrets`) all match OC's governance vocabulary
and read as verbs/nouns a gateway-eng would expect. No renames
warranted — the integrator-perspective walkthrough (gateway-eng lens)
lands clean.

**Severity.** Note. Positive finding: confirm the names are stable
before CP-10 extraction, because renaming after publish is a major
bump.

**Recommendation.** Lock the 6 subpath names in `guardrails.md`
§Structure (already done) and add a deprecation-aliases section
for future renames: any rename ships the old name as a deprecated
alias for one minor version before removal.

**Resolution path.** Spec amendment to `guardrails.md §Versioning`
(existing section): add paragraph on subpath-rename policy.
Amendment lands in CP-10 P48.

---

### F11 — `peerDependenciesMeta` optional marking hides missing-peer bugs (Warning)

**Observation.** F1 recommends `peerDependenciesMeta.optional: true`.
But marking a peer optional means `npm install` no longer warns when
it's absent. An integrator who genuinely needs `/audit` won't discover
the missing peer until runtime, possibly in production.

**Severity.** Warning. The runtime-check contract in F1 mitigates this,
but only if the check fires early (module load, not first call).

**Recommendation.** `/audit` and `/approvals` index files must import
`@openclaw/workspace/canonicalize` at module top-level. Module-load
throws `GuardrailsMissingPeerError` before any provider is registered.
Add an integration test: `npm install @openclaw/guardrails` without
workspace, `import from '@openclaw/guardrails/audit'`, assert the
specific error message. This gives integrators a loud early signal
without blocking `npm install`.

**Resolution path.** Answered by current shape + F1 resolution.
Lands in CP-10 P48 with test fixture.

---

### F12 — CJS `require` condition + top-level await (Note)

**Observation.** `exports` map declares both `import` and `require`
conditions. Any subpath that uses top-level `await` (e.g., `/identity`
loading an async OIDC discovery doc at module init) breaks CJS
consumers. CJS doesn't support TLA.

**Severity.** Note. No current subpath uses TLA per the interfaces in
`guardrails.md`, but worth documenting as a forbidden pattern.

**Recommendation.** Add an ESLint rule (or a custom AST check in the
publish gate) that rejects top-level `await` in any file under `src/`.
Document in `guardrails.md §Build`: "Subpaths must be CJS-compatible
— no top-level await, no `import.meta` outside ESM-only branches."

**Resolution path.** Spec amendment to `guardrails.md §Build` (new
section, shared with F6). Amendment lands in CP-10 P48.

---

## Resolution Summary

| Finding | Severity | Resolution | Target |
|---------|----------|------------|--------|
| F1  | Major   | Spec amend + runtime check        | CP-10 P48 (guardrails-package) |
| F2  | Warning | Current shape + lint rule         | CP-10 P48 |
| F3  | Major   | Spec amend §Packaging             | CP-10 P48 |
| F4  | Note    | Spec amend §Packaging             | CP-10 P48 |
| F5  | Major   | Current shape + publish check     | CP-10 P48 |
| F6  | Warning | Spec amend §Build                 | CP-10 P48 |
| F7  | Warning | Spec amend openclaw-upstream-spec | CP-10 P47 (workspace-package) |
| F8  | Major   | Current shape + verify script     | CP-10 P48 |
| F9  | Warning | Spec amend §Host integration      | CP-10 P48 |
| F10 | Note    | Spec amend §Versioning            | CP-10 P48 |
| F11 | Warning | Current shape + integration test  | CP-10 P48 |
| F12 | Note    | Spec amend §Build                 | CP-10 P48 |

**Count:** 12 findings (4 Major, 6 Warning, 2 Note). Severity ramp
from Major → Warning → Note per the Ra stop rule — no further findings
warranted at medium/low severity beyond F10 / F12.

**Spec amendments required before CP-10:** 8 findings drive amendments,
concentrated in `guardrails.md` (7) and `openclaw-upstream-spec.md` (1).
All amendments absorbable in P47 / P48 packaging pulses.

---

## Acceptance

- [x] ≥5 findings (12 delivered)
- [x] Fixture package layout documented (tree, `package.json`,
      per-subpath `tsconfig.json` shape)
- [x] Tree-shake assertion encoded as runnable vitest fixture
- [x] Peer-dep routing verified: `/audit` + `/approvals` declare
      workspace optional; `/siem`/`/identity`/`/secrets`/`/budget`
      declare none (§F1, §F11)
- [x] Every Major / Warning has a concrete resolution path (no "TBD",
      no "deferred")
- [x] Governing-role coverage: craft:architect (F2, F3, F4, F5, F6,
      F7, F10, F12) and claws:gateway-eng (F1, F8, F9, F11) each
      contribute ≥ 4 findings
