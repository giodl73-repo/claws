---
name: sdk-api-baseline
description: SHA256-pinned snapshot of the public plugin-SDK type surface; gen/check pipeline; relationship to manifest schema and gateway protocol gates
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Plugin SDK API baseline

## What it is

A SHA256-pinned snapshot of the public TypeScript type surface across
200+ plugin-SDK subpaths. The pinned hash lives at
`docs/.generated/plugin-sdk-api-baseline.sha256` (tracked in git) and
covers two generated artifacts (gitignored — for local inspection only):

- `plugin-sdk-api-baseline.json` — full structured export surface.
- `plugin-sdk-api-baseline.jsonl` — streaming JSONL with module + export records.

**Why it exists.** Catch unintentional SDK API drift. Adds, removes,
signature changes, and type modifications across the SDK's 200+
entrypoints (`scripts/lib/plugin-sdk-entrypoints.json`) all change the
hash. CI failure mandates explicit regeneration + PR-description
justification.

This is one of three drift gates the wave's `claws-openclaw-upstream`
plan calls out. The others are `manifest-schema.md`'s manifest-shape
validation (no SHA gate, but config-baseline does have its own) and
`gateway-protocol.md`'s Swift codegen.

## The pipeline

### `pnpm plugin-sdk:api:gen`

Defined in `package.json:1383`:

```
"plugin-sdk:api:gen": "node --import tsx scripts/generate-plugin-sdk-api-baseline.ts --write"
```

Runtime steps:

1. Call `renderPluginSdkApiBaseline()` (in `src/plugin-sdk/api-baseline.ts`).
2. Walk all SDK entrypoints via `pluginSdkDocMetadata` categories: core, provider, channel, runtime, utilities, legacy.
3. Use the TypeScript compiler API (under `tsconfig.plugin-sdk.dts.json`) to introspect exported symbols at each entrypoint.
4. For each export capture: `name`, `kind` (class/const/enum/function/interface/type/…), signature/type text (truncated >1200 chars), source location.
5. Render JSON + JSONL.
6. Compute SHA256 of both.
7. Write the three files to `docs/.generated/`.

### `pnpm plugin-sdk:api:check`

Defined in `package.json:1382`:

```
"plugin-sdk:api:check": "node --import tsx scripts/generate-plugin-sdk-api-baseline.ts --check"
```

Same render pipeline in check-only mode (no write). Compares computed
SHA256 against committed `docs/.generated/plugin-sdk-api-baseline.sha256`.
On mismatch, emits:

> Plugin SDK API baseline drift detected.

with instructions to run `pnpm plugin-sdk:api:gen`.

## Generated artifacts

`docs/.generated/`:

| File | Size (audit) | In git? | Purpose |
|---|---|---|---|
| `plugin-sdk-api-baseline.sha256` | ~191 B | **yes** | 2-line hash manifest. The pinned baseline. |
| `plugin-sdk-api-baseline.json` | ~150–200 KB | no (gitignored) | Full structured export surface. Local inspection. |
| `plugin-sdk-api-baseline.jsonl` | ~200–300 KB | no (gitignored) | Streaming JSONL — one record per module + one per export. |

Gitignore at `.gitignore:174-176`: `docs/.generated/*.json` and
`docs/.generated/*.jsonl` are ignored. Only `.sha256` is committed.

JSON shape:

```jsonc
{
  "generatedBy": "...",
  "modules": [
    {
      "category": "core",
      "entrypoint": "...",
      "importSpecifier": "@openclaw/plugin-sdk",
      "exports": [
        { "exportName": "...", "kind": "function", "declaration": "...", "source": "..." }
      ]
    }
  ]
}
```

JSONL streams `recordType: "module"` then `recordType: "export"` records.

What changes the hash: any new/modified/removed export, any signature/
type change, any entrypoint added or removed from
`scripts/lib/plugin-sdk-entrypoints.json`.

## `docs/sdk-overview.md`

**Hand-written** reference doc. Top declares intent: *"reference for what
to import and what you can register."* Import-convention table at
`:18-53`; registration API tables at `:69-100+`. Curated, not generated.
The baseline pipeline does **not** regenerate it.

A separate docs page at `/plugins/sdk-subpaths` *is* derived from the
generated catalog — but `sdk-overview.md` itself stays human-edited.

## TypeScript surface emission

`tsconfig.plugin-sdk.dts.json`:

| Setting | Value |
|---|---|
| `extends` | root `tsconfig.json` |
| `declaration` | `true` |
| `emitDeclarationOnly` | `true` |
| `outDir` | `dist/plugin-sdk` |
| `rootDir` | `.` |
| `include` | `src/plugin-sdk/**/*.ts`, video-generation types, `src/types/**/*.d.ts` |
| `exclude` | `node_modules`, `dist`, test files |

Outputs: **only `.d.ts` files** (declaration-only mode). They land in
`dist/plugin-sdk/` (e.g., `dist/plugin-sdk/index.d.ts`,
`dist/plugin-sdk/core.d.ts`, …).

The baseline introspector walks these `.d.ts` files via the TypeScript
compiler API to extract the exported symbol surface. The actual
implementation `.ts` files are not directly read for the baseline.

## CI gate

`.github/workflows/workflow-sanity.yml`, job `generated-doc-baselines` at
`:84-100`:

| Property | Value |
|---|---|
| Trigger | `workflow_dispatch` only (manual). Not on PR by default. |
| Steps | Setup Node → `pnpm config:docs:check && pnpm plugin-sdk:api:check` |
| Auto-block on PR | **No.** |

The gate **does** run inside the `release:check` orchestrator (`package.json:1414`),
so release cuts hit it. Day-to-day PR review relies on the contributor
running the check locally and committing the refreshed `.sha256`.

This means a stale baseline can land on `main` if both reviewer and CI
miss it. Catching it requires either local checks or running the manual
workflow_dispatch trigger.

## Refresh workflow

A contributor adds a new public export (function, type, interface,
signature change, etc.). Workflow:

1. Make the SDK change in `src/plugin-sdk/*.ts`.
2. Run `pnpm plugin-sdk:api:gen`.
3. `docs/.generated/plugin-sdk-api-baseline.sha256` updates.
4. Commit the hash file with a note: *"Refresh plugin SDK API baseline: added X, removed Y, …"*
5. PR description must justify the API surface change (additive vs breaking).
6. CI (when run) passes if hash is in sync.

Triggers for refresh:

- New / removed / renamed export.
- Function-signature / type-annotation change.
- `scripts/lib/plugin-sdk-doc-metadata.ts` category reassignment.
- New entrypoint added to `scripts/lib/plugin-sdk-entrypoints.json`.
- `tsconfig.plugin-sdk.dts.json` include/exclude change.

## Three drift gates compared

| Gate | What it catches | Hash file | Check |
|---|---|---|---|
| **Plugin SDK API baseline** (this) | TS public-API surface drift | `docs/.generated/plugin-sdk-api-baseline.sha256` | `pnpm plugin-sdk:api:check` |
| **Bundled-plugin config baseline** | Plugin manifest config-shape drift | `docs/.generated/config-baseline.sha256` (separate) | `pnpm config:docs:check` |
| **Swift protocol regen** | Gateway frame/method drift | none — relies on the regenerated Swift files | `pnpm protocol:gen:swift` (manual) |

All three feed `release:check`. None gates ordinary PRs by default —
contributor + reviewer discipline carries the load.

## Footguns

1. **Partial regen.** Run `pnpm plugin-sdk:api:gen`, then make another export change without re-running. The committed hash is now stale; CI fails mysteriously next release.
2. **Forgetting the hash commit.** Regenerate JSON/JSONL locally but forget to `git add docs/.generated/plugin-sdk-api-baseline.sha256`. CI sees drift forever.
3. **Editing `.sha256` by hand.** Don't. Always regen via the script. Hand-edits corrupt the invariant.
4. **Untracked entrypoint.** Add `src/plugin-sdk/new-thing.ts` without registering it in `scripts/lib/plugin-sdk-entrypoints.json`. The baseline won't include it; CI won't detect drift; the new export is silently part of the public surface without ever appearing in the audit.
5. **`tsconfig.plugin-sdk.dts.json` include/exclude churn.** Modifying compile inputs without re-running `plugin-sdk:api:gen` means the next render produces a different surface and the hash mismatches.
6. **No PR-time CI gate.** The check is workflow_dispatch + release-only. Don't trust CI to catch baseline drift on every PR; verify locally.

## Files I'd link from any SDK API PR

1. `scripts/generate-plugin-sdk-api-baseline.ts` — entry script (~47 LOC, readable).
2. `src/plugin-sdk/api-baseline.ts` — render + hash + write logic (~530 LOC).
3. `scripts/lib/plugin-sdk-doc-metadata.ts` — entrypoint metadata + categories.
4. `scripts/lib/plugin-sdk-entrypoints.json` — entrypoint registry.
5. `tsconfig.plugin-sdk.dts.json` — compiler config.
6. `.github/workflows/workflow-sanity.yml` — CI gate.
7. `docs/.generated/plugin-sdk-api-baseline.sha256` — the pinned artifact.

## Read next

- [`plugin-model.md`](plugin-model.md) — the SDK contract this baseline pins.
- [`manifest-schema.md`](manifest-schema.md) — sibling drift gate for manifests.
- [`gateway-protocol.md`](gateway-protocol.md) — the third drift gate (Swift codegen).
