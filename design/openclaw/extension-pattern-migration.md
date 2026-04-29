---
name: extension-pattern-migration
description: The migration plugin pattern — three-phase detect/plan/apply codemods; migrate-claude and migrate-hermes exemplars; idempotency, secrets, conflict policy
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Extension pattern — migration plugins

## What a migration plugin is

A **three-phase stateful importer** that pulls state from a legacy
system into OpenClaw. Phases:

```
detect  → filesystem probe, confidence + found flag
   │
plan    → itemized changelog (no I/O — preview only)
   │
apply   → mutate config, copy/append files, archive unsupported state
```

Human review fits between `plan` and `apply`. Backup before apply.
Plans are JSON-serializable and can be `--dry-run`'d safely.

Migration plugins are not pure codemods — they handle **all of**:

- codemods (skill Markdown conversion, prompt rewrites),
- config schema translation (provider, model, memory binding),
- auth profile mapping,
- data migration (workspace files, memories, secrets when flagged).

## Manifest fields

Each plugin declares its provider id under `contracts.migrationProviders`:

```jsonc
{
  "id": "migrate-hermes",
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

Static metadata, read before plugin code loads. Drives `openclaw migrate
list` discovery + onboarding surfaces. Schema reference:
`docs/plugins/manifest.md:495-508`.

At runtime the plugin calls `api.registerMigrationProvider(provider)`
to wire the implementation in.

## migrate-claude

**FROM:** Claude Code home (`~/.claude`), project state (`.claude/CLAUDE.md`,
`.mcp.json`, skills/), Claude Desktop (`claude_desktop_config.json`).

**TO:** OpenClaw workspace (agent CLAUDE.md, MEMORY.md, SOUL.md merged),
MCP server catalog, skill tree.

Flow (`extensions/migrate-claude/`):

| Phase | Function | Behavior |
|---|---|---|
| `detect()` | `discoverClaudeSource()` (`source.ts`) | Probes `~/.claude/`, project roots, home `.mcp.json`, Desktop config. Returns confidence + found. |
| `plan()` | `buildClaudePlan()` | Enumerates items: memory → `buildMemoryItems()`, configs → `buildConfigItems()` (MCP servers, skill metadata), skills → `buildSkillItems()` (Markdown conversion). |
| `apply()` | `applyClaudePlan()` (`apply.ts:67-105`) | Iterates items; archive items go to a report directory for manual review; config items via `runtime.config.mutateConfigFile()`; files via `copyMigrationFileItem()` or append. |

Conflicts block apply unless `--overwrite` (`apply.ts:79-81`).

## migrate-hermes

**Hermes**: cloud-native multi-LLM orchestrator with config.yaml-driven
provider binding, file memory (SOUL.md, AGENTS.md, memories/), skill
bundles, .env secrets, model refs.

**FROM:** `~/.hermes/` — config.yaml, provider definitions, MCP servers,
workspace files, memory, skills.

**TO:** OpenClaw config (providers array, models, default model ref),
workspace files, memory files, skills.

Flow (`extensions/migrate-hermes/`):

| Phase | Function | Behavior |
|---|---|---|
| `detect()` | `provider.ts:14-35` | Detects Hermes config at `~/.hermes` or `--from`; high/low confidence. |
| `plan()` | `buildHermesPlan()` (`:47-162`) | Model migration via `resolveHermesModelRef()`; provider/memory/skill config items; workspace files (SOUL.md, AGENTS.md → copy); memory (MEMORY.md, USER.md → append for accumulation); skills via `buildSkillItems()`; secrets via `buildSecretItems()` (gated by `--include-secrets`); archives plugins/, sessions/, logs/, cron/, mcp-tokens/, auth.json, state.db. |
| `apply()` | `applyHermesPlan()` | Model-apply ordering (`:93-95`). Skips downstream items if a config error blocks (`:88-90`). |

**Secrets off by default.** `--include-secrets` required to migrate
`.env` keys.

## CLI flow

```
openclaw migrate list                       # registered providers
openclaw migrate hermes --dry-run           # plan only
openclaw migrate apply hermes --yes         # apply after confirmation
openclaw migrate hermes --include-secrets   # include .env import
```

Orchestration:

1. Plugin manifest declares `contracts.migrationProviders: ["hermes"]`.
2. User runs `openclaw migrate hermes` → core calls `provider.detect(ctx)`.
3. If found → `provider.plan(ctx)` → itemized changelog (preview JSON via `--json`).
4. User reviews, confirms (or `--dry-run` exits).
5. Core creates backup of existing OpenClaw state.
6. Core calls `provider.apply(ctx, plan)` → provider mutates + writes report.
7. Report saved to `ctx.reportDir` (default `~/.openclaw/state/migration/<provider>/`).

`MigrationProviderContext` (`src/plugins/types.ts`):

| Field | Purpose |
|---|---|
| `source` | Source root (e.g., `~/.hermes`). |
| `config` | Current OpenClaw config (mutable via `runtime.config.mutateConfigFile()`). |
| `runtime` | Optional provider runtime for direct config mutation. |
| `overwrite` | Allow target conflicts. |
| `includeSecrets` | Hermes only — gate for `.env` import. |
| `stateDir`, `reportDir`, `backupPath` | Filesystem roots. |

## Codemod targets

### Claude

| Source | Target | Action |
|---|---|---|
| `~/.claude/skills/<name>/` | OpenClaw skill tree | copy preserving `SKILL.md` |
| `.mcp.json`, Claude Desktop JSON | `config.mcp.servers[]` | merge |
| Project `CLAUDE.md` | workspace | copy |
| User `CLAUDE.md` | USER.md | append |
| Auth (OAuth, Desktop creds) | — | archive (manual review) |

### Hermes

| Source | Target | Action |
|---|---|---|
| `~/.hermes/skills/<name>/` | OpenClaw skill tree + `skills.config` | copy + merge |
| Providers, custom OpenAI endpoints | `config.providers` | translate |
| Memory defaults | `config.memory.*` | translate (file-memory only; external archived) |
| SOUL.md, AGENTS.md | workspace | copy |
| MEMORY.md, USER.md | workspace | **append** (multi-source accumulation) |
| Default model | `config.models.default` | normalize |
| `.env` keys | `config.auth.<provider>.apiKey` | requires `--include-secrets` |

## Idempotency and dry-run

| Mode | Safety |
|---|---|
| `--dry-run` | runs `plan()` only; prints summary; **safe, repeatable.** |
| `apply` | **not idempotent by design.** Conflicts on second run unless `--overwrite`. |

Conflicts reported per-item in the plan (Claude `plan.ts:79-81`,
Hermes `:138-141`). Backup created before apply
(Claude `apply.ts:72`); operators can restore from backup.

`--dry-run` is for previewing; second `apply` requires `--overwrite` to
acknowledge intentional replacement.

## The pattern, abstracted

1. **Modular detection.** Probe filesystem for marker files; return confidence + found.
2. **Declarative item model.** Each migration unit is a `MigrationItem` with `id`, `kind`, `action`, `source`, `target`, `status`, `reason`. Status pipeline: `planned` → `migrated` | `skipped` | `conflict` | `error`.
3. **Safe previewing.** `plan()` does no I/O. JSON/text output redacts secrets via `redactMigrationValue()`.
4. **Pluggable actions.** `kind` + `action` dispatch to handlers (copy, archive, append, create, custom).
5. **Static manifest + runtime registration.** Cheap discovery; `api.registerMigrationProvider()` wires runtime.
6. **Reusable SDK.** `openclaw/plugin-sdk/migration` exports item constructors, summary rollup, secret redaction. `openclaw/plugin-sdk/migration-runtime` handles file ops, archive I/O, report writing.

## Footguns

1. **Secret redaction isn't foolproof.** Custom env keys (e.g., `MY_CUSTOM_KEY=sk-...`) may leak if name doesn't match the secret heuristics. Operators should always audit the report.
2. **Config merge collisions.** Appending memory + merging provider configs assumes target is empty. Re-running with `--overwrite` can erase handwritten config. Always backup before.
3. **Hermes config-error cascades.** Failed config item (`apply.ts:88-90`) skips all downstream items in the plan. No resumability — fix and re-run.
4. **Skill detection is filename-based.** Only directories with `SKILL.md` migrate. Missing `SKILL.md` → archived for manual review.
5. **Auth state is opaque.** OAuth flows, Desktop credentials, Hermes plugins/ are archived, not executed. Manual auth setup post-migration.
6. **Runtime mutability race.** Cached config-file mutations flush after the mutation function. If provider reads "fresh" config between items, caching may hide conflicts.

## Files I'd link from any migration PR

1. `docs/cli/migrate.md` — CLI surface + provider contract.
2. `docs/plugins/manifest.md:454-508` — `contracts.migrationProviders` schema.
3. `extensions/migrate-claude/provider.ts` — exemplar provider interface.
4. `extensions/migrate-hermes/provider.ts` — second exemplar (model + secrets).
5. `src/plugin-sdk/migration.ts` — shared helpers.
6. `src/plugin-sdk/migration-runtime.ts` — file ops + report writing.

## Read next

- [`extension-pattern-provider.md`](extension-pattern-provider.md) — provider contract pattern (this pattern is a specialization).
- [`extension-pattern-skill.md`](extension-pattern-skill.md) — skills are migrated by these plugins.
- [`doctor-and-migration.md`](doctor-and-migration.md) (pending) — runtime-level migration via `openclaw doctor`, distinct surface.
