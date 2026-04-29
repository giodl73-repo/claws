---
name: canvas-host
description: Canvas-host + A2UI bundle — local HTTP server for agent-rendered UIs, Lit-based renderer, hash-gated bundle script, agent canvas-tool integration
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Canvas-host + A2UI

## What canvas-host is

A lightweight HTTP server (`src/canvas-host/server.ts`) that runs alongside
OpenClaw agents and presents a rich UI rendering surface for nodes
(iOS/Android/desktop clients). Binds to a local port; serves both
custom HTML canvases (user-defined in `~/.openclaw/state/canvas/`) and
the standardized A2UI widget library. Live-reload via WebSocket
(`/__openclaw__/ws`). All HTML responses get a bridge helper injected
that allows bidirectional communication between rendered UIs and the
agent runtime.

## A2UI — Agent-to-UI

Spec + component library for declarative, agent-driven UI rendering.
Agents emit JSONL commands that canvas-host interprets to render
structured responses — cards, forms, buttons, modals, tables —
instead of returning opaque text.

The A2UI spec lives in `vendor/a2ui/` (currently spec 0.8 + 0.9). The
vendor-supplied Lit-based renderer is in `vendor/a2ui/renderers/lit/`.
OpenClaw customizes and bundles this renderer for bootstrap into the
canvas environment.

## Bundle hash mechanics

`src/canvas-host/a2ui/.bundle.hash` is a SHA256 digest of all input
sources tracked by `pnpm canvas:a2ui:bundle`. The script
(`scripts/bundle-a2ui.mjs`) walks three trees:

- `ui/package.json` and dependencies (Lit ecosystem)
- `vendor/a2ui/renderers/lit/` (Lit renderer source)
- `apps/shared/OpenClawKit/Tools/CanvasA2UI/` (OpenClaw bootstrap + theme overrides)

Before bundling, computes hash and compares against the stored value.
If they match and `a2ui.bundle.js` exists, **bundling is skipped**.
Mismatch → full rebundle.

`AGENTS.md:180`: *"A2UI hash generated; ignore unless running
`pnpm canvas:a2ui:bundle`; commit separately."* The hash file is
checked in but bundles are gitignored.

## `pnpm canvas:a2ui:bundle`

Two-step:

1. **TypeScript compile** — `pnpm exec tsgo -p vendor/a2ui/renderers/lit/tsconfig.json`.
2. **Rolldown bundle** — `node scripts/bundle-a2ui.mjs` → `rolldown -c apps/shared/OpenClawKit/Tools/CanvasA2UI/rolldown.config.mjs`.

Rolldown bundles `CanvasA2UI/bootstrap.js` (imports A2UI Lit components
+ theme context + styling tweaks) into a single ESM file
(`a2ui.bundle.js`, ~486 KB).

When to run: editing A2UI theme/styling, or updating the Lit/A2UI
vendor dependencies. Also part of `build:strict-smoke` pre-build gate.

## Directory layout

`src/canvas-host/`:

| File | Role |
|---|---|
| `server.ts` | HTTP/WebSocket server, file resolver, live-reload |
| `a2ui.ts` | A2UI asset routing (resolves `a2ui/` subdir with fallbacks) |
| `a2ui-shared.ts` | Path constants + client-side bridge helper injection |
| `file-resolver.ts` | Sandbox-safe file traversal |
| `a2ui/a2ui.bundle.js` | bundled client renderer (generated, gitignored) |
| `a2ui/index.html` | A2UI harness (Lit custom elements, theme injections) |

Server is Node.js-only. UI is browser-side (iOS WKWebView, Android
WebView, desktop Chromium).

## Plugin interplay

**Plugins do not register canvas surfaces directly.** The canvas-tool
(`src/agents/tools/canvas-tool.ts`) is a built-in agent capability with
actions: `present`, `hide`, `navigate`, `eval`, `snapshot`,
`a2ui_push`, `a2ui_reset`.

Agents invoke `a2ui_push` with JSONL payloads to render widgets. Plugins
control content (what to display) but the canvas infrastructure is core.

## Footguns

1. **"Why isn't my canvas change showing up?"** — A2UI bundle wasn't rebuilt. Run `pnpm canvas:a2ui:bundle` after edits to `ui/` deps, theme overrides in `CanvasA2UI/bootstrap.js`, or the Lit renderer.
2. **Hash drift in CI** — modifying source without re-running the bundle script ships a stale `a2ui.bundle.js`. CI catches via `build:strict-smoke`.
3. **Bundle and hash committed separately.** Bundle is gitignored; hash is committed. Forgetting to commit the hash on a renderer change is a common PR oversight.

## Files I'd link from any canvas PR

1. `src/canvas-host/server.ts` — HTTP handler + live-reload.
2. `scripts/bundle-a2ui.mjs` — hash + Rolldown orchestration.
3. `apps/shared/OpenClawKit/Tools/CanvasA2UI/` — bootstrap + theme + rolldown config.
4. `src/agents/tools/canvas-tool.ts` — agent API surface.
5. `AGENTS.md:180` — A2UI hash policy.

## Read next

- [`apps-and-swabble.md`](apps-and-swabble.md) — the apps that consume canvas-host's WebView surface.
- [`extension-pattern-tool.md`](extension-pattern-tool.md) — canvas-tool is built-in, not plugin-extensible (yet).
