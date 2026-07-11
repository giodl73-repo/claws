# TypeClaw TS7 / Native API Findings

Last updated: 2026-07-10

## Executive Summary

OpenClaw already uses the native TypeScript checker path heavily through
`tsgo`, but it cannot yet replace the classic root `typescript` package with the
TS7/native package shape. The current blocker is not typecheck performance; it
is programmatic compiler API parity for runtime and SDK tooling that imports the
classic root module.

TypeClaw branch:
`giodl73-repo/openclaw:user/giodl/typeclaw-ts-native-eval`

Current head: `f93f344c18`

## Evidence

- Current OpenClaw baseline:
  - `typescript@6.0.3`
  - `@typescript/native-preview@7.0.0-dev.20260704.1`
  - `pnpm tsgo:core`: 27.13s cold-ish with local heavy-check queue, 3.87s warm
  - `pnpm tsgo:extensions`: 16.54s cold-ish, 5.38s warm
- Candidate tested:
  - `typescript@7.0.1-rc`
  - `@typescript/native-preview@7.0.0-dev.20260705.1`
- TS7 RC package exports no root module. `npm view typescript@7.0.1-rc exports`
  reports only:
  - `./package.json`
  - `./unstable/sync`
  - `./unstable/async`
  - `./unstable/fs`
  - `./unstable/proto`
  - `./unstable/ast`
  - `./unstable/ast/is`
  - `./unstable/ast/factory`
  - `./unstable/ast/utils`
  - `./unstable/ast/scanner`
  - `./unstable/ast/visitor`
  - `./unstable/ast/clone`
- Direct candidate runs failed because OpenClaw production code imported the
  root `typescript` module from Code Mode and plugin SDK API-baseline tooling.

## TypeClaw Branch Work

The branch does not open an OpenClaw PR yet. It makes the problem smaller and
reportable:

1. `0cea014673` - `Add TypeScript compiler API seam`
   - Moves production root `typescript` imports behind
     `src/typescript/compiler-api.ts`.
   - Covers `src/agents/code-mode.ts` and `src/plugin-sdk/api-baseline.ts`.
2. `47bcbcb19d` - `Report TS native compiler API gaps`
   - Adds a targeted diagnostic for rootless TS7/native packages.
   - Names the classic compiler APIs OpenClaw still requires.
3. `6669f86e91` - `Stabilize TS native diagnostic metadata`
   - Makes the diagnostic test independent from the installed local package.
4. `f93f344c18` - `Map TS native API coverage gaps`
   - Adds `src/typescript/native-api-coverage.ts`.
   - Classifies required classic APIs as available, partial, or missing against
     TS7 unstable exports.

## Current API Coverage Map

| Classic API | TS7/native coverage | Notes |
| --- | --- | --- |
| `SyntaxKind` | Available via `typescript/unstable/ast` | AST enum/helper coverage appears present. |
| `createProgram` | Partial via `typescript/unstable/sync` | `Program`, `Project`, `Snapshot`, and `Checker` primitives exist, but OpenClaw needs an adapter. |
| `createPrinter` | Partial via `typescript/unstable/sync` | `Emitter.printNode` may cover this, but plugin SDK baseline output needs parity validation. |
| `readConfigFile` | Partial via `typescript/unstable/fs` | File helpers may cover reads, but classic parse/error shaping is not direct. |
| `sys` | Partial via `typescript/unstable/fs` | OpenClaw would need to stop depending on the classic `sys` object shape. |
| `transpileModule` | Missing direct parity | Code Mode still needs a runtime-safe single-file TypeScript transform. |
| `parseJsonConfigFileContent` | Missing direct parity | No direct tsconfig parse helper parity has been confirmed. |

## Questions for TypeScript / Native Owners

1. Is the root `typescript` package intentionally absent for TS7 native, or
   should there be a compatibility facade for common compiler APIs?
2. Is there a planned native equivalent for `transpileModule` for runtime
   TypeScript-to-JavaScript transforms?
3. Is there a planned native equivalent for classic tsconfig parsing
   (`readConfigFile` plus `parseJsonConfigFileContent`)?
4. Should consumers build adapters directly against `typescript/unstable/sync`
   and `typescript/unstable/ast`, or is a more stable programmatic API expected?
5. For SDK/public-API baseline generators, what is the recommended path for
   stable declaration printing and type-string output under TS7/native?

## Recommended Next Step

Prototype only the partial plugin SDK API-baseline adapter path if TS owners
confirm `typescript/unstable/sync` is the intended target. Do not attempt a full
OpenClaw TS7 package upgrade until `transpileModule` and tsconfig parsing parity
are answered.
