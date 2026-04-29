---
name: hook-engine-legacy
description: openclaw-core's internal event-driven hook system at src/hooks/ — a coexisting parallel surface to the typed plugin hooks; bundled/plugin/managed/workspace precedence; gmail watch + fire-and-forget queue + frontmatter-driven discovery
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Legacy / internal hook engine

## "Legacy" is a misnomer

The directory is called `src/hooks/` and the system is colloquially "legacy"
because it predates the typed plugin hook engine
([`hook-engine-typed.md`](hook-engine-typed.md) — pending). But there is **no
deprecation marker, no migration plan, no `@deprecated` annotation** in the
48-file directory. It is the primary mechanism for *internal* event
observation across openclaw-core: agent bootstrap, gateway startup, session
patches, message lifecycle. The two systems coexist and **do not call each
other** (`internal-hooks.ts:189`).

Mental model:

| System | Surface | Event count | Audience |
|---|---|---|---|
| Typed plugin hooks (`src/plugins/hook-types.ts`) | application-layer (prompt build, model resolution, tool invoke) | 33 typed events | plugin authors |
| **This system** (`src/hooks/`) | core lifecycle (agent boot, gateway startup, message lifecycle) | 6 core event types | internal code + four hook sources |

This spec covers the second system.

## Surface inventory

### Core event types — `internal-hook-types.ts`

| Event | Sub-events | Cite |
|---|---|---|
| `agent` | bootstrap | `internal-hook-types.ts:1` |
| `gateway` | startup | same |
| `message` | `received`, `sent`, `transcribed`, `preprocessed` | `internal-hooks.ts:54-165` |
| `session` | patch | `internal-hooks.ts:167-177` |
| `command` | (via mapper, not direct) | `message-hook-mappers.ts` |

That's it. Six event types, ~10 sub-events. Tiny vs the 33-typed-event
plugin system, because it intentionally targets *core* lifecycle, not
domain semantics.

### Four-tier hook sources (`policy.ts:26-54`)

| Source label | Default state | Precedence | Origin |
|---|---|---|---|
| `openclaw-bundled` | enabled | 10 | shipped with core |
| `openclaw-plugin` | enabled | 20 | loaded from plugin manifests |
| `openclaw-managed` | enabled | 30 | `~/.openclaw/hooks/` (user-installed) |
| `openclaw-workspace` | **explicit opt-in** | 40 | workspace `.hooks/` directory |

Higher precedence wins on conflicts. Workspace hooks need
`hooks.internal.entries.<id>.enabled: true` or they silently don't load —
asymmetric vs the other three tiers and a surprise vector.

### Bundled hooks (default-on examples)

- `boot-md` — runs startup checklist.
- `session-memory` — transcript persistence.
- `command-logger` — logs commands.
- `bootstrap-extra-files` — copies extras at boot.

### Domain-specific hooks worth knowing

| Subsystem | Files | Purpose |
|---|---|---|
| Gmail watch | `gmail.ts`, `gmail-watcher.ts`, `gmail-watcher-lifecycle.ts`, `gmail-ops.ts`, `gmail-setup-utils.ts`, `gmail-watcher-errors.ts` (+tests) | Google Pub/Sub-based inbox watch. Tailscale-tunnel aware. |
| Fire-and-forget queue | `fire-and-forget.ts:5-25` | Bounded async task queue: max **16 concurrent**, **256 queued**, drops silently when full. |
| Import-URL | `import-url.ts` | Load hooks from remote URLs. |
| Message hook mappers | `message-hook-mappers.ts` (sibling) | Bridges raw message events to higher-level command/custom events. |

### Central files

| File | Lines | Role |
|---|---|---|
| `src/hooks/internal-hooks.ts` | ~306 | True implementation: singleton Map registry, dispatcher, type guards |
| `src/hooks/hooks.ts` | 14 | **Public facade** — re-exports under `registerHook`, `triggerHook`, `HookEvent` aliases |
| `src/hooks/internal-hook-types.ts` | 19 | Event + handler types |
| `src/hooks/loader.ts` | ~260 | Hook discovery and dynamic import (legacy + new formats) |
| `src/hooks/policy.ts` | ~140 | Source precedence + enable/disable state machine |
| `src/hooks/install.ts` | ~200 | User-facing install entry points |
| `src/hooks/installs.ts` | ~30 | Persistence of install records |
| `src/hooks/legacy-config.ts` | 18 | Backwards-compat config reader |
| `src/hooks/frontmatter.ts` | ~70 | YAML frontmatter parser for HOOK.md |
| `src/hooks/plugin-hooks.ts` | ~99 | Plugin-contributed hooks loader |
| `src/hooks/bundled-dir.ts` | ~49 | Bundled hook discovery (bun/npm/dev layouts) |

## `internal-hooks.ts` vs `hooks.ts`

Two-file split. **`internal-hooks.ts`** is the implementation:

- Singleton `Map` registry on `globalThis` keyed by a `Symbol.for()` marker (`:189-193`) — same pattern the diagnostic event stream uses, same reason: bundle-chunk visibility.
- Functions: `registerInternalHook`, `triggerInternalHook`, `clearInternalHooks`, `getRegisteredEventKeys` (`:220-266`).
- Type guards for specific event kinds (`:364-457`) — narrow `InternalHookEvent` to `agent:bootstrap`, `message:received`, etc.

**`hooks.ts`** is the 14-line public facade:

```ts
export {
  registerInternalHook as registerHook,
  triggerInternalHook as triggerHook,
} from "./internal-hooks";
export type { HookEvent } from "./internal-hook-types";
```

The split avoids type-import circularities and keeps the public name
shorter.

## Install / uninstall flow

Hooks can be installed at runtime by users; the lifecycle:

1. **Entry**: `installHooksFromNpm()`, `installHooksFromPath()`, `installHooksFromArchive()` etc. in `install.ts:49-100`.
2. **Runtime delegation**: `install.runtime.ts` re-exports infra helpers (NPM spec resolution, archive extraction). Standard `*.runtime.ts` lazy-boundary pattern.
3. **Persistence**: `installs.ts:6-30` records the install in config under `cfg.hooks.internal.installs[hookId]` with `installedAt` ISO timestamp and `hooks: string[]` list.
4. **Discovery on next boot**: `loader.ts:80-180` scans the recorded install paths, parses `HOOK.md` frontmatter, dynamic-imports the handler.

**No explicit uninstall.** Removing a hook from `hooks.internal.installs`
stops it loading; the files in `~/.openclaw/hooks/` are not deleted.
Operators clean up manually if desired.

### `HOOK.md` frontmatter

Hooks are declared via a `HOOK.md` file with YAML frontmatter, parsed by
`frontmatter.ts:resolveOpenClawMetadata()` (`:48-70`):

```yaml
---
events:
  - agent:bootstrap
  - gateway:startup
requires:
  bins:
    - python3
os:
  - darwin
  - linux
install:
  - kind: npm
    package: "@openclaw/my-hook"
---
```

Loader uses this to know what to load, what events to subscribe to, what
binaries/OS the hook requires. Frontmatter is read *before* the handler
runs — same manifest-first pattern as plugins.

## Configuration surface

Lives at `cfg.hooks.internal` in `~/.openclaw/config.json`. Schema at
`src/config/types.hooks.ts:69-91`:

```ts
hooks: {
  internal: {
    enabled?: boolean;                                // master on/off
    entries?: Record<string, HookConfig>;             // per-hook override
    load?: { extraDirs?: string[] };                  // extra scan paths
    installs?: Record<string, HookInstallRecord>;     // installed hook packs
  }
}

type HookConfig = { enabled?: boolean; env?: Record<string, string> };
type HookInstallRecord = { hooks?: string[]; installedAt?: string };
```

The `entries.<id>.env` lets per-hook env vars be set without polluting the
process env — useful for credentials scoped to a single hook.

## Legacy config — what's still loaded

`legacy-config.ts:1-18` extracts the ancient inline format:

```ts
hooks: {
  internal: {
    handlers: [
      { event: "command:new", module: "path/to/handler.js", export?: "myExport" }
    ]
  }
}
```

The loader (`loader.ts:181-260`) treats these as "legacy internal hook
handlers" and dynamically imports them. **No migration path is
documented**; the format simply coexists with the directory-based
discovery (`openclaw-workspace`, `openclaw-managed`, `openclaw-bundled`).
This is the closest thing to a deprecation signal in the dir, and even
this is just "here's the old format, we still read it."

## Relationship to typed plugin hooks

**Completely disjoint.** They share neither registry, dispatcher, nor
event types. But:

- A **plugin** can contribute *legacy* hooks via its manifest. `plugin-hooks.ts:21-99` walks plugin `hooks` directories, evaluates plugin-activation state, and loads the legacy-style hooks alongside bundled/managed/workspace.
- A plugin's *typed* hooks (`src/plugins/hook-types.ts`) never touch this system.
- The bundled legacy hooks (`boot-md`, `session-memory`) are triggered by core code — not by typed hooks firing.

So a plugin can register against *both* systems. Picking the right one
is the same decision as in the diagnostic-event-stream spec:

| Use legacy/internal hooks for | Use typed plugin hooks for |
|---|---|
| reacting to core lifecycle events (bootstrap, startup, session) | participating in agent/prompt/model lifecycle |
| installing user-facing reactive logic (gmail watch, scheduled jobs) | merging logic across plugins (with merge functions) |
| simple "fire when X happens, do Y" | typed payload + result + priority + timeout |

## Footguns and load-bearing details

1. **Global singleton via `Symbol.for()`** (`internal-hooks.ts:189-193`). Without it, bundler chunk splitting would lose handlers registered in one chunk when another chunk dispatched. Same pattern as the diagnostic event stream.
2. **Workspace hooks are explicit-opt-in.** `policy.ts:48-54`. Unlike bundled/plugin/managed (default-on), workspace hooks need `hooks.internal.entries.<id>.enabled: true`. Easy to forget.
3. **Handler errors are swallowed.** `internal-hooks.ts:298-305` — caught and logged. A single handler failing doesn't stop others. Logging is subsystem-level (potentially verbose).
4. **Fire-and-forget bounded queue silently drops.** `fire-and-forget.ts:5-25` — 16 concurrent / 256 queued. Exceeding the queue drops via logger; no backpressure signal to the caller. Don't put critical work behind it.
5. **`message:received` is not a user-webhook event.** That's a separate system in `gateway/hooks/` plus `message-hook-mappers.ts` — the mapper *calls* `triggerInternalHook` to bridge raw inbound messages into the legacy event stream. Don't conflate the user-facing webhook system with this internal stream.
6. **No explicit uninstall path** (above). Operators clean up files manually.
7. **Plugin-contributed legacy hooks honor plugin-activation state.** `plugin-hooks.ts` skips loading legacy hooks from inactive plugins. Plugin reload propagates to its legacy hooks.
8. **Two discovery formats coexist.** Directory-based with `HOOK.md` frontmatter (newer) and inline `hooks.internal.handlers` config (legacy). Both work. Know which one a given hook uses before debugging it.

## Files I'd link from any hook-touching PR

1. `src/hooks/internal-hooks.ts:189-306` — registry + dispatcher core.
2. `src/hooks/hooks.ts` — public facade.
3. `src/hooks/internal-hook-types.ts` — event/handler types.
4. `src/hooks/loader.ts:80-260` — discovery + dynamic import.
5. `src/hooks/policy.ts:26-54` — source precedence + workspace opt-in.
6. `src/hooks/install.ts:49-100` — install entry points.
7. `src/config/types.hooks.ts:69-91` — config schema.
8. `src/hooks/frontmatter.ts:48-70` — `HOOK.md` parser.

## Read next

- A2 in [`TOUR.md`](TOUR.md) — the *typed* hook engine deep dive (the other system).
- [`diagnostic-event-stream.md`](diagnostic-event-stream.md) — third event channel; uses the same `globalThis`/`Symbol.for()` singleton pattern.
- B5 in [`TOUR.md`](TOUR.md) — MCP integration (one of the user-facing webhook entry points that flows through this system).
