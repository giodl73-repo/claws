# exp-a: GovernanceHost Interface Design

**Question**: Q12r -- How does claws map to OC Gateway runtime contracts?
**Experiment**: Design the GovernanceHost interface that OC Gateway (and other platforms) must implement for claws-generated skills to enforce governance at runtime.
**Method**: Design analysis (read actual ExecHost, GovernanceManager, tension, delegation, and gate-resolution source)
**Date**: 2026-04-11
**Result**: 6-facet GovernanceHost interface, OC Gateway mapping for all 6 facets, 3 alternative platform sketches, lifecycle protocol.

---

## Design Approach

The existing agent-sdk has runtime contracts scattered across several modules:

| Module | Contract | What it enforces |
|--------|----------|-----------------|
| `govern/index.ts` | GovernanceManager | Budget enforcement, signal rate limiting, expansion depth, workspace state |
| `govern/cgr-chain.ts` | CGR append/verify | Hash-chained audit trail |
| `govern/policy-walker.ts` | PolicyWalker | Hierarchical policy merge (most-restrictive-wins) |
| `govern/client.ts` | GovernClient | Check, budget, scan, assess, comply, monitor, kill |
| `runtime/gate-resolution.ts` | resolveGate | Multi-reviewer pairwise reduction with tension negotiation |
| `runtime/tension-negotiation.ts` | negotiateTension | Cross-cluster priority, same-cluster escalation |
| `execute/delegation-guard.ts` | DelegationContext | Delegation depth enforcement (decrement, assert) |
| `execute/wal.ts` | WalStore | Write-ahead log for crash recovery |
| `execute/task-fsm.ts` | TaskFsm | 11-state task lifecycle |
| `execute/index.ts` | WorkAgentSupervisor | Stage gates, task dispatch, dependency validation |

GovernanceHost must unify these into a single interface that a hosting platform implements.
It is NOT a 1:1 mirror of GovernanceManager. GovernanceHost is the **platform's contract to
claws**, while GovernanceManager is the **internal implementation** that runs inside the SDK.

---

## The GovernanceHost Interface

Six facets, each independently implementable. A platform can start with facet 1 (tool
governance) and progressively adopt the others. No facet depends on another at the
interface level, though implementations will share state.

### Facet 1: Tool Governance (G-CLASS, G-PERM, G-ELICIT)

```typescript
/**
 * Tool governance hooks. The host intercepts every tool call and
 * delegates to claws-compiled guard logic.
 */
interface ToolGovernanceFacet {
  /**
   * Register a handler invoked BEFORE every tool call.
   * The handler receives the tool name, arguments, and caller context.
   * Returns: allow, deny (with reason), or redirect (to approval flow).
   *
   * Maps to: GovernanceManager.checkBudget + PolicyWalker rules +
   *          WorkAgentSupervisor.dispatch dependency checks
   */
  onBeforeToolCall(handler: ToolGuardHandler): Disposable;

  /**
   * Register a handler invoked AFTER every tool call completes.
   * The handler receives the tool name, result, and duration.
   * Used for: audit recording, budget accounting, output sanitization.
   *
   * Maps to: GovernanceManager.recordUsage + CGR appendEntry
   */
  onAfterToolCall(handler: ToolAuditHandler): Disposable;

  /**
   * Query the platform's available tools and their current state.
   * claws uses this to validate classification tables at startup.
   *
   * Maps to: ExecHost.availableTools (from atom:exec-host)
   */
  getAvailableTools(): Promise<ToolDescriptor[]>;
}

interface ToolGuardHandler {
  (ctx: ToolCallContext): Promise<ToolGuardDecision>;
}

interface ToolCallContext {
  /** Tool identifier as registered with the platform. */
  readonly toolName: string;
  /** Serialized arguments (platform-specific format). */
  readonly arguments: Record<string, unknown>;
  /** Agent identity making the call. */
  readonly callerId: AgentIdentity;
  /** Current delegation depth (from DelegationContext). */
  readonly delegationDepth: number;
  /** Maximum allowed delegation depth. */
  readonly maxDelegationDepth: number;
  /** Timestamp of the call. */
  readonly timestamp: string;
  /** Correlation ID for tracing. */
  readonly correlationId: string;
}

type ToolGuardDecision =
  | { action: 'allow' }
  | { action: 'deny'; reason: string; ruleId: string }
  | { action: 'redirect'; target: 'approval'; approvalContext: ApprovalRequest }
  | { action: 'modify'; arguments: Record<string, unknown>; reason: string };

interface ToolAuditHandler {
  (ctx: ToolCallContext, result: ToolCallResult): Promise<void>;
}

interface ToolCallResult {
  readonly success: boolean;
  readonly tokensUsed: number;
  readonly durationMs: number;
  readonly output: unknown;
  readonly error?: string;
}
```

**OC Gateway mapping**: `hooks.before_tool_call` and `hooks.after_tool_call` in `openclaw.json`.
The Gateway calls these JavaScript handlers synchronously before/after every tool invocation.
claws emits `hooks/glint-guard.js` (Q12i Layer 2) that implements `ToolGuardHandler`.

**Bedrock mapping**: Amazon Bedrock Guardrails API. `ApplyGuardrail` action with `INTERVENTION`
mode. Tool governance maps to the content filter policy applied to tool input/output.

**LangGraph mapping**: `ToolNode` with `handle_tool_errors=True` + custom `should_continue`
function on the tool edge. Before-tool maps to a conditional edge; after-tool maps to
a post-processing node.

**CrewAI mapping**: `@tool` decorator with custom `before_execution` and `after_execution`
callbacks on the `Tool` class. CrewAI 0.x used `tool_calling_llm`; newer versions support
direct tool hooks.

### Facet 2: A2A Governance (G-A2A-*)

```typescript
/**
 * Agent-to-agent message governance. The host intercepts all
 * inter-agent communication and delegates to claws trust policies.
 */
interface A2AGovernanceFacet {
  /**
   * Register a handler for all inbound and outbound A2A messages.
   * The handler can allow, deny, or modify the message.
   *
   * Maps to: tension-negotiation.ts priority resolution +
   *          DelegationContext depth enforcement
   */
  onAgentMessage(handler: A2AGuardHandler): Disposable;

  /**
   * Query the current agent roster known to the platform.
   * claws uses this to validate trust group membership at startup.
   */
  getAgentRoster(): Promise<AgentIdentity[]>;

  /**
   * Request the platform to resolve a tension between two agents.
   * Uses the tension negotiation protocol (cross-cluster priority,
   * same-cluster escalation).
   *
   * Maps to: negotiateTension() + resolveGate()
   */
  resolveTension(reviewers: TensionParticipant[]): Promise<TensionOutcome>;
}

interface A2AGuardHandler {
  (ctx: A2AMessageContext): Promise<A2AGuardDecision>;
}

interface A2AMessageContext {
  readonly direction: 'inbound' | 'outbound';
  readonly sourceAgent: AgentIdentity;
  readonly targetAgent: AgentIdentity;
  readonly messageType: string;
  readonly payload: unknown;
  readonly delegationDepth: number;
  readonly correlationId: string;
  readonly timestamp: string;
}

type A2AGuardDecision =
  | { action: 'allow' }
  | { action: 'deny'; reason: string; ruleId: string }
  | { action: 'modify'; payload: unknown; reason: string }
  | { action: 'escalate'; reason: string };

interface TensionParticipant {
  readonly agentId: string;
  readonly cluster: string;
  readonly favors: string;
  readonly over: string;
}

type TensionOutcome =
  | { resolved: true; winner: string; winnerCluster: string; audit: string[] }
  | { resolved: false; escalated: true; reason: string; audit: string[] };
```

**OC Gateway mapping**: `plugins.slots.governance` in `openclaw.json`. The Gateway plugin
receives all A2A events through the plugin event bus. claws emits `plugins/glint-gateway/index.js`
(Q12i Layer 3).

**Bedrock mapping**: Not directly available. A2A governance would require a custom Lambda
between agent invocations in a Bedrock Agent workflow. The Lambda checks trust boundaries
before forwarding.

**LangGraph mapping**: Custom edges between agent nodes. Each edge has a `should_continue`
function that enforces trust boundaries. LangGraph's `MessageGraph` provides message-level
interception.

**CrewAI mapping**: Custom `Process` class that wraps `sequential` or `hierarchical` process
and injects trust checks between agent handoffs.

### Facet 3: Context Governance (G-CONTEXT-*, G-INPUT-*, G-OUTPUT-*)

```typescript
/**
 * Context assembly governance. The host delegates context construction
 * to claws-compiled rules that control what enters the agent's
 * context window.
 */
interface ContextGovernanceFacet {
  /**
   * Assemble governed context for an agent from platform-provided
   * components (memories, skills, role instructions, tool descriptions).
   *
   * claws-compiled rules control:
   * - Boundary markers between context sections (G-CONTEXT-1)
   * - Tool output isolation (G-CONTEXT-2)
   * - Memory isolation (G-CONTEXT-3)
   * - Skill isolation (G-CONTEXT-4)
   * - Input sanitization (G-INPUT-3)
   * - Trust labeling (G-INPUT-2)
   *
   * Maps to: atom:context-assembly (A152)
   */
  assembleContext(request: ContextAssemblyRequest): Promise<GovernedContext>;

  /**
   * Validate agent output before it leaves the platform.
   * Enforces PII redaction, URL allowlists, format rules.
   *
   * Maps to: G-OUTPUT-1 through G-OUTPUT-4
   */
  validateOutput(output: AgentOutput): Promise<OutputValidation>;
}

interface ContextAssemblyRequest {
  /** Agent receiving the context. */
  readonly agent: AgentIdentity;
  /** Raw memory entries from the platform's memory store. */
  readonly memories: MemoryEntry[];
  /** Active skill instructions. */
  readonly skills: SkillContent[];
  /** Role instructions (if role-based platform). */
  readonly roleInstructions?: string;
  /** Tool descriptions to include. */
  readonly toolDescriptions: ToolDescriptor[];
  /** Conversation history. */
  readonly conversationHistory: ConversationTurn[];
  /** Maximum context tokens (platform budget). */
  readonly maxContextTokens: number;
}

interface GovernedContext {
  /** Assembled system prompt with governance boundary markers. */
  readonly systemPrompt: string;
  /** Sections with their trust labels. */
  readonly sections: ContextSection[];
  /** Tools excluded by governance rules. */
  readonly excludedTools: Array<{ tool: string; reason: string; ruleId: string }>;
  /** Memories excluded by data sensitivity rules. */
  readonly excludedMemories: Array<{ memoryId: string; reason: string }>;
  /** Total tokens used by governed context. */
  readonly tokenCount: number;
  /** Governance diagnostics generated during assembly. */
  readonly diagnostics: GovernanceDiagnostic[];
}

interface ContextSection {
  readonly id: string;
  readonly type: 'governance' | 'skill' | 'memory' | 'tool' | 'role' | 'conversation';
  readonly trustLabel: 'SYSTEM' | 'DATA' | 'USER';
  readonly content: string;
  readonly tokens: number;
  readonly boundaryMarker: string;
}
```

**OC Gateway mapping**: OpenClaw currently does context assembly internally. GovernanceHost
intercepts this by having `glint init` inject a context assembly plugin that wraps the
default assembly logic. The plugin calls `assembleContext` before the Gateway's native
assembly, filtering and labeling content.

**Bedrock mapping**: Bedrock's `RetrieveAndGenerate` API controls what knowledge enters
context. Governance maps to the retrieval filter configuration plus guardrail content
policies on the assembled prompt.

**LangGraph mapping**: The `StateGraph` state object is the context. Governance is a
pre-processing node that runs before the LLM node, filtering the state.

**CrewAI mapping**: `Agent.system_template` and `Agent.prompt_template` control context.
Governance wraps these templates with boundary markers and trust labels.

### Facet 4: Elicitation (G-ELICIT-*)

```typescript
/**
 * Human-in-the-loop approval for high-risk actions.
 * The host provides the approval mechanism; claws provides the policy.
 */
interface ElicitationFacet {
  /**
   * Request human approval for an on-behalf-of action.
   * The host surfaces this to the user through its native UI.
   *
   * Approval semantics:
   * - Timeout: deny (G-ELICIT-TIMEOUT, always fail-closed)
   * - Approved: audit trail entry created
   * - Denied: audit trail entry created + reason captured
   *
   * Maps to: exec-approvals.json in OC + G-ELICIT rules
   */
  requestApproval(request: ApprovalRequest): Promise<ApprovalResult>;
}

interface ApprovalRequest {
  /** Unique request identifier for audit trail. */
  readonly requestId: string;
  /** The action requiring approval. */
  readonly action: OboAction;
  /** Why the agent wants to perform this action. */
  readonly justification: string;
  /** Maximum time to wait (ms). Deny on timeout. */
  readonly timeoutMs: number;
  /** Agent requesting the action. */
  readonly requester: AgentIdentity;
  /** Risk classification of the tool/action. */
  readonly riskLevel: 'R3' | 'R4' | 'R5';
  /** Correlation ID for tracing. */
  readonly correlationId: string;
}

interface OboAction {
  readonly type: 'tool_call' | 'a2a_delegate' | 'external_api';
  readonly toolName?: string;
  readonly targetAgent?: string;
  readonly description: string;
  readonly arguments: Record<string, unknown>;
}

type ApprovalResult =
  | { approved: true; approver: string; timestamp: string }
  | { denied: true; reason: string; approver?: string; timestamp: string }
  | { timeout: true; timestamp: string };
```

**OC Gateway mapping**: `config/exec-approvals.json` defines tool-level approval modes
(auto, ask, deny). The Gateway surfaces approval requests through its native chat UI.
claws maps R5 tools to `ask` mode and R3-R4 tools to risk-based approval.

**Bedrock mapping**: No native approval mechanism. Would require a Step Functions
human approval task between the agent and the tool invocation.

**LangGraph mapping**: `interrupt_before` on tool nodes. LangGraph 0.2+ supports
`NodeInterrupt` which pauses execution and returns control to the caller for approval.

**CrewAI mapping**: `human_input=True` on the `Task` object. CrewAI prompts the user
via CLI stdin. For production, a custom `HumanInputHandler` that integrates with an
approval service.

### Facet 5: Audit (CGR chain, SIEM, compliance)

```typescript
/**
 * Governance event recording. The host provides storage;
 * claws provides the events and integrity guarantees.
 */
interface AuditFacet {
  /**
   * Append a governance event to the audit trail.
   * The host is responsible for persistence. claws provides:
   * - Event type and payload
   * - Hash chaining (prevHash linkage)
   * - Sequence numbering
   *
   * Maps to: cgr-chain.ts appendEntry + suite/cgr-chain.ts appendCgrEntry
   */
  appendAuditEvent(event: GovernanceEvent): Promise<AuditReceipt>;

  /**
   * Query audit events for compliance reporting.
   * Supports time-range and event-type filtering.
   */
  queryAuditEvents(filter: AuditFilter): Promise<GovernanceEvent[]>;

  /**
   * Verify the integrity of the audit chain.
   * Returns the verification result without modifying the chain.
   *
   * Maps to: cgr-chain.ts verifyChain + suite/cgr-chain.ts verifyCgrChain
   */
  verifyAuditChain(): Promise<AuditChainVerification>;

  /**
   * Register a subscriber for real-time governance events.
   * Used by SIEM, dashboards, and alerting systems.
   *
   * Maps to: atom:event-fanout (A172)
   */
  onAuditEvent(subscriber: AuditEventSubscriber): Disposable;
}

interface GovernanceEvent {
  readonly eventId: string;
  readonly type: GovernanceEventType;
  readonly timestamp: string;
  readonly actor: AgentIdentity;
  readonly correlationId: string;
  readonly payload: Record<string, unknown>;
  /** Computed by the host using the CGR hash chain algorithm. */
  readonly hash?: string;
  readonly prevHash?: string;
  readonly sequenceNumber?: number;
}

type GovernanceEventType =
  | 'tool.guard.allow'
  | 'tool.guard.deny'
  | 'tool.guard.redirect'
  | 'a2a.guard.allow'
  | 'a2a.guard.deny'
  | 'a2a.guard.escalate'
  | 'context.assembly.complete'
  | 'context.exclusion'
  | 'approval.requested'
  | 'approval.granted'
  | 'approval.denied'
  | 'approval.timeout'
  | 'budget.warning'
  | 'budget.throttle'
  | 'budget.reject'
  | 'tension.resolved'
  | 'tension.escalated'
  | 'policy.violation'
  | 'health.check';

interface AuditReceipt {
  readonly sequenceNumber: number;
  readonly hash: string;
  readonly timestamp: string;
}

interface AuditFilter {
  readonly since?: string;
  readonly until?: string;
  readonly eventTypes?: GovernanceEventType[];
  readonly actorId?: string;
  readonly correlationId?: string;
  readonly limit?: number;
}

interface AuditChainVerification {
  readonly valid: boolean;
  readonly verifiedLength: number;
  readonly totalEntries: number;
  readonly breakPoint?: number;
  readonly genesisHash: string;
  readonly latestHash: string;
}

type AuditEventSubscriber = (event: GovernanceEvent) => void;
```

**OC Gateway mapping**: File-based NDJSON in `.glint/audit/chain.jsonl`. The Gateway
plugin appends events after every governance decision. For SIEM integration, a sidecar
process tails the NDJSON file and forwards to Splunk/Sentinel/Datadog via their HTTP
ingest APIs.

**Bedrock mapping**: CloudWatch Logs + CloudTrail. Bedrock natively logs all agent
invocations to CloudTrail. Governance events are custom CloudWatch log entries with
a structured JSON format that CloudWatch Insights can query.

**LangGraph mapping**: LangSmith tracing. LangGraph sends all execution traces to
LangSmith. Governance events are custom metadata on LangSmith runs. For enterprise,
LangSmith Enterprise supports SIEM export.

**CrewAI mapping**: Custom `CrewOutput` post-processing plus the built-in `verbose`
logging. Enterprise governance would require a custom `Logger` class that implements
the audit chain.

### Facet 6: Health (monitoring, drift, kill)

```typescript
/**
 * Governance health monitoring. The host reports its governance
 * status; claws checks for drift, violations, and degradation.
 */
interface HealthFacet {
  /**
   * Get the current governance health report.
   *
   * Maps to: GovernanceManager.getBudgetState + getSignalState +
   *          GovernClient.assess + GovernClient.monitor
   */
  getGovernanceHealth(): Promise<GovernanceHealthReport>;

  /**
   * Emergency kill: terminate all agent activity in a workspace.
   * The host must honor this immediately.
   *
   * Maps to: GovernClient.killAndAudit + AgentOrchestrator.cancel
   */
  emergencyKill(reason: string): Promise<KillReceipt>;
}

interface GovernanceHealthReport {
  /** Overall status. */
  readonly status: 'healthy' | 'degraded' | 'critical' | 'killed';
  /** Budget utilization (0-100). */
  readonly budgetPercent: number;
  /** Active policy violations. */
  readonly activeViolations: number;
  /** Configuration drift score (0 = no drift). */
  readonly driftScore: number;
  /** Audit chain integrity. */
  readonly auditChainValid: boolean;
  /** Number of active agents. */
  readonly activeAgents: number;
  /** Governance facets that are operational. */
  readonly activeFacets: string[];
  /** Last health check timestamp. */
  readonly lastChecked: string;
}

interface KillReceipt {
  readonly killed: boolean;
  readonly agentsStopped: number;
  readonly auditEntryHash: string;
  readonly timestamp: string;
}
```

**OC Gateway mapping**: Health endpoint exposed by the sidecar process (Q12i Layer 5).
Emergency kill maps to `fleet kill --workspace` which terminates the Gateway process
and records the kill event in the CGR chain.

**Bedrock mapping**: CloudWatch health checks + Bedrock StopAgentExecution API.

**LangGraph mapping**: Health is a custom node that runs periodically. Kill maps to
LangGraph's `cancel` API on the running graph.

**CrewAI mapping**: No native health endpoint. Would require a custom health check
method on the `Crew` class. Kill maps to `Crew.kickoff` interruption.

---

## Unified GovernanceHost Interface

```typescript
/**
 * GovernanceHost -- the platform contract for claws-generated governance.
 *
 * A hosting platform (OC Gateway, Bedrock, LangGraph, CrewAI) implements
 * this interface. claws-generated skills call these methods to enforce
 * governance at runtime. The interface is platform-agnostic; each platform
 * provides its own implementation.
 *
 * Facets are independently adoptable. A minimal implementation provides
 * only ToolGovernanceFacet + AuditFacet. Full enterprise governance
 * implements all 6.
 */
interface GovernanceHost
  extends ToolGovernanceFacet,
          A2AGovernanceFacet,
          ContextGovernanceFacet,
          ElicitationFacet,
          AuditFacet,
          HealthFacet {
  /**
   * Platform identity. Used for audit, diagnostics, and conditional
   * behavior in claws-generated code.
   */
  readonly platformId: PlatformId;

  /**
   * GovernanceHost version. Allows claws-generated skills to check
   * compatibility at startup.
   */
  readonly hostVersion: string;

  /**
   * Which facets this host implements. claws-generated skills degrade
   * gracefully when a facet is missing (compile-time enforcement only
   * for that category).
   */
  readonly supportedFacets: GovernanceFacetId[];

  /**
   * Initialize governance for a workspace. Called once on startup.
   * Loads compiled governance artifacts, validates configuration,
   * registers handlers.
   */
  initialize(config: GovernanceConfig): Promise<InitResult>;

  /**
   * Graceful shutdown. Flushes audit events, completes pending
   * approvals (deny-default), and records shutdown in audit chain.
   */
  shutdown(): Promise<void>;
}

type PlatformId = 'openclaw' | 'bedrock' | 'langgraph' | 'crewai' | 'custom';

type GovernanceFacetId =
  | 'tool-governance'
  | 'a2a-governance'
  | 'context-governance'
  | 'elicitation'
  | 'audit'
  | 'health';

interface GovernanceConfig {
  /** Path to compiled governance artifacts (.glint/compiled/). */
  readonly compiledArtifactsPath: string;
  /** Policy override layer (runtime > compiled). */
  readonly policyOverrides?: Record<string, unknown>;
  /** Budget configuration. */
  readonly budget?: BudgetConfig;
  /** Signal configuration. */
  readonly signals?: SignalConfig;
}

interface InitResult {
  readonly success: boolean;
  readonly facetsActivated: GovernanceFacetId[];
  readonly warnings: string[];
  readonly errors: string[];
}

interface BudgetConfig {
  readonly maxTokens?: number;
  readonly maxCalls?: number;
  readonly maxDuration?: number;
  readonly enforcement: 'hard' | 'soft' | 'advisory';
}

interface SignalConfig {
  readonly allowed: string[];
  readonly maxPerMinute?: number;
}

/** Disposal handle returned by event registrations. */
interface Disposable {
  dispose(): void;
}
```

---

## GovernanceHost Lifecycle Protocol

```
Platform Start
  |
  v
[1] host = platform.createGovernanceHost()
  |
  v
[2] host.initialize(config)              -- loads compiled artifacts, validates
  |                                         returns InitResult with activated facets
  v
[3] host.onBeforeToolCall(guardHandler)   -- registers tool guard
    host.onAfterToolCall(auditHandler)    -- registers tool audit
    host.onAgentMessage(a2aHandler)       -- registers A2A guard
    host.onAuditEvent(siemSubscriber)     -- registers SIEM fanout
  |
  v
[4] ... agent execution ...
  |    guardHandler called on every tool call
  |    a2aHandler called on every A2A message
  |    assembleContext called on every context build
  |    requestApproval called for R5 actions
  |    appendAuditEvent called for every governance decision
  |
  v
[5] host.shutdown()                       -- flushes audit, deny-defaults pending
  |                                         approvals, records shutdown event
  v
Platform Stop
```

---

## Source Code Traceability

| GovernanceHost Method | agent-sdk Source | Key Pattern Used |
|----------------------|-----------------|-----------------|
| `onBeforeToolCall` | `GovernanceManager.checkBudget` + `DelegationContext.assertCanDelegate` | Pre-check + budget threshold (80/95/100) |
| `onAfterToolCall` | `GovernanceManager.recordUsage` + `appendEntry` | Post-record + hash chain append |
| `onAgentMessage` | `negotiateTension` + `resolveGate` | Cross-cluster priority, pairwise reduction |
| `assembleContext` | atom:context-assembly (A152) | Boundary markers, trust labels, section isolation |
| `requestApproval` | G-ELICIT rules | Timeout = deny, audit all decisions |
| `appendAuditEvent` | `cgr-chain.ts` + `suite/cgr-chain.ts` | SHA-256 hash chain, NDJSON, sequence numbers |
| `verifyAuditChain` | `verifyChain` + `verifyCgrChain` | Read-only audit, break point detection |
| `onAuditEvent` | atom:event-fanout (A172) | Subscriber registration, re-entrancy guard |
| `getGovernanceHealth` | `GovernanceManager.getBudgetState` + `getSignalState` | Budget %, active violations, drift |
| `emergencyKill` | `AgentOrchestrator.cancel` + SIGTERM handler | Cancel all + audit + exit |
| `resolveTension` | `resolveGate(reviewers[])` | Pairwise reduction, escalation |
| `getAvailableTools` | atom:exec-host (A151) | Tool discovery at startup |
| `getAgentRoster` | Not in current SDK (new) | Agent registry query |
| `validateOutput` | G-OUTPUT rules | PII redaction, URL allowlist, format |
| `initialize` | `loadPolicies` + `GovernClient` constructor | Policy walker merge, config validation |
| `shutdown` | `registerShutdownHandlers` | SIGTERM/SIGINT graceful shutdown |

---

## Graceful Degradation Matrix

When a facet is not implemented, claws-generated skills degrade to compile-time-only enforcement.

| Missing Facet | Compile-Time Coverage | Runtime Gap | Risk |
|--------------|----------------------|-------------|------|
| tool-governance | G-CLASS/G-PERM validated at build | No runtime blocking of tool calls | Agent can call tools that compile-time classified as R5 |
| a2a-governance | Trust groups validated at build | No runtime A2A filtering | Lateral movement possible |
| context-governance | Boundary markers emitted in SKILL.md | No runtime context filtering | Tool output treated as instructions |
| elicitation | Approval policy validated at build | No runtime approval flow | R5 tools callable without human consent |
| audit | Compiled artifacts include audit config | No runtime audit trail | Compliance gap -- no evidence chain |
| health | Budget validated at build | No runtime budget enforcement | Runaway costs, no kill switch |

**Minimum viable GovernanceHost**: `ToolGovernanceFacet` + `AuditFacet`. This covers the
top OWASP concerns (tool misuse + audit trail) and is the smallest useful deployment.

---

## Key Design Decisions

**D1: Faceted interface, not monolithic.** Each facet is a separate TypeScript interface.
Platforms implement the facets they support. `supportedFacets` declares capabilities at
runtime. This enables incremental adoption.

**D2: Handler registration, not method override.** `onBeforeToolCall(handler)` returns
a `Disposable` rather than being a method the platform overrides. This supports multiple
handlers (claws governance + platform logging + user custom) composed in order.

**D3: Async everything.** Every governance operation is async. Even fast decisions (allow
a read-only tool) may need async audit recording. Platform implementations can optimize
internally but the interface is always async.

**D4: Correlation IDs everywhere.** Every context object carries a `correlationId` that
threads through tool calls, A2A messages, approval requests, and audit events. This
enables end-to-end tracing across platform boundaries.

**D5: Platform provides identity, claws provides policy.** GovernanceHost does not define
how agents authenticate. It receives `AgentIdentity` from the platform. claws-compiled
policies evaluate against that identity. Identity verification levels (L0-L3 from Q12h)
are a platform concern.

**D6: Deny-default on error.** If any governance handler throws, the platform must treat
the decision as DENY. R5 tools are always fail-closed (from Q12i). R1-R2 tools are
fail-open by configuration.
