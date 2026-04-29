---
name: architecture
description: Synthesis of the 28 spec pages — what the codebase tells us about OpenClaw's design philosophy, gateway extensibility seams, and how every layer ties together
type: skunkworks-synthesis
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# What we learned about OpenClaw

After 28 spec pages and ~7,500 lines of analysis, the picture sharpens
into about ten architectural commitments. Each is held coherently across
the codebase. Few are stated as such; you have to read the manifests,
the loader, the gateway, the diagnostic event stream, the sandbox model,
the trust gate, and `AGENTS.md` side-by-side before they emerge.

## Lead question — is the gateway extensible?

**Yes — three distinct seams, no fourth.**

| Seam | What plugins can register | Trust |
|---|---|---|
| `api.registerGatewayMethod(name, handler)` | A custom RPC method on the gateway dispatcher. | host-side, plugin-trusted |
| `api.registerHttpRoute({path, auth, scope, handler})` | HTTP routes mounted on the gateway server (e.g., `/api/diagnostics/prometheus`). | host-side, plugin-trusted; `auth: "gateway"` + `scope: "trusted-operator"` gate user access |
| `api.on(<hookName>, handler)` for `gateway_*` and dispatch hooks | Lifecycle: `gateway_start`, `gateway_stop`, `before_dispatch`, `reply_dispatch`. | `before_dispatch` is **claiming** — first `handled=true` wins |

What you **cannot** do:

- Add new frame envelope types — the four (`req` / `res` / `event` / `hello-ok`) are frozen in TypeBox; new frames need a Swift codegen change.
- Replace the dispatcher.
- Inject methods at runtime *after* boot — the registry is built once, populated, then read-only until full reload.
- Skip the auth + scope matrix.
- Skip the rate-limit budget for control-plane writes.

The constraint is deliberate. Per `AGENTS.md`: *"Manifest-first control
plane; targeted runtime loaders; no hidden contract bypasses; broad
mutable registries transitional."*

Compare to the analog ecosystem: nginx (compile-time linked modules) vs
Apache `mod_lua` (runtime hot-load). OpenClaw is closer to nginx —
plugins linked at boot, registry frozen, reload-or-restart to change.
This is the opposite of "plugin systems should be hot-pluggable." The
team chose stability over flexibility, with full reload as the escape
hatch.

## Ten architectural commitments

### 1. Manifest is the registry, not just metadata

`openclaw.plugin.json` is read **before** any plugin TypeScript runs.
Auth UI, command discovery, capability resolution, model catalog,
endpoint classification, embedding-provider picker — all answered from
JSON. Plugin runtime loads only when activation triggers fire.

This inverts the common TypeScript pattern (decorators or
register-on-import). It's slower to author but pays for itself in:

- audit (you can read every manifest and know what plugins own without executing code),
- boot speed (cold paths skip plugin code entirely),
- security (no untrusted code runs to populate UI).

Almost every "core stays extension-agnostic" guarantee in `AGENTS.md`
is enforced through manifest fields, not runtime checks.

### 2. Three drift gates, none PR-blocking

| Gate | Hash file | Check |
|---|---|---|
| Plugin SDK API baseline | `docs/.generated/plugin-sdk-api-baseline.sha256` | `pnpm plugin-sdk:api:check` |
| Bundled-plugin config baseline | `docs/.generated/config-baseline.sha256` | `pnpm config:docs:check` |
| Swift protocol regen | none — file diff catches it | `pnpm protocol:gen:swift` |

All run in `release:check`, not on every PR. **Discipline + code review
carry the load.** That's a statement about the team's preferred process:
trust contributors, fail at release time, not block development.

### 3. Two hook systems, plus a third observation channel

| Channel | Style | Purpose |
|---|---|---|
| Typed plugin hooks (35) | pull, modify | Block, claim, merge results across plugins. |
| Legacy hooks (`src/hooks/`, 6 events × 4 source tiers) | pull, observe | Internal lifecycle (gmail watch, fire-and-forget, install/uninstall). |
| Diagnostic event stream (~30 event types) | push, observe | Metrics, durations, outcomes — no payloads. |

Plugin authors pick by need. Conflating them is the most common audit
mistake.

### 4. Trust is a single boolean, defended by `WeakSet`

`metadata.trusted: true` is a flag, not a JWT or capability token. The
defense is per-dispatch `WeakSet` anti-spoof: only metadata objects
that passed through the runtime dispatcher are recognized as trusted.

A plugin can fabricate `{ trusted: true }` but it won't pass the
`dispatchedTrustedDiagnosticMetadata.has(metadata)` check that gates
W3C traceparent propagation. Lightweight defense — small file, big
footprint.

### 5. Sandbox is a runtime concern, not a loader concern

All plugins run host-side, full API access. *Workloads* (agent code,
arbitrary tool execution) get sandboxed.

This is the inverse of "every plugin is a Docker container" — that
would dilute the SDK surface and make hooks impossible. OpenClaw chose:
**rich plugin SDK + workload sandboxing**.

The implication: trust the plugin author (vetted via ClawHub or
bundled-plugin review). Don't trust the LLM.

### 6. Four extension surfaces, each clearly bounded

| Surface | Role | When |
|---|---|---|
| Code plugins | runtime hooks, providers, channels, services | needs in-process API |
| Bundle plugins (skills) | Markdown prompt extensions, no code | static documentation of CLI tools |
| MCP servers | external tool catalogs (consume) + gateway expose (server) | dynamic tool discovery |
| ACPX bundles | format mapping for Codex/Claude command packs | bridge bundled formats |

`VISION.md` commits to *"pragmatic MCP without duplicating existing
agent/tool/ACPX/plugin/ClawHub paths."* The boundary is per-capability:
code-plugin for hooks, ACPX for format mapping, MCP for external tool
catalogs, ClawHub for distribution.

### 7. Memory is a special slot

`kind: "memory"` in the manifest triggers slot machinery. Only one
memory plugin active at a time per `plugins.slots.memory`. **The only
manifest field that drives mutually-exclusive activation.**

Memory deserved this because the dreaming subsystem (light/REM/deep
phases) and the in-prompt injection seam are coherent only with one
provider. Memory feeds active-memory feeds context-engine feeds the
prompt — three layers, single tenant.

### 8. The gateway is the everything-bus

Channels (telegram, discord, slack, …), agents (CLI, mobile, macOS),
tools (browser, exec), MCP clients, mobile apps, CLI commands all
converge in the gateway process. **In-proc, not a microservice mesh.**

Subagent re-entry (`PluginRuntime.subagent.run()`) goes through the
gateway as a child request, scope preserved via `AsyncLocalStorage`.

This is OpenClaw's "monolith with manifests" stance. One process to
supervise, one log to tail, one reload to apply.

### 9. Determinism for prompt caching is load-bearing

`AGENTS.md`: *"deterministic ordering for maps/sets/registries/plugin
lists/files/network results before model/tool payloads."*

Cache miss on retry costs ~30% latency. The cost is felt in:

- hook merge ordering,
- context-engine assembly (transcript order, not query-hit order),
- plugin registry iteration (sorted by id, not insertion order),
- active-memory injection position (stable spot in prompt).

Targets >70% cache hit rate. Drift breaks the rate.

### 10. Mobile + desktop apps are first-class

Swift codegen (`scripts/protocol-gen-swift.ts`) maintains parity with
the protocol. iOS/Android/macOS connect as `role: node` over WebSocket.
The macOS app **supervises** the gateway via launchd, not the other way
around.

`ws://` is loopback-only by default; private-network needs
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`. Public deploy uses `wss://` or
tunnel. App version bumps coordinate across six files
([`build-and-release.md`](build-and-release.md)).

## Macro system map

```
   ┌────────────────────────────────────────────────────────────────────┐
   │              ~80 manifests at extensions/*/openclaw.plugin.json    │
   │              + skills/<name>/SKILL.md                              │
   │                                                                    │
   │     ┌─ providers          (anthropic, openai, google, mistral, …)  │
   │     ├─ channels           (telegram, discord, slack, irc, matrix)  │
   │     ├─ memory (slot)      (memory-core, memory-lancedb, -wiki)     │
   │     ├─ tools              (browser, document-extract, …)           │
   │     ├─ diagnostics        (otel, prometheus)                       │
   │     ├─ migration          (migrate-claude, migrate-hermes)         │
   │     ├─ ACPX bundle        (acpx — Codex/Claude bridge)             │
   │     └─ skills             (~57 bundled markdown extensions)        │
   │                                                                    │
   │              read at boot, drives all cold-path lookups            │
   └─────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │                                                                    │
   │  CLIENTS                  GATEWAY (in-proc Node.js)     EXTENSIONS │
   │  ───────                  ─────────                     ────────── │
   │                                                                    │
   │   CLI ────────────┐                                                │
   │                   │   ┌──────────────────────────┐                 │
   │   macOS app ──────┤   │   frame dispatcher       │                 │
   │   iOS app ────────┼──►│   • TypeBox schemas      │◄─────┐          │
   │   Android app ────┤   │   • role + scope auth    │      │ register │
   │   Swabble ────────┘   │   • rate-limit budget    │      │ method   │
   │                       └────────────┬─────────────┘      │          │
   │   ws:// loopback /                 │                    │          │
   │   wss:// public                    ▼                    │          │
   │                       ┌──────────────────────────┐      │          │
   │                       │   plugin registry        │ ─────┤          │
   │                       │   + hook runner          │      │ register │
   │                       │   (35 typed hooks)       │      │ tool /   │
   │                       └────────────┬─────────────┘      │ channel /│
   │                                    │                    │ provider │
   │   webhook / poll ─┐                ▼                    │          │
   │                   │   ┌──────────────────────────┐      │          │
   │   Telegram poll ──┤   │   agent harness          │      │          │
   │   Slack events ───┼──►│   + context engine       │      │          │
   │   Discord WS ─────┤   │   + active-memory        │      │          │
   │   Matrix sync ────┘   │   + before_prompt_build  │      │          │
   │                       └────────────┬─────────────┘      │          │
   │                                    │                    │          │
   │                                    │ tool call          │          │
   │                                    ▼                    │          │
   │                       ┌──────────────────────────┐      │          │
   │                       │ before_tool_call hook    │ ─────┘          │
   │                       │ + ACP approval gate      │                 │
   │                       └────────────┬─────────────┘                 │
   │                                    │ stdio                         │
   │                                    ▼                               │
   │                       ┌──────────────────────────┐                 │
   │                       │   sandbox (Docker)       │                 │
   │                       │   • Dockerfile.sandbox   │                 │
   │                       │   • sandbox-browser      │                 │
   │                       │   • sandbox-common       │                 │
   │                       └──────────────────────────┘                 │
   │                                                                    │
   │   ──────────── observability ────────────                          │
   │                       │                                            │
   │                       ▼                                            │
   │                       ┌──────────────────────────┐                 │
   │                       │ diagnostic event stream  │                 │
   │                       │ (in-proc pub/sub bus,    │                 │
   │                       │  metadata.trusted gate)  │                 │
   │                       └────────┬───────┬─────────┘                 │
   │                                │       │                           │
   │                                ▼       ▼                           │
   │                            OTLP/HTTP  /api/diagnostics/prometheus  │
   │                            (push)    (pull scrape)                 │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              │ Sparkle / appcast.xml
                              ▼
                     macOS app auto-updater
```

The gateway sits at the center. Manifests above drive what plugs in.
Clients on the left talk WebSocket. Channels on the left poll/webhook
inbound. Sandbox runs below. Observability flows out the right.

## Anatomy of a turn

```
   user message lands at channel adapter
        │
        ▼
   ┌──────────────────────────────────────┐
   │ inbound_claim hook         (claiming)│  ← first plugin handled=true wins
   │ message_received hook      (observe) │
   │ before_dispatch hook       (claiming)│
   └─────────────────┬────────────────────┘
                     │ if no claim
                     ▼
   ┌──────────────────────────────────────┐
   │ active-memory blocking sub-agent     │  ← memory_search → "NONE" or summary
   └─────────────────┬────────────────────┘
                     │ summary injected
                     ▼
   ┌──────────────────────────────────────┐
   │ context-engine.assemble()            │
   │ • messages[] in TRANSCRIPT order     │  ← prompt-cache determinism
   │ • token budget + reserve             │
   │ • systemPromptAddition               │
   └─────────────────┬────────────────────┘
                     │
                     ▼
   ┌──────────────────────────────────────┐
   │ before_model_resolve  (modify, FIRST)│
   │ before_prompt_build   (modify, 15s)  │
   │   • prependContext, appendContext    │
   │   • systemPrompt FIRST-wins          │
   └─────────────────┬────────────────────┘
                     │
                     ▼   "context.assembled" diag event (trusted=true)
                     │
                     ▼
   ┌──────────────────────────────────────┐
   │ LLM call                             │
   │   model_call_started     (observe)   │
   │   [provider plugin streamFn]         │
   │   llm_input / llm_output (observe)   │
   │   model_call_ended       (observe)   │
   └─────────────────┬────────────────────┘
                     │
                     ├── tool calls? ──┐
                     │                 ▼
                     │   ┌──────────────────────────────┐
                     │   │ before_tool_call             │ ← FAIL-CLOSED
                     │   │   (modify, approval-aware)   │
                     │   │ • params rewrite             │
                     │   │ • block / requireApproval    │
                     │   └────────────┬─────────────────┘
                     │                │
                     │                ▼
                     │   ┌──────────────────────────────┐
                     │   │ resolveExecTarget()          │
                     │   │   "auto" / sandbox / host    │
                     │   │   / node / gateway           │
                     │   └────────────┬─────────────────┘
                     │                │ stdio (subprocess)
                     │                ▼
                     │   ┌──────────────────────────────┐
                     │   │ docker exec -i <container>   │
                     │   │   /bin/sh -lc "<command>"    │
                     │   └────────────┬─────────────────┘
                     │                │
                     │   ┌────────────┴─────────────────┐
                     │   │ after_tool_call    (observe) │
                     │   │ exec.process.completed event │ ← trusted=false (sandbox)
                     │   │   tool_result_persist (sync) │ ← hot path; no promises
                     │   └────────────┬─────────────────┘
                     │                │
                     │◄───────────────┘  (loop until done or finalize)
                     │
                     ▼
   ┌──────────────────────────────────────┐
   │ before_agent_finalize    (modify)    │  ← finalize > revise > continue
   │ before_message_write     (sync, hot) │
   │ message_sending          (cancel-stk)│
   │ reply_dispatch           (claiming)  │
   └─────────────────┬────────────────────┘
                     │
                     ▼
   channel adapter outbound (chunk to ≤4096; render entities;
                              sendMessage / sendDocument / sendVoice / …)
                     │
                     ▼
              user gets reply
```

Eleven hook firings, four claiming gates, two sync-only hot-path
guards, one approval flow, one sandbox boundary. This is what runs
behind every chat turn.

## Three observation channels — picking the right one

```
                     OPENCLAW HAS THREE CHANNELS PLUGINS USE TO INTERACT
                     WITH THE RUNTIME. CONFLATING THEM IS A COMMON BUG.

   ┌─────────────────────────┬──────────────────────────┬───────────────────────────┐
   │   TYPED PLUGIN HOOKS    │    LEGACY/INTERNAL       │   DIAGNOSTIC EVENT STREAM │
   │   (src/plugins/)        │    HOOKS (src/hooks/)    │   (src/infra/diagnostic-) │
   ├─────────────────────────┼──────────────────────────┼───────────────────────────┤
   │ 35 named hooks          │ 6 events × 4 sources     │ ~30 event types           │
   │                         │  (bundled, plugin,       │                           │
   │                         │   managed, workspace)    │                           │
   │ pull-based              │ pull-based               │ push, fire-and-forget     │
   │   runtime calls them    │   runtime fires          │   producers emit          │
   │   at specific gates     │                          │                           │
   │                         │                          │                           │
   │ MODIFY behavior         │ react to LIFECYCLE       │ OBSERVE only              │
   │ • block / claim         │ • gmail watch            │ • metrics, durations      │
   │ • merge results         │ • fire-and-forget        │ • outcomes, no payloads   │
   │ • per-hook merge funcs  │ • install / uninstall    │                           │
   │                         │ • frontmatter HOOK.md    │                           │
   │                         │                          │                           │
   │ TIMEOUTS                │ no timeout               │ no timeout                │
   │ • before_prompt: 15s    │   handler errors caught  │   async drain queue (10K) │
   │ • agent_end: 30s        │   and logged             │   silent drop on full     │
   │ • timeout doesn't       │                          │                           │
   │   cancel underlying     │                          │                           │
   │                         │                          │                           │
   │ FAIL POLICY             │ fail-open (logged)       │ fire-and-forget; throwing │
   │ • mostly fail-open      │                          │   subscribers caught      │
   │ • before_tool_call      │                          │   and logged              │
   │   = FAIL-CLOSED         │                          │                           │
   │                         │                          │                           │
   │ SHARED ACROSS BUNDLE    │ shared across bundle     │ shared across bundle      │
   │ via Symbol.for() global │ via Symbol.for() global  │ via Symbol.for() global   │
   │   singleton             │   singleton              │   singleton               │
   │                         │                          │                           │
   │ Examples:               │ Examples:                │ Examples:                 │
   │ • before_model_resolve  │ • agent:bootstrap        │ • model.usage             │
   │ • before_prompt_build   │ • gateway:startup        │ • run.completed           │
   │ • before_tool_call      │ • message:received       │ • tool.execution.error    │
   │ • before_agent_finalize │ • session:patch          │ • diagnostic.memory.*     │
   │ • subagent_spawning     │                          │ • diagnostic.liveness.*   │
   │ • gateway_start         │                          │ • context.assembled       │
   │ • gateway_stop          │                          │ • telemetry.exporter      │
   │                         │                          │                           │
   │ DECISION:               │ DECISION:                │ DECISION:                 │
   │ "I need to MODIFY"      │ "I need user-facing      │ "I need to OBSERVE"       │
   │                         │  install/lifecycle"      │                           │
   │                         │                          │ TRUST GATE                │
   │                         │                          │ • metadata.trusted        │
   │                         │                          │   gate at consumers       │
   │                         │                          │ • WeakSet anti-spoof      │
   │                         │                          │ • redactSensitiveText     │
   │                         │                          │ • LOW_CARDINALITY regex   │
   └─────────────────────────┴──────────────────────────┴───────────────────────────┘
```

## Plugin lifecycle — manifest to live registry

```
   manifest discovery     ┌──────────────────────────────┐
   ──────────────────────►│ src/plugins/                 │
                          │   bundled-plugin-scan.ts     │
   manifest reading       │   bundled-dir.ts             │
   ──────────────────────►│   bundled-plugin-metadata.ts │
                          └──────────────┬───────────────┘
                                         │ JSON5 parse
                                         ▼
   manifest validation    ┌──────────────────────────────┐
   ──────────────────────►│ src/plugins/manifest.ts      │
                          │ src/plugins/schema-validator │
                          │   • configSchema (AJV)       │
                          │   • prototype-key block-list │
                          │   • normalize records        │
                          └──────────────┬───────────────┘
                                         │
                                         ▼
   activation planning    ┌──────────────────────────────┐
   ──────────────────────►│ activation-planner.ts:63-100 │
   (cold path; no code)   │   triggers:                  │
                          │   • activation.onStartup     │
                          │   • activation.onProviders   │
                          │   • activation.onChannels    │
                          │   • activation.onCommands    │
                          │   • activation.onConfigPaths │
                          │   • activation.onCapabilities│
                          │                              │
                          │   reasons recorded ────►     │  "manifest-provider-owner"
                          │                              │  "activation-channel-hint"
                          │                              │  …
                          └──────────────┬───────────────┘
                                         │
                                         ▼
   plugin code load       ┌──────────────────────────────┐
   ──────────────────────►│ definePluginEntry({          │
   (only if activated)    │   id, name, kind?,           │
                          │   register(api) {            │
                          │     api.registerProvider()   │
                          │     api.registerChannel()    │
                          │     api.registerTool()       │
                          │     api.registerService()    │
                          │     api.registerHttpRoute()  │
                          │     api.registerCli()        │
                          │     api.registerGatewayMethod│
                          │     api.on(<typed-hook>)     │
                          │     api.registerRuntimeLifecycle()
                          │     ...                      │
                          │   }                          │
                          │ })                           │
                          └──────────────┬───────────────┘
                                         │
                                         ▼
   live registries        ┌──────────────────────────────┐
   ──────────────────────►│ PluginRegistry               │
                          │ {                            │
                          │   plugins: PluginRecord[],   │
                          │   tools, hooks, typedHooks,  │
                          │   channels, channelSetups,   │
                          │   providers,                 │
                          │   speechProviders,           │
                          │   mediaUnderstandingProvs,   │
                          │   imageGenerationProvs, ...  │
                          │   migrationProviders,        │
                          │   memoryEmbeddingProviders,  │
                          │   agentHarnesses,            │
                          │   httpRoutes, services,      │
                          │   gatewayHandlers,           │
                          │   commands, cliRegistrars,   │
                          │   runtimeLifecycles,         │
                          │   diagnostics: [...]         │
                          │ }                            │
                          │ ─ specialized sub-registries │
                          │ ─ frozen post-load           │
                          │ ─ reload = clear+repopulate  │
                          └──────────────┬───────────────┘
                                         │
                                         ▼
   request-time use       ┌──────────────────────────────┐
   ──────────────────────►│ runtime queries              │
                          │   • hook runner fires hooks  │
                          │   • dispatcher routes RPC    │
                          │     by method-name string    │
                          │   • agent harness picks      │
                          │     tools, model, hooks      │
                          │   • channel adapter binds    │
                          │   • diagnostic events flow   │
                          │     via ctx.internalDiagnostics
                          └──────────────────────────────┘
```

## What's surprising

A handful of design choices that surprised us as we read the code, in
case they surprise you:

- **No DI container.** Every "service" is a global singleton via `Symbol.for("openclaw.x.state.v1")` for bundle-chunk visibility. Pragmatic, not idiomatic.
- **No frame-type extensibility.** The four envelopes cover everything. New event payloads, not new envelope types. Codegen pinned to those four.
- **No method-name TypeScript union.** Methods are runtime string lookups. Typos fail at dispatch, not compile. Methods are cheap to add.
- **Auth profiles are immutable from inside the plugin.** No refresh from inside. Anthropic CLI auth refreshes via Claude CLI's own machinery — outside the plugin's control.
- **Config hot-reloads partially.** Most paths reload live; specific paths (model pricing, plugin loading) trigger SIGUSR1 restart.
- **Prom + OTel coexist deliberately.** Two diagnostics extensions, one pull, one push. Not redundant — different observability architectures (on-box scrape vs cloud-native push).
- **`AnyCodable` is the Swift forward-compat hatch.** The generated Swift is `Codable`-only; unknown payload fields decode to `AnyCodable` rather than failing.
- **Mac app supervises the gateway, not vice versa.** launchd is the supervisor. The macOS app spawns and manages, then connects as a client.
- **Sandbox emits events as `trusted: false`.** The trust gate isn't documented as such; you have to read both the diagnostic event stream spec and the sandbox spec to see the boundary.
- **No PR-time CI gate on Swift codegen.** Manual regen + reviewer discipline. Same for SDK API baseline. Failures land on `main` if both contributor and reviewer miss it.

## What this means for our claws-side work

The wave's `claws-openclaw-upstream` plan ships six PRs into upstream
openclaw/openclaw. The architectural picture above explains *why* the
wave's gates exist:

| Wave gate | OpenClaw architectural commitment |
|---|---|
| 10-PR cap, 2-PR open culture | "broad mutable registries transitional" — small, focused changes |
| Bot-preempt checklist | OpenClaw uses bot reviewers (Greptile, Copilot, chatgpt-codex) by default; pre-empt their P1/P2/P3 categories |
| `r:third-party-extension` / `r:skill` auto-close | "core stays lean; optional capability should usually ship as plugins" — must justify core-not-extension |
| Public API additions require Swift regen | `gateway-protocol.md` — codegen is manual, drift falls back to PR review |
| `plugin-sdk-api-baseline.sha256` refresh | `sdk-api-baseline.md` — third drift gate, also manual |
| `docs/sdk-overview.md` table refresh | hand-written, not auto-generated |
| Adapter audits (per-PR) | `manifest-schema.md` — every contracts.* declaration must match runtime registration |

Each claws-side PR is an exercise in respecting these commitments. The
architectural shape isn't arbitrary — it's defending the
"manifest-first control plane" position. Our PRs that fit the position
land cleanly; the ones that don't get auto-closed.

## Read the specs in this order

If onboarding someone new to OpenClaw via these specs:

1. [`README.md`](README.md) — the index.
2. [`architecture.md`](architecture.md) — this file.
3. [`gateway.md`](gateway.md) + [`plugin-model.md`](plugin-model.md) + [`manifest-schema.md`](manifest-schema.md) — the load-bearing trio.
4. [`hook-engine-typed.md`](hook-engine-typed.md) + [`diagnostic-event-stream.md`](diagnostic-event-stream.md) — the two observation channels.
5. [`extension-pattern-provider.md`](extension-pattern-provider.md) + [`extension-pattern-channel.md`](extension-pattern-channel.md) — pattern by example.
6. The rest as needed.

After this onboarding, anyone should be able to read an arbitrary
`extensions/<id>/` plugin and predict its manifest, its `index.ts`,
and the cold-path lookups it answers — without reading the source.
