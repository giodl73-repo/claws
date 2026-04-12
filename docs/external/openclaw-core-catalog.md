# OpenClaw Core Catalog

Authoritative reference for claws CL-03 runtime integration.
Source: `C:\src\openclaw-core` (commit snapshot 2026-04-11).

---

## 1. Gateway Architecture

### Entry Point

The gateway starts via `src/gateway/server.ts` which lazy-loads `server.impl.ts`.

```ts
// src/gateway/server.ts
export async function startGatewayServer(...): ReturnType<...> {
  const mod = await import("./server.impl.js");
  return await mod.startGatewayServer(...args);
}
```

### Boot Sequence (server.impl.ts)

1. Load config via `loadConfig()` + `applyConfigOverrides()`
2. Resolve gateway auth (`resolveGatewayAuth`)
3. Create plugin runtime (`createPluginRuntime`)
4. Prepare plugin bootstrap (`prepareGatewayPluginBootstrap`)
5. Start early runtime services (`startGatewayEarlyRuntime`)
6. Load model catalog (`loadGatewayModelCatalog`)
7. Create channel manager (`createChannelManager`)
8. Build cron service (`buildGatewayCronService`)
9. Start runtime subscriptions (`startGatewayEventSubscriptions`)
10. Attach WebSocket handlers (`attachGatewayWsHandlers`)
11. Start post-attach runtime (`startGatewayPostAttachRuntime`)
12. Fire `gateway_start` plugin hook

### BOOT.md

`src/gateway/boot.ts` supports a workspace `BOOT.md` file that runs an agent session on gateway start. The content is treated as a prompt; the agent can use message tools to send notifications.

### Key Files

| File | Purpose |
|------|---------|
| `src/gateway/server.ts` | Lazy entry, exports `startGatewayServer` |
| `src/gateway/server.impl.ts` | Full boot implementation (~100 imports) |
| `src/gateway/boot.ts` | BOOT.md one-shot agent run on startup |
| `src/gateway/server-startup.ts` | Early + post-attach startup phases |
| `src/gateway/server-startup-plugins.ts` | Plugin bootstrap during startup |
| `src/gateway/server-runtime-services.ts` | Long-running service lifecycle |
| `src/gateway/server-close.ts` | Graceful shutdown |

### claws Relevance

The gateway is the primary runtime target. claws hooks must register before `gateway_start` fires. The startup sequence is ordered but modular -- plugin bootstrap happens at step 3-4, meaning hooks registered in `register()` or `activate()` are live before channels and cron start.

---

## 2. Hook API (Gateway HTTP Hooks)

These are **external webhook endpoints** exposed by the gateway, distinct from plugin lifecycle hooks (Section 3).

### Configuration

```json
{
  "hooks": {
    "enabled": true,
    "token": "secret-bearer-token",
    "path": "/hooks",
    "maxBodyBytes": 262144,
    "allowRequestSessionKey": false,
    "allowedSessionKeyPrefixes": ["hook:"],
    "allowedAgentIds": ["main", "ops"],
    "presets": ["gmail"],
    "mappings": [
      {
        "id": "custom-webhook",
        "match": { "path": "deploy", "source": "github" },
        "action": "agent",
        "messageTemplate": "Deploy event: {{payload.repository}}",
        "agentId": "ops",
        "sessionKey": "hook:deploy:{{payload.delivery}}"
      }
    ]
  }
}
```

### Key Types (`src/gateway/hooks.ts`, `hooks-mapping.ts`)

```ts
type HookAction =
  | { kind: "wake"; text: string; mode: "now" | "next-heartbeat" }
  | { kind: "agent"; message: string; name?: string; agentId?: string;
      wakeMode: "now" | "next-heartbeat"; sessionKey?: string;
      deliver?: boolean; channel?: HookMessageChannel; ... };

type HookMappingTransformResolved = {
  modulePath: string;   // Must be within ~/.openclaw/hooks/transforms/
  exportName?: string;  // Default: "default" or "transform"
};

// Transform function signature:
type HookTransformFn = (ctx: HookMappingContext) => HookTransformResult | Promise<HookTransformResult>;
```

### Template Engine

Mappings support `{{ expr }}` templates resolving `payload.*`, `headers.*`, `query.*`, `path`, and `now`. Array indexing: `messages[0].from`. Prototype chain keys (`__proto__`, `constructor`) are blocked.

### Authentication

Hooks require bearer token via `Authorization: Bearer <token>` or `X-OpenClaw-Token` header. The token is configured in `hooks.token`.

### claws Relevance

Gateway hooks are the primary external integration surface for webhook-driven governance events (CI/CD, SIEM forward). claws would use the `agent` action kind to inject governance commands into specific agent sessions.

---

## 3. Plugin System

### Plugin Definition

```ts
// src/plugins/types.ts
type OpenClawPluginDefinition = {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  kind?: PluginKind | PluginKind[];  // "memory" | "context-engine"
  configSchema?: OpenClawPluginConfigSchema;
  register?: (api: OpenClawPluginApi) => void | Promise<void>;
  activate?: (api: OpenClawPluginApi) => void | Promise<void>;
};

type OpenClawPluginModule =
  | OpenClawPluginDefinition
  | ((api: OpenClawPluginApi) => void | Promise<void>);
```

### Plugin API (`OpenClawPluginApi`)

The `api` object passed to `register()` and `activate()` exposes:

| Method | Purpose |
|--------|---------|
| `api.registerTool(tool, opts?)` | Register an agent tool |
| `api.registerHook(events, handler, opts?)` | Register internal event hooks |
| `api.on(hookName, handler, opts?)` | Register lifecycle hook (typed) |
| `api.registerHttpRoute(params)` | Register HTTP endpoint on gateway |
| `api.registerGatewayMethod(method, handler, opts?)` | Register gateway RPC method |
| `api.registerChannel(registration)` | Register messaging channel |
| `api.registerCli(registrar, opts?)` | Register CLI commands |
| `api.registerProvider(provider)` | Register LLM provider |
| `api.registerCommand(command)` | Register bypass command |
| `api.registerConfigMigration(fn)` | Register config migration |
| `api.registerSecurityAuditCollector(collector)` | Register security audit collector |
| `api.registerService(service)` | Register long-running service |
| `api.registerMemoryCapability(capability)` | Register memory plugin |
| `api.registerContextEngine(id, factory)` | Register context engine |
| `api.registerCompactionProvider(provider)` | Register compaction backend |

### Lifecycle Hooks (28 hooks)

```ts
type PluginHookName =
  | "before_model_resolve" | "before_prompt_build" | "before_agent_start"
  | "before_agent_reply" | "llm_input" | "llm_output" | "agent_end"
  | "before_compaction" | "after_compaction" | "before_reset"
  | "inbound_claim" | "message_received" | "message_sending" | "message_sent"
  | "before_tool_call" | "after_tool_call" | "tool_result_persist"
  | "before_message_write"
  | "session_start" | "session_end"
  | "subagent_spawning" | "subagent_delivery_target" | "subagent_spawned" | "subagent_ended"
  | "gateway_start" | "gateway_stop"
  | "before_dispatch" | "reply_dispatch" | "before_install";
```

### before_tool_call (critical for claws)

```ts
type PluginHookBeforeToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
  runId?: string;
  toolCallId?: string;
};

type PluginHookBeforeToolCallResult = {
  params?: Record<string, unknown>;    // Modify params
  block?: boolean;                      // Block execution
  blockReason?: string;                 // Reason shown to agent
  requireApproval?: {                   // Request human approval
    title: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    timeoutMs?: number;
    timeoutBehavior?: "allow" | "deny";
    pluginId?: string;
    onResolution?: (decision: PluginApprovalResolution) => Promise<void> | void;
  };
};

type PluginApprovalResolution = "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled";
```

### after_tool_call

```ts
type PluginHookAfterToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
  runId?: string;
  toolCallId?: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
};
// Return type: void (observation only)
```

### Hook Context

```ts
type PluginHookToolContext = {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  toolName: string;
  toolCallId?: string;
};
```

### Hook Runner Configuration

```ts
type HookFailurePolicy = "fail-open" | "fail-closed";
type HookRunnerOptions = {
  catchErrors?: boolean;
  failurePolicyByHook?: Partial<Record<PluginHookName, HookFailurePolicy>>;
};
```

### Plugin Configuration

```json
{
  "plugins": {
    "enabled": true,
    "allow": ["plugin-a"],
    "deny": ["plugin-b"],
    "load": { "paths": ["/extra/plugins"] },
    "slots": { "memory": "memory-core", "contextEngine": "legacy" },
    "entries": {
      "my-plugin": {
        "enabled": true,
        "hooks": { "allowPromptInjection": false },
        "config": { "key": "value" }
      }
    }
  }
}
```

### Slot System

Only two exclusive slots exist: `memory` and `contextEngine`. The `PluginKind` type is `"memory" | "context-engine"`. When a plugin claims a slot, other plugins with the same kind are automatically disabled.

### Plugin Loading (`src/plugins/loader.ts`)

Plugins are discovered via `discoverOpenClawPlugins()`, loaded via `jiti` (JIT TypeScript compilation), and registered through the `OpenClawPluginApi`. Bundled plugins, npm packages, and local directory plugins are all supported. The loader validates path containment (no symlink escapes).

### claws Relevance

claws would register as an `OpenClawPluginDefinition` with hooks on `before_tool_call`, `after_tool_call`, `before_agent_start`, `session_start`, `session_end`, and `gateway_start`. The `requireApproval` return from `before_tool_call` is the native approval mechanism. The `block` + `blockReason` pattern is the deny mechanism.

---

## 4. Exec Approvals

### File: `~/.openclaw/exec-approvals.json`

```ts
// src/infra/exec-approvals.ts
type ExecApprovalsFile = {
  version: 1;
  socket?: { path?: string; token?: string };
  defaults?: ExecApprovalsDefaults;
  agents?: Record<string, ExecApprovalsAgent>;
};

type ExecApprovalsDefaults = {
  security?: "deny" | "allowlist" | "full";
  ask?: "off" | "on-miss" | "always";
  askFallback?: "deny" | "allowlist" | "full";
  autoAllowSkills?: boolean;
};

type ExecApprovalsAgent = ExecApprovalsDefaults & {
  allowlist?: ExecAllowlistEntry[];
};
```

### Approval Decisions

```ts
type ExecApprovalDecision = "allow-once" | "allow-always" | "deny";
```

### Approval Manager (`src/gateway/exec-approval-manager.ts`)

- `create(request, timeoutMs)` -- create approval record
- `register(record, timeoutMs)` -- register and return decision promise
- `resolve(recordId, decision, resolvedBy?)` -- resolve pending approval
- `expire(recordId)` -- timeout expiry
- `consumeAllowOnce(recordId)` -- atomic one-time consume
- `listPendingRecords()` -- list all pending

### Approval Request Payload

```ts
type ExecApprovalRequestPayload = {
  command: string;
  commandPreview?: string | null;
  commandArgv?: string[];
  envKeys?: string[];
  systemRunBinding?: SystemRunApprovalBinding | null;
  systemRunPlan?: SystemRunApprovalPlan | null;
  cwd?: string | null;
  nodeId?: string | null;
  host?: string | null;
  security?: string | null;
  ask?: string | null;
  allowedDecisions?: readonly ExecApprovalDecision[];
  agentId?: string | null;
  sessionKey?: string | null;
};
```

### Forwarding (`src/config/types.approvals.ts`)

```ts
type ExecApprovalForwardingConfig = {
  enabled?: boolean;
  mode?: "session" | "targets" | "both";
  agentFilter?: string[];
  sessionFilter?: string[];
  targets?: ExecApprovalForwardTarget[];
};
```

### System Run Approval Guard

`src/gateway/node-invoke-system-run-approval.ts` validates:
1. runId exists and matches a registered approval
2. Approval has not expired
3. Node ID matches the approval's bound node
4. Device/client identity matches the requester
5. Command argv matches the approval's system run plan

### Config (`tools.exec`)

```json
{
  "tools": {
    "exec": {
      "host": "auto",
      "security": "allowlist",
      "ask": "on-miss",
      "safeBins": ["git", "npm"],
      "strictInlineEval": true,
      "backgroundMs": 5000,
      "timeoutSec": 300
    }
  }
}
```

### claws Relevance

Exec approvals are the primary enforcement point for command execution governance. claws can intercept via `before_tool_call` on the `exec`/`bash`/`shell` tool names and either block, modify params, or inject `requireApproval`. The existing allowlist + ask system is per-agent, which aligns with claws's agent-scoped policy model. Gap: no policy IR evaluation exists today -- claws adds this.

---

## 5. Skill Format

### SKILL.md Schema

Skills are markdown files in skill directories. The format uses YAML frontmatter:

```yaml
---
name: my-skill
description: Does something useful
user-invocable: true
disable-model-invocation: false
openclaw:
  always: false
  skillKey: my-skill
  primaryEnv: MY_API_KEY
  emoji: "🔧"
  os: [darwin, linux]
  requires:
    bins: [git]
    env: [MY_API_KEY]
  install:
    - kind: node
      package: my-tool
      bins: [my-tool]
---
# Skill content (instructions for the agent)
```

### Key Types (`src/agents/skills/types.ts`)

```ts
type Skill = {
  name: string;
  description: string;
  filePath: string;
  source?: string;
};

type SkillEntry = {
  skill: Skill;
  frontmatter: Record<string, string>;
  metadata?: OpenClawSkillMetadata;
  invocation?: SkillInvocationPolicy;
  exposure?: SkillExposure;
};

type SkillSnapshot = {
  prompt: string;        // XML-formatted skill list for system prompt
  skills: Array<{ name: string; primaryEnv?: string }>;
  resolvedSkills?: Skill[];
};
```

### Skill Loading

Skills are loaded from multiple sources (bundled, managed, workspace, extra dirs) via `src/agents/skills/` modules. The `local-loader.ts` scans directories for `SKILL.md` files, parses frontmatter, validates metadata, and builds `SkillEntry` records.

### System Prompt Integration

Skills are formatted as XML and injected into the system prompt:
```xml
<available_skills>
  <skill>
    <name>my-skill</name>
    <description>Does something useful</description>
    <location>/path/to/SKILL.md</location>
  </skill>
</available_skills>
```

### Config

```json
{
  "skills": {
    "allowBundled": ["lobster"],
    "load": { "extraDirs": ["/my/skills"], "watch": true },
    "limits": { "maxSkillsInPrompt": 50, "maxSkillFileBytes": 65536 },
    "entries": {
      "my-skill": { "enabled": true, "env": { "MY_KEY": "value" } }
    }
  }
}
```

### claws Relevance

claws governance policies could be delivered as skills, but skills are read-only prompts -- no `execute()` method exists. Skills cannot intercept or block actions. They influence agent behavior through system prompt instructions only. For enforcement, claws must use plugin hooks, not skills.

---

## 6. Workspace Files

### Bootstrap Files (`src/agents/workspace.ts`)

| File | Constant | Purpose |
|------|----------|---------|
| `AGENTS.md` | `DEFAULT_AGENTS_FILENAME` | Multi-agent definitions |
| `SOUL.md` | `DEFAULT_SOUL_FILENAME` | Core personality/identity |
| `TOOLS.md` | `DEFAULT_TOOLS_FILENAME` | Tool usage guidelines |
| `IDENTITY.md` | `DEFAULT_IDENTITY_FILENAME` | Agent identity spec |
| `USER.md` | `DEFAULT_USER_FILENAME` | User preferences |
| `HEARTBEAT.md` | `DEFAULT_HEARTBEAT_FILENAME` | Periodic heartbeat prompt |
| `BOOTSTRAP.md` | `DEFAULT_BOOTSTRAP_FILENAME` | Initial bootstrap instructions |
| `MEMORY.md` / `memory.md` | `DEFAULT_MEMORY_FILENAME` | Persistent memory |

### Loading

Files are read via `readWorkspaceFileWithGuards()` which:
1. Opens files via `openBoundaryFile()` (validates path is within workspace root)
2. Enforces max 2MB per file
3. Caches by inode/dev/size/mtime identity
4. Strips YAML frontmatter before content injection

### Workspace Directory

Default: `~/.openclaw/workspace` (or `~/.openclaw/workspace-{profile}` with `OPENCLAW_PROFILE`).

### claws Relevance

claws could inject governance context via `SOUL.md` or `TOOLS.md` content, but this is prompt-level only (soft governance). For hard enforcement, plugin hooks are required. The `before_prompt_build` hook allows programmatic prompt injection without modifying workspace files.

---

## 7. ACP (Agent Communication Protocol)

### Implementation

ACP is implemented via the `@agentclientprotocol/sdk` package. The server lives in `src/acp/server.ts`.

```ts
// src/acp/types.ts
type AcpSession = {
  sessionId: SessionId;
  sessionKey: string;
  cwd: string;
  createdAt: number;
  lastTouchedAt: number;
  abortController: AbortController | null;
  activeRunId: string | null;
};

type AcpServerOptions = {
  gatewayUrl?: string;
  gatewayToken?: string;
  defaultSessionKey?: string;
  provenanceMode?: "off" | "meta" | "meta+receipt";
  verbose?: boolean;
};
```

### Approval Classifier (`src/acp/approval-classifier.ts`)

ACP tool calls are classified for auto-approval:

```ts
type AcpApprovalClass =
  | "readonly_scoped"    // Read, Glob, etc.
  | "readonly_search"    // search, web_search, memory_search
  | "mutating"           // Write, Edit, etc.
  | "exec_capable"       // exec, spawn, shell, bash
  | "control_plane"      // sessions_spawn, sessions_send
  | "interactive"
  | "other"
  | "unknown";
```

### Connection Model

ACP server (`serveAcpGateway`) creates a `GatewayClient` WebSocket connection, wraps it in an `AcpGatewayAgent` translator, and exposes stdio-based `AgentSideConnection` for child agents. The `@agentclientprotocol/sdk` handles NDJSON protocol framing.

### Config

```json
{
  "acp": {
    "enabled": true,
    "backend": "acpx",
    "defaultAgent": "claude",
    "allowedAgents": ["claude", "codex"],
    "maxConcurrentSessions": 5,
    "stream": { "deliveryMode": "live", "maxOutputChars": 10000 }
  }
}
```

### Trust Boundaries

**Gap**: ACP has no trust model between agents. The approval classifier auto-approves readonly tools and prompts for others, but there is no identity verification, capability attestation, or policy-based trust between agent identities. The `provenanceMode` field supports `"meta"` and `"meta+receipt"` but these are observability features, not enforcement boundaries.

### claws Relevance

ACP is the inter-agent communication layer. claws governance policies should intercept ACP interactions via `subagent_spawning`, `subagent_spawned`, and `subagent_ended` hooks. The lack of trust boundaries is a key gap that claws's policy IR can fill.

---

## 8. Configuration

### Config File: `openclaw.json`

Located at `~/.openclaw/openclaw.json`. Loaded via `loadConfig()` in `src/config/config.ts`.

### Top-Level Schema (`src/config/types.openclaw.ts`)

```ts
type OpenClawConfig = {
  meta?: { lastTouchedVersion?: string; lastTouchedAt?: string };
  auth?: AuthConfig;
  acp?: AcpConfig;
  env?: { shellEnv?: { enabled?: boolean }; vars?: Record<string, string> };
  skills?: SkillsConfig;
  plugins?: PluginsConfig;
  models?: ModelsConfig;
  agents?: AgentsConfig;
  tools?: ToolsConfig;
  approvals?: ApprovalsConfig;
  hooks?: HooksConfig;
  channels?: ChannelsConfig;
  cron?: CronConfig;
  session?: SessionConfig;
  gateway?: GatewayConfig;
  secrets?: SecretsConfig;
  // ... 20+ additional sections
};
```

### Governance-Relevant Keys

| Key | Type | Purpose |
|-----|------|---------|
| `tools.exec.security` | `"deny" \| "allowlist" \| "full"` | Exec security mode |
| `tools.exec.ask` | `"off" \| "on-miss" \| "always"` | Approval ask mode |
| `tools.exec.safeBins` | `string[]` | Stdin-only safe binaries |
| `tools.allow` / `tools.deny` | `string[]` | Tool allowlist/denylist |
| `tools.exec.strictInlineEval` | `boolean` | Block `python -c` etc. |
| `plugins.entries.*.hooks.allowPromptInjection` | `boolean` | Gate prompt mutation |
| `agents.*.tools` | `AgentToolsConfig` | Per-agent tool policy |
| `approvals.exec` | `ExecApprovalForwardingConfig` | Approval forwarding |
| `hooks.allowedAgentIds` | `string[]` | Restrict hook agent routing |

### Config Schema

The JSON schema is generated in `src/config/schema.base.generated.ts` and extended at runtime with plugin contributions. Validation uses both Zod schemas (`src/config/zod-schema.*.ts`) and the generated JSON schema.

### Config Doctor

`src/flows/doctor-health.ts` provides health checks and config migration. Plugins can register config migrations via `registerConfigMigration()`.

### claws Relevance

claws governance config would live under a dedicated key (e.g., `governance` or `claws`) in openclaw.json. Config migrations ensure forward compatibility. The existing per-agent tool policy (`agents.*.tools`) provides the precedent for agent-scoped governance.

---

## 9. Lobster Workflows

### Extension: `extensions/lobster/`

Lobster is a workflow engine for deterministic multi-step pipelines with approval checkpoints.

### Pipeline Syntax

```
gog.gmail.search --query 'newer_than:1d' --max 20 | email.triage | approve --prompt 'Process?'
```

### Runner Types (`extensions/lobster/src/lobster-runner.ts`)

```ts
type LobsterRunnerParams = {
  action: "run" | "resume";
  pipeline?: string;
  argsJson?: string;
  token?: string;        // Resume token
  approve?: boolean;     // Approve pending action
  cwd: string;
  timeoutMs: number;
  maxStdoutBytes: number;
};

type LobsterEnvelope =
  | { ok: true; status: "ok" | "needs_approval" | "cancelled";
      output: unknown[];
      requiresApproval: null | { prompt: string; items: unknown[]; resumeToken?: string } }
  | { ok: false; error: { type?: string; message: string } };
```

### Embedded Runtime

Lobster uses an `EmbeddedToolRuntime` that provides `runToolRequest()` and `resumeToolRequest()`. The runtime creates a default registry and parses pipelines into step arrays.

### TaskFlow Integration

`lobster-taskflow.ts` provides managed flow state with `runManagedLobsterFlow()` and `resumeManagedLobsterFlow()`, tracking flow state, revisions, and controller IDs.

### claws Relevance

Lobster pipelines are deterministic (no LLM in the loop), so governance applies to the pipeline composition and approval gates. claws could intercept Lobster tool calls via `before_tool_call` on the `lobster` tool name, inspect the pipeline string, and enforce policy on which pipeline steps are allowed.

---

## 10. Security Model

### Gateway Auth (`src/gateway/auth.ts`)

```ts
type ResolvedGatewayAuthMode = "none" | "token" | "password" | "trusted-proxy";

type GatewayAuthResult = {
  ok: boolean;
  method?: "none" | "token" | "password" | "tailscale" | "device-token"
           | "bootstrap-token" | "trusted-proxy";
  user?: string;
  rateLimited?: boolean;
};
```

Auth supports: bearer token, password, Tailscale identity (whois), device tokens, bootstrap tokens, and trusted proxy headers. Rate limiting is built into the auth layer.

### Security Audit (`src/security/audit.ts`)

```ts
type SecurityAuditFinding = {
  checkId: string;
  severity: "info" | "warn" | "critical";
  title: string;
  detail: string;
  remediation?: string;
};

type SecurityAuditReport = {
  ts: number;
  summary: { critical: number; warn: number; info: number };
  findings: SecurityAuditFinding[];
  deep?: { gateway?: { attempted: boolean; url: string | null; ok: boolean } };
};
```

Audit checks include: config permissions, exec policy, sandbox config, plugin trust, gateway exposure, auth selection, channel security, model hygiene, and workspace skill escape.

### DM Policy

Channel-level DM policies control who can message agents. Per-channel, per-account, and per-sender granularity via `tools.bySender` and `group.policy` configs.

### Plugin Security

- `plugins.entries.*.hooks.allowPromptInjection` gates prompt mutation
- `before_install` hook enables pre-install security scanning with findings
- Plugin path containment prevents symlink escapes
- Plugin code safety scanning (deep audit mode)

### Operator Scopes

Gateway methods are scoped: `operator.admin`, `operator.approvals`, `operator.write`. Plugins registering gateway methods get their scope normalized.

### Gaps

1. **No mTLS between services** -- gateway auth is token/password only
2. **No plugin sandboxing** -- native plugins run in-process with full access
3. **No policy IR evaluation** -- exec approvals are allowlist-based, no rule engine
4. **No ACP trust boundaries** -- agents cannot verify peer identity
5. **No audit log persistence** -- security audit is point-in-time, not streaming

### claws Relevance

claws fills gaps 3 and 4. The existing security audit system provides the finding format that claws should emit. Plugin security gates (`before_install`, `allowPromptInjection`) show the precedent for governance enforcement at registration time.

---

## Summary: claws Integration Points

| claws Concern | OpenClaw Surface | Hook/API |
|--------------|------------------|----------|
| Tool call governance | Plugin hooks | `before_tool_call` (block/approve/modify) |
| Tool call audit | Plugin hooks | `after_tool_call` (observe) |
| Exec command policy | Exec approvals + hooks | `before_tool_call` on exec tools |
| Agent spawn policy | Plugin hooks | `subagent_spawning` (block/allow) |
| Session governance | Plugin hooks | `session_start`, `session_end` |
| Prompt injection | Plugin hooks | `before_prompt_build`, `before_agent_start` |
| LLM observability | Plugin hooks | `llm_input`, `llm_output` |
| Config governance | Plugin registration | `registerConfigMigration` |
| Security findings | Plugin registration | `registerSecurityAuditCollector` |
| Gateway methods | Plugin registration | `registerGatewayMethod` |
| Workflow policy | Plugin hooks | `before_tool_call` on lobster |

### Plugin Registration Pattern for claws

```ts
const clawsPlugin: OpenClawPluginDefinition = {
  id: "claws",
  name: "claws Governance Engine",
  version: "1.0.0",
  register: (api) => {
    api.on("before_tool_call", async (event, ctx) => {
      // Evaluate policy IR against event + ctx
      // Return { block, blockReason } or { requireApproval }
    });
    api.on("after_tool_call", async (event, ctx) => {
      // Audit chain write
    });
    api.on("gateway_start", async () => {
      // Initialize policy engine
    });
    api.registerSecurityAuditCollector({ ... });
    api.registerGatewayMethod("claws.policy.evaluate", handler);
  },
};
```
