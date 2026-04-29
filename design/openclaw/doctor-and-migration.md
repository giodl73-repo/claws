---
name: doctor-and-migration
description: openclaw doctor command and runtime config migration — repair OpenClaw's own state (config, auth, plugins, sandbox); distinct from cross-system migrate-claude/migrate-hermes plugins
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Doctor + runtime migration

## Two distinct surfaces

| Surface | What it does | Spec |
|---|---|---|
| **`openclaw doctor`** | Repair / diagnose **OpenClaw's own state** — config validity, missing bins, stale auth, rebrand artifacts, plugin compat | this spec |
| **`openclaw migrate <provider>`** | Cross-system import — `migrate-claude`, `migrate-hermes` (one-time directed import from external state) | [`extension-pattern-migration.md`](extension-pattern-migration.md) |

`AGENTS.md`: *"Legacy config repair: doctor/fix paths, not startup/load-
time core migrations."* Doctor is the on-demand repair tool; runtime
core migrations don't auto-rewrite config silently.

## What doctor does

A unified health check that runs ~14 contributions in sequence
(`src/flows/doctor-health-contributions.ts:40-440`). Five primary
categories:

| Category | Scope |
|---|---|
| **Config validity** | Unrecognized keys, stale schema, missing required fields, legacy field names |
| **Missing binaries / deps** | Sandbox containers, plugin manifests, browser CLI, gateway binaries, optional transcription/media |
| **Stale auth** | Expired OAuth tokens, missing profiles, profile-store corruption, legacy OAuth ID schemes |
| **Rebrand artifacts** | Obsolete provider overrides, legacy plugin contracts, cron-store structure, deprecated internal hooks |
| **Plugin compat + reachability** | Plugin registry validity, bundled-plugin runtime deps, gateway connectivity, channel capability contracts |

## `--fix` semantics

| Flag | Behavior |
|---|---|
| `openclaw doctor` | **Read-only diagnose.** Prints warnings + suggestions. No file mutation. |
| `--fix` / `--repair` | Enables repairs. |
| `--yes` | Auto-approve all non-destructive fixes (skip interactive confirmation). |
| `--force` | Confirm destructive / high-risk fixes (e.g., remove sandboxes, delete cron payloads). |

**Idempotent.** Running doctor multiple times without new issues
produces no changes. Each check exposes a `shouldRepair` flag resolved
by `resolveDoctorRepairMode()` in `src/commands/doctor-repair-mode.ts`.

## Subcommand surface

Single unified command. No subcommand routing yet (e.g., no
`openclaw doctor auth`, `openclaw doctor config`); all checks run in
fixed sequence. Future extension could add `--category` filtering by
mapping contribution ids to CLI flags. Today the contribution registry
defines order; users can't isolate.

## Inventory of checks

In execution order from `src/flows/doctor-health-contributions.ts`:

| Check | Function | Cite |
|---|---|---|
| Config load + legacy migration | `loadAndMaybeMigrateDoctorConfig()` | `src/flows/doctor-health.ts` |
| Gateway config health | `runGatewayConfigHealth()` | — |
| Auth profile health | `runAuthProfileHealth()` | `doctor-auth-flat-profiles.ts`, `doctor-auth-legacy-oauth.ts`, `doctor-auth.ts` |
| Gateway auth health | `runGatewayAuthHealth()` | — |
| Claude CLI health | `runClaudeCliHealth()` | — |
| Legacy state health | `runLegacyStateHealth()` | `src/infra/state-migrations.js` |
| Plugin manifest health | `runLegacyPluginManifestHealth()` | migrates `speechProviders` → `contracts.speechProviders`, etc. |
| Plugin registry health | `runPluginRegistryHealth()` | — |
| Bundled plugin deps health | `runBundledPluginRuntimeDepsHealth()` | — |
| State integrity health | `runStateIntegrityHealth()` | session locks, transcript indices, cloud sync |
| Sandbox health | `runSandboxHealth()` | Docker images, scope, legacy storage paths |
| Gateway services health | `runGatewayServicesHealth()` | systemd / launchctl / Windows Tasks |
| Security warnings | `runSecurityHealth()` | overly permissive allowlists, cleartext auth, TLS prereqs |
| Browser health | `runBrowserHealth()` | Chrome / MCP browser CLI readiness |

## Doctor vs migrate

The boundary is **temporal + structural:**

| | Doctor | Migrate |
|---|---|---|
| When | On-demand or startup-time check | One-time directed import |
| What | OpenClaw's own state | External state from another product |
| Direction | In-place repair | External → OpenClaw |
| Idempotency | Safe to repeat | Single-shot (with `--overwrite`) |
| Targets | config paths, state dirs, registry files | sessions, manifests, auth profiles, skills |
| Gating | `--fix` / `--yes` / `--force` | Setup wizards or `--from <path>` |

## Runtime config migration

When a user upgrades OpenClaw and `~/.openclaw/config.json` contains
legacy field names, **doctor's config-load flow handles auto-migration**
— but it does **not** rewrite on first read at startup.

Flow (`loadAndMaybeMigrateDoctorConfig()`):

1. Detect legacy issues via rule registry (`src/config/legacy.ts`, `src/config/legacy.rules.ts`).
2. Apply migrations in-memory.
3. If `--fix`: persist; otherwise leave config untouched, print warnings.
4. Subsequent runs detect the same issues and repeat the prompt.

This avoids silent startup mutation. The user must explicitly consent
(via `--fix` or interactive `--yes`) to rewrite config.

Migration helpers in `src/commands/doctor/shared/legacy-config-migrations.*`
(audio, channels, runtime, web-search) implement field-by-field
transformations using the `LegacyConfigMigration` type:

```ts
type LegacyConfigMigration = {
  id: string;
  describe: string;
  apply: (rawConfig: unknown) => void;
};
```

`src/config/legacy.ts` feeds detection rules to doctor.

## Doctor ↔ PR-1 lint integration

PR-1 in our wave emits "doctor migration suggestions" via the
`OC_CFG_LEGACY_FIELD` lint. Concretely: lint output reads something
like

> `config.audio.transcriber.command` is deprecated; run
> `openclaw doctor --fix` to migrate to `audio.transcriber.type=cli`.

Doctor's migration rules
(`src/commands/doctor/shared/legacy-config-migrations.audio.ts`, …)
are the source of truth for the suggestion. Doctor is **expected** to
apply the fix when `--fix` runs.

The lint is *passive discovery*; doctor is the *active repair*. No
special integration code is needed — the rule registry and migration
specs are decoupled from linting. Linters reference legacy field names
independently.

## Diagnostic output shape

Doctor does **not** emit structured JSON by default. Output is human-
readable terminal notes via `note()` helper (`src/terminal/note.ts`).

| Section | Meaning |
|---|---|
| **Doctor changes** | Repairs applied (config field migrated, state rewritten, service installed) |
| **Doctor warnings** | Unresolved issues to address manually (auth expired, sandbox unavailable, security concern) |

Severity is implicit in title + body. Domain tags via title prefix:
*Gateway*, *Hooks*, *Security*, *Sandbox*, etc.

`emitDoctorNotes()` in `src/commands/doctor/emit-notes.ts` batches +
sanitizes notes. No `--json` mode today; future enhancement could emit:

```ts
{ severity: "warning"|"error"|"info"; category: string; message: string; suggestion?: string }[]
```

## Footguns

1. **False positives on includes/env expansion.** Legacy detection runs on the parsed config (after `$include` and `$env` resolution). An include file using a legacy field that the base config doesn't gets flagged but doctor only auto-migrates the main file — repeated warnings on every run.
2. **Partial repairs with plugin-owner checks.** Plugin registry checks run late. An earlier config migration that breaks a plugin's assumptions can cause later checks to silently fail. Running doctor twice usually resolves (idempotency).
3. **Auth profile recovery blocks on missing keychain.** If profile store is encrypted and system keychain is unavailable (fresh OS, locked, network delay), `--fix` stalls. `--non-interactive` skips the prompt but also skips the repair.
4. **Gateway-token overwrite refusal.** SecretRef-managed `gateway.auth.token` is not overwritten by `--generate-gateway-token`; doctor warns instead. Users may expect auto-generation and fail when external secret is unavailable.
5. **State-dir presumptions.** Doctor assumes `~/.openclaw/` exists and is writable. `OPENCLAW_STATE_DIR` set to a read-only path or laggy network share → some repairs hang without clear errors.

## Files I'd link from any doctor PR

1. `src/flows/doctor-health.ts` — entrypoint + flow orchestration.
2. `src/flows/doctor-health-contributions.ts:40-440` — contribution registry + sequencing.
3. `src/commands/doctor-repair-mode.ts` — `--fix` / `--yes` / `--force` resolution.
4. `src/commands/doctor-config-flow.ts` — config load + legacy migration.
5. `src/commands/doctor/shared/legacy-config-migrations.ts` — migration rules registry.

## Read next

- [`extension-pattern-migration.md`](extension-pattern-migration.md) — sibling cross-system import surface.
- [`manifest-schema.md`](manifest-schema.md) — `OC_CFG_LEGACY_FIELD` lint targets manifest fields.
- [`build-and-release.md`](build-and-release.md) — `pnpm release:check` runs `doctor`-adjacent gates.
