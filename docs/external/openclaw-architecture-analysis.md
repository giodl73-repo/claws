# OpenClaw Architecture Analysis

Architect's assessment of the OpenClaw codebase (`openclaw-core`) for the
claws governance compiler integration project.

Repository: https://github.com/openclaw/openclaw
Version analyzed: 2026.4.11-beta.1
Codebase scale: ~280K lines TypeScript across `src/`, plus extensions, tests, UI

---

## 1. Architecture Strengths

### 1.1 Hook System: Well-Designed and Comprehensive

The plugin hook system is the crown jewel. 28 named lifecycle hooks cover the
full agent request path from model resolution through tool execution to reply
dispatch:

```
before_model_resolve -> before_prompt_build -> before_agent_start ->
before_agent_reply -> llm_input -> llm_output -> agent_end
before_tool_call -> after_tool_call -> tool_result_persist
session_start -> session_end
subagent_spawning -> subagent_spawned -> subagent_ended
gateway_start -> gateway_stop
before_install
```

The hook runner (`src/plugins/hooks.ts`) supports three execution modes:
- **Void hooks**: parallel fire-and-forget (performance optimization for observability)
- **Modifying hooks**: sequential with merge semantics (higher priority wins)
- **Claiming hooks**: sequential first-handled-wins (for routing decisions)

Each mode has typed event/context/result signatures per hook name via
`PluginHookHandlerMap` (`src/plugins/hook-types.ts`). The type-safety here is
strong --- the handler map uses mapped types so plugin authors get full IntelliSense
for both event payloads and return types.

Key strength: the `before_tool_call` hook returns a `PluginHookBeforeToolCallResult`
that can modify params, block execution, or request approval with severity levels.
This is *exactly* the integration surface claws needs for R1-R5 classification.

```typescript
// src/plugins/hook-types.ts lines 309-322
export type PluginHookBeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
  requireApproval?: {
    title: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    timeoutMs?: number;
    timeoutBehavior?: "allow" | "deny";
    pluginId?: string;
    onResolution?: (decision: PluginApprovalResolution) => Promise<void> | void;
  };
};
```

### 1.2 Config Type System: Deeply Structured

The config type system spans 38 dedicated type files under `src/config/types.*.ts`,
each covering a domain slice (tools, agents, channels, ACP, etc.). The root
`OpenClawConfig` type (`src/config/types.openclaw.ts`) composes all of these
with clear separation.

Notable design choices:
- **Branded config states**: `SourceConfig`, `ResolvedSourceConfig`, `RuntimeConfig`
  use unique symbol brands to prevent accidentally passing unresolved config where
  runtime config is expected (`src/config/types.openclaw.ts` line 127-135).
- **Zod validation layer**: parallel zod schemas (`src/config/zod-schema.*.ts`)
  for runtime validation, kept in sync with the TypeScript types.
- **JSON5 + `$include` directives**: modular config composition with circular
  reference detection, path traversal protection, and symlink hardening
  (`src/config/includes.ts`).

### 1.3 Security Audit Infrastructure

The `src/security/` directory (15K lines) is serious work. The audit system
(`src/security/audit.ts`) performs comprehensive checks:

- Config flag risk analysis (`dangerous-config-flags.ts`)
- Tool risk classification (`dangerous-tools.ts`)
- Trust model exposure matrix (`audit-trust-model.test.ts`)
- Windows ACL checks (`windows-acl.ts`)
- Plugin code safety scanning (`audit-plugin-code-safety.test.ts`)
- SSRF policy enforcement (in web fetch config)
- Filesystem permission inspection with detailed findings

The `DEFAULT_GATEWAY_HTTP_TOOL_DENY` list (`src/security/dangerous-tools.ts`)
shows thoughtful risk classification --- exec, spawn, shell, fs_write,
sessions_spawn, cron, gateway, and nodes are all denied over HTTP by default.

### 1.4 Plugin SDK: Clean Public Surface

The plugin SDK (`src/plugin-sdk/index.ts`) keeps a deliberately narrow public
surface. The entry point re-exports only the types plugin authors need:
channel adapters, plugin API interfaces, runtime types. Internal machinery
stays behind the boundary.

Multiple export subpaths (`plugin-sdk/core`, `plugin-sdk/routing`,
`plugin-sdk/runtime`, `plugin-sdk/sandbox`) allow plugins to import exactly
what they need without pulling the full SDK.

### 1.5 Test Culture: Strong and Architectural

2,671 test files in `src/` alone. The test infrastructure includes:

- **Architecture smell detection**: `test/architecture-smells.test.ts` runs a
  scripted smell collector that produces stable sorted output, enforcing
  structural invariants across the codebase.
- **Extension import boundaries**: dedicated tests prevent cross-boundary imports
  between packages.
- **Live integration tests**: gateway multi-E2E tests, provider live tests,
  QA channel tests with disposable infrastructure.
- **Contract tests**: `src/plugins/config-contracts.test.ts`,
  `src/gateway/system-run-approval-binding.contract.test.ts`

The test-to-source ratio is healthy. Nearly every source file in `src/gateway/`
has a corresponding test file.

### 1.6 Mono-Repo Organization

pnpm workspaces with four categories:
- Root package (the gateway itself)
- `ui/` (web UI)
- `packages/*` (plugin-sdk, memory-host-sdk, plugin-package-contract)
- `extensions/*` (130+ channel/provider/capability extensions)

Each extension is a self-contained package. This is the right shape for a
plugin ecosystem --- extensions can be developed, tested, and published
independently.

---

## 2. Architecture Weaknesses

### 2.1 The Single-User Trust Assumption

OpenClaw is architecturally a **personal assistant**. The README says it plainly:
"a personal AI assistant you run on your own devices." This assumption is baked
deep into the codebase.

**Evidence: Operator scopes are coarse.** The entire scope model
(`src/gateway/operator-scopes.ts`) has exactly six scopes:

```typescript
operator.admin | operator.read | operator.write |
operator.approvals | operator.pairing | operator.talk.secrets
```

There is no per-user identity, no delegated authorization, no role hierarchy.
The CLI default is *all scopes* (`CLI_DEFAULT_OPERATOR_SCOPES`). Every connected
client is effectively the owner.

**Evidence: Auth is gateway-level, not request-level.** The `ResolvedGatewayAuth`
type (`src/gateway/auth.ts`) resolves to a single mode for the entire gateway:
`none | token | password | trusted-proxy`. There is no per-request identity
resolution beyond rate limiting.

### 2.2 Hook Failure Policy Defaults to Fail-Open

```typescript
// src/plugins/hooks.ts line 211-215
const shouldCatchHookErrors = (hookName: PluginHookName): boolean =>
  catchErrors && (failurePolicyByHook[hookName] ?? "fail-open") === "fail-open";
```

Every plugin hook defaults to **fail-open**. If a governance hook throws an
exception, the operation proceeds. For observability hooks this is correct.
For security-critical hooks like `before_tool_call`, this is a fundamental
problem --- a crashing governance plugin silently becomes no governance at all.

The `failurePolicyByHook` override exists but is opt-in and per-deployment.
No hook has a built-in fail-closed default.

### 2.3 Config Complexity: 38 Type Files, Infinite Surface

The config surface is enormous. A complete `OpenClawConfig` has 25+ top-level
keys, each with deeply nested sub-objects. The `ToolsConfig` type alone
(`src/config/types.tools.ts`) spans 649 lines covering tool profiles,
per-provider overrides, per-sender overrides, exec policy, filesystem guards,
loop detection, web search, media understanding, memory search with vector
stores, and experimental flags.

Legacy migration machinery (`src/config/legacy.ts`, `src/config/legacy.rules.ts`)
runs on every config load to detect deprecated patterns. The env var substitution
system (`src/config/config-env-vars.ts`) adds another layer of indirection.
Config includes add a third. The result is that the *effective* config at runtime
may differ significantly from what any single file contains.

### 2.4 No Per-Tool Risk Classification in Core

Despite the `DEFAULT_GATEWAY_HTTP_TOOL_DENY` list for HTTP surfaces, the core
has no systematic tool risk taxonomy. Tool policy is expressed as flat
allow/deny string lists:

```typescript
// src/config/types.tools.ts lines 182-193
export type ToolPolicyConfig = {
  allow?: string[];
  alsoAllow?: string[];
  deny?: string[];
  profile?: ToolProfileId;
};
```

The four profiles (`minimal | coding | messaging | full`) are preset bundles.
There is no per-invocation risk score, no parameter-sensitive classification,
no distinction between "read /tmp" and "read /etc/shadow" at the policy level.

The `before_tool_call` hook can provide this, but it is plugin-space, not
core-space. The core treats all allowed tools identically.

### 2.5 ACP Policy: Boolean Gates Without Trust Groups

The ACP (Agent Communication Protocol) policy system (`src/acp/policy.ts`) is
minimal:

```typescript
export function isAcpEnabledByPolicy(cfg: OpenClawConfig): boolean {
  return cfg.acp?.enabled !== false;
}
```

Agent-to-agent trust is a flat `allowedAgents` string array on the config.
There are no trust groups, no delegation chains, no on-behalf-of (OBO)
semantics. An agent is either allowed to participate in ACP or it is not.
There is no concept of *what* an agent can ask another agent to do.

### 2.6 Plugin Isolation: In-Process, Shared Event Loop

Plugins execute in the same Node.js process as the gateway. The plugin loader
(`src/plugins/loader.ts`) uses `jiti` for dynamic imports with an alias map
for SDK resolution. There is no process isolation, no memory budget per plugin,
no timeout enforcement on hook handlers.

A misbehaving plugin can:
- Block the event loop (sync hooks like `tool_result_persist` are explicitly sync)
- Leak memory without detection
- Corrupt shared state through the registry
- Crash the entire gateway with an uncaught exception

### 2.7 Gateway Size: 99K Lines in One Directory

The `src/gateway/` directory contains 99,054 lines of TypeScript. The server
implementation (`server.impl.ts`) imports from 40+ sibling modules. This is a
monolith within a monolith. Key concerns:

- The `server-methods/` subdirectory and `server-methods.ts` define the RPC
  surface. Method scope checking (`method-scopes.ts`) maps ~100 methods to
  six coarse scopes.
- Session management spans 20+ files (`session-*.ts`).
- The HTTP surface has multiple entry points (hooks HTTP, OpenAI-compatible HTTP,
  models HTTP, tools invoke HTTP, embeddings HTTP, MCP HTTP).

---

## 3. Technical Debt

### 3.1 Low TODO/FIXME Count (Surprising)

Only 32 TODO/FIXME/HACK occurrences across all of `src/`. This is unusually
clean for a ~280K line codebase. Either the team actively removes these or
they use a different tracking mechanism (likely GitHub issues, given the
~65000+ issue numbers in the changelog).

### 3.2 Legacy Name Migration

The `CLAWDBOT_` -> `OPENCLAW_` env var migration is still present in tests:

```
src/daemon/inspect.test.ts:48   CLAWDBOT_GATEWAY_CONTENTS
src/config/paths.test.ts:74     envWith({ CLAWDBOT_GATEWAY_PORT: "127.0.0.1:18789" })
```

These are test-only references, suggesting the migration is nearly complete but
backward-compat test cases remain.

### 3.3 Deprecation Surface

41 `@deprecated` annotations across 27 files. Notable:
- `src/config/types.tools.ts`: `allowCrossContextSend` deprecated in favor of
  `crossContext` sub-object (config evolution)
- `src/plugin-sdk/command-auth.ts`: 3 deprecations (SDK surface cleanup)
- `src/plugin-sdk/channel-inbound.ts`: 2 deprecations
- `src/config/types.messages.ts`: 2 deprecations

These are managed deprecations with replacement guidance, not abandoned code.

### 3.4 Caldate Versioning

Version scheme is `YYYY.M.DD` with optional beta/revision suffixes. The
`parseOpenClawVersion` function (`src/config/version.ts`) handles legacy
dot-beta formats. This scheme means every release is technically a "breaking"
version from a semver perspective. The changelog shows ~1 release per day
during active development (e.g., 2026.4.10, 2026.4.11-beta.1). This rapid
cadence, combined with the enormous config surface, means downstream
integrations must be resilient to frequent changes.

---

## 4. The Trust Model Gap

### 4.1 Permission Path: Config to Execution

The permission path for tool execution follows this chain:

1. **Config load**: `OpenClawConfig.tools` defines global tool policy
   (allow/deny/profile), per-provider overrides, per-agent overrides,
   and per-sender group overrides.

2. **Tool resolution** (`src/gateway/tool-resolution.ts`):
   `resolveGatewayScopedTools()` builds a tool set by layering:
   - Profile policy (preset bundle)
   - Provider-specific policy
   - Global allow/deny
   - Agent-level allow/deny
   - Group policy (per-sender)
   - Subagent policy
   - Gateway HTTP deny list (surface-specific)

3. **Policy pipeline** (`src/agents/tool-policy-pipeline.ts`):
   `applyToolPolicyPipeline()` applies the layered policies sequentially.
   Deny wins over allow at each layer.

4. **Hook execution**: `before_tool_call` runs sequentially through registered
   plugins. First `block=true` stops the chain. First `requireApproval` wins
   (subsequent plugins cannot override it).

5. **Approval flow**: If `requireApproval` is set, the gateway routes to the
   exec approval manager. Approval resolution comes from operator clients
   with `operator.approvals` scope.

6. **Execution**: If not blocked, the tool runs.

### 4.2 Missing Gates

**No A2A (Agent-to-Agent) trust boundary.** The `acp.allowedAgents` config is
a flat list. There is no concept of trust transitivity, delegation scope, or
capability attestation between agents. Agent A spawning Agent B spawning Agent C
has no trust chain --- if C is in `allowedAgents`, it can do whatever its tool
policy allows.

**No OBO (On-Behalf-Of) semantics.** When a subagent executes a tool, the
`PluginHookToolContext` carries `agentId` and `sessionKey` but no
"requested-by" identity. The governance hook sees which agent is calling
but not who initiated the chain.

**No per-tool parameter classification.** The `before_tool_call` event passes
`toolName` and `params` (the full parameter object). But there is no core
classification of what parameter values mean for risk. `exec` with
`command: "ls"` and `exec` with `command: "rm -rf /"` look identical to the
policy engine --- both are either allowed or denied as `exec`.

**No crash recovery for governance decisions.** If the gateway process crashes
between a governance decision and the tool execution, there is no record of
the decision. No WAL, no audit log of in-flight decisions, no replay mechanism.

### 4.3 What Would Need to Change for claws Hooks

The Gateway needs no structural changes for basic claws integration. The
`before_tool_call` hook is the correct insertion point. However:

1. **Fail-closed default for governance hooks**: The hook runner must support
   a per-registration failure policy, not just per-deployment. claws's
   `before_tool_call` handler must be fail-closed by default.

2. **Subagent context propagation**: The `PluginHookSubagentContext` carries
   `childSessionKey` and `requesterSessionKey`, but the tool hooks do not
   carry the requester chain. claws needs the full delegation path.

3. **Approval callback lifecycle**: The `onResolution` callback in
   `requireApproval` is fire-and-forget. claws needs acknowledged delivery
   (the decision must be durably recorded before execution proceeds).

---

## 5. Where claws Strengthens the Runtime

### 5.1 Per-Tool Risk Classification (R1-R5)

**Weakness**: OpenClaw's tool policy is binary (allowed or denied) with no
risk gradient.

**claws**: The FormaIR compiler classifies every tool invocation into risk
levels R1-R5 based on tool name, parameter patterns, and session context.
Via `before_tool_call`, claws intercepts every tool call, evaluates it against
compiled policy, and returns `block`, `requireApproval` with calibrated
severity, or modified params --- all through the existing hook contract.

### 5.2 A2A Trust Groups via Gateway Plugin

**Weakness**: ACP has boolean agent allow/deny with no trust groups or
delegation semantics.

**claws**: A claws Gateway plugin registers `subagent_spawning` and
`before_tool_call` hooks. It maintains a trust graph where agents belong to
trust groups with scoped capabilities. When Agent A spawns Agent B, claws
validates the delegation against the trust group policy. When Agent B calls
a tool, claws traces the full requester chain and applies the most
restrictive policy in the chain.

### 5.3 WAL-Backed Governance Decisions

**Weakness**: No crash recovery for in-flight governance decisions.

**claws**: Every governance decision (allow, deny, escalate) is written to a
write-ahead log before the tool proceeds. On gateway restart, the WAL is
replayed to reconstruct the audit trail. This gives claws crash-consistent
governance without depending on the gateway's own persistence.

### 5.4 Fail-Closed Hook Semantics

**Weakness**: All hooks default to fail-open.

**claws**: When claws registers its `before_tool_call` handler, it requests
fail-closed semantics. If claws crashes or times out, the tool call is
**blocked**, not allowed. This inverts the default for security-critical hooks.

Implementation note: claws cannot currently force fail-closed registration
through the plugin SDK. It must either:
- Contribute a `failurePolicy` field to `PluginHookRegistration` (preferred)
- Implement its own catch-and-rethrow wrapper that converts fail-open to
  fail-closed at the handler level (workaround)

### 5.5 Audit Chain with SIEM Integration

**Weakness**: OpenClaw's security audit is point-in-time (config analysis).
There is no runtime decision audit trail.

**claws**: Every `before_tool_call` decision, every approval resolution, every
blocked invocation is recorded in the audit chain with structured fields
(timestamp, agent, tool, risk level, decision, requester chain). The chain
exports to SIEM systems for enterprise compliance.

### 5.6 Policy Compilation vs. Runtime Interpretation

**Weakness**: OpenClaw's tool policy is interpreted at runtime from layered
config objects. Every tool call re-evaluates the full policy pipeline.

**claws**: Policies are compiled to FormaIR at deploy time. The runtime
evaluates a pre-compiled decision tree, not a config object. This is both
faster (no layered resolution per call) and safer (the compiled policy is
immutable and auditable).

---

## 6. Integration Risk Assessment

### 6.1 What Could Break claws's Integration

**Hook registration timing.** Plugins are loaded during gateway startup
(`src/plugins/loader.ts`). The load order affects hook priority. If claws's
plugin loads late, lower-priority hooks run first and may modify params before
claws sees them. claws must register with high priority to evaluate original
params.

**Hook runner internals.** The `createHookRunner` function
(`src/plugins/hooks.ts` line 206) is not exported as a public SDK type. The
hook runner is an internal gateway object. If the runner's merge semantics
change (e.g., how `before_tool_call` results accumulate), claws's assumptions
about `block` stickiness and `requireApproval` first-wins behavior could break.

**Config reload.** The gateway supports hot config reload (`src/gateway/
config-reload.ts`). If tool policy changes at runtime, claws must detect the
reload and recompile its policy. The `gateway_start` / `gateway_stop` hooks
do not fire on reload --- only on full restart.

**Version churn.** The caldate versioning with daily releases means the internal
API surface shifts frequently. The changelog shows ~20 changes per release.
Even "fix" entries often involve structural refactoring (e.g., "split startup
and runtime seams").

### 6.2 What claws Should AVOID Depending On

**Internal gateway module imports.** Never import from `src/gateway/server-*.ts`
directly. These files restructure frequently (the changelog explicitly mentions
"split startup and runtime seams" as a maintenance change).

**Hook runner merge implementation details.** The `mergeResults` callbacks
in `hooks.ts` (lines 787-809 for `before_tool_call`) are internal. Depend on
the documented `PluginHookBeforeToolCallResult` contract, not the merge order.

**Method scope internals.** The `METHOD_SCOPE_GROUPS` mapping
(`src/gateway/method-scopes.ts`) is an internal routing table. claws should
use operator scope checks through the plugin SDK, not by importing this file.

**Config type internal structure.** The 38 `types.*.ts` files have internal
cross-references. Depend on `OpenClawConfig` from the SDK export, not on
individual type files.

**Session file format.** Session persistence uses JSONL transcript files
(`src/gateway/session-transcript-*.ts`). The format, key scheme, and archive
behavior change across versions.

### 6.3 Minimum OC Version Target

**Recommendation: 2026.4.10 or later.**

Rationale:
- `before_tool_call` hook with `requireApproval` + `onResolution` callback
  is stable since at least 2026.3.x.
- `subagent_spawning` / `subagent_ended` hooks are present in the analyzed
  version.
- ACP policy system is present and stable.
- The `before_install` hook (needed for plugin supply-chain governance) is
  present in the current hook list.

claws should declare a `minHostVersion` in its plugin manifest (the
`min-host-version.ts` module in the plugin system supports this). Target
`2026.4.10` as the floor, with degraded functionality notes for older versions.

### 6.4 Stable Integration Surfaces

These surfaces are safe to depend on:

| Surface | Location | Stability |
|---------|----------|-----------|
| `PluginHookHandlerMap` | `src/plugins/hook-types.ts` | High (public SDK) |
| `PluginHookBeforeToolCallResult` | `src/plugins/hook-types.ts` | High |
| `PluginHookRegistration` | `src/plugins/hook-types.ts` | High |
| `OpenClawConfig` | `src/plugin-sdk/index.ts` | High (re-exported) |
| `OpenClawPluginApi` | `src/plugins/types.ts` | High (SDK contract) |
| `PluginRuntime` | `src/plugins/runtime/types.ts` | Medium-High |
| Plugin manifest format | `src/plugins/manifest-types.ts` | Medium |

---

## Summary Assessment

OpenClaw is an impressive codebase with strong engineering fundamentals:
comprehensive hook system, deep type safety, serious security audit
infrastructure, and healthy test culture. The architecture is well-suited for
its intended use case (single-user personal assistant).

The governance gaps are not bugs --- they are design choices that follow from
the single-user trust model. OpenClaw correctly does not build enterprise
governance because it is not an enterprise product. The `before_tool_call` hook
exists because *individual users* want approval flows, not because the system
contemplates organizational policy.

claws's opportunity is to layer enterprise governance onto a runtime that is
already well-instrumented for it. The hook system is the right integration
point. The risks are API stability (daily releases, internal restructuring)
and the fail-open default (which claws must actively counteract). The
recommendation is to depend only on the plugin SDK's public surface, register
hooks with high priority and fail-closed semantics, and maintain version
floor enforcement through the manifest system.
