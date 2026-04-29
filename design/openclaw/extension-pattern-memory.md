---
name: extension-pattern-memory
description: The memory plugin pattern — special single-slot kind, memory-core dreaming subsystem, memory-lancedb vector variant, memory-wiki supplement, switching, harness interplay
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Extension pattern — memory plugins

## Why memory deserves its own page

Memory is the **only "kind" plugin slot** that VISION.md explicitly
calls out: *"Memory is a special plugin slot where only one memory
plugin can be active at a time."* The slot mechanic, the dreaming
subsystem, and the prompt-injection seam are unique to this kind. The
pattern doesn't transfer cleanly to providers/channels/tools.

## What memory is in OpenClaw

A contextualization layer that surfaces previous conversations, facts,
and decisions to the active agent during prompt construction. Sits at
the Tier-C8 abstraction level — above context-engine, tightly integrated
with agent-harness prompt-building.

Distinct from:

| Layer | Role |
|---|---|
| **active-memory** (Tier C8) | In-session message buffer. Memory feeds *into* this. |
| **context-engine** (Tier C8) | Documents, skills, code context. Orthogonal to memory. |
| **memory** (this) | Persistent agent history + learned facts: stated preferences, prior-session decisions, distilled knowledge from dreaming. |

## The slot model

Single-slot architecture enforced by `plugins.slots.memory` config and
the loader at `src/plugins/config-activation-shared.ts:355-384`,
function `resolveMemorySlotDecisionShared()`:

```ts
if (params.slot === null) {
  return isMultiKind ? { enabled: true } : { enabled: false, reason: "memory slot disabled" };
}
if (typeof params.slot === "string") {
  if (params.slot === params.id) return { enabled: true, selected: true };
  return isMultiKind ? { enabled: true } : { enabled: false, reason: `memory slot set to "${params.slot}"` };
}
if (params.selectedId && params.selectedId !== params.id) {
  return isMultiKind
    ? { enabled: true }
    : { enabled: false, reason: `memory slot already filled by "${params.selectedId}"` };
}
return { enabled: true, selected: true };
```

Behaviors:

| `plugins.slots.memory` value | Effect |
|---|---|
| `null` | Memory entirely disabled. Single-kind memory plugins skip activation. |
| string (plugin id) | Only that plugin loads; others of `kind: "memory"` skipped. |
| undefined | First memory plugin found wins. |

**Dual-kind plugins** (`kind: ["memory", "context-engine"]`) bypass the
disable rule if they have a secondary role — they still load as
context-engine even when not selected as memory.

## memory-core walkthrough — canonical reference

`extensions/memory-core/index.ts:24-41`:

```ts
export default definePluginEntry({
  id: "memory-core",
  name: "Memory (Core)",
  description: "File-backed memory search tools and CLI",
  kind: "memory",
  register(api) {
    registerBuiltInMemoryEmbeddingProviders(api);
    registerShortTermPromotionDreaming(api);
    registerDreamingCommand(api);
    api.registerMemoryCapability({
      promptBuilder: buildPromptSection,
      flushPlanResolver: buildMemoryFlushPlan,
      runtime: memoryRuntime,
      publicArtifacts: { listArtifacts: listMemoryCorePublicArtifacts },
    });
    // ... tools (memory_search, memory_get) and CLI (memory)
  },
});
```

### File layout

| Path | Role |
|---|---|
| `src/cli.ts` | CLI: `memory search`, `memory reindex`, `memory status`. |
| `src/prompt-section.ts` | Builds memory context block injected into system prompt. |
| `src/tools.ts` | Registers `memory_search` and `memory_get` tools. |
| `src/runtime-provider.ts` | File-backed search-manager runtime. |
| `src/dreaming*.ts` (10+ files) | Dreaming subsystem (see below). |

### `registerMemoryCapability()`

Single SDK call that registers the four-part memory contract:

| Field | Returns | Purpose |
|---|---|---|
| `promptBuilder` | string[] | Lines injected into system prompt at `before_prompt_build`. |
| `flushPlanResolver` | `MemoryFlushPlan` | Token budgets for compaction. |
| `runtime` | search manager | Tool-side query interface. |
| `publicArtifacts.listArtifacts` | file list | Files exposed to the gateway. |

## Dreaming subsystem — three phases

The unique-to-memory-core feature. Asynchronous cron-scheduled task that
reviews session transcripts and distills them into durable memory
entries. Mimics human sleep: short-term (transcripts) → long-term
(MEMORY.md).

### Light sleep (`dreaming-phases.ts:98-109`)

Scans recent session transcripts for high-scoring fragments matching
search queries. Extracts snippets ("user prefers Python over Go") and
scores for importance. Output: `.dreams/light-ingestion.json` —
temporary candidate list.

### REM sleep (`dreaming-phases.ts:43-54`)

Pattern extraction across light candidates. Looks for recurring motifs
across multiple sessions (e.g., "Python" in 3+ light snapshots, pattern
strength ≥ threshold). Output: higher-confidence candidates in
`.dreams/`.

### Deep sleep (`dreaming.ts:387-406` + `src/short-term-promotion.ts`)

The **only phase that writes to persistent `MEMORY.md`**. Applies a
configurable scoring policy:

```
score >= minScore && recallCount >= minRecallCount && uniqueQueries >= minUniqueQueries
```

Thresholds prevent noise; only multi-session-validated facts enter
durable memory.

### Configuration

```ts
type ShortTermPromotionDreamingConfig = {
  enabled: boolean;
  cron: string;                    // e.g., "0 2 * * *" (2 AM daily)
  timezone?: string;
  limit: number;
  minScore: number;
  minRecallCount: number;
  minUniqueQueries: number;
  recencyHalfLifeDays?: number;
  maxAgeDays?: number;
  verboseLogging: boolean;
  storage?: { mode: "inline" | "separate" | "both" };
  execution?: { model?: string };  // override model for dream narratives
};
```

Lives at `plugins.entries.memory-core.config.dreaming`.

### Triggering — event-driven, not background

Dreaming uses **cron events** through the gateway's cron service
(`src/dreaming.ts:338-356`). When cron fires the event with text
`__openclaw_memory_core_dreaming__`, the system event stream carries
it; `hasPendingManagedDreamingCronEvent()` detects; the agent calls
`runShortTermDreamingPromotionIfTriggered()` **during its turn**.

This is a deliberate choice: dreaming runs **inside the agent loop**,
not as an out-of-process background worker. Avoids cross-process
coordination; keeps state local to the agent.

### Dream narratives (`dreaming-narrative.ts`)

Optionally each phase generates an AI-written summary appended to
`DREAMS.md` (human-readable diary). Uses `execution.model` to synthesize
phase results into prose: *"Last night I learned the user works in
fintech and prefers async communication."*

## `commandAliases` and the `/dreaming` command

memory-core does **not** declare `commandAliases` in the manifest.
Dreaming surfaces three ways:

| Surface | Invocation | Purpose |
|---|---|---|
| CLI | `openclaw memory status` | Show enabled state, cron schedule, promotion policy. |
| CLI | `openclaw memory dreaming on/off` | Toggle via `config.patch`. |
| Gateway slash command | `/dreaming status`, `/dreaming on/off` | Mid-session toggle (`dreaming-command.ts:83-100`). |

The slash command is wired by `registerDreamingCommand(api)` —
attaches to the gateway's CLI system events handler.

## Embedding provider contract

memory-core's embedding contract is implicit:
`registerBuiltInMemoryEmbeddingProviders(api)` registers `["local"]` as
the default provider pool. Local embedding uses bundled ONNX or similar
client-side inference; no external API calls required.

When an agent runs `memory_search("recent decisions")`:

1. `getMemorySearchManager({ cfg, agentId })` → search engine.
2. Engine uses the embedding provider to convert query → vector.
3. Vector searched against indexed memory entries.

## memory-lancedb sibling — vector backend variant

`extensions/memory-lancedb/index.ts`. Same `kind: "memory"` so it
**competes for the same slot** as memory-core.

| Aspect | memory-lancedb |
|---|---|
| Storage | LanceDB (lightweight columnar vector DB, Apache-licensed). Local `.lancedb/` dir. |
| Entry shape | `{ id, text, vector, importance, category, createdAt }` |
| Tools | `memory_recall` (search), `memory_store` (insert), `memory_forget` (delete) |
| Embedding | Pluggable. Reads `cfg.embedding.provider` (`"openai"` or `"local"`) and uses external API or local adapter. |
| Auto-capture | Hooks `agent_end` and `before_prompt_build` to *automatically* store facts and inject relevant memories. |
| Differs from core | **No dreaming phases.** Rule-based auto-capture on `MEMORY_TRIGGERS` regex (e.g., `/remember`, `/prefer`, `/zapamatuj`). |

Choice between the two: dreaming-centric / file-backed (memory-core) vs
auto-capture-centric / vector DB (memory-lancedb). Mutually exclusive.

## memory-wiki — knowledge-vault supplement

`extensions/memory-wiki/index.ts`. **Does not declare `kind: "memory"`
as the primary slot plugin** — coexists as a supplement.

| Aspect | memory-wiki |
|---|---|
| Storage | Markdown files in a vault dir (Obsidian-compatible). YAML frontmatter + wikilinks. |
| Tools | `wiki_search`, `wiki_get`, `wiki_apply`, `wiki_status`, `wiki_lint` |
| Prompt integration | `registerMemoryPromptSupplement()` — *appends* to the prompt without owning the memory slot. |
| Corpus | Registers itself as a corpus backend alongside primary memory. Search queries can include wiki results. |

Operators can run **memory-core + memory-wiki together**: core handles
dreaming + auto-recall, wiki handles curated knowledge bases.

## Switching memory plugins

Operator changes `plugins.slots.memory`: `"memory-core"` → `"memory-lancedb"`.

1. Plugin loader re-evaluates slot decisions; disables memory-core, enables memory-lancedb.
2. `clearMemoryPluginState()` (`src/plugins/memory-state.ts`) resets registration globals: prompt builders, flush-plan resolvers, runtime, corpus supplements, public-artifact listings.
3. **No automatic data migration.** memory-core's `MEMORY.md` and `.dreams/` remain on disk but go unread. memory-lancedb's `.lancedb/` is untouched.
4. **Active-memory loss possible.** Sessions in progress may lose in-memory state if the runtime context held references to the old plugin's runtime.
5. Next agent turn: new plugin's `promptBuilder` runs.

**Best practice:** export memory-core entries (`memory export`), import
into memory-lancedb format, *then* switch slots. Backfill via tools, not
file-copy.

## Memory ↔ agent harness interplay

Two seams.

### `before_prompt_build` hook (`auto-reply/agent-runner-memory.ts:27`)

Fires during system-prompt construction. memory-lancedb registers
(`index.ts:834-881`):

```ts
api.on("before_prompt_build", async (event) => {
  if (!currentCfg.autoRecall) return undefined;
  const recallQuery = normalizeRecallQuery(extractLatestUserText(event.messages));
  const results = await db.search(vector, 3, 0.3);
  return { prependContext: formatRelevantMemoriesContext(results) };
});
```

Injects relevant memories *before* the agent sees the prompt.

### Direct tool access

Agent explicitly calls `memory_search(...)` mid-turn. Tools registered
via `api.registerTool()`; surface in available-tools list.

### Memory state queries (`memory-state.ts:4-22`)

Core queries the active memory plugin's registered state via:

| Function | Purpose |
|---|---|
| `buildMemoryPromptSection(...)` | Get prompt-section text. |
| `getMemoryRuntime()` | Access search manager. |
| `getMemoryFlushPlanResolver()` | Token budgets for compaction. |

## The pattern, abstracted

A memory plugin must:

1. **Declare `kind: "memory"`** in `definePluginEntry()` to claim the slot.
2. **Register memory capability** via `api.registerMemoryCapability()`:
   - `promptBuilder: (ctx) => string[]` — prompt-section lines.
   - `flushPlanResolver: (cfg) => MemoryFlushPlan` — compaction budgets.
   - `runtime: { getMemorySearchManager, resolveMemoryBackendConfig }` — search API.
   - Optional `publicArtifacts.listArtifacts` — exposed memory files.
3. **Register search tools** (`memory_search`, `memory_recall`).
4. **Bind embedding provider** — register built-ins or use the system registry.
5. **Optional: corpus supplement** — register memory results for search aggregation.
6. **Optional: prompt supplement** — append context lines without owning the slot.
7. **Optional: hooks** — `before_prompt_build`, `agent_end` for auto-capture or synthesis.
8. **Optional: CLI** — operator commands (`memory status`, `wiki search`).

## Footguns

1. **Slot enforcement at load time.** Changing `plugins.slots.memory` mid-session does **not** swap the active plugin until next agent restart.
2. **Double registration.** Two memory plugins registering without `registerMemoryCapability()` deduplication get conflicting prompt builders. Always use the unified API; the legacy split-state path is unsafe.
3. **Embedding provider availability.** Plugins requiring external embedding (OpenAI) silently fail if auth is missing. Match `contracts.memoryEmbeddingProviders` to actual auth setup.
4. **Cron service dependency.** memory-core's dreaming relies on `api.context.getCron?.()`. Gateway cron offline → dreaming jobs don't fire → short-term promotion stalls forever.
5. **Transcript scan overhead.** Each cron job scans transcripts. Large stores (100s of MB) cause GC pressure + agent stalls. Set `maxAgeDays` to prune.
6. **Vector recall false positives.** memory-lancedb's `autoRecall: true` injects irrelevant memories if the embedding model has poor recall precision. Test with explicit `memory_search` first.
7. **Dual-kind ambiguity.** Plugins with `kind: ["memory", "context-engine"]` losing the memory slot still load as context-engine. Hidden dependency if operator assumed memory was disabled.
8. **Public-artifact cache staleness.** `listArtifacts()` cached during agent setup. Modifications between turns are invisible until next agent restart.

## Files I'd link from any memory PR

1. `src/plugins/plugin-kind.types.ts` — kind enum.
2. `src/plugins/memory-state.ts` — registration + state mgmt.
3. `src/plugins/config-activation-shared.ts:355-384` — slot enforcement.
4. `extensions/memory-core/index.ts` — entry + capability.
5. `extensions/memory-core/src/dreaming.ts` — cron + dreaming coordinator.
6. `extensions/memory-core/src/dreaming-phases.ts` — light/REM/deep logic.
7. `extensions/memory-lancedb/index.ts` — vector variant + auto-recall hook.
8. `extensions/memory-wiki/index.ts` — supplement pattern.
9. `src/auto-reply/agent-runner-memory.ts` — flush integration.
10. `src/agents/system-prompt.ts:8` — `buildMemoryPromptSection()` call site.

## Read next

- [`manifest-schema.md`](manifest-schema.md) — `kind`, `contracts.memoryEmbeddingProviders`.
- [`hook-engine-typed.md`](hook-engine-typed.md) — `before_prompt_build` mechanics.
- C8 in [`TOUR.md`](TOUR.md) — active memory + context engine (the layers memory feeds).
