---
name: openclaw-internals tour
description: Map of the openclaw-core atoms worth their own skunkworks spec — what, why, where, recommended depth — so we can pick the next deep dive deliberately
type: skunkworks-index
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# OpenClaw Skunkworks Tour

This file is a *map*, not a study. Every row points at an atom we'd want our
own spec on, ranked by what unblocks the next contribution. Pick from here;
each "deep" row is roughly the size of a `gateway.md`-class document.

## Status — 2026-04-28: tour complete

**All Tier-A through Tier-C atoms in this map are now specced.** 20 deep
dives + 4 already-explored extensions/runtime, in `design/openclaw/`.
What follows is the original ranked map; consult it to find a spec
quickly or to scope re-runs against newer upstream HEADs.

## Tier 0 — already covered

| # | Atom | Spec |
|---|---|---|
| 0a | Gateway core (dispatcher, runtime) | [`gateway.md`](gateway.md) |
| 0b | Plugin / extension model (SDK, lifecycle, sandbox) | [`plugin-model.md`](plugin-model.md) |
| 0c | `diagnostics-otel` extension | [`diagnostics-otel.md`](diagnostics-otel.md) |
| 0d | `diagnostics-prometheus` extension | [`diagnostics-prometheus.md`](diagnostics-prometheus.md) |

## Tier A — substrate (everything else sits on these)

The four covered atoms touched these but never gave them their own page. They
are *not* extensions — they are the runtime fabric.

| # | Atom | What | Spec |
|---|---|---|---|
| A1 | Plugin loader | Activation planner, registry, bundled-plugin scan, api-builder, lifecycle dispatcher. | ✅ [`plugin-loader.md`](plugin-loader.md) |
| A2 | Hook engine — typed | All 35 typed hook points + per-hook merge semantics + failure policy + timeout policy. | ✅ [`hook-engine-typed.md`](hook-engine-typed.md) |
| A3 | Hook engine — legacy | The 48-file `src/hooks/` parallel system, four-tier source precedence, `HOOK.md` frontmatter. | ✅ [`hook-engine-legacy.md`](hook-engine-legacy.md) |
| A4 | Manifest schema | Field-by-field contract for `openclaw.plugin.json`. | ✅ [`manifest-schema.md`](manifest-schema.md) |
| A5 | Diagnostic event stream | Bus, event-type union, trust gate, W3C trace propagation. | ✅ [`diagnostic-event-stream.md`](diagnostic-event-stream.md) |
| A6 | Trust model + redaction | Cross-cutting catalog of `metadata.trusted`, `redactSensitiveText`, attribute filters, prototype-key block-list. | ✅ [`trust-and-redaction.md`](trust-and-redaction.md) |
| A7 | Gateway protocol surface | TypeBox schema registry, frames, version negotiation, Swift codegen. | ✅ [`gateway-protocol.md`](gateway-protocol.md) |
| A8 | ACP — Agent Client Protocol | Approval classifier, persistent bindings, control plane, event mapper. | ✅ [`acp.md`](acp.md) |
| A9 | Plugin SDK API baseline | SHA256-pinned snapshot of public SDK type surface. | ✅ [`sdk-api-baseline.md`](sdk-api-baseline.md) |

## Tier B — pattern exemplars (one read each, then we have the pattern)

We don't need full deep dives on every extension. Pick one of each kind and
the pattern transfers.

| # | Atom | Exemplar | Spec |
|---|---|---|---|
| B1 | Provider plugin pattern | `extensions/anthropic/` | ✅ [`extension-pattern-provider.md`](extension-pattern-provider.md) |
| B2 | Channel plugin pattern | `extensions/telegram/` | ✅ [`extension-pattern-channel.md`](extension-pattern-channel.md) |
| B3 | Memory plugin pattern | `extensions/memory-core/` (+ lancedb + wiki) | ✅ [`extension-pattern-memory.md`](extension-pattern-memory.md) |
| B4 | Tool plugin pattern | `extensions/browser/` | ✅ [`extension-pattern-tool.md`](extension-pattern-tool.md) |
| B5 | MCP integration | both server + runtime sides | ✅ [`mcp.md`](mcp.md) |
| B6 | Bundle-style plugin (skills) | `skills/` directory | ✅ [`extension-pattern-skill.md`](extension-pattern-skill.md) |
| B7 | Migration plugin | `extensions/migrate-{claude,hermes}/` | ✅ [`extension-pattern-migration.md`](extension-pattern-migration.md) |

## Tier C — operational / surface

These shape *how* OpenClaw runs and gets shipped. Each is small enough to be
a half-page note rather than a deep spec.

| # | Atom | Spec |
|---|---|---|
| C1 | CLI / Commander dispatcher | ✅ [`cli.md`](cli.md) |
| C2 | Daemon lifecycle | ✅ [`daemon-lifecycle.md`](daemon-lifecycle.md) |
| C3 | Sandbox model | ✅ [`sandbox.md`](sandbox.md) |
| C4 | Build / release plumbing | ✅ [`build-and-release.md`](build-and-release.md) |
| C5 | `openclaw doctor` + runtime migration | ✅ [`doctor-and-migration.md`](doctor-and-migration.md) |
| C6 | Canvas-host / A2UI | ✅ [`canvas-host.md`](canvas-host.md) |
| C7 | Apps / Swabble | ✅ [`apps-and-swabble.md`](apps-and-swabble.md) |
| C8 | Active memory + context engine | ✅ [`active-memory-and-context.md`](active-memory-and-context.md) |

## Tier D — governance / contracts (read once, internalize, no spec)

| Atom | Source |
|---|---|
| Owner-boundary rule ("fix owner-specific behavior in the owner module") | `AGENTS.md ## Architecture` |
| Manifest-first control plane direction | `AGENTS.md ## Architecture` |
| Plugin-package-contract (external-plugin compat fields) | `packages/plugin-package-contract/src/index.ts:46-100` |
| Wording: "plugin/plugins" externally, `extensions/` internally | `AGENTS.md ## Start` |
| CODEOWNERS / maintainer-bots (`$openclaw-pr-maintainer`, `$openclaw-release-maintainer`, `$openclaw-ghsa-maintainer`, `$openclaw-parallels-smoke`) | `AGENTS.md` |
| Carbon dependency pin (Shadow-only) | `AGENTS.md ## Security / Release` |
| Beta version-tag match rule | `AGENTS.md ## Security / Release` |
| Prompt cache deterministic ordering | `AGENTS.md ## Architecture` |

## Re-runs and refresh

Tour is complete. Next maintenance:

- When upstream advances past `5e8cc1d9c`, file:line cites rot. Re-run the relevant Explore agent against new HEAD.
- New extension categories (e.g., voice / realtime / specific connector classes) may merit additional pattern-spec specializations beyond the seven covered.
- For our wave's PR-1..PR-6, [`manifest-schema.md`](manifest-schema.md), [`gateway-protocol.md`](gateway-protocol.md), [`hook-engine-typed.md`](hook-engine-typed.md), and [`sdk-api-baseline.md`](sdk-api-baseline.md) are the load-bearing pages that match the upstream-PR-rules + Swift-regen + SDK-baseline gates from the wave plan.

## Notes on what NOT to spec

- **Per-extension dives** beyond the Tier-B exemplars — diminishing returns; the pattern transfers.
- **`extensions/diffs/`, `extensions/llm-task/`, `extensions/active-memory/`** etc. — read only if we hit them in upstream PR work.
- **`scripts/`** broadly — touch only when a specific gate (Swift regen, SDK baseline, lint evidence) requires it.
