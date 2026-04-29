---
name: hook-engine-typed
description: openclaw-core's typed hook engine — 35 hook points, full handler map, per-hook merge semantics, failure policy, timeout policy, sync-only hot-path guards
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Typed hook engine

## Scope

The 35 typed hook points plugins can register against, the per-hook merge
functions that compose results from multiple plugins, and the timeout +
failure-policy regime that wraps every invocation.

[`plugin-loader.md`](plugin-loader.md) covered runner *construction*; this
spec is the *menu* — what each hook is for, when it fires, how multiple
plugins compose. [`hook-engine-legacy.md`](hook-engine-legacy.md) covers
the parallel internal hook system at `src/hooks/`.

## All 35 hook points

Names canonical at `src/plugins/hook-types.ts:107-143` (`PLUGIN_HOOK_NAMES`);
typed handler map at `:787-934` (`PluginHookHandlerMap`); registration
shape at `:936-942`.

### Agent lifecycle

| Hook | Mode | Fire site | Purpose |
|---|---|---|---|
| `before_model_resolve` | modifying (sequential merge) | `src/agents/pi-embedded-runner/run/setup.ts:68` | Override provider/model before session load. First-wins on overrides. |
| `agent_turn_prepare` | modifying (sequential merge) | `pi-embedded-runner/run/attempt.prompt-helpers.ts` | Drain queued plugin injections; add same-turn context. |
| `before_prompt_build` | modifying (sequential merge) | `pi-embedded-runner/run/attempt.prompt-helpers.ts` | Add system prompt, prepend/append context (15s timeout default). |
| `before_agent_start` | modifying (sequential merge) | `pi-embedded-runner/run/setup.ts:76` | **Legacy** combined phase (resolve + prompt build). Prefer the discrete hooks. |
| `before_agent_reply` | claiming (first-wins) | `pi-embedded-runner/run.ts`, `agents/cli-runner.ts` | Short-circuit LLM turn with synthetic reply or silence (`handled=true` halts). |
| `before_agent_finalize` | modifying (sequential merge) | `agents/harness/lifecycle-hook-helpers.ts` | Request revision, force finalize, or accept after final LLM output. |
| `agent_end` | void (parallel) | `pi-embedded-runner/run/attempt.ts`, `harness/lifecycle-hook-helpers.ts` | Observe final messages, success state, duration (30s timeout default). |
| `heartbeat_prompt_contribution` | modifying (sequential merge) | `pi-embedded-runner/run/attempt.prompt-helpers.ts` | Background-monitor context (heartbeat turns only). Same merge as `agent_turn_prepare`. |

### Model observation

| Hook | Mode | Purpose |
|---|---|---|
| `model_call_started` | void (parallel) | Sanitized provider/model call initiation — no content. |
| `model_call_ended` | void (parallel) | Sanitized completion: duration, outcome, request-id hash. |
| `llm_input` | void (parallel) | Actual payload sent to LLM (system, prompt, history, images). Trusted-only. |
| `llm_output` | void (parallel) | Actual LLM response (texts, usage, resolved model ref). |

### Message routing

| Hook | Mode | Fire site | Purpose |
|---|---|---|---|
| `inbound_claim` | claiming (first-wins) | `auto-reply/reply/dispatch-from-config.ts` | Claim inbound message before agent/command dispatch. |
| `message_received` | void (parallel) | same | Observe inbound content + sender + thread + metadata. |
| `before_dispatch` | claiming (first-wins) | same | Inspect/rewrite before model dispatch or handle entirely. |
| `message_sending` | modifying (sequential, **cancel-sticky**) | reply flow | Modify outgoing or cancel delivery. `cancel=true` halts remaining. |
| `message_sent` | void (parallel) | reply flow | Observe outgoing delivery success/failure. |

### Tool execution

| Hook | Mode | Fire site | Purpose |
|---|---|---|---|
| `before_tool_call` | modifying (sequential, **approval-aware, fail-closed**) | `agents/pi-tools.before-tool-call.ts` | Rewrite params, block, or require approval. |
| `after_tool_call` | void (parallel) | `agents/harness/hook-helpers.ts`, `agents/pi-embedded-subscribe.handlers.tools.ts` | Observe result, error, duration. |
| `tool_result_persist` | **sync-only** (sequential) | `agents/session-tool-result-guard-wrapper.ts` | Rewrite tool result before session JSONL write. **Hot path. No promises.** |
| `before_message_write` | **sync-only** (sequential, blocking) | `agents/harness/hook-helpers.ts` | Block or modify before session write. **Hot path. No promises.** |

### Session lifecycle

| Hook | Mode | Purpose |
|---|---|---|
| `session_start` | void (parallel) | Initialization or resumption. |
| `session_end` | void (parallel) | Termination: reason, archived transcript, message count. |
| `before_reset` | void (parallel) | Observe `/new`, `/reset`, programmatic reset before messages lost. |
| `before_compaction` | void (parallel) | Pre-compaction message count + token usage. |
| `after_compaction` | void (parallel) | Post-compaction message count + token reduction. |

### Subagent coordination

| Hook | Mode | Purpose |
|---|---|---|
| `subagent_spawning` | modifying (sequential merge) | Provision session bindings + deterministic delivery origin pre-spawn. |
| `subagent_delivery_target` | modifying (sequential merge) | Resolve subagent delivery routing (channel, accountId, thread). |
| `subagent_spawned` | void (parallel) | Observe initialization + runId assignment. |
| `subagent_ended` | void (parallel) | Observe completion + outcome (`ok`/`error`/`timeout`/`killed`/`reset`). |

### Reply dispatch + gateway lifecycle

| Hook | Mode | Purpose |
|---|---|---|
| `reply_dispatch` | claiming (first-wins) | Own final reply pipeline before default channel handoff. |
| `gateway_start` | void (parallel) | Startup plugin services (cron, webhooks). Fires **post-attach**. |
| `gateway_stop` | void (parallel) | Graceful shutdown via `runGlobalGatewayStopSafely()`. |
| `cron_changed` | void (parallel) | Cron lifecycle — added/updated/removed/started/finished. |

### Install security

| Hook | Mode | Purpose |
|---|---|---|
| `before_install` | modifying (sequential, **findings concatenated, block sticky**) | Augment security scan findings, block install. |

**Total: 35 hooks.** (Earlier count of 33 in [`plugin-model.md`](plugin-model.md) was approximate; the correct figure from `PLUGIN_HOOK_NAMES` is 35.)

## Per-hook merge functions

Modifying hooks compose results from multiple plugins. **Merge semantics
are hook-specific**, not uniform.

| Hook | Merger | Cite | Behavior |
|---|---|---|---|
| `before_model_resolve` | `mergeBeforeModelResolve` | `hooks.ts:268-275` | First-wins per field (`modelOverride`, `providerOverride`). Non-conflicting fields preserved across plugins. |
| `before_prompt_build` | `mergeBeforePromptBuild` | `hooks.ts:277-299` | `systemPrompt` first-wins; context fields (prepend/append × system/user) **all concatenated** in priority order. |
| `agent_turn_prepare` | `mergeAgentTurnPrepare` | `hooks.ts:301-316` | Concatenate `prependContext`, `appendContext`. Reused for `heartbeat_prompt_contribution`. |
| `before_agent_finalize` | `mergeBeforeAgentFinalize` | `hooks.ts:318-344` | Action precedence: **`finalize > revise > continue`**. `finalize` is terminal; `revise` reasons concatenated; `continue` only if no higher action. |
| `subagent_spawning` | `mergeSubagentSpawningResult` | `hooks.ts:346-362` | Error-first (return immediately on error); `threadBindingReady` OR-merged; `deliveryOrigin` from either. |
| `subagent_delivery_target` | `mergeSubagentDeliveryTargetResult` | `hooks.ts:364-372` | First-defined origin wins. |
| `before_install` | inline | `hooks.ts:1302-1311` | `findings` concatenated; `block` sticky-true; `blockReason` last-wins. |
| `message_sending` | inline | `hooks.ts:951-959` | Content last-wins; `cancel` sticky-true (terminal). **A late cancel discards earlier content modifications.** |
| `before_tool_call` | inline | `hooks.ts:995-1013` | Sophisticated. Once approval is requested by plugin P, lower-priority plugins **cannot rewrite `params`** (anti-tampering across plugin boundaries). `block` sticky; `requireApproval` first-defined. |

**The seven hooks without an explicit merger fall back to last-wins.** New
modifying hooks should ship an explicit merger; relying on the default is
a footgun.

## Registration shape and sort

`PluginHookRegistration<K>` at `hook-types.ts:936-942`:

```ts
type PluginHookRegistration<K extends PluginHookName = PluginHookName> = {
  pluginId: string;
  hookName: K;
  handler: PluginHookHandlerMap[K];
  priority?: number;
  source: string;
};
```

Sort at `hooks.ts:224-230`:

```ts
return (registry.typedHooks as PluginHookRegistration<K>[])
  .filter(h => h.hookName === hookName)
  .toSorted((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
```

Descending priority. Same-priority preserves registration order. Default
priority is `0`.

## Failure policy

Per-hook `failurePolicyByHook` at `hooks.ts:155, :250-261`:

| Policy | Behavior |
|---|---|
| `fail-open` (default) | Errors logged, execution continues. |
| `fail-closed` | Errors propagate to the caller. |

**Only one hook is fail-closed by default**: `before_tool_call` (`hook-runner-global.ts:43-45`). Tool-call safety is the asymmetric case — a malfunctioning approval/block plugin must abort the call, not silently allow it.

## Timeout policy

`voidHookTimeoutMsByHook` and `modifyingHookTimeoutMsByHook` (`hooks.ts:178-183`).

| Hook | Timeout | Reason |
|---|---|---|
| `agent_end` | 30 000 ms | Observation hooks may block agent completion logging. |
| `before_prompt_build` | 15 000 ms | Modifying hook on the request hot path. |
| (all other hooks) | none | No default timeout. |

Implementation at `hooks.ts:416-438`: `Promise.race()` against a timer
marked `unref()` (won't prevent process exit). **Critical:** a timeout
logs and moves on but **does not cancel** the underlying plugin promise
— the plugin continues running in the background. Do not put resource-
intensive uncancellable work behind a timed hook.

## Discoverability

| Surface | Where |
|---|---|
| Canonical type list | `src/plugins/hook-types.ts:70-143` (names), `:787-934` (handler map) |
| User-facing reference | `docs/plugins/hooks.md` (~15.5 KB; quick start + tool policy + decision tree) |
| Architecture doc | `docs/plugins/architecture-internals.md` (load pipeline, typed-vs-legacy distinction) |
| SDK guide | `docs/plugins/sdk-overview.md` (registration via `api.on(...)`) |

The TypeScript type system is the contract; `docs/plugins/hooks.md` is
the user guide. Contributors unfamiliar with TypeScript should consult
both.

## Hook vs diagnostic event — decision rule

The diagnostic event stream ([`diagnostic-event-stream.md`](diagnostic-event-stream.md))
is the alternative observation channel. Choosing between them:

| Use a typed hook if | Use a diagnostic event if |
|---|---|
| The plugin needs to **block or modify** behavior | The plugin only **observes** outcomes |
| Priority ordering / merge semantics matter | Order doesn't matter |
| Receives **full payloads** (prompts, tool results) | Carries metrics / outcome categories only |
| Synchronous coordination required | Fire-and-forget OK |

`before_tool_call` is a hook (block/approve). `after_tool_call` is also
a hook because plugins may want to audit synchronously. If only metrics
are needed, the diagnostic event for tool timing is sufficient.

## Footguns

1. **Sync-only hot-path guards.** `tool_result_persist` and `before_message_write` (`hooks.ts:1057, :1117`) **must not return a Promise.** The runner does not await — a returned promise is logged (fail-open) or thrown (fail-closed). Hot path is the JSONL session-write loop; awaiting would stall sessions.
2. **Failure policy inversion.** `before_tool_call` is the lone fail-closed hook by default. Plugin errors here abort the tool call. Other hooks fail open.
3. **Timeout doesn't cancel.** Logged + moved on. Underlying work continues.
4. **Approval-plugin freezing in `before_tool_call`.** Once any plugin requests approval, lower-priority plugins **cannot modify `params`**. Their returned `params: newParams` is silently discarded. Sophisticated anti-tampering — easy to miss when debugging "why is my param rewrite ignored?"
5. **Claiming hooks silently drop later plugins.** `inbound_claim`, `before_dispatch`, `reply_dispatch`: first `handled: true` wins, remaining plugins skipped without log. Operators debugging message flow won't see who claimed.
6. **`gateway_start` fires post-attach, not pre-init.** `gateway/server-startup-post-attach.ts`. If you need shared state available *before* HTTP request handling, `gateway_start` is too late.
7. **Default merge = last-wins.** Hooks without explicit mergers do last-wins. New modifying hooks should ship a merger or document the choice.
8. **Two hook systems coexist.** `HookRunnerRegistry` has `hooks: PluginLegacyHookRegistration[]` *and* `typedHooks: TypedPluginHookRegistration[]` (`hook-registry.types.ts:12-15`). The runner iterates only `typedHooks`. Plugins migrating from the legacy path must explicitly register typed hooks. See [`hook-engine-legacy.md`](hook-engine-legacy.md).
9. **`runId` not auto-injected.** Some events arrive with `runId` undefined; helper `withAgentRunId()` (`hooks.ts:655-663`) fills from context. New hooks should call it.

## Files I'd link from any hook-touching PR

1. `src/plugins/hook-types.ts:70-143, :787-934` — names + handler map.
2. `src/plugins/hooks.ts:244-1388` — runner + every merge function.
3. `src/plugins/hook-runner-global.ts` — global accessor + default policies.
4. `src/plugins/hook-registry.types.ts:12-15` — typed-vs-legacy registry.
5. `docs/plugins/hooks.md` — user guide.
6. `src/agents/pi-embedded-runner/run/setup.ts` — `before_model_resolve`, `before_agent_start` fire sites.
7. `src/agents/pi-tools.before-tool-call.ts` — tool-call hook with approval flow.
8. `src/auto-reply/reply/dispatch-from-config.ts` — message routing hooks.
9. `src/gateway/server-startup-post-attach.ts` — gateway lifecycle hooks.

## Read next

- [`hook-engine-legacy.md`](hook-engine-legacy.md) — the parallel internal hook system.
- [`plugin-loader.md`](plugin-loader.md) — runner construction + activation planner.
- [`diagnostic-event-stream.md`](diagnostic-event-stream.md) — the observation alternative.
- [`trust-and-redaction.md`](trust-and-redaction.md) — the security gate `before_tool_call` enforces.
