# Cap-Integration Scenario Runners

## Existing Runners (reuse from claws-sdk/tests/accept/runners/)

| Runner            | Scenarios     | What it does                                                                                                                            |
| ----------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway-sim`     | S03, S04, S05 | Compile → emit → fire tool calls → verify enforcement outcomes. Reuse for PATCH validation: edit → recompile → verify governance holds. |
| `compile-sim`     | S06, S07      | Full/incremental compilation pipeline. Reuse for cache invalidation timing and rollback verification.                                   |
| `emit-sim`        | S01, S02      | Emit artifacts from GovernanceIR. Reuse for verifying chunk assembly sources (host-approval-policies.json, exec-approvals.json).        |
| `host-policy-sim` | S04, S05      | Host approval policy resolution with specific→wildcard→global order. Reuse for fleet lock and "Allow all" enforcement.                  |
| `fleet-sim`       | S04           | Fleet policy distribution and override resolution. Reuse for fleet lock precedence testing.                                             |
| `security-sim`    | S15           | Security rule enforcement (injection, secrets). Reuse for onboard content validation.                                                   |

## New Runners Required

### serve-sim

**Location**: `claws-sdk/tests/accept/runners/serve-sim.ts`
**Purpose**: Start `claws serve` as an in-process HTTP server, call endpoints, verify JSON responses.

```typescript
interface ServeSimConfig {
  workspaceRoot: string; // fixture workspace with OC files
  port?: number; // default: 0 (random port)
}

interface ServeSimResult {
  response: { status: number; body: unknown; headers: Record<string, string> };
  durationMs: number;
}

// Usage:
const sim = await ServeSim.start(config);
const chunk = await sim.get("/api/chunks/connections/outlook");
// chunk.response.status === 200
// chunk.response.body.data.tools[0].risk.level === 5
await sim.stop();
```

**Used by**: S01, S02, S06, S08, S11, S13, S14

### chunk-sim

**Location**: `claws-sdk/tests/accept/runners/chunk-sim.ts`
**Purpose**: Chunk assembly in isolation — parse workspace → build ChunkDataMap → verify typed chunks without HTTP.

```typescript
interface ChunkSimConfig {
  workspaceRoot: string;
  compiledIR?: GovernanceIR; // optional: inject pre-compiled IR
  fleetPolicy?: FleetPolicy; // optional: inject fleet overrides
}

// Usage:
const sim = new ChunkSim(config);
const chunk = await sim.assembleChunk("connections", "outlook");
// chunk.data.tools[0].lock.source === 'r5'
// chunk.governance.risk.level === 5
```

**Used by**: S01, S02 (unit-level, no HTTP)

### patch-sim

**Location**: `claws-sdk/tests/accept/runners/patch-sim.ts`
**Purpose**: Write-time validation pipeline in isolation — submit edits, verify acceptance/rejection, check file state and recompilation result.

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
}

// Usage:
const sim = new PatchSim(config);
const result = await sim.patch("connections", "outlook", {
  tools: [{ tool: "send-email", enabled: false }],
});
// result.status === 'rejected'
// result.error === 'R5_NON_NEGOTIABLE'
// result.fileChanged === false
```

**Used by**: S03, S04, S05, S07, S09, S10, S12

### loop-sim

**Location**: `claws-sdk/tests/accept/runners/loop-sim.ts`
**Purpose**: Loop ↔ OC file sync — SOUL.md/MEMORY.md as sections, governance-aware edits, lossless round-trip.

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

**Used by**: S09, S10

### sse-sim

**Location**: `claws-sdk/tests/accept/runners/sse-sim.ts`
**Purpose**: SSE event stream testing — connect, collect events, verify ordering and content.

```typescript
interface SseSimConfig {
  serverUrl: string; // from serve-sim
  timeout?: number; // max wait for events (default: 5000ms)
}

// Usage:
const sim = new SseSim(config);
await sim.connect("/api/events");
// ... trigger a PATCH ...
const events = await sim.collectUntil((e) => e.type === "compilation_complete");
// events[0].type === 'file_changed'
// events[1].type === 'compilation_started'
// events[2].type === 'compilation_complete'
// events[2].data.status === 'clean'
await sim.disconnect();
```

**Used by**: S08

## Scenario → Runner Matrix

| Scenario                       | Primary Runner | Supporting Runners         |
| ------------------------------ | -------------- | -------------------------- |
| S01-chunk-read-connections     | serve-sim      | chunk-sim, emit-sim        |
| S02-chunk-read-general         | serve-sim      | chunk-sim                  |
| S03-r5-patch-rejection         | patch-sim      | gateway-sim                |
| S04-fleet-lock-enforcement     | patch-sim      | fleet-sim, host-policy-sim |
| S05-allow-all-r5-exclusion     | patch-sim      | host-policy-sim            |
| S06-incremental-recompile      | serve-sim      | compile-sim                |
| S07-patch-atomic-rollback      | patch-sim      | compile-sim                |
| S08-sse-events-on-edit         | sse-sim        | serve-sim, patch-sim       |
| S09-loop-soul-sync             | loop-sim       | patch-sim                  |
| S10-loop-deny-rule-removal     | loop-sim       | patch-sim, gateway-sim     |
| S11-schedule-as-calendar       | serve-sim      | —                          |
| S12-trust-escalation           | patch-sim      | —                          |
| S13-workqueue-read             | serve-sim      | —                          |
| S14-audit-query                | serve-sim      | —                          |
| S15-onboard-content-validation | patch-sim      | security-sim               |

## Finding Count Target

Per the scenario findings depth rule: **5-15 findings per scenario**.
Current range: 6-8. Scenarios should be deepened to 10+ findings during
the implementation phase when concrete edge cases emerge from the code.
