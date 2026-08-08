# Cap-Integration v2 Scenario Runners

## Existing Runners (reuse from claws-sdk/tests/accept/runners/)

| Runner            | Scenarios     | What it does                                                                                                                                 |
| ----------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway-sim`     | S07, S08, S22 | Compile -> emit -> fire tool calls -> verify enforcement outcomes. Reuse for PATCH validation: edit -> recompile -> verify governance holds. |
| `compile-sim`     | S10, S19      | Full/incremental compilation pipeline. Reuse for cache invalidation timing, snapshot verification, and rollback verification.                |
| `emit-sim`        | S06           | Emit artifacts from GovernanceIR. Reuse for verifying chunk assembly sources (host-approval-policies.json, exec-approvals.json).             |
| `host-policy-sim` | S08, S09      | Host approval policy resolution with specific->wildcard->global order. Reuse for fleet lock and "Allow all" enforcement.                     |
| `fleet-sim`       | S08, S28      | Fleet policy distribution and override resolution. Reuse for fleet lock precedence testing and hot-reload validation.                        |
| `security-sim`    | S26           | Security rule enforcement (injection, secrets). Reuse for onboard content validation and secret scan.                                        |

## New Runners Required

### serve-sim

**Location**: `claws-sdk/tests/accept/runners/serve-sim.ts`
**Purpose**: Start `claws serve` as an in-process HTTP server, call endpoints, verify JSON responses.

```typescript
interface ServeSimConfig {
  workspaceRoot: string; // fixture workspace with OC files
  port?: number; // default: 0 (random port)
  fleetPolicyPath?: string; // optional fleet policy file for hot-reload tests
}

interface ServeSimResult {
  response: { status: number; body: unknown; headers: Record<string, string> };
  durationMs: number;
}

// Usage:
const sim = await ServeSim.start(config);
const chunk = await sim.get("/api/chunks/connections");
// chunk.response.status === 200
// chunk.response.body.data.tools[0].risk.level === 'R5'
const workspace = await sim.get("/api/oc/");
// workspace.response.body.files.length === 9
await sim.stop();
```

**Used by**: S01, S02, S03, S06, S11, S12, S13, S14, S15, S18, S30

### oc-sim

**Location**: `claws-sdk/tests/accept/runners/oc-sim.ts`
**Purpose**: Layer 1 generic OC API testing -- resolve oc:// paths at every granularity, verify response shapes, test encoding edge cases.

```typescript
interface OcSimConfig {
  workspaceRoot: string;
  compiledIR?: GovernanceIR; // optional: inject pre-compiled IR
}

interface OcSimResult {
  response: { status: number; body: unknown; headers: Record<string, string> };
  oc_path_echoed: string; // the oc:// path echoed in meta
  governance_context: unknown; // governance context from response
}

// Usage:
const sim = new OcSim(config);
const file = await sim.get("oc://TOOLS.md");
// file.response.body.data.sections.length === 3
const section = await sim.get("oc://TOOLS.md/Tools");
// section.response.body.data.items.length === 6
const item = await sim.get("oc://TOOLS.md/Tools/timely-updates");
// item.response.body.data.fields includes 'enabled'
const missing = await sim.get("oc://MISSING.md");
// missing.response.status === 404
// missing.response.body.suggestion === 'TOOLS.md'
```

**Used by**: S01, S03, S04, S21, S22, S23

### chunk-sim

**Location**: `claws-sdk/tests/accept/runners/chunk-sim.ts`
**Purpose**: Chunk assembly in isolation -- parse workspace -> build ChunkDataMap -> verify typed chunks without HTTP.

```typescript
interface ChunkSimConfig {
  workspaceRoot: string;
  compiledIR?: GovernanceIR; // optional: inject pre-compiled IR
  fleetPolicy?: FleetPolicy; // optional: inject fleet overrides
}

// Usage:
const sim = new ChunkSim(config);
const chunk = await sim.assembleChunk("connections");
// chunk.data.tools[0].lock.source === 'r5'
// chunk.data.tools[0].lock.precedence === ['r5', 'fleet']
// chunk.governance.risk.level === 'R5'
const general = await sim.assembleChunk("general");
// general.meta.snapshot_id is composite hash
```

**Used by**: S06, S10 (unit-level, no HTTP)

### patch-sim

**Location**: `claws-sdk/tests/accept/runners/patch-sim.ts`
**Purpose**: Write-time validation pipeline in isolation -- submit edits, verify acceptance/rejection, check file state and recompilation result.

```typescript
interface PatchSimConfig {
  workspaceRoot: string; // mutable fixture workspace
  fleetPolicy?: FleetPolicy;
}

interface PatchSimResult {
  status: "ok" | "rejected";
  error?: string;
  fileChanged: boolean; // was the OC file actually modified?
  fileContent?: string; // post-edit file content (for lossless verification)
  governance?: GovernanceResult; // recompilation result (if status === 'ok')
  auditEvent?: AuditEvent; // audit event emitted (if any)
  etag?: string; // new ETag after successful write
  dryRun?: boolean; // was this a dry-run?
}

// Usage:
const sim = new PatchSim(config);
const result = await sim.patch("connections", "outlook", {
  tools: [{ tool: "send-email", enabled: false }],
});
// result.status === 'rejected'
// result.error === 'R5_NON_NEGOTIABLE'
// result.fileChanged === false

const dryResult = await sim.patch(
  "connections",
  "outlook",
  {
    tools: [{ tool: "outlook-read", enabled: true }],
  },
  { dryRun: true },
);
// dryResult.dryRun === true
// dryResult.fileChanged === false
```

**Used by**: S04, S07, S08, S09, S16, S17, S20, S21, S22, S23, S24

### loop-sim

**Location**: `claws-sdk/tests/accept/runners/loop-sim.ts`
**Purpose**: Loop <-> OC file sync -- SOUL.md/MEMORY.md as sections, governance-aware edits, lossless round-trip.

```typescript
interface LoopSimConfig {
  workspaceRoot: string;
  soulContent?: string; // inject SOUL.md content
  memoryContent?: string; // inject MEMORY.md content
}

// Usage:
const sim = new LoopSim(config);
const soul = await sim.getSoulSections();
// soul[0].name === 'Instructions'
// soul[1].governance.denyRules === 2

const result = await sim.patchSoulSection("Boundaries", "New boundary text");
// result.governance.warnings includes 'DENY_RULE_REMOVED' if deny rule was removed
// result.fileContent preserves frontmatter and other sections
```

**Used by**: S22

### sse-sim

**Location**: `claws-sdk/tests/accept/runners/sse-sim.ts`
**Purpose**: SSE event stream testing -- connect, collect events, verify ordering and content.

```typescript
interface SseSimConfig {
  serverUrl: string; // from serve-sim
  timeout?: number; // max wait for events (default: 5000ms)
}

// Usage:
const sim = new SseSim(config);
await sim.connect("/api/events");
// ... trigger a PATCH ...
const events = await sim.collectUntil((e) => e.type === "COMPILATION_COMPLETE");
// events[0].type === 'OC_FILE_UPDATED'
// events[0].data.oc_path === 'oc://TOOLS.md'
// events[1].type === 'COMPILATION_COMPLETE'
// events[1].data.compilation_id is present
await sim.disconnect();
```

**Used by**: S05, S24, S28, S30

### session-sim

**Location**: `claws-sdk/tests/accept/runners/session-sim.ts`
**Purpose**: Session lifecycle testing -- create sessions, query tools with session scoping, verify permission computation.

```typescript
interface SessionSimConfig {
  workspaceRoot: string;
  sessions?: SessionDefinition[]; // inject session definitions
}

// Usage:
const sim = new SessionSim(config);
const sessions = await sim.listSessions();
// sessions.length === 4 (main, cron, channel, agent)
// sessions[0].type === 'main'

const tools = await sim.getSessionTools("cron:daily-triage");
// tools.filter(t => t.effectivePermission === 'allowed').length === 15
// tools.filter(t => t.effectivePermission === 'locked').length === 1
// tools.find(t => t.toolId === 'send-email').lockSource === 'r5_lock'

const runs = await sim.getRunHistory("cron:daily-triage", { limit: 25 });
// runs[0].status === 'in_progress'
// runs[1].status === 'success'
```

**Used by**: S02, S11, S12, S13, S25

### trust-sim

**Location**: `claws-sdk/tests/accept/runners/trust-sim.ts`
**Purpose**: Trust escalation and JWT verification testing.

```typescript
interface TrustSimConfig {
  workspaceRoot: string;
  signingKey: string; // key pair for JWT generation
  workspaceId: string; // for audience verification
  issuerId: string; // for issuer verification
}

// Usage:
const sim = new TrustSim(config);
const trust = await sim.getTrust();
// trust.currentTier === 2
// trust.maxTier === 4

const jwt = sim.generateJwt({ targetTier: 3, managerId: "mgr-001" });
const result = await sim.escalate(jwt);
// result.currentTier === 3
// result.history.length increased by 1

const expiredJwt = sim.generateJwt({ targetTier: 3, exp: -60 });
const failResult = await sim.escalate(expiredJwt);
// failResult.error === 'TOKEN_EXPIRED'
```

**Used by**: S14

### audit-sim

**Location**: `claws-sdk/tests/accept/runners/audit-sim.ts`
**Purpose**: Audit chain query, integrity verification, filtering, and SARIF export testing.

```typescript
interface AuditSimConfig {
  workspaceRoot: string;
  seedEvents?: AuditEvent[]; // optional: pre-seed audit chain
}

// Usage:
const sim = new AuditSim(config);
const events = await sim.query({ category: "trust-escalation", limit: 20 });
// events.length <= 20
// events[0].prevHash === null (chain root)

const filtered = await sim.query({ sessionId: "cron:daily-triage" });
// all events have sessionId === 'cron:daily-triage'

const sarif = await sim.exportSarif({ category: "tool-call" });
// sarif.version === '2.1.0'
// sarif.runs[0].results.length > 0

const integrity = await sim.verifyChain();
// integrity.valid === true
// integrity.chainLength === 5000
```

**Used by**: S15

### delegation-sim

**Location**: `claws-sdk/tests/accept/runners/delegation-sim.ts`
**Purpose**: Multi-agent delegation chain testing -- chain construction, cycle detection, depth limits, approval propagation.

```typescript
interface DelegationSimConfig {
  workspaceRoot: string;
  agents: AgentDefinition[]; // agent configs with trust tiers
  maxDepth?: number; // default: 5
}

// Usage:
const sim = new DelegationSim(config);
const chain = await sim.delegate("agent-a", "agent-b", "subtask-1");
// chain.depth === 1
// chain.effectiveTier === Math.min(agentA.tier, agentB.tier)

const deepChain = await sim.delegate("agent-b", "agent-c", "subtask-1a");
// deepChain.depth === 2
// deepChain.effectiveTier === Math.min(agentA.tier, agentB.tier, agentC.tier)

const cycle = await sim.delegate("agent-c", "agent-a", "subtask-loop");
// cycle.error === 'DELEGATION_CYCLE_DETECTED'

const approval = await sim.requestApproval("agent-c", "deploy-service");
// approval.delegation_chain === ['agent-a', 'agent-b', 'agent-c']
// approval.human_sees_full_chain === true
```

**Used by**: S27

### recovery-sim

**Location**: `claws-sdk/tests/accept/runners/recovery-sim.ts`
**Purpose**: Crash recovery and startup health testing -- simulate crash states, verify recovery sequence.

```typescript
interface RecoverySimConfig {
  workspaceRoot: string;
  crashState?: "write_without_compile" | "partial_write" | "stale_cache";
}

// Usage:
const sim = new RecoverySim(config);
await sim.simulateCrash("write_without_compile");
// workspace has file newer than last compilation

const health = await sim.startupHealthCheck();
// health.state === 'recovering'
// health.step === 'recompile'

await sim.waitForRecovery(30000);
// sim.isReady() === true
// sim.getWorkspaceVersion() > previousVersion

const report = await sim.getRecoveryReport();
// report.crashTimestamp is present
// report.walReplayed === true
// report.recoveryDurationMs < 30000
```

**Used by**: S29

### batch-sim

**Location**: `claws-sdk/tests/accept/runners/batch-sim.ts`
**Purpose**: Batch operation testing -- atomic multi-operation execution, rollback, conflict detection.

```typescript
interface BatchSimConfig {
  workspaceRoot: string;
  fleetPolicy?: FleetPolicy;
}

// Usage:
const sim = new BatchSim(config);
const result = await sim.executeBatch([
  { type: "toggle_tool", toolId: "slack-send", value: "enabled" },
  { type: "edit_prompt", chunkPath: "connections/outlook", value: "New prompt" },
  { type: "change_schedule", sessionId: "cron:daily-triage", value: "0 9 * * 1-5" },
]);
// result.status === 200
// result.all_succeeded === true
// result.recompile_count === 1

const failResult = await sim.executeBatch([
  { type: "toggle_tool", toolId: "send-email", value: "disabled" },
  { type: "edit_prompt", chunkPath: "connections/outlook", value: "New prompt" },
]);
// failResult.status === 422
// failResult.all_rolled_back === true
// failResult.failed_operation_index === 0

const dryResult = await sim.executeBatch(
  [{ type: "toggle_tool", toolId: "slack-send", value: "enabled" }],
  { dryRun: true },
);
// dryResult.dryRun === true
// dryResult.governance_preview is present
```

**Used by**: S17

## Scenario -> Runner Matrix

| Scenario                     | Primary Runner | Supporting Runners                           |
| ---------------------------- | -------------- | -------------------------------------------- |
| S01-oc-path-resolution       | oc-sim         | serve-sim                                    |
| S02-session-scoped-query     | session-sim    | serve-sim                                    |
| S03-workspace-schema         | oc-sim         | serve-sim                                    |
| S04-layer1-patch             | patch-sim      | oc-sim                                       |
| S05-external-edit-detection  | sse-sim        | serve-sim, patch-sim                         |
| S06-chunk-read-connections   | serve-sim      | chunk-sim, emit-sim                          |
| S07-chunk-patch-r5-rejection | patch-sim      | gateway-sim                                  |
| S08-chunk-fleet-lock         | patch-sim      | fleet-sim, host-policy-sim                   |
| S09-allow-all-r5-exclusion   | patch-sim      | host-policy-sim                              |
| S10-chunk-assembly-atomic    | chunk-sim      | compile-sim                                  |
| S11-session-list             | session-sim    | serve-sim                                    |
| S12-cron-run-history         | session-sim    | serve-sim                                    |
| S13-session-tools            | session-sim    | serve-sim                                    |
| S14-trust-escalation         | trust-sim      | serve-sim                                    |
| S15-audit-query              | audit-sim      | serve-sim                                    |
| S16-dry-run-patch            | patch-sim      | serve-sim                                    |
| S17-batch-edits              | batch-sim      | patch-sim                                    |
| S18-workspace-versioning     | serve-sim      | patch-sim, sse-sim                           |
| S19-incremental-recompile    | patch-sim      | compile-sim                                  |
| S20-atomic-rollback          | patch-sim      | compile-sim                                  |
| S21-r5-bypass-layer1         | patch-sim      | oc-sim, gateway-sim                          |
| S22-deny-rule-removal        | patch-sim      | loop-sim, gateway-sim                        |
| S23-obo-without-elicitation  | patch-sim      | oc-sim                                       |
| S24-risk-level-drift         | patch-sim      | sse-sim                                      |
| S25-cron-unattended-approval | session-sim    | patch-sim                                    |
| S26-onboard-to-first-task    | serve-sim      | oc-sim, session-sim, audit-sim, security-sim |
| S27-multi-agent-delegation   | delegation-sim | trust-sim                                    |
| S28-fleet-policy-hot-reload  | sse-sim        | fleet-sim, serve-sim                         |
| S29-crash-recovery           | recovery-sim   | serve-sim                                    |
| S30-concurrent-multi-tab     | serve-sim      | patch-sim, sse-sim, compile-sim              |

## Finding Count Target

Per the scenario findings depth rule: **5-15 findings per scenario**.
Current range: 11-13. All scenarios meet the target.
