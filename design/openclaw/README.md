# OpenClaw Skunkworks — Design Notes

This directory is our **internal study of `openclaw-core`**. It exists to teach
the team how OpenClaw works so we can contribute upstream from a position of
understanding rather than guesswork. These are *our* notes about *their* repo.
They do not ship as part of OpenClaw.

## Source baseline

All file:line cites target `openclaw/openclaw` at HEAD `5e8cc1d9c` (the audit
baseline pinned by the `claws-openclaw-upstream` plan). Locally the source
sits at `C:\src\openclaw-core`.

When upstream moves, cites may rot. Re-run the relevant Explore agent before
trusting a cite for an active PR.

## Index

[`TOUR.md`](TOUR.md) — map of every atom, ranked by leverage. Start there if
unsure where to look.

[`architecture.md`](architecture.md) — synthesis of all 28 specs into one
picture: the gateway-extensibility seams, ten architectural commitments,
ASCII diagrams of the macro system, anatomy of a turn, three observation
channels, plugin lifecycle. Start here if you want the **why** before the **what**.

### Substrate (Tier A)

| Spec | What |
|---|---|
| [`gateway.md`](gateway.md) | In-proc RPC dispatcher / WS broker, frame envelope, dispatch, Swift regen seam. |
| [`gateway-protocol.md`](gateway-protocol.md) | TypeBox schema registry, frames, version negotiation, Swift codegen pipeline. |
| [`plugin-model.md`](plugin-model.md) | Plugin/extension model end-to-end. |
| [`plugin-loader.md`](plugin-loader.md) | Activation planner, bundled-plugin discovery, registry shape, hook-runner construction. |
| [`manifest-schema.md`](manifest-schema.md) | Field-by-field reference for `openclaw.plugin.json`. |
| [`hook-engine-typed.md`](hook-engine-typed.md) | All 35 typed hook points, per-hook merge semantics, failure policy, timeouts. |
| [`hook-engine-legacy.md`](hook-engine-legacy.md) | The `src/hooks/` parallel system — bundled/plugin/managed/workspace precedence. |
| [`diagnostic-event-stream.md`](diagnostic-event-stream.md) | Bus, full event-type union, trust gate, W3C trace propagation. |
| [`trust-and-redaction.md`](trust-and-redaction.md) | Cross-cutting catalog of every trust gate + redaction pattern. |
| [`acp.md`](acp.md) | Agent Client Protocol — distinct from gateway protocol. |
| [`sdk-api-baseline.md`](sdk-api-baseline.md) | SHA256-pinned SDK type-surface drift gate. |

### Diagnostics extensions

| Spec | What |
|---|---|
| [`diagnostics-otel.md`](diagnostics-otel.md) | Three-signal OTLP/HTTP exporter. |
| [`diagnostics-prometheus.md`](diagnostics-prometheus.md) | Pull-based scrape endpoint, zero deps, custom registry. |

### Extension patterns (Tier B exemplars)

| Spec | Exemplar |
|---|---|
| [`extension-pattern-provider.md`](extension-pattern-provider.md) | `extensions/anthropic/` — provider plugins |
| [`extension-pattern-channel.md`](extension-pattern-channel.md) | `extensions/telegram/` — channel plugins |
| [`extension-pattern-memory.md`](extension-pattern-memory.md) | `extensions/memory-core/` + lancedb + wiki — memory slot |
| [`extension-pattern-tool.md`](extension-pattern-tool.md) | `extensions/browser/` — tool plugins |
| [`extension-pattern-skill.md`](extension-pattern-skill.md) | `skills/` — bundle-style plugins |
| [`extension-pattern-migration.md`](extension-pattern-migration.md) | `extensions/migrate-{claude,hermes}/` — codemods |
| [`mcp.md`](mcp.md) | MCP integration — server expose + runtime consume |

### Operational (Tier C)

| Spec | What |
|---|---|
| [`cli.md`](cli.md) | Commander v14 dispatcher, plugin-CLI surface, slash commands. |
| [`daemon-lifecycle.md`](daemon-lifecycle.md) | `openclaw gateway` start/stop/restart, launchd/systemd, hot-reload. |
| [`sandbox.md`](sandbox.md) | Three Dockerfile variants, Docker vs Podman, mode/scope/workspaceAccess. |
| [`build-and-release.md`](build-and-release.md) | tsdown bundler, lane-based testing, Sparkle/appcast, release flow. |
| [`doctor-and-migration.md`](doctor-and-migration.md) | `openclaw doctor` repair surface (distinct from `openclaw migrate`). |
| [`canvas-host.md`](canvas-host.md) | Canvas-host + A2UI bundle. |
| [`apps-and-swabble.md`](apps-and-swabble.md) | macOS / iOS / Android apps + Swabble wake-word daemon. |
| [`active-memory-and-context.md`](active-memory-and-context.md) | In-session working set + context-engine layers. |

## House conventions

- **Frontmatter** with `name`, `description`, `applies_to`, `source_version`, `authored`.
- **Lead** with a 2–3 sentence "what this is" so a future reader can decide in 10 seconds whether to keep reading.
- **Cite** every load-bearing claim as `path/file.ts:LINE`. Use repo-root-relative paths (matches OpenClaw's `AGENTS.md` rule).
- **End** with a "Files I'd link" or "Read next" pointer.
- **No code dumps.** A single representative snippet beats a wall of paste.
- **No docstring-style filler.** Telegraph style is fine. Match `AGENTS.md` tone.

## Status

**All 20 specs in the [`TOUR.md`](TOUR.md) plan are complete as of 2026-04-28.**
~7500 lines across 28 markdown files. Re-run individual Explore agents to
refresh cites against newer upstream HEADs.
