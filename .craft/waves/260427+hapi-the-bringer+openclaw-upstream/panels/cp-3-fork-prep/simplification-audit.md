---
doc: simplification-audit
round: 3
panel: cp-3-fork-prep
created: 2026-05-04
---

# Simplification audit — 5 substrate packages, pre-fork-open

Scope: `oc-paths-substrate` (`@openclaw/oc-path`), `pinch`
(`@openclaw/oc-lint`), `oc-paths-doctor` (`@openclaw/oc-doctor`),
`lkg-recovery-substrate` (`@openclaw/lkg`), `policy-substrate`
(`@openclaw/policy`). CLI line totals: 506 + 502 + 501 + 825 = 2334.

Goal of this pass: surface concrete deduplication and tightening
opportunities **before** the fork goes public, so the upstream surface
is as lean as possible. Pure audit — no refactors. Verdicts and effort
estimates are advisory.

## 1. CLI helpers (`safeWrite`, `installPipeGuard`, `scrubSentinel`, `isClosedPipeError`, `emit`, `emitError`)

**Status**: confirmed; partial duplication, with an awkward asymmetry.

| Helper                    | oc-paths-substrate cli | pinch cli       | lkg cli                   | policy cli                 |
| ------------------------- | ---------------------- | --------------- | ------------------------- | -------------------------- |
| `scrubSentinel`           | line 65 (4 LoC)        | line 91 (4 LoC) | line 82 (4 LoC)           | line 92 (4 LoC)            |
| `SCRUB_PLACEHOLDER`       | line 64                | line 90         | line 81                   | line 91                    |
| `OutputContext` iface     | line 72 (4 LoC)        | line 66 (5 LoC) | line 67 (5 LoC)           | line 78 (5 LoC)            |
| `makeOutput`/`detectMode` | line 77 (4 LoC)        | line 72 (7 LoC) | line 73 (7 LoC)           | line 84 (7 LoC)            |
| `emit`                    | line 83 (12 LoC)       | line 96 (7 LoC) | line 111 (9 LoC)          | line 129 (9 LoC)           |
| `emitError`               | line 96 (10 LoC)       | (absent)        | line 121 (8 LoC)          | line 139 (8 LoC)           |
| `isClosedPipeError`       | absent                 | absent          | line 95 (5 LoC, exported) | line 105 (5 LoC, exported) |
| `safeWrite`               | absent                 | absent          | line 101 (9 LoC)          | line 119 (9 LoC)           |
| `installPipeGuard`        | absent                 | absent          | line 444 (18 LoC)         | line 763 (18 LoC)          |

Hardest dup is `installPipeGuard` (18 LoC, byte-identical between lkg
and policy modulo doc strings). `safeWrite` (9 LoC) and
`isClosedPipeError` (5 LoC) sit next to it. Combined: ~32 LoC × 2 CLIs
= **64 LoC** of zero-variance pipe-guard machinery.

`scrubSentinel` (4 LoC + 1 const) duplicated **5 times** (4 CLIs +
`lkg-recovery-substrate/.../scrub-sentinel-from-tracked.ts:17`). 5 × 5 LoC
= 25 LoC, plus a hidden hazard: any future change to the `[REDACTED]`
placeholder format has to land in 5 spots.

The asymmetry is the tell: oc-paths-substrate and pinch CLIs **do not
have** `installPipeGuard` / `safeWrite` (they pre-date W-039). When the
next CLI author copies a sibling, they pick whichever they happened to
look at — bug-class drift waiting to happen.

**Proposed extraction**: subpath export `@openclaw/oc-path/cli-helpers`
(or `/cli/helpers`) shipping `OutputContext`, `makeOutput`,
`scrubSentinel`, `SCRUB_PLACEHOLDER`, `safeWrite`, `isClosedPipeError`,
`installPipeGuard`, and the `emit` / `emitError` pair. Other CLIs
import — net delete ~150 LoC across the four CLIs. Locating in
oc-paths-substrate (rather than a new `@openclaw/cli-helpers`) keeps the
package count flat for the upstream PR — every other substrate already
depends on `@openclaw/oc-path`.

**Effort**: **S** (~half a day; mechanical extract + 4 import sites).

**Trade-off**: pro: single source of truth for output-boundary scrubbing
and EPIPE behaviour, fixes the silent asymmetry. con: oc-paths-substrate
grows a small surface that's CLI-only (some upstream reviewers may push
back — "why is the path substrate shipping CLI helpers?"). Counter-frame:
the substrate already ships its own `./cli`, so `./cli-helpers` is in
character.

## 2. `_tools-md-scan.ts` duplication inside policy-substrate

**Status**: confirmed; near-identical with one fixer-only field.

```
policy-substrate/src/extensions/policy-lint-rules-starter/rules/_tools-md-scan.ts        37 LoC
policy-substrate/src/extensions/policy-doctor-fixers-starter/fixers/_tools-md-scan.ts    55 LoC
```

`diff` shows 36 of 37 lines of the lint copy are byte-equal to the
fixer copy; the fixer adds (a) `bodyLineIdx` to `ToolHeaderHit` and (b)
a 17-LoC `replaceLine` helper. Both are valid extensions — neither
breaks the lint copy.

**Proposed extraction**: hoist to
`policy-substrate/src/extensions/_shared/tools-md-scan.ts` (package-internal,
underscore-prefixed dir to signal "not exported"). Export
`scanToolHeaders`, `ToolHeaderHit` (with `bodyLineIdx` always present
— harmless for lint callers), and `replaceLine`. Both extension packs
import.

**Effort**: **XS** (~30 min; one new file, two import sites, delete two
old files). No external surface change.

**Trade-off**: pro: kills 36 LoC of literal copy, removes the doc-comment
disclaimer "_duplicates the lint pack's helper but lives here so the
fixer pack doesn't import across extensions_" — that disclaimer was
there to justify the copy, not to defend it. con: the two extension
packs now share a sibling import, weakening the "extensions are
independent" framing slightly. Acceptable: `_shared/` makes the
boundary explicit.

## 3. `parseForKind` switch statement

**Status**: confirmed; 3 production duplications + 2 in tests.

| Site                                                                                                   | LoC |
| ------------------------------------------------------------------------------------------------------ | --- |
| `pinch/src/cli/index.ts:106`                                                                           | 10  |
| `policy-substrate/src/cli/index.ts:150`                                                                | 10  |
| `policy-substrate/src/extensions/policy-doctor-fixers-starter/fixers/policy-regenerate-on-drift.ts:55` | 10  |
| `pinch/tests/integration/manifest-driven.test.ts:36`                                                   | 10  |
| `oc-paths-doctor/tests/integration/manifest-driven.test.ts:39`                                         | 10  |

oc-paths-substrate has the analogous `loadAst` (file 151) and
`emitForKind` (file 160), which are file/AST variants of the same
dispatch. So the **dispatch over `OcKind`** appears in 5 production
spots in different shapes.

**Proposed extraction**: add to `@openclaw/oc-path` plugin-sdk:

- `parseForKind(kind, raw): OcAst` — pure dispatch
- `emitForKind(ast): string` — pure dispatch (matches existing
  `emitJsonc`/`emitJsonl`/etc. but unified)

Drop-in replacement at all 5 sites; tests should also import.

**Effort**: **XS** (~1 hour). Trivial extract; the dispatch literally is
the same `switch`.

**Trade-off**: pro: eliminates a "stamp-collecting" duplication that's
particularly insulting because the substrate already exports every leg
of the switch separately. con: literally none — the substrate is the
right home; this is a trivial omission.

## 4. Sentinel scrub placeholder constant `'[REDACTED]'`

**Status**: confirmed; magic string in 5 spots.

All 5 declare:

```ts
const SCRUB_PLACEHOLDER = "[REDACTED]";
```

Sites: `oc-paths-substrate/src/cli/index.ts:64`, `pinch/src/cli/index.ts:90`,
`lkg-recovery-substrate/src/cli/index.ts:81`,
`policy-substrate/src/cli/index.ts:92`,
`lkg-recovery-substrate/src/extensions/lkg-doctor-fixers-starter/fixers/scrub-sentinel-from-tracked.ts:17`.

`REDACTED_SENTINEL = '__OPENCLAW_REDACTED__'` is canonically declared
**once** at `oc-paths-substrate/src/plugin-sdk/oc-path/sentinel.ts:25`
and re-exported everywhere. The placeholder it gets replaced with should
live in the same module.

**Proposed extraction**: export `REDACTED_PLACEHOLDER = '[REDACTED]'`
from `oc-paths-substrate/src/plugin-sdk/oc-path/sentinel.ts` alongside
`REDACTED_SENTINEL`. Folded into the `cli-helpers` extraction in (1) —
once `scrubSentinel` itself moves, the placeholder moves with it.

**Effort**: **XS** (folds into #1).

**Trade-off**: pro: a future security review that wants to change the
placeholder (e.g., to `[REDACTED-OPENCLAW]`) edits one file. con: none.

## 5. Missing `./test-harness` from policy-substrate

**Status**: confirmed; structural inconsistency.

Comparison of the four packages that have plug-in surfaces:

| Package                | `src/test-harness/` | `./test-harness` export |
| ---------------------- | ------------------- | ----------------------- |
| pinch                  | yes (114 LoC)       | yes                     |
| oc-paths-doctor        | yes                 | yes                     |
| lkg-recovery-substrate | yes                 | yes                     |
| **policy-substrate**   | **no**              | **no**                  |

policy-substrate ships extension packs (`policy-from-md-starter`,
`policy-lint-rules-starter`, `policy-doctor-fixers-starter`) but no
canonical "run a generator / extractor / fixer against an in-memory
fixture" surface for plugin authors. Skill-author panels flagged this
in cp-2; the absence is unprincipled.

**Proposed addition**: `policy-substrate/src/test-harness/index.ts`
with at minimum:

- `runGenerator(spec, files, anchor?)` — returns `PolicyIR` for assertions
- `runExtractor(extractor, ast, fileName?)` — returns `T[]` for assertions
- `assertPolicyContains(ir, predicate)` / `assertPolicyEmpty(ir)`
- A trivial fixture builder that takes `{ 'AGENTS.md': '## Tools\n...' }` and
  produces `PolicyExtractFile[]` (this currently lives inline in
  `policy-substrate/tests/extensions/policy-from-md-starter/extractors.test.ts`
  and friends).

**Effort**: **S** (~3-4 hours; pattern already exists in pinch/lkg/oc-doctor
to copy from, plus surface a few internals).

**Trade-off**: pro: closes a documented inconsistency; gives skill authors
a stable plugin-test surface. con: small new surface area to maintain.

## 6. SDK_VERSION coordination

**Status**: confirmed; 5 declarations, all `'0.1.0'`.

```
oc-paths-substrate/src/plugin-sdk/oc-path/index.ts:33    SDK_VERSION = '0.1.0'
pinch/src/plugin-sdk/oc-lint/index.ts:16                 SDK_VERSION = '0.1.0'
oc-paths-doctor/src/plugin-sdk/oc-doctor/index.ts:18     SDK_VERSION = '0.1.0'
lkg-recovery-substrate/src/plugin-sdk/lkg/index.ts:17    SDK_VERSION = '0.1.0'
policy-substrate/src/plugin-sdk/policy/api.ts:23         SDK_VERSION = '0.1.0'
```

**Verdict**: do nothing. This is a case where the apparent duplication
is intentional. Each substrate has an independent post-launch evolution
trajectory; coupling their SDK versions to a shared constant means
`@openclaw/oc-path` can never bump without a coordinated release across
all four. `requires.sdkVersion` on plugin specs is per-substrate
deliberately — that's the whole point of the version field.

The substrates _are_ coupled in this snapshot, but only because they
were stood up together. Forcing a shared constant freezes that
coincidence into the contract.

**Effort**: **N/A** — recommend leaving as-is.

**Trade-off** (FYI): the closer alternative is a narrow dev-time check
("if all four SDK_VERSIONs disagree by major, error in CI") — but
that's a CI lint, not a code change.

## 7. DEPRECATED.md tombstones — `@bic/*` rename drift

**Status**: confirmed; **5 of 5 tombstones reference dead names**.

The substrate packages have already been renamed to `@openclaw/*`:

```
oc-paths-substrate            → @openclaw/oc-path
pinch                          → @openclaw/oc-lint
oc-paths-doctor                → @openclaw/oc-doctor
lkg-recovery-substrate         → @openclaw/lkg
policy-substrate               → @openclaw/policy
```

But every DEPRECATED.md still tells consumers to migrate to `@bic/*`:

| File                                               | Says "migrate to"             | Actual name                  |
| -------------------------------------------------- | ----------------------------- | ---------------------------- |
| `openclaw-guardrails/DEPRECATED.md:3`              | `@bic/claws-guardrails`       | (rename pending)             |
| `openclaw-lkg/DEPRECATED.md:3,41-42`               | `@bic/lkg-recovery-substrate` | `@openclaw/lkg`              |
| `openclaw-lkg-git/DEPRECATED.md:3,33-34`           | `@bic/lkg-recovery-git`       | (likely `@openclaw/lkg-git`) |
| `openclaw-policy/DEPRECATED.md:3,46-47,57-60`      | `@bic/policy-substrate`       | `@openclaw/policy`           |
| `openclaw-workspace/src/ast/DEPRECATED.md:3,42-43` | `@bic/oc-paths-substrate`     | `@openclaw/oc-path`          |

**Proposed fix**: rewrite the migration code blocks in all 5 to use
`@openclaw/*` names. While there, also re-check the export subpaths
(some currently say e.g. `@bic/lkg-recovery-substrate/fs` which today
resolves as `@openclaw/lkg/fs` — the **subpath** changed too).

**Effort**: **XS** (~30 min; mechanical s/@bic\///, hand-verify each
example block compiles against the current export map).

**Trade-off**: pro: consumers reading these tombstones today get
working migration recipes. con: none — pure documentation correctness.

This one matters more than its size suggests because it's the literal
welcome mat for anyone discovering the old packages first.

## 8. Plugin-shape registry duplication

**Status**: confirmed; ~70 LoC × 3 generic-shaped registries.

```
pinch/src/plugin-sdk/oc-lint/registry.ts         63 LoC
oc-paths-doctor/src/plugin-sdk/oc-doctor/registry.ts  59 LoC
policy-substrate/src/plugin-sdk/policy/registry.ts   84 LoC
                                                ──────
                                                206 LoC
```

All three are shaped:

```ts
const REGISTRY = new Map<string, T>();
export function register(spec: T): void {
  REGISTRY.set(spec.id, spec);
}
export function get(id: string): T | null {
  return REGISTRY.get(id) ?? null;
}
export function list(): readonly T[] {
  return [...REGISTRY.values()];
}
export function _clearRegistry(): void {
  REGISTRY.clear();
}
```

The three pieces of variation: (a) the exported names (`registerLintRule`
vs `registerDoctorHealthContribution` vs `registerPolicyGenerator`), (b)
the spec shape, (c) the doc strings. (lkg's `trackers/registry.ts` is a
different beast — kind→factory map, not an id→spec registry — and
should NOT fold in.)

**Proposed extraction**: a generic `makeRegistry<T extends { id: string }>()`
factory in `@openclaw/oc-path/plugin-shape` returning `{ register, get,
list, _clear }`. Each substrate then writes 4-5 LoC to wire its
strongly-named exports onto the generic instance.

**Verdict**: **probably don't**. Effort is **M** (need to thread
generics through three substrates; bikeshedding on naming will
dominate). The wins are small (~150 LoC saved across three packages,
none of which is hot code), and the cost is real: each substrate's
registry doc-comment frames the **plugin-shape pattern** in the
package's domain language, which is genuinely useful for plugin
authors. A generic factory dilutes that. The factory belongs in a
"@openclaw/plugin-shape" companion package eventually, but that's a v2
move — after the contract is real.

**Effort**: **M**, **not recommended for this pass**.

## 9. Per-CLI workspace-section reading boilerplate

**Status**: confirmed; 5 sites, each reading their own section name.

```
pinch/src/cli/index.ts:152      const lintSection = workspaceConfig?.['lint'] as WorkspaceLintConfig | undefined;
pinch/src/cli/index.ts:327      const lintSection = workspaceConfig?.['lint'] as WorkspaceLintConfig | undefined;
policy-substrate/src/cli/index.ts:187  const policySection = wsConfig?.['policy'] as WorkspacePolicyConfig | undefined;
policy-substrate/src/cli/index.ts:314  const policySection = wsConfig?.['policy'] as WorkspacePolicyConfig | undefined;
lkg-recovery-substrate/src/cli/index.ts:171  const lkgSection = wsConfig?.['lkg'] as WorkspaceLkgConfig | undefined;
```

Each substrate's `plugin-sdk/.../workspace-config.ts` documents this
_usage pattern_ in a code-block doc-comment but doesn't ship a typed
helper. The cast-via-`as` is identical at 5 sites.

**Proposed addition**: each `workspace-config.ts` exports a typed reader:

```ts
// in policy-substrate/src/plugin-sdk/policy/workspace-config.ts
export function readPolicyConfigSection(
  cfg: WorkspaceConfig | null,
): WorkspacePolicyConfig | undefined {
  return cfg?.["policy"] as WorkspacePolicyConfig | undefined;
}
```

Each substrate ships its own (lint/doctor/lkg/policy). No shared
generic — the `as` cast is unsafe enough that hiding it in a
substrate-named helper at least makes the pin-the-string boundary
explicit.

**Effort**: **XS** (~30 min × 4 substrates).

**Trade-off**: pro: makes the section name a compile-checked constant
in the substrate that owns it (typo-safe across CLI rewrites); makes
it discoverable via `import { read*ConfigSection } from ...`. con: a
genuinely tiny amount of code; you could equally argue it's fine
inline.

Recommend doing this only if (1) is being done — they share the
"narrow public CLI helpers" frame. Not worth a standalone pass.

## Summary table

| #   | Finding                                     | LoC saved           | Effort | Recommend?          |
| --- | ------------------------------------------- | ------------------- | ------ | ------------------- |
| 1   | CLI helpers extraction                      | ~150                | S      | yes                 |
| 2   | `_tools-md-scan.ts` dedup                   | ~36                 | XS     | yes                 |
| 3   | `parseForKind` / `emitForKind` to substrate | ~50                 | XS     | yes                 |
| 4   | `[REDACTED]` placeholder constant           | folds into 1        | XS     | yes (with 1)        |
| 5   | policy-substrate `./test-harness`           | net **add** ~80 LoC | S      | yes                 |
| 6   | shared SDK_VERSION                          | -                   | -      | **no**              |
| 7   | DEPRECATED.md `@bic/*` → `@openclaw/*`      | doc fix             | XS     | yes                 |
| 8   | generic `makeRegistry<T>()`                 | ~150                | M      | **no, defer to v2** |
| 9   | typed workspace-section readers             | minor               | XS     | yes (with 1)        |

**Total LoC delta if all "yes" actions land**: ~−240 production LoC,
+~80 test-harness LoC ⇒ ~−160 net. Bigger qualitative wins than
quantitative: kills the silent CLI-helper asymmetry (1, 4), removes the
embarrassing `@bic/*` references in deprecation tombstones (7), and
brings policy-substrate to parity with its siblings on test-harness
(5).

**Sequencing recommendation**: do (7) and (2) first — pure cleanup, no
public-surface change, zero risk. Then (3) and (5) as substrate
additions. Then (1) + (4) + (9) as a coordinated CLI-helpers pass —
that's the one that touches every CLI and benefits from being one
review. Skip (6) and (8).

## Out of scope but noted

- **`pickFlag` is duplicated** between
  `lkg-recovery-substrate/src/cli/index.ts:132` (3 LoC) and
  `policy-substrate/src/cli/index.ts:748` (3 LoC). Folds into (1).
- **`OutputContext` interface** has 4 declarations (4-5 LoC each); 3 of
  4 are byte-identical. Folds into (1).
- **`makeOutput` / `detectMode`** has 4 declarations (4-7 LoC each);
  pinch/lkg/policy variants are byte-identical. Folds into (1).
- **`computeWorkspaceAnchor`** in `policy-substrate/src/cli/index.ts:247`
  feels like it could move to the substrate's `plugin-sdk` — it's a
  pure helper with no CLI-specific concerns. Not in original brief, but
  worth checking with the policy-substrate author.
