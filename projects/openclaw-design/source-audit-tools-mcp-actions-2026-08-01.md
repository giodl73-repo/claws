# Tools, MCP, and External Actions Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

"Tools, MCP, and external actions" contains several different owners:

1. tool definition and catalog;
2. per-run tool-surface materialization;
3. MCP catalog and transport runtime;
4. binding, sandbox, policy, and approval authority;
5. dynamic invocation and side-effect execution; and
6. transcript, progress, audit, and replay projection.

MCP is a transport and capability source. It is not the semantic owner of every
tool or external effect.

## Current Architecture

```text
core + plugin + MCP + client/native tool definitions
        |
        v
catalog/profile + caller/model/sandbox/policy filtering
        |
        v
per-run materialized tool surface
        |
        v
binding + approval + execution authority
        |
        v
tool call ID + abort/timeout + side effect
        |
        v
structured result + transcript/progress/audit projection
```

## Objects and Lifetimes

| Object | Owner | Lifetime |
| ------ | ----- | -------- |
| Tool definition | Core/plugin/MCP/client owner | Definition or catalog generation. |
| Tool profile/section | Tool catalog | Stable grouping and product-facing semantic metadata. |
| Materialized tool surface | Agent runtime | One run/turn projection after capability and policy filtering. |
| MCP server/runtime | Bundle MCP manager | Requester/session lifecycle from acquisition through disposal. |
| MCP advertised catalog | MCP runtime | Cached catalog generation, renewed by refresh/retry/reconnect. |
| Session binding | Backend execution owner | Runtime identity, authority, storage, approval, and provider association. |
| Approval/grant | Policy/approval owner | One bounded authorization decision or continuation. |
| Tool call | Provider/runtime execution owner | One invocation, identified by `toolCallId` or backend-native call ID. |
| Execution task/process | Tool-specific runtime | Side-effecting operation that may outlive the immediate call. |
| Structured tool result | Semantic tool/runtime owner | Terminal result projected to model, transcript, and user surfaces. |
| Transcript mirror key | Transcript projector | Idempotent projection identity, not the execution identity. |

## Definition and Surface Materialization

The core tool catalog owns known tool IDs, profiles, sections, and grouping
metadata (`src/agents/tool-catalog.ts:526-582`).

`createOpenClawTools` resolves core and plugin tools and applies client
capability filtering (`src/agents/openclaw-tools.ts:102-736`).

The broader assembly path applies sandbox, provider, capability, hook, and
post-processing policy in `src/agents/agent-tools.ts:478-1253`.

The resulting surface is a run-scoped projection. A tool's presence in a
catalog does not prove it is available or authorized in a specific run.

## MCP Runtime and Transport

The bundle MCP runtime owns:

- requester-scoped session runtime creation;
- catalog load/cache/refresh;
- list/read/call methods;
- request guards;
- retry and backoff; and
- disposal.

See:

- `src/agents/agent-bundle-mcp-runtime.ts:381-1209`;
- `src/agents/agent-bundle-mcp-manager-lifecycle.ts:69-142`;
- `src/agents/agent-bundle-mcp-manager-api.ts:26-155`; and
- `src/agents/agent-bundle-mcp-harness.ts:99-161`.

Node-host MCP calls add timeout and error mediation at the host boundary
(`src/node-host/mcp.ts:309-432`).

## Binding, Policy, Sandbox, and Approval

The Codex backend demonstrates a distinct native execution surface:

- dynamic tool shaping:
  `extensions/codex/src/app-server/dynamic-tool-build.ts:125-844`;
- native execution policy:
  `extensions/codex/src/app-server/native-execution-policy.ts:35-108`;
- sandbox guard:
  `extensions/codex/src/app-server/sandbox-guard.ts:78-143`; and
- session binding:
  `extensions/codex/src/app-server/session-binding.ts:61-1571`.

Binding currently combines identity, authority, persistence, fingerprinting,
approval normalization, and model/provider resolution. These are related but
not one semantic object.

## Invocation, Cancellation, and Side Effects

Dynamic tool execution owns call acceptance, abort, timeout, terminal result,
and backend handoff
(`extensions/codex/src/app-server/dynamic-tool-execution.ts:147-494`).

Nested tool-search calls synthesize child call IDs from the parent call,
catalog entry, and sequence
(`src/agents/tool-search-runtime.ts:609-615`).

The generic tool-definition adapter bridges execution and `after_tool_call`
hook projection
(`src/agents/agent-tool-definition-adapter.ts:329-552`).

Tool-specific owners remain responsible for their side effects, process
lifetime, retry safety, and cleanup.

## Results, Transcript, and Replay

The Codex event projector coordinates dynamic call/result recording, timeout
and abort state, normalized tool items, and final result synthesis:

- `extensions/codex/src/app-server/event-projector.ts:220-601`;
- `extensions/codex/src/app-server/event-projector-tool-transcript.ts:103-505`;
- `extensions/codex/src/app-server/event-projector-tool-items.ts:25-331`.

Transcript mirrors use idempotent projection keys. Replay-safe summaries and
duplicate suppression do not imply that arbitrary side effects are replayable.

## Evidence

- MCP runtime catalog, lifecycle, and requester isolation:
  `src/agents/agent-bundle-mcp-runtime.test.ts`,
  `src/agents/agent-bundle-mcp-harness.test.ts`.
- Codex effective MCP catalog compatibility:
  `extensions/codex/src/app-server/effective-mcp-catalog.test.ts`.
- OpenClaw-owned tool runtime and hook contract:
  `src/agents/openclaw-owned-tool-runtime-contract.test.ts`.
- Backend thread/session lifecycle compatibility:
  `extensions/codex/src/app-server/thread-lifecycle.test.ts`.
- Plugin tool metadata and registry boundary:
  `src/plugins/tools.ts:50-1298`,
  `src/plugins/registry.ts:33-159`.

## What Is Covered Well

- Core, plugin, MCP, and backend-native tools remain distinguishable.
- Catalog membership is separate from per-run availability.
- MCP has explicit catalog, session/requester, request, retry, and disposal
  lifetimes.
- Tool calls have concrete call IDs and cancellation/timeout paths.
- Sandbox, binding, approval, and native-execution policy are explicit.
- Structured results, progress, transcript projection, and terminal status are
  tested.
- Projection idempotency is not confused with side-effect idempotency.

## Weak or Monolithic

- `agent-tools.ts` mixes assembly, sandbox policy, provider policy, capability
  gating, hooks, and post-processing.
- `agent-bundle-mcp-runtime.ts` mixes discovery, catalog caching, transport,
  retry guards, and disposal.
- `dynamic-tool-build.ts` mixes native-surface selection, sandbox/node
  mediation, aliases, web search, allowlists, and schema shaping.
- `session-binding.ts` combines identity, authority, persistence, approval, and
  provider/model facts.
- `event-projector.ts` coordinates many semantic and presentation projections.
- There is no universal replay/idempotency rule for external actions; safety is
  tool-specific.

## Separation Decision

Use five contracts:

1. **Tool surface catalog**: definitions, semantic metadata, profiles, and
   discovery.
2. **Tool materialization**: per-run model/caller/sandbox/policy projection.
3. **MCP runtime transport**: server/session lifecycle, catalog acquisition,
   requests, retry guards, and disposal.
4. **Execution authority**: binding identity, sandbox, policy, approval,
   trusted target, and continuation.
5. **Invocation and projection**: call ID, timeout/cancel, side effect,
   structured result, transcript/audit/progress sinks, and replay facts.

Tool-specific side-effect semantics must remain with the tool owner.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Semantic, MCP, policy, execution, and projection owners exist but overlap in hubs. |
| Object model | 3 | Definitions, surfaces, runtimes, bindings, calls, approvals, and results are concrete. |
| Contract completeness | 3 | Strong runtime behavior; generic replay and side-effect contracts must remain owner-specific. |
| Separation/cohesion | 2 | Several very large modules combine otherwise distinct contracts. |
| Evidence | 4 | Focused MCP, backend, hook, plugin, lifecycle, and projection tests. |
| Evolution/operations | 3 | Catalog refresh, disposal, backend compatibility, retry, and cancellation are explicit. |

**Total: 18/24 (B), high confidence for the audited paths.**
