# exp-c: WAL Crash Recovery + Event Fanout for Enterprise Governance

**Question**: Q12r -- How does claws map to OC Gateway runtime contracts?
**Experiment**: Design crash-safe governance state using WAL and event fanout for distributing governance decisions to SIEM, audit chain, and real-time dashboards simultaneously.
**Method**: Design analysis (read WAL, CGR chain, GovernanceManager, signal queue, shutdown handlers)
**Date**: 2026-04-11
**Result**: 3-phase crash recovery protocol, governance WAL entry types, event fanout architecture with 4 subscriber tiers, OC Gateway integration.

---

## Part 1: WAL for Governance State

### The Problem

The existing `WalStore` (agent-sdk/src/execute/wal.ts) provides crash-safe execution
state for task dispatch. But governance has its own state that must survive crashes:

| State | What could be lost | Impact of loss |
|-------|-------------------|----------------|
| Pending approval | Agent requested R5 approval, Gateway crashed before response | Agent retries with no record of prior approval request |
| Budget spent | Agent used 45K tokens, Gateway crashed before recording | Budget tracking reset, agent can overspend |
| Audit events | 10 governance decisions made, Gateway crashed before flush | Compliance gap, missing audit trail, broken hash chain |
| Policy state | Mid-policy-update crash | Agent runs with stale or corrupt policy |
| Tension resolution | Multi-reviewer gate mid-negotiation | Reviewers re-negotiate, potentially different outcome |

### Current WAL Design

The existing WalStore has:

```typescript
interface WalEntry {
  readonly id: string;         // Unique entry ID
  readonly timestamp: number;  // Unix epoch ms
  readonly type: string;       // Discriminator
  readonly payload: string;    // Serialized payload
  readonly committed: boolean; // Applied to main state?
}
```

Operations:
- `append(entry)`: Append with advisory file lock
- `recover()`: Read all entries (returns [] if no file)
- `compact(retainMs)`: Remove committed entries older than retention window

The lock uses `fs.open('wx')` with retry/backoff (3 retries, 100ms base). Compaction
uses atomic temp-file + rename. This is solid infrastructure.

### Governance WAL Entry Types

We extend the WAL with governance-specific entry types. The existing `type` discriminator
field carries the governance event type.

```typescript
// Governance WAL entry types (extend WalEntry.type)
type GovernanceWalType =
  // Budget lifecycle
  | 'gov.budget.reserve'      // Tokens reserved before tool call
  | 'gov.budget.commit'       // Tokens actually spent (post-call)
  | 'gov.budget.release'      // Reserved tokens released (call failed/skipped)

  // Approval lifecycle
  | 'gov.approval.requested'  // R5 approval sent to human
  | 'gov.approval.granted'    // Human approved
  | 'gov.approval.denied'     // Human denied
  | 'gov.approval.timeout'    // Approval timed out (deny-default)

  // Audit flush lifecycle
  | 'gov.audit.pending'       // Governance event generated, not yet in CGR chain
  | 'gov.audit.flushed'       // Event written to CGR chain

  // Policy lifecycle
  | 'gov.policy.loading'      // New policy being loaded
  | 'gov.policy.active'       // Policy load complete, active
  | 'gov.policy.rollback'     // Policy rolled back to previous

  // Tension lifecycle
  | 'gov.tension.started'     // Multi-reviewer gate negotiation started
  | 'gov.tension.resolved'    // Negotiation complete
  | 'gov.tension.escalated'   // Negotiation escalated to human

  // Context assembly
  | 'gov.context.assembled'   // Context built (records what was included/excluded)
```

### Budget Reserve/Commit/Release Protocol

The budget protocol uses a two-phase pattern inspired by the WAL's
committed flag. Before a tool call, we RESERVE tokens in the WAL.
After the call, we COMMIT actual usage or RELEASE the reservation.

```
[1] WAL: gov.budget.reserve { toolName, estimatedTokens, agentId }
    committed: false
      |
[2] Tool call executes
      |
[3a] Success: WAL: gov.budget.commit { toolName, actualTokens, agentId }
     Mark reserve entry as committed
     
[3b] Failure: WAL: gov.budget.release { toolName, agentId }
     Mark reserve entry as committed
```

On crash recovery:
- Uncommitted `gov.budget.reserve` entries = tokens that may or may not have been spent
- Conservative recovery: count reserved tokens as spent (over-count, not under-count)
- This means crash recovery may reduce remaining budget, but never allows overspend

```typescript
interface BudgetReservePayload {
  toolName: string;
  estimatedTokens: number;
  agentId: string;
  correlationId: string;
}

interface BudgetCommitPayload {
  toolName: string;
  actualTokens: number;
  agentId: string;
  correlationId: string;
  durationMs: number;
}

// Recovery: reconstruct budget state from WAL
function recoverBudgetState(entries: WalEntry[]): BudgetState {
  let tokensUsed = 0;
  let callsMade = 0;
  const pendingReserves = new Map<string, number>(); // correlationId -> reserved

  for (const entry of entries) {
    const payload = JSON.parse(entry.payload);
    switch (entry.type) {
      case 'gov.budget.reserve':
        pendingReserves.set(payload.correlationId, payload.estimatedTokens);
        break;
      case 'gov.budget.commit':
        tokensUsed += payload.actualTokens;
        callsMade++;
        pendingReserves.delete(payload.correlationId);
        break;
      case 'gov.budget.release':
        pendingReserves.delete(payload.correlationId);
        break;
    }
  }

  // Conservative: count pending reserves as spent
  for (const reserved of pendingReserves.values()) {
    tokensUsed += reserved;
    callsMade++;
  }

  return { tokensUsed, callsMade, elapsed: 0, config: {} };
}
```

### Approval State Recovery

Approvals are the most critical governance state to survive crashes. An R5 tool
call blocked on human approval must resume correctly after a crash.

```
[1] WAL: gov.approval.requested { requestId, action, agentId, timeoutMs, requestedAt }
    committed: false
      |
[2] Gateway crash / restart
      |
[3] Recovery: check WAL for uncommitted gov.approval.requested entries
      |
[4] For each pending approval:
    - If (now - requestedAt) > timeoutMs: auto-deny (timeout)
    - If (now - requestedAt) <= timeoutMs: re-present to human
    - Either way: record result in WAL + audit chain
```

```typescript
interface ApprovalRequestPayload {
  requestId: string;
  action: {
    type: 'tool_call' | 'a2a_delegate' | 'external_api';
    toolName?: string;
    description: string;
  };
  agentId: string;
  timeoutMs: number;
  requestedAt: string;  // ISO 8601
  riskLevel: 'R3' | 'R4' | 'R5';
  correlationId: string;
}

// Recovery: find pending approvals
function recoverPendingApprovals(entries: WalEntry[]): ApprovalRequestPayload[] {
  const requested = new Map<string, ApprovalRequestPayload>();
  const resolved = new Set<string>();

  for (const entry of entries) {
    const payload = JSON.parse(entry.payload);
    switch (entry.type) {
      case 'gov.approval.requested':
        requested.set(payload.requestId, payload);
        break;
      case 'gov.approval.granted':
      case 'gov.approval.denied':
      case 'gov.approval.timeout':
        resolved.add(payload.requestId);
        break;
    }
  }

  // Return requests that have no resolution
  return Array.from(requested.values()).filter(r => !resolved.has(r.requestId));
}

// On recovery: process pending approvals
async function processPendingApprovals(
  pending: ApprovalRequestPayload[],
  governanceHost: GovernanceHost,
  walStore: WalStore,
): Promise<void> {
  for (const approval of pending) {
    const elapsed = Date.now() - new Date(approval.requestedAt).getTime();

    if (elapsed > approval.timeoutMs) {
      // Auto-deny: timeout exceeded during crash
      await walStore.append({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'gov.approval.timeout',
        payload: JSON.stringify({
          requestId: approval.requestId,
          reason: 'timeout-during-crash-recovery',
          elapsedMs: elapsed,
        }),
        committed: true,
      });

      await governanceHost.appendAuditEvent({
        eventId: crypto.randomUUID(),
        type: 'approval.timeout',
        timestamp: new Date().toISOString(),
        actor: { agentId: approval.agentId },
        correlationId: approval.correlationId,
        payload: {
          requestId: approval.requestId,
          reason: 'timeout-during-crash-recovery',
          originalTimeoutMs: approval.timeoutMs,
          actualElapsedMs: elapsed,
        },
      });
    } else {
      // Re-present to human with reduced timeout
      const remainingMs = approval.timeoutMs - elapsed;
      const result = await governanceHost.requestApproval({
        requestId: approval.requestId,
        action: approval.action,
        justification: `[RECOVERED] Original request from before system restart`,
        timeoutMs: remainingMs,
        requester: { agentId: approval.agentId },
        riskLevel: approval.riskLevel,
        correlationId: approval.correlationId,
      });

      const entryType = result.approved ? 'gov.approval.granted'
        : result.timeout ? 'gov.approval.timeout'
        : 'gov.approval.denied';

      await walStore.append({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: entryType,
        payload: JSON.stringify({ requestId: approval.requestId, result }),
        committed: true,
      });
    }
  }
}
```

### Audit Event Buffering

The CGR chain (hash-chained NDJSON) requires sequential append. But governance decisions
happen during tool calls which may be concurrent. The WAL acts as a buffer:

1. Governance decision occurs -> write to WAL as `gov.audit.pending`
2. Background flush loop -> read pending entries -> append to CGR chain -> mark committed
3. On crash -> WAL has pending entries that never reached CGR chain -> replay on recovery

```typescript
class GovernanceAuditBuffer {
  private readonly wal: WalStore;
  private readonly cgrPath: string;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(wal: WalStore, cgrPath: string) {
    this.wal = wal;
    this.cgrPath = cgrPath;
  }

  /**
   * Record a governance event. Writes to WAL immediately (crash-safe).
   * CGR chain append happens asynchronously in flush loop.
   */
  async record(event: GovernanceEvent): Promise<void> {
    await this.wal.append({
      id: event.eventId,
      timestamp: Date.now(),
      type: 'gov.audit.pending',
      payload: JSON.stringify(event),
      committed: false,
    });
  }

  /**
   * Start the background flush loop. Runs every flushIntervalMs.
   */
  startFlushLoop(flushIntervalMs: number = 1000): void {
    this.flushInterval = setInterval(async () => {
      await this.flush();
    }, flushIntervalMs);
  }

  /**
   * Flush all pending audit events to the CGR chain.
   * Called by the flush loop and during shutdown.
   */
  async flush(): Promise<number> {
    const entries = await this.wal.recover();
    const pending = entries.filter(e => e.type === 'gov.audit.pending' && !e.committed);

    let flushed = 0;
    for (const entry of pending) {
      const event = JSON.parse(entry.payload) as GovernanceEvent;

      // Append to CGR chain (sequential, hash-linked)
      await appendCgrEntry(this.cgrPath, {
        type: event.type,
        actor: event.actor.agentId,
        correlationId: event.correlationId,
        ...event.payload,
      });

      // Mark as flushed in WAL
      await this.wal.append({
        id: entry.id,
        timestamp: Date.now(),
        type: 'gov.audit.flushed',
        payload: entry.payload,
        committed: true,
      });

      flushed++;
    }

    return flushed;
  }

  /**
   * Shutdown: flush all pending events, stop loop.
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}
```

### 3-Phase Crash Recovery Protocol

When the OC Gateway (or any GovernanceHost platform) restarts after a crash:

```
Phase 1: WAL Recovery (immediate)
  [1.1] Read WAL entries
  [1.2] Reconstruct budget state (conservative: count reserves as spent)
  [1.3] Identify pending approvals
  [1.4] Identify unflushed audit events
  [1.5] Identify mid-negotiation tensions
  Result: GovernanceRecoveryState

Phase 2: State Reconciliation (before accepting new requests)
  [2.1] Flush pending audit events to CGR chain (restore chain continuity)
  [2.2] Verify CGR chain integrity (detect corruption from crash)
  [2.3] Process pending approvals (timeout or re-present)
  [2.4] Resume or restart tension negotiations
  [2.5] Reload compiled policy (verify hash matches pre-crash version)
  Result: GovernanceReady (or GovernanceDegraded if chain corrupt)

Phase 3: Resume Operations (accept new requests)
  [3.1] Re-register governance handlers with platform
  [3.2] Compact WAL (remove committed entries older than retention)
  [3.3] Emit recovery audit event (records what was recovered)
  [3.4] Resume normal governance enforcement
  Result: GovernanceActive
```

```typescript
interface GovernanceRecoveryState {
  /** Budget state reconstructed from WAL. */
  budget: BudgetState;
  /** Approvals that need resolution. */
  pendingApprovals: ApprovalRequestPayload[];
  /** Audit events not yet in CGR chain. */
  unflushedAuditEvents: GovernanceEvent[];
  /** Tensions mid-negotiation. */
  pendingTensions: TensionNegotiationState[];
  /** WAL entries processed. */
  walEntriesProcessed: number;
  /** Crash timestamp (inferred from last WAL entry). */
  inferredCrashTime: string;
}

async function recoverGovernanceState(
  walStore: WalStore,
  cgrPath: string,
  governanceHost: GovernanceHost,
): Promise<GovernanceRecoveryState> {
  // Phase 1: WAL Recovery
  const entries = await walStore.recover();
  const budget = recoverBudgetState(entries);
  const pendingApprovals = recoverPendingApprovals(entries);
  const unflushed = entries.filter(e => e.type === 'gov.audit.pending' && !e.committed);
  const pendingTensions = recoverTensionState(entries);
  const lastEntry = entries[entries.length - 1];
  const crashTime = lastEntry ? new Date(lastEntry.timestamp).toISOString() : new Date().toISOString();

  return {
    budget,
    pendingApprovals,
    unflushedAuditEvents: unflushed.map(e => JSON.parse(e.payload)),
    pendingTensions,
    walEntriesProcessed: entries.length,
    inferredCrashTime: crashTime,
  };
}

async function reconcileGovernanceState(
  recovery: GovernanceRecoveryState,
  walStore: WalStore,
  cgrPath: string,
  governanceHost: GovernanceHost,
): Promise<{ ready: boolean; degraded: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  // Phase 2.1: Flush pending audit events
  for (const event of recovery.unflushedAuditEvents) {
    try {
      await appendCgrEntry(cgrPath, {
        type: event.type,
        actor: event.actor.agentId,
        recoveredFromCrash: true,
        originalTimestamp: event.timestamp,
        ...event.payload,
      });
    } catch (err) {
      warnings.push(`Failed to flush audit event ${event.eventId}: ${err}`);
    }
  }

  // Phase 2.2: Verify CGR chain
  const chainResult = await verifyCgrChain(cgrPath);
  if (!chainResult.valid) {
    warnings.push(`CGR chain integrity failure at entry ${chainResult.breakPoint}`);
    // Degraded mode: continue with broken chain, alert SIEM
    return { ready: true, degraded: true, warnings };
  }

  // Phase 2.3: Process pending approvals
  await processPendingApprovals(recovery.pendingApprovals, governanceHost, walStore);

  // Phase 2.5: Verify policy
  // (Policy hash checked against compiled artifacts)

  return { ready: true, degraded: false, warnings };
}
```

---

## Part 2: Event Fanout Architecture

### The Problem

Governance decisions must reach multiple consumers simultaneously:

| Consumer | Latency Requirement | Reliability Requirement | Format |
|----------|-------------------|------------------------|--------|
| CGR chain (audit) | <1s | Must not lose events | NDJSON with hash chain |
| SIEM (Splunk/Sentinel) | <5s | At-least-once delivery | Syslog/CEF/JSON over HTTPS |
| Real-time dashboard | <500ms | Best-effort | WebSocket/SSE JSON |
| Compliance report | Batch (hourly/daily) | Must not lose events | Aggregated JSON |
| Budget tracker | <100ms | Must not lose events | In-memory + WAL |

### Existing Pattern: atom:event-fanout (A172)

The atom describes composite event fan-out with re-entrancy guard. The key constraint:
a governance event handler must not trigger another governance event that triggers
the same handler (infinite loop). The re-entrancy guard prevents this.

### 4-Tier Subscriber Architecture

```
                     GovernanceEvent
                           |
                     [Event Router]
                           |
              +------------+------------+
              |            |            |
         Tier 1:      Tier 2:      Tier 3:      Tier 4:
         Critical     Standard     Best-Effort  Batch
         (sync)       (async)      (async)      (deferred)
              |            |            |            |
         CGR chain    SIEM HTTP    WebSocket    Report
         Budget WAL   AlertManager  Dashboard    Aggregator
                      Datadog
```

**Tier 1 (Critical, synchronous)**: Events that must be recorded before the governance
decision takes effect. The CGR chain append and WAL budget commit happen synchronously
in the governance decision path. If Tier 1 fails, the governance decision is retried
or fails closed.

**Tier 2 (Standard, asynchronous)**: Events sent to external systems with at-least-once
delivery. SIEM integration, alerting. Failures are retried with exponential backoff
(matching the existing `sendSignalWithRetry` pattern from GovernanceManager).

**Tier 3 (Best-effort, asynchronous)**: Real-time UI updates. Dropped events are
acceptable (dashboard will catch up on next event). No retry.

**Tier 4 (Batch, deferred)**: Events aggregated for periodic reports. Reads from CGR
chain on a schedule. Never receives events directly.

### Event Router Implementation

```typescript
class GovernanceEventRouter {
  private readonly tier1: CriticalSubscriber[] = [];
  private readonly tier2: StandardSubscriber[] = [];
  private readonly tier3: BestEffortSubscriber[] = [];
  private readonly reentrancyGuard = new Set<string>();
  private readonly deadLetterQueue: GovernanceEvent[] = [];

  /**
   * Emit a governance event to all subscribers by tier.
   *
   * Tier 1 (critical): synchronous, fail = governance decision fails
   * Tier 2 (standard): async with retry, fail = dead-letter queue
   * Tier 3 (best-effort): async fire-and-forget
   *
   * Re-entrancy guard: if this event type is already being processed
   * by this router (e.g., audit event handler triggers another audit
   * event), the nested event is queued for post-processing.
   */
  async emit(event: GovernanceEvent): Promise<EmitResult> {
    // Re-entrancy guard (atom:event-fanout A172)
    if (this.reentrancyGuard.has(event.type)) {
      // Queue for later processing, don't recurse
      this.deadLetterQueue.push(event);
      return { delivered: false, reason: 'reentrancy-queued' };
    }

    this.reentrancyGuard.add(event.type);
    try {
      // Tier 1: Critical (synchronous)
      for (const sub of this.tier1) {
        try {
          await sub.handle(event);
        } catch (err) {
          // Tier 1 failure = governance decision should fail
          return {
            delivered: false,
            reason: 'tier1-failure',
            error: String(err),
            subscriber: sub.name,
          };
        }
      }

      // Tier 2: Standard (async with retry)
      const tier2Promises = this.tier2.map(async (sub) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await sub.handle(event);
            return;
          } catch {
            if (attempt < 2) {
              await sleep(100 * Math.pow(2, attempt));
            }
          }
        }
        // All retries exhausted: dead-letter
        this.deadLetterQueue.push(event);
      });

      // Tier 3: Best-effort (fire-and-forget)
      const tier3Promises = this.tier3.map(async (sub) => {
        try {
          await sub.handle(event);
        } catch {
          // Silently drop
        }
      });

      // Wait for Tier 2 (at-least-once semantics)
      await Promise.all(tier2Promises);

      // Don't wait for Tier 3 (best-effort)
      Promise.all(tier3Promises).catch(() => {});

      return { delivered: true };
    } finally {
      this.reentrancyGuard.delete(event.type);

      // Process any events that were queued during re-entrancy
      if (this.deadLetterQueue.length > 0) {
        const queued = [...this.deadLetterQueue];
        this.deadLetterQueue.length = 0;
        for (const q of queued) {
          await this.emit(q);  // Safe: re-entrancy guard is cleared
        }
      }
    }
  }

  /** Register a critical (Tier 1) subscriber. */
  addCritical(sub: CriticalSubscriber): Disposable {
    this.tier1.push(sub);
    return { dispose: () => { const i = this.tier1.indexOf(sub); if (i >= 0) this.tier1.splice(i, 1); } };
  }

  /** Register a standard (Tier 2) subscriber. */
  addStandard(sub: StandardSubscriber): Disposable {
    this.tier2.push(sub);
    return { dispose: () => { const i = this.tier2.indexOf(sub); if (i >= 0) this.tier2.splice(i, 1); } };
  }

  /** Register a best-effort (Tier 3) subscriber. */
  addBestEffort(sub: BestEffortSubscriber): Disposable {
    this.tier3.push(sub);
    return { dispose: () => { const i = this.tier3.indexOf(sub); if (i >= 0) this.tier3.splice(i, 1); } };
  }
}

interface CriticalSubscriber {
  readonly name: string;
  handle(event: GovernanceEvent): Promise<void>;
}

interface StandardSubscriber {
  readonly name: string;
  handle(event: GovernanceEvent): Promise<void>;
}

interface BestEffortSubscriber {
  readonly name: string;
  handle(event: GovernanceEvent): Promise<void>;
}

interface EmitResult {
  delivered: boolean;
  reason?: string;
  error?: string;
  subscriber?: string;
}
```

### OC Gateway SIEM Integration

The SIEM subscriber (Tier 2) converts governance events to the target format and
sends via HTTP. Supports Splunk HEC, Azure Sentinel, Datadog, and generic webhook.

```typescript
class SiemSubscriber implements StandardSubscriber {
  readonly name = 'siem';
  private readonly endpoint: string;
  private readonly format: 'splunk-hec' | 'sentinel' | 'datadog' | 'webhook';
  private readonly authToken: string;

  constructor(config: SiemConfig) {
    this.endpoint = config.endpoint;
    this.format = config.format;
    this.authToken = config.authToken;
  }

  async handle(event: GovernanceEvent): Promise<void> {
    const payload = this.formatEvent(event);
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`SIEM delivery failed: ${response.status} ${response.statusText}`);
    }
  }

  private formatEvent(event: GovernanceEvent): unknown {
    switch (this.format) {
      case 'splunk-hec':
        return {
          time: new Date(event.timestamp).getTime() / 1000,
          sourcetype: 'claws:governance',
          event: {
            type: event.type,
            actor: event.actor.agentId,
            correlationId: event.correlationId,
            ...event.payload,
          },
        };
      case 'sentinel':
        return {
          TimeGenerated: event.timestamp,
          Category: 'AgentGovernance',
          OperationName: event.type,
          Identity: event.actor.agentId,
          CorrelationId: event.correlationId,
          Properties: event.payload,
        };
      case 'datadog':
        return {
          ddsource: 'claws',
          ddtags: `governance_type:${event.type},agent:${event.actor.agentId}`,
          message: JSON.stringify(event.payload),
          service: 'agent-governance',
          hostname: event.correlationId,
        };
      case 'webhook':
        return event;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    switch (this.format) {
      case 'splunk-hec':
        headers['Authorization'] = `Splunk ${this.authToken}`;
        break;
      case 'sentinel':
        headers['Authorization'] = `SharedKey ${this.authToken}`;
        headers['Log-Type'] = 'AgentGovernance';
        break;
      case 'datadog':
        headers['DD-API-KEY'] = this.authToken;
        break;
      case 'webhook':
        headers['Authorization'] = `Bearer ${this.authToken}`;
        break;
    }
    return headers;
  }
}
```

### Real-Time Dashboard Subscriber

The dashboard subscriber (Tier 3) sends events to connected WebSocket clients.

```typescript
class DashboardSubscriber implements BestEffortSubscriber {
  readonly name = 'dashboard';
  private readonly clients: Set<WebSocket> = new Set();

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    ws.on('close', () => this.clients.delete(ws));
  }

  async handle(event: GovernanceEvent): Promise<void> {
    const message = JSON.stringify({
      type: 'governance-event',
      data: {
        eventType: event.type,
        actor: event.actor.agentId,
        timestamp: event.timestamp,
        summary: this.summarize(event),
      },
    });

    for (const client of this.clients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(message);
      }
    }
  }

  private summarize(event: GovernanceEvent): string {
    switch (event.type) {
      case 'tool.guard.deny':
        return `Blocked tool call: ${event.payload.toolName} (${event.payload.reason})`;
      case 'approval.requested':
        return `Approval needed: ${event.payload.description}`;
      case 'budget.throttle':
        return `Budget throttled at ${event.payload.percent}%`;
      case 'a2a.guard.deny':
        return `Blocked A2A: ${event.payload.sourceAgent} -> ${event.payload.targetAgent}`;
      default:
        return event.type;
    }
  }
}
```

---

## Part 3: OC Gateway Integration

### Wiring It All Together

When `claws init` installs governance into an OC Gateway workspace, it sets up
the WAL, event router, and all subscribers:

```typescript
// OC Gateway governance bootstrap (called during Gateway startup)
async function bootstrapGovernance(
  workspace: string,
  governanceHost: OcGovernanceHost,
): Promise<void> {
  const statePath = join(workspace, '.claws', 'state');
  const walPath = join(statePath, 'governance.wal');
  const cgrPath = join(workspace, '.claws', 'audit', 'chain.jsonl');
  const compiledPath = join(workspace, '.claws', 'compiled');

  // 1. Create WAL and CGR chain if needed
  const wal = new WalStore(walPath);
  await createCgrChain(cgrPath);

  // 2. Crash recovery (Phase 1 + 2)
  const recovery = await recoverGovernanceState(wal, cgrPath, governanceHost);
  const reconciliation = await reconcileGovernanceState(
    recovery, wal, cgrPath, governanceHost,
  );

  if (reconciliation.warnings.length > 0) {
    for (const warning of reconciliation.warnings) {
      console.warn(`[governance] Recovery warning: ${warning}`);
    }
  }

  // 3. Set up event router with all subscribers
  const router = new GovernanceEventRouter();

  // Tier 1: CGR chain (critical)
  const auditBuffer = new GovernanceAuditBuffer(wal, cgrPath);
  router.addCritical({
    name: 'cgr-chain',
    handle: (event) => auditBuffer.record(event),
  });

  // Tier 1: Budget WAL (critical)
  router.addCritical({
    name: 'budget-wal',
    handle: async (event) => {
      if (event.type.startsWith('budget.')) {
        await wal.append({
          id: event.eventId,
          timestamp: Date.now(),
          type: `gov.${event.type}`,
          payload: JSON.stringify(event.payload),
          committed: false,
        });
      }
    },
  });

  // Tier 2: SIEM (if configured)
  const siemConfig = await loadSiemConfig(compiledPath);
  if (siemConfig) {
    router.addStandard(new SiemSubscriber(siemConfig));
  }

  // Tier 3: Dashboard (if enabled)
  if (governanceHost.dashboardEnabled) {
    const dashboard = new DashboardSubscriber();
    router.addBestEffort(dashboard);
    governanceHost.setDashboardSubscriber(dashboard);
  }

  // 4. Start audit flush loop
  auditBuffer.startFlushLoop(1000);

  // 5. Register shutdown handler
  const cleanup = registerShutdownHandlers({
    cancel: async () => {
      await auditBuffer.shutdown();
      await wal.compact(24 * 60 * 60 * 1000); // 24h retention
    },
  });

  // 6. Wire event router into GovernanceHost
  governanceHost.setEventRouter(router);

  // 7. Initialize governance (loads compiled artifacts, registers handlers)
  await governanceHost.initialize({
    compiledArtifactsPath: compiledPath,
    budget: recovery.budget.config,
  });

  // 8. Emit recovery event
  await router.emit({
    eventId: crypto.randomUUID(),
    type: 'health.check',
    timestamp: new Date().toISOString(),
    actor: { agentId: 'system' },
    correlationId: 'startup',
    payload: {
      event: 'governance-recovery-complete',
      walEntriesProcessed: recovery.walEntriesProcessed,
      pendingApprovalsResolved: recovery.pendingApprovals.length,
      unflushedEventsRecovered: recovery.unflushedAuditEvents.length,
      degraded: reconciliation.degraded,
      warnings: reconciliation.warnings,
    },
  });
}
```

### WAL Compaction Strategy

The WAL grows unbounded without compaction. Compaction removes committed entries
older than the retention window. For governance:

| Entry Type | Retention | Reason |
|-----------|-----------|--------|
| `gov.budget.*` | 24 hours | Budget resets daily; stale budget data is meaningless |
| `gov.approval.*` | 7 days | Approvals may need review; 7d matches audit retention |
| `gov.audit.flushed` | 1 hour | Already in CGR chain; WAL copy is redundant |
| `gov.audit.pending` | Never compact | Must be flushed first |
| `gov.tension.*` | 24 hours | Tension state is transient |
| `gov.policy.*` | 7 days | Policy history for rollback |
| `gov.context.*` | 1 hour | Context assembly is ephemeral |

The WalStore.compact(retainMs) method handles this. For type-specific retention,
the compaction logic filters by entry type:

```typescript
async function compactGovernanceWal(wal: WalStore): Promise<void> {
  // Standard compaction: remove committed entries older than 24h
  await wal.compact(24 * 60 * 60 * 1000);

  // Note: uncommitted gov.audit.pending entries are never removed by compact()
  // because compact() only removes entries where committed === true.
  // This is the correct behavior: pending audit events must survive compaction.
}
```

---

## Key Design Decisions

**D1: Conservative budget recovery.** On crash, uncommitted budget reserves are counted
as spent. This may reduce available budget after restart, but it never allows overspend.
An enterprise would rather have an agent stopped early than run over budget.

**D2: Approval timeout survives crash.** The timeout clock does not reset on restart.
If an approval was requested 4 minutes ago with a 5-minute timeout, only 1 minute
remains after recovery. This prevents indefinite approval windows.

**D3: CGR chain is the source of truth for audit.** The WAL is a write buffer. The CGR
chain (hash-linked NDJSON) is the permanent record. On recovery, unflushed WAL events
are replayed to the CGR chain with a `recoveredFromCrash: true` flag.

**D4: Tier 1 failure blocks governance decisions.** If the CGR chain append fails, the
tool call is denied. This ensures every governance decision has an audit record. The
alternative (allow the call, log later) creates compliance gaps.

**D5: Re-entrancy guard prevents infinite loops.** An audit event handler that triggers
another audit event (e.g., "budget.throttle" triggers an alert which triggers a SIEM
event which triggers...) is caught by the re-entrancy guard. The nested event is queued
and processed after the current event completes.

**D6: SIEM format is platform-specific, event schema is universal.** The `GovernanceEvent`
type is the same across all platforms. The SIEM subscriber converts to Splunk HEC,
Azure Sentinel, Datadog, or generic webhook format. The claws-compiled governance
configuration specifies which SIEM format to use.
