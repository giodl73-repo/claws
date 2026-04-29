---
name: active-memory-and-context
description: In-session "working set" layers — extensions/active-memory blocking sub-agent + context-engine assembly/compaction; how memory plugins feed in, how before_prompt_build feeds out
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Active memory + context engine

## Why this exists separate from memory plugins

[`extension-pattern-memory.md`](extension-pattern-memory.md) covered
**persistent** memory plugins (`memory-core`, `memory-lancedb`) — durable
across sessions, queried reactively. **This** spec covers the in-process
layers below: the **in-session** working set that runs on every turn.

Two distinct components:

| Component | Path | Role |
|---|---|---|
| **Active-memory** | `extensions/active-memory/` (an extension) | Blocking sub-agent that runs once per eligible turn, surfaces relevant memory automatically. |
| **Context-engine** | `src/context-engine/` + bundled `legacy` engine | Decides what messages the model sees: ordering, token budgeting, summarization, compaction. |

## Active-memory

A blocking memory sub-agent spawned per turn. Receives the user's
message + optional conversation tail. Runs a bounded recall pass with
`memory_search` and `memory_get` tools. Injects **either `NONE` or a
compact user-fact summary** into the main prompt as untrusted context.

Why it exists: persistent memory plugins are *reactive* — the agent
must decide when to search. Active-memory provides one *bounded
chance* to surface relevant memory automatically, before the moment
passes.

| Aspect | Default |
|---|---|
| Activation | `plugins.entries.active-memory.enabled: false` (off by default) |
| Activation hint | `activation.onStartup: true` |
| Default timeout | 15 000 ms |
| Default query mode | `recent` (small conversation tail) |
| Query modes | `message` / `recent` / `full` / `recall-heavy` / `precision-heavy` / `preference-only` / `strict` / `balanced` / `contextual` |
| Summary cap | `maxSummaryChars` default 220 |
| Toggle storage | `agents/<agent>/sessions/active-memory/session-toggles.json` |

User-facing command: `/active-memory` (toggle, status). Diagnostic
verbose: `Active Memory: status=ok elapsed=842ms query=recent
summary=34 chars`. Diagnostic trace: `Active Memory Debug: <summary>`.

**It is not a context engine.** It's a memory-search wrapper that
injects a system-context prefix before the main model runs.

## Context-engine

Controls how OpenClaw builds model context for each run: which
messages to include, token budgeting, summarization policy, compaction
lifecycle.

Orthogonal to memory: memory *retrieves* facts; context-engine *decides
what the model sees*.

The bundled `legacy` engine preserves original behavior (pass-through
assemble + built-in compaction). Plugin engines implement the
`ContextEngine` interface (`src/context-engine/types.ts`) for custom
assembly (retrieval-augmented, DAG-based summaries) or compaction
(proactive, cache-aware, cross-session).

### Lifecycle

| Hook | When | Returns |
|---|---|---|
| `bootstrap` | On gateway start | initial state |
| `ingest` | Every message stored | acknowledgment |
| `assemble` | Before each run | `{ messages[], systemPromptAddition? }` |
| `compact` | When window full (if engine `ownsCompaction: true`) | `{ summary, compactedCount, tokenReduction }` |
| `afterTurn` | Post-run | maintenance |

Slot: `plugins.slots.contextEngine` defaults to `"legacy"`. Engines
report `ownsCompaction` boolean to control whether Pi's built-in
auto-compaction runs alongside.

## The full layering

```
┌──────────────────────────────────────────────────────────────────┐
│ Persistent Memory Plugin (memory-core / memory-lancedb / wiki)   │
│   exposes: memory_search, memory_get tools                       │
└─────────────────────────┬────────────────────────────────────────┘
                          │ tools available to active-memory
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│ Active-Memory blocking sub-agent (extensions/active-memory)      │
│   recall pass over "recent" / "full" / etc.                      │
│   produces: NONE  or  compact user-fact summary                  │
│   injects untrusted <active_memory_plugin> system prefix         │
└─────────────────────────┬────────────────────────────────────────┘
                          │ summary in prompt context
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│ context-engine.assemble()                                        │
│   orders messages, budgets tokens, optional systemPromptAddition │
└─────────────────────────┬────────────────────────────────────────┘
                          │ messages[] + system prompt
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│ before_prompt_build typed hook                                   │
│   plugins inject prependContext, modify systemPrompt             │
└─────────────────────────┬────────────────────────────────────────┘
                          │ final prompt
                          ▼
                        LLM
```

Active-memory runs **before** context assembly so its output feeds
context-engine's input. Memory plugins feed *into* active-memory as
tools; active-memory feeds *into* context-engine as a prompt prefix.
The `before_prompt_build` hook fires *after* context-engine assembly,
allowing plugins to inject further dynamic context (`prependContext`
sits outside system prompt; `systemPrompt` modifications affect stable
guidance).

Active-memory occupies the gap between persistent recall and context
assembly.

## Why an extension named `active-memory`

Three reasons it lives at `extensions/active-memory/` rather than core:

1. Optional — disabled by default, opt-in per agent.
2. Model-agnostic — can use the session model, a fallback, or a custom override.
3. Scoped per-agent — toggle state, transcript persistence, sub-agent prompt all per-agent.

The extension owns: configSchema, session-toggle persistence,
transcript lifecycle (delete temp or persist to
`agents/<agent>/sessions/active-memory/`), and the sub-agent prompt
itself (balancing query modes + styles).

## Prompt-cache deterministic ordering

`AGENTS.md`: *"Prompt cache: deterministic ordering for maps / sets /
registries / plugin lists / files / network results before model/tool
payloads. Preserve old transcript bytes when possible."*

Why critical: prompt caching hashes input to detect cache hits.
Non-deterministic field ordering (`Object.keys()` insertion order, `Set`
iteration, registry order) breaks cache hits on retry or multi-turn.

| Surface | Determinism rule |
|---|---|
| Active-memory | Embed memory summary at a stable position (always after system prompt, before latest user message; fields never reordered). |
| `context-engine.assemble()` | Return `messages[]` in **transcript order** (oldest → newest), not query-hit order. `systemPromptAddition` stable across runs. |
| `before_prompt_build` plugins | Inject `prependContext` / `systemPrompt` in **sorted registry order** (by plugin id, not insertion order). |

Cache miss on reorder → wasted cache tokens, lower hit rate (target
> 70%), higher latency + cost. `hooks.ts` iterates registries in
stable order; context-engine registry validates plugin engines as
singletons.

## Compaction

When a session approaches the context limit, compaction summarizes
older turns into a summary entry and keeps recent messages intact.

If `ownsCompaction: true`, the context-engine's `compact()` runs.
Otherwise Pi's built-in summarization. Two hooks fire:

| Hook | Carries |
|---|---|
| `before_compaction` | `messageCount`, `tokenCount` |
| `after_compaction` | `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter` |

Active-memory does not directly trigger compaction. When compaction
fires, the session is reprepared for the next turn, and active-memory
runs again if eligible. Pre-compaction context's active-memory summary
is preserved in the unsummarized recent tail; only older history is
compacted.

Before compaction, a memory-flush turn silently runs to promote
in-memory context to disk files (memory-core handles this) — so
active-memory's prior search hits aren't lost.

## Token budgets

`context-engine.assemble()` receives `tokenBudget?` (model context
window minus reserves). Compaction defaults at
`agents.defaults.compaction`:

| Key | Meaning |
|---|---|
| `keepRecentTokens` | preserve recent tail (soft checkpoint) |
| `model` | summarization model override |
| `maxActiveTranscriptBytes` | compact locally if JSONL exceeds threshold (requires `truncateAfterCompaction: true`) |

Active-memory has its own timeout (e.g., 15 000 ms), not a token
budget. On timeout returns `NONE` (no injection). The main model's
token budget is honored by context-engine; active-memory summary
counts toward that budget (capped by `maxSummaryChars`).

## `context.assembled` diagnostic event

Fires from `src/agents/pi-embedded-runner/run/attempt.ts` after
context-engine.assemble() succeeds. Carries (per [`diagnostic-event-stream.md`](diagnostic-event-stream.md)):

```
type: "context.assembled"
runId, sessionKey, sessionId, provider, model, channel?, trigger?
messageCount, historyTextChars, historyImageBlocks
maxMessageTextChars, systemPromptChars, promptChars, promptImages
contextTokenBudget?, reserveTokens?
```

Fires *after* active-memory has injected its summary (if any) but
*before* the LLM receives the prompt. Observability hook for cache-hit
analysis: context-engine can inspect `promptCache` field in
runtimeContext during assembly and log cache observations.

`src/logging/diagnostic-stability.test.ts` validates event schema
consistency across runs.

## Footguns

1. **Ordering bugs break prompt cache.** Sorting messages by query-hit score instead of transcript order, or injecting active-memory summary at variable positions, breaks cache hashing. 20–30% latency increase on retry.
2. **Truncating critical context.** Compaction split-point that cuts a tool result mid-response (`toolStart` without `toolResult`) leaves the next turn with incomplete state. Compaction keeps tool pairs together; custom engines must respect the invariant.
3. **Active-memory timeout misconfigured.** `timeoutMs` too high (>60s) → blocked sub-agent eats reply latency budget. Too low (<250ms) → memory hits missed. Default 15s is tested safe for `recent`. Adjust per query mode (message: 3–5s, full: 20–30s).
4. **Session toggles not persisted across restarts.** Default `persistTranscripts: false` puts toggles in a temp dir. Session closes before sync → preference lost. Enable `persistTranscripts` for production.
5. **Context-engine plugin not registered.** `plugins.slots.contextEngine: "custom-engine"` set but plugin fails to load or doesn't call `api.registerContextEngine()` → runs fail until slot reset to `"legacy"`. **No fallback.** Manual config edit required.
6. **`systemPromptAddition` duplication.** Multiple plugins both registering `systemPromptAddition` appends in uncontrolled order → unbounded system-prompt growth. Context-engine must enforce deterministic ordering + dedup; reject duplicate engine registrations.

## Files I'd link

1. `docs/concepts/active-memory.md` — config + query-mode reference.
2. `docs/concepts/context-engine.md` — engine lifecycle + slot selection + plugin API.
3. `extensions/active-memory/index.ts` — blocking sub-agent spawning + transcript handling.
4. `src/context-engine/types.ts` — `ContextEngine` interface, `AssembleResult`, `CompactResult`.
5. `src/agents/pi-embedded-runner/run/attempt.ts` — `context.assembled` emission.
6. `docs/concepts/compaction.md` — lifecycle hooks, memory flush, successor transcripts.
7. `AGENTS.md:41` — prompt-cache determinism rule.

## Read next

- [`extension-pattern-memory.md`](extension-pattern-memory.md) — persistent memory plugins (the layer below).
- [`hook-engine-typed.md`](hook-engine-typed.md) — `before_prompt_build`, `before_compaction`, `after_compaction` mechanics.
- [`diagnostic-event-stream.md`](diagnostic-event-stream.md) — `context.assembled` event details.
