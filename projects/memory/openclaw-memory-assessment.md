# OpenClaw Memory Assessment

Source pass: 2026-06-22 against `C:\src\openclaw-stack`.

## Evidence Files Checked

| Area | Path |
| --- | --- |
| Vision and plugin strategy | `VISION.md` |
| Memory overview | `docs/concepts/memory.md` |
| Builtin backend | `docs/concepts/memory-builtin.md` |
| QMD backend | `docs/concepts/memory-qmd.md` |
| Active Memory | `docs/concepts/active-memory.md` |
| Memory config | `docs/reference/memory-config.md` |
| Security boundary | `SECURITY.md` |
| Config/source surface | `src/config/types.memory.ts`, `src/plugins/memory-state.ts`, `packages/memory-host-sdk/src/`, `extensions/memory-core/src/memory/` |

## Current Architecture

OpenClaw treats memory as an inspectable local substrate, not hidden model
state. Durable memory starts as Markdown in the agent workspace:

- `MEMORY.md` for compact long-term memory that is loaded into private DM
  session bootstrap context.
- `memory/YYYY-MM-DD.md` and slugged daily files for running notes and
  searchable working context.
- `DREAMS.md` for human-reviewable dreaming/consolidation output.

The active memory plugin slot is exclusive: only one memory provider owns the
runtime memory capability at a time. The vision doc says OpenClaw ships multiple
memory options today and expects to converge on a recommended default path.

## Retrieval Backends

The default builtin backend stores a per-agent SQLite index and supports:

- FTS5 keyword search with BM25 scoring.
- Embedding/vector search through supported embedding providers.
- Hybrid search combining lexical and semantic ranking.
- Optional sqlite-vec acceleration, with in-process cosine fallback.
- CJK trigram tokenization support.
- File watching, debounced reindexing, embedding cache, and explicit
  `openclaw memory index --force`.

QMD is an optional local-first sidecar backend. It adds:

- BM25/vector search modes, query expansion, and reranking.
- Extra indexed paths outside the workspace.
- Optional session transcript indexing.
- Managed collections and periodic refresh.
- Fallback to builtin memory when QMD is unavailable.
- Scope rules so memory results are limited by session/channel policy.

## Recall in Agent Flow

OpenClaw exposes memory through tools:

- `memory_search`
- `memory_get`

Active Memory adds a pre-reply blocking memory sub-agent for eligible
interactive persistent chat sessions. It is opt-in, agent-targeted, defaults to
direct-message style sessions, and returns either no recall or a compact hidden
context prefix for the main reply. It can be tuned by query mode, prompt style,
allowed memory tools, timeout, and model override/fallback.

The key product design distinction: normal memory is reactive/tool-mediated,
while Active Memory makes recall proactive in conversational sessions without
requiring the main model to decide to search.

## Consolidation and Knowledge Layer

OpenClaw has several layers beyond raw recall:

- Automatic memory flush before compaction: a silent turn encourages saving
  important facts before aggressive history reduction.
- Dreaming: optional scheduled consolidation that scores short-term candidates
  and promotes qualified snippets into `MEMORY.md`, with diary output in
  `DREAMS.md`.
- Memory Wiki: a companion plugin that compiles durable knowledge into a
  provenance-rich wiki vault with structured claims, evidence, contradiction
  and freshness tracking, dashboards, and wiki-native tools.

This is useful for the report because OpenClaw separates:

- raw memory capture,
- retrieval,
- recall-time injection,
- consolidation/promotion,
- human-readable knowledge governance.

## Governance and Trust Boundary

OpenClaw's security model is local-operator oriented. The security docs treat
`MEMORY.md` and `memory/*.md` as trusted local operator state. If an attacker can
edit those files, they have already crossed the workspace trust boundary.

Implication for Microsoft: OpenClaw's model is strong for local developer
agency and inspectability, but it is not by itself an enterprise multi-tenant
memory service. A Microsoft path would need stronger service-side controls:

- user/tenant/app/agent/channel scoping,
- consent and transparency,
- retention and deletion,
- access audit,
- source authority,
- data classification,
- policy-filtered retrieval,
- cross-experience conflict handling.

## Strengths

- Inspectable and user-editable memory files reduce hidden-state surprises.
- Pluggable memory slot allows backend experimentation without changing every
  agent surface.
- Hybrid lexical/semantic retrieval fits developer and work contexts where
  exact IDs and semantic paraphrase both matter.
- Active Memory addresses the common failure mode where agents forget to search
  memory.
- Memory Wiki points toward provenance-rich durable knowledge rather than raw
  transcript accumulation.
- Configuration exposes practical controls for provider choice, ranking,
  scope, timeouts, and startup behavior.

## Limitations for Enterprise Shared Memory

- Default durability is local filesystem plus per-agent SQLite; not a shared
  cross-app service.
- Trust boundary assumes workspace file access is trusted operator state.
- Cross-agent sharing exists through configurable indexed paths/backends, not a
  first-class governed user-global memory contract.
- Recall policy is mostly runtime/config scoped, not integrated with Microsoft
  tenant compliance systems.
- Memory promotion quality depends on agent behavior, dreaming settings, or
  user/operator review.
- Proactive Active Memory has latency/cost tradeoffs in the interactive reply
  path.

## Takeaways for the Microsoft Report

1. OpenClaw is a good reference for composable memory layers: local durable
   files, retriever backend, recall tools, proactive recall, and consolidation.
2. The strongest Microsoft opportunity is not merely vector search; it is a
   governed memory service with portable user scope and app/agent-specific
   policy overlays.
3. The OpenClaw lesson to preserve is inspectability: users and admins should
   know what is remembered, why it was recalled, and how to delete or suppress
   it.
4. The OpenClaw limitation to avoid is implicit trust in local writable memory
   files when the product goal is enterprise cross-app memory.
5. A narrow MCS + Scout POC should test the service contract, controls, and user
   trust loop before broad cross-Microsoft recall.
