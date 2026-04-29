---
name: cli
description: openclaw CLI — Commander v14 dispatcher, entry flow, command registry, plugin-contributed commands, slash commands, help system
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# CLI / Commander dispatcher

## Entry flow — shell to handler

```
$ openclaw <cmd> [args]
   │
   ▼ resolves to bin entry
openclaw.mjs                     ─ version guard (Node 22.12+), compile-cache, help fast-path
   │
   ▼ delegates
dist/entry.js (src/entry.ts)     ─ respawn guard, env normalization, respawn plan
   │
   ▼ calls
runCli() in src/cli/run-main.ts  ─ resolves CLI metadata, profile/container/gateway fast-paths
   │
   ▼ builds
buildProgram() in src/cli/program/build-program.ts   ─ Commander instantiation
   │
   ▼ registers
registerProgramCommands(...) in src/cli/program/command-registry.ts
   │
   ▼ parses argv
Commander → action handler
```

Cites: `openclaw.mjs:1-241`, `src/entry.ts:77-240`,
`src/cli/run-main.ts:140-162`, `src/cli/program/build-program.ts:9-29`,
`src/cli/program/command-registry.ts:22-29`.

## Commander v14.0.3 setup

| Detail | Value |
|---|---|
| Version | Commander v14.0.3 (cited in our adapter-audits guide) |
| Positional options | enabled |
| Help | custom (sorted subcommands, theme coloring, suffix `*` for groups) |
| Exit override | preserves exit codes (`exitOverride()`) |

### Top-level command tree

Registered in `src/cli/program/core-command-descriptors.ts:6-108`. Major
groups:

| Group | Purpose |
|---|---|
| `crestodian`, `setup`, `onboard`, `configure` | initialization |
| `config`, `backup`, `migrate` | config management |
| `doctor`, `dashboard`, `reset`, `uninstall` | maintenance |
| `message` | send / read messages |
| `mcp` | MCP integration ([`mcp.md`](mcp.md)) |
| `agent`, `agents` | agent workspaces + execution |
| `status`, `health`, `sessions`, `tasks` | runtime introspection |
| `gateway` | daemon lifecycle ([`daemon-lifecycle.md`](daemon-lifecycle.md)) |

### Registration flow

1. `defineImportedProgramCommandGroupSpecs()` declares module paths + export names.
2. `buildCommandGroupEntries()` lazy-loads modules, groups by command name.
3. `registerCommandGroups()` applies registration policy (eager vs deferred, primary-only filter), invokes each registrar.

Subcommands loaded via `register.subclis.ts` (completion, plus
plugin-contributed commands).

Cite: `src/cli/program/command-registry-core.ts:49-130`,
`src/cli/program/build-program.ts:11-26`.

## Plugin-contributed CLI commands

Plugins surface CLI commands two ways:

### Manifest

```jsonc
{
  "commandAliases": [
    { "name": "dreaming", "kind": "runtime-slash", "cliCommand": "memory" }
  ],
  "activation": { "onCommands": ["mycommand"] }
}
```

`commandAliases[]` declares command names + their `kind` (`runtime-slash`
for chat commands, otherwise CLI). `activation.onCommands[]` triggers
plugin load when the user invokes that command.

Cite: `docs/plugins/manifest.md:211-234, :296`.

### Runtime

Plugins call `api.registerCli(program, handler)` from inside `register()`.
The plugin SDK exposes the surface at `src/plugin-sdk/cli-runtime.ts`.

**Plugins do not directly amend `command-registry.ts`.** Their handlers
are registered by the plugin loader when activation matches. This keeps
core's command tree stable; plugin contributions layer on top.

## Slash commands vs CLI commands

Distinct dispatchers, distinct surfaces.

| Kind | Surface | Examples |
|---|---|---|
| **CLI** | shell-level | `openclaw agents list`, `openclaw config get key` |
| **Slash** | runtime, chat-in-agent | `/dreaming on`, `/memory`, `/skills list` |

Slash command parsing lives at `src/auto-reply/reply/commands-slash-parse.ts:13-48`.
`parseSlashCommandActionArgs()` extracts action + args from message text;
returns discriminated union `{ kind: "parsed", action, args }` on match.

Dispatcher: `src/auto-reply/reply/reply-dispatcher.ts:14-125`. Slash
handlers register via `registerDispatcher()` from
`dispatcher-registry.ts`. Runtime events, not CLI argv.

`commandAliases[].kind: "runtime-slash"` is metadata for
diagnostics — runtime behavior lives in plugin `register()`, not in
the alias.

## Argument parsing strategy

Per-command schema. Each command module defines its own options +
subcommands + parsing via Commander API:

```ts
program
  .command("mycommand")
  .description("My command")
  .option("--flag", "Description")
  .argument("<positional>", "Description")
  .action((args, options, command) => { /* handler */ });
```

Central policy at `src/cli/command-registration-policy.ts` and
`run-main-policy.ts`:

| Policy | Effect |
|---|---|
| `shouldRegisterPrimaryCommandOnly()` | Defer subcommand loading until second parse pass. |
| `shouldEagerRegisterSubcommands()` | Load all subcommands upfront vs deferred. |
| `isGatewayRunFastPathArgv()` | Bypass normal parsing for `openclaw gateway run …` to reduce startup latency. |

## Output formatting

| Surface | File | Purpose |
|---|---|---|
| Progress UI | `src/cli/progress.ts:1-100+` | `createCliProgress()` wraps `osc-progress` (native terminal progress) or falls back to spinner / line. Detects TTY + OSC support. |
| Markdown tables | `src/markdown/tables.ts:13-43` | `convertMarkdownTables(markdown, mode)` — block/code/plain. |
| Status tables | `src/commands/models/list.table.ts`, `src/commands/status-all/report-tables.ts` | Command-specific renderers. |
| Theme | `src/terminal/theme.ts` | Color/style helpers (`.command()`, `.error()`, `.accent()`, `.muted()`). |

## Help system

### Fast paths in `openclaw.mjs:169-225`

| Function | Behavior |
|---|---|
| `tryOutputBareRootHelp()` | `--help` on root → load precomputed `rootHelpText` from `cli-startup-metadata.json`. |
| `tryOutputBrowserHelp()` | `openclaw browser --help` precomputed fast-path. |

Precomputed text lives in `cli-startup-metadata.json` — generated at
build time. Manual help-text edits don't auto-update; run `pnpm build`
to regenerate.

### Interactive help — `src/cli/program/help.ts:47-144`

`configureProgramHelp(program, ctx)` registers Commander hooks:

- `.configureHelp()` sorts subcommands, applies theme coloring, marks groups (`*` suffix for commands with subcommands).
- `.addHelpText("beforeAll" / "afterAll")` injects banner + examples.

Example commands hardcoded in `help.ts:23-45` for `openclaw --help`.

Subcommand help: each registrar can add `.addHelpText()` blocks. Built-in
`-h, --help` support handles invocation.

## Adding a new top-level command

For core commands:

1. Create registrar module `src/cli/program/register.<name>.ts`:
   ```ts
   export function registerXxxCommand(program: Command) {
     program
       .command("xxx")
       .description("...")
       .option("--flag", "...")
       .action((options) => { /* … */ });
   }
   ```
2. Add to `coreEntrySpecs` in `src/cli/program/command-registry-core.ts`:
   ```ts
   { commandNames: ["xxx"], loadModule: () => import("./register.xxx.js"), exportName: "registerXxxCommand" }
   ```
3. Update `core-command-descriptors.ts` (name, description, hasSubcommands).
4. Add tests colocated as `*.test.ts`.

For plugin commands:

1. Declare in manifest: `commandAliases: [{ name: "xxx", cliCommand: "xxx" }]`, optionally `activation.onCommands: ["xxx"]`.
2. Call `api.registerCli(...)` in plugin's `register()`.
3. Activation auto-fires on first invocation.

## Footguns

1. **Compile cache respawn.** `openclaw.mjs` respawns without `NODE_COMPILE_CACHE` on first run; detects `.git` to identify a dev checkout. Override via `NODE_DISABLE_COMPILE_CACHE=1`.
2. **Primary-only policy can confuse help introspection.** When `shouldRegisterPrimaryCommandOnly()` is true, only the first command's subcommands load — second `program.parse()` needed for transitions.
3. **Gateway fast-path is brittle.** `isGatewayRunFastPathArgv()` is a micro-optimization. Non-standard tokens in argv break it. Changes to `openclaw gateway run` options can inadvertently disable the fast-path.
4. **Plugin CLI registration order is unspecified.** Two plugins claiming the same command name → last-loaded wins (silent override).
5. **Help precomputation drifts.** Manual edits to help text don't propagate to `cli-startup-metadata.json` until `pnpm build`. CI catches mismatches; local dev can be confusing.
6. **Slash-command name collisions with CLI.** A `/dreaming` runtime slash exists with no CLI command `dreaming`. Manifest `commandAliases` flags the distinction but doesn't enforce. Plugins must avoid shadowing CLI command names.

## Files I'd link from any CLI PR

1. `src/cli/program/build-program.ts` — Commander instantiation.
2. `src/cli/program/command-registry.ts` — registration orchestration.
3. `src/cli/program/core-command-descriptors.ts` — command catalog + metadata.
4. `src/cli/run-main.ts` — entry + gateway fast-path.
5. `src/plugin-sdk/cli-runtime.ts` — plugin CLI API.
6. `src/cli/program/help.ts` — help system.
7. `docs/plugins/manifest.md:211-234, :296` — manifest CLI schema.

## Read next

- [`daemon-lifecycle.md`](daemon-lifecycle.md) — `openclaw gateway` subcommand surface.
- [`manifest-schema.md`](manifest-schema.md) — `commandAliases` and `activation.onCommands`.
- [`plugin-loader.md`](plugin-loader.md) — how plugin-contributed commands actually fire.
