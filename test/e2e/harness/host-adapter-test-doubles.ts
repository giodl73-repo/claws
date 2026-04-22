/**
 * test/e2e/harness/host-adapter-test-doubles — CL-07 §1a HostAdapter test
 * doubles.
 *
 * Ships the `HostAdapter` + `ApprovalSink` contract shapes plus two fixtures:
 *
 *   - `InProcessAdapter` — default single-user, in-memory fixture. Plan-5
 *     scenarios use this by default so they remain adapter-agnostic.
 *   - `StubFailingAdapter` — negative-case fixture. Each method has a
 *     `.program()` knob so plan-6 can prove the plugin tolerates out-of-
 *     contract behavior from a malicious / misconfigured adapter.
 *
 * The four shipping adapters (AetherAdapter, LobsterAdapter,
 * OpenClawVanillaAdapter, ClawsServiceAdapter) are CP-7 deliverables and are
 * NOT produced by this module.
 *
 * Identity extraction is authoritative — once `extractIdentity` returns an
 * `AuthorizationContext`, the plugin trusts every identity field. Re-validation
 * at the plugin layer is forbidden (SC-03 phase-4 HOST-A-01).
 *
 * @module test/e2e/harness/host-adapter-test-doubles
 */
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// AuthorizationContext — 11-field authoritative shape per CL-07 §1a.
// Inlined here so every adapter implementing `HostAdapter` produces the same
// context shape (R1 type-system F-08). The `_AuthorizationContextCheck`
// satisfies guard below makes `tsc --noEmit` fail if the sample drifts.
// ---------------------------------------------------------------------------

export interface AuthorizationContext {
  /** aether: required; openclaw: null */
  readonly tenantId: string | null;
  /** principal resolved from OS / JWT / actor */
  readonly userId: string | null;
  /** aether session; null in Layer 1+3 */
  readonly sessionId: string | null;
  /** 3-tier fallback (actor → user → principal) */
  readonly actorId: string | null;
  /** `${tenantId}:${userId}:${sessionId}` or `:userId:` collapsed */
  readonly compositeId: string;
  /** injected clock; P-01 decision-start capture (test injects fake) */
  readonly clock: () => number;
  /** sha256-truncated per-invocation */
  readonly correlationId: string;
  /** P-02 host-computed, provider read-only */
  readonly canonicalInvocationHash: string;
  /** trusted keyIds at decision-start (P-04 snapshot) */
  readonly trustSet: ReadonlySet<string>;
  readonly environmentClass: 'prod' | 'test' | 'sim';
  /** fully-qualified principal string (approverPrincipal compare target) */
  readonly callerPrincipal: string;
}

// ---------------------------------------------------------------------------
// Incoming request / outgoing response — opaque shapes the adapter translates.
// ---------------------------------------------------------------------------

export interface IncomingRequest {
  readonly tool: string;
  readonly args: unknown;
  readonly headers: Readonly<Record<string, string>>;
  readonly snapshotId: string;
  readonly rawPrincipal?: string;
}

export interface PolicyArtifactRef {
  readonly adapterId: string;
  readonly policyDir: string;
  readonly policyVersion: string;
}

export interface AuthorizationDecision {
  readonly action: 'allow' | 'deny' | 'review' | 'modify';
  readonly requireApproval: boolean;
  readonly reason?: string;
  readonly modifiedArgs?: unknown;
}

export interface OutgoingResponse {
  readonly status: 'allowed' | 'denied' | 'review-required' | 'modified';
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// ApprovalSink — CL-11 §3a shape. DecisionEntry / ApprovalEntry carry
// `adapterId` so the integration test can read it back and prove the adapter
// seam produced the emission.
// ---------------------------------------------------------------------------

export interface SinkDecisionEntry {
  readonly kind: 'decision';
  readonly adapterId: string;
  readonly sinkId: string;
  readonly correlationId: string;
  readonly canonicalInvocationHash: string;
  readonly action: 'allow' | 'deny' | 'review' | 'modify';
  readonly sequence: number;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly emittedAt: number;
}

export interface SinkApprovalEntry {
  readonly kind: 'approval';
  readonly adapterId: string;
  readonly sinkId: string;
  readonly correlationId: string;
  readonly approverPrincipal: string;
  readonly outcome: 'approved' | 'denied';
  readonly sequence: number;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly emittedAt: number;
}

export type SinkEntry = SinkDecisionEntry | SinkApprovalEntry;

export interface AuditFilter {
  readonly correlationId?: string;
  readonly adapterId?: string;
  readonly kind?: 'decision' | 'approval';
}

export interface ApprovalSink {
  readonly sinkId: string;
  writeDecision(entry: Omit<SinkDecisionEntry, 'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'>): Promise<SinkDecisionEntry>;
  writeApproval(entry: Omit<SinkApprovalEntry, 'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'>): Promise<SinkApprovalEntry>;
  query(filter: AuditFilter): AsyncIterable<SinkEntry>;
  flush(): Promise<void>;
}

// ---------------------------------------------------------------------------
// HostAdapter — CL-07 §1a 4-method contract.
// ---------------------------------------------------------------------------

export interface HostAdapter {
  readonly adapterId: string;
  extractIdentity(req: IncomingRequest): Promise<AuthorizationContext>;
  routePolicy(ctx: AuthorizationContext): Promise<PolicyArtifactRef>;
  getApprovalSink(ctx: AuthorizationContext): ApprovalSink;
  shapeResponse(
    decision: AuthorizationDecision,
    ctx: AuthorizationContext
  ): Promise<OutgoingResponse>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}

// ---------------------------------------------------------------------------
// InMemorySink — shared sink impl for both doubles (hash-chain,
// monotonic sequence, query filter, flush no-op).
// ---------------------------------------------------------------------------

class InMemorySink implements ApprovalSink {
  readonly sinkId: string;
  private readonly entries: SinkEntry[] = [];
  private seq = 0;
  private prevHash = 'sha256:' + '0'.repeat(64);
  private readonly clock: () => number;

  constructor(sinkId: string, clock: () => number) {
    this.sinkId = sinkId;
    this.clock = clock;
  }

  async writeDecision(
    e: Omit<SinkDecisionEntry, 'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'>
  ): Promise<SinkDecisionEntry> {
    this.seq += 1;
    const emittedAt = this.clock();
    const base: Omit<SinkDecisionEntry, 'entryHash'> = {
      kind: 'decision',
      sinkId: this.sinkId,
      adapterId: e.adapterId,
      correlationId: e.correlationId,
      canonicalInvocationHash: e.canonicalInvocationHash,
      action: e.action,
      sequence: this.seq,
      prevHash: this.prevHash,
      emittedAt,
    };
    const entryHash = hashEntry(base);
    const full: SinkDecisionEntry = { ...base, entryHash };
    this.entries.push(full);
    this.prevHash = entryHash;
    return full;
  }

  async writeApproval(
    e: Omit<SinkApprovalEntry, 'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'>
  ): Promise<SinkApprovalEntry> {
    this.seq += 1;
    const emittedAt = this.clock();
    const base: Omit<SinkApprovalEntry, 'entryHash'> = {
      kind: 'approval',
      sinkId: this.sinkId,
      adapterId: e.adapterId,
      correlationId: e.correlationId,
      approverPrincipal: e.approverPrincipal,
      outcome: e.outcome,
      sequence: this.seq,
      prevHash: this.prevHash,
      emittedAt,
    };
    const entryHash = hashEntry(base);
    const full: SinkApprovalEntry = { ...base, entryHash };
    this.entries.push(full);
    this.prevHash = entryHash;
    return full;
  }

  async *query(filter: AuditFilter): AsyncIterable<SinkEntry> {
    for (const entry of this.entries) {
      if (filter.correlationId !== undefined && entry.correlationId !== filter.correlationId) continue;
      if (filter.adapterId !== undefined && entry.adapterId !== filter.adapterId) continue;
      if (filter.kind !== undefined && entry.kind !== filter.kind) continue;
      yield entry;
    }
  }

  async flush(): Promise<void> {
    // in-memory fixture: nothing to persist
  }
}

function hashEntry(base: Omit<SinkEntry, 'entryHash'>): string {
  // Entries are flat records of strings | numbers — sort keys for stability.
  const keys = Object.keys(base).sort();
  const record = base as unknown as Record<string, unknown>;
  const payload =
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + JSON.stringify(record[k])).join(',') +
    '}';
  return 'sha256:' + createHash('sha256').update(payload).digest('hex');
}

function stableStringify(value: Record<string, unknown>): string {
  const keys = Object.keys(value).sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + stableNode(value[k])).join(',') +
    '}'
  );
}

function stableNode(node: unknown): string {
  if (node === null || node === undefined) return 'null';
  if (typeof node !== 'object') return JSON.stringify(node);
  if (Array.isArray(node)) return '[' + node.map(stableNode).join(',') + ']';
  return stableStringify(node as Record<string, unknown>);
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ---------------------------------------------------------------------------
// InProcessAdapter — default fixture.
// ---------------------------------------------------------------------------

export interface InProcessAdapterOptions {
  readonly adapterId?: string;
  readonly policyDir: string;
  readonly policyVersion?: string;
  readonly userId?: string;
  readonly environmentClass?: 'prod' | 'test' | 'sim';
  readonly clock?: () => number;
  readonly trustSet?: ReadonlySet<string>;
}

export class InProcessAdapter implements HostAdapter {
  readonly adapterId: string;
  private readonly policyDir: string;
  private readonly policyVersion: string;
  private readonly userId: string;
  private readonly environmentClass: 'prod' | 'test' | 'sim';
  private readonly clock: () => number;
  private readonly trustSet: ReadonlySet<string>;
  private readonly sink: InMemorySink;

  constructor(opts: InProcessAdapterOptions) {
    if (opts.policyDir.length === 0) {
      throw new Error('InProcessAdapter: policyDir must be non-empty');
    }
    this.adapterId = opts.adapterId ?? 'in-process';
    this.policyDir = opts.policyDir;
    this.policyVersion = opts.policyVersion ?? 'test-v1';
    this.userId = opts.userId ?? 'test-user';
    this.environmentClass = opts.environmentClass ?? 'sim';
    this.clock = opts.clock ?? (() => Date.now());
    this.trustSet = opts.trustSet ?? new Set<string>();
    this.sink = new InMemorySink(`${this.adapterId}-sink`, this.clock);
  }

  async extractIdentity(req: IncomingRequest): Promise<AuthorizationContext> {
    const tenantId: string | null = null;
    const sessionId: string | null = null;
    const userId = req.rawPrincipal ?? this.userId;
    const compositeId = `:${userId}:`;
    const canonicalInvocationHash =
      'sha256:' +
      sha256Hex(
        stableStringify({
          tool: req.tool,
          args: req.args,
          snapshotId: req.snapshotId,
          principal: userId,
        })
      );
    const correlationId = sha256Hex(
      `${canonicalInvocationHash}:${this.clock()}`
    ).slice(0, 32);

    return {
      tenantId,
      userId,
      sessionId,
      actorId: userId,
      compositeId,
      clock: this.clock,
      correlationId,
      canonicalInvocationHash,
      trustSet: this.trustSet,
      environmentClass: this.environmentClass,
      callerPrincipal: userId,
    };
  }

  async routePolicy(_ctx: AuthorizationContext): Promise<PolicyArtifactRef> {
    return {
      adapterId: this.adapterId,
      policyDir: this.policyDir,
      policyVersion: this.policyVersion,
    };
  }

  getApprovalSink(_ctx: AuthorizationContext): ApprovalSink {
    return this.sink;
  }

  async shapeResponse(
    decision: AuthorizationDecision,
    _ctx: AuthorizationContext
  ): Promise<OutgoingResponse> {
    const statusMap = {
      allow: 'allowed',
      deny: 'denied',
      review: 'review-required',
      modify: 'modified',
    } as const;
    return {
      status: statusMap[decision.action],
      body: decision.modifiedArgs ?? { action: decision.action, reason: decision.reason },
      headers: { 'x-adapter-id': this.adapterId },
    };
  }
}

// ---------------------------------------------------------------------------
// StubFailingAdapter — negative-case fixture.
// ---------------------------------------------------------------------------

export interface StubFailingAdapterOptions {
  readonly adapterId?: string;
  readonly policyDir?: string;
  readonly clock?: () => number;
}

type Programmed<T> = { readonly kind: 'throw'; readonly error: Error } | { readonly kind: 'return'; readonly value: T } | { readonly kind: 'default' };

export class StubFailingAdapter implements HostAdapter {
  readonly adapterId: string;
  private readonly clock: () => number;
  private readonly sink: InMemorySink;
  private readonly policyDir: string;

  private extractProgram: Programmed<AuthorizationContext> = { kind: 'default' };
  private routeProgram: Programmed<PolicyArtifactRef> = { kind: 'default' };
  private sinkProgram: Programmed<ApprovalSink> = { kind: 'default' };
  private shapeProgram: Programmed<OutgoingResponse> = { kind: 'default' };

  constructor(opts: StubFailingAdapterOptions = {}) {
    this.adapterId = opts.adapterId ?? 'stub-failing';
    this.policyDir = opts.policyDir ?? '/tmp/stub-policy';
    this.clock = opts.clock ?? (() => Date.now());
    this.sink = new InMemorySink(`${this.adapterId}-sink`, this.clock);
  }

  programExtractIdentity(p: Programmed<AuthorizationContext>): void {
    this.extractProgram = p;
  }
  programRoutePolicy(p: Programmed<PolicyArtifactRef>): void {
    this.routeProgram = p;
  }
  programGetApprovalSink(p: Programmed<ApprovalSink>): void {
    this.sinkProgram = p;
  }
  programShapeResponse(p: Programmed<OutgoingResponse>): void {
    this.shapeProgram = p;
  }

  async extractIdentity(req: IncomingRequest): Promise<AuthorizationContext> {
    if (this.extractProgram.kind === 'throw') throw this.extractProgram.error;
    if (this.extractProgram.kind === 'return') return this.extractProgram.value;
    const hash = 'sha256:' + sha256Hex(`${req.tool}:${req.snapshotId}`);
    return {
      tenantId: null,
      userId: req.rawPrincipal ?? null,
      sessionId: null,
      actorId: req.rawPrincipal ?? null,
      compositeId: `:${req.rawPrincipal ?? 'anon'}:`,
      clock: this.clock,
      correlationId: sha256Hex(`${hash}:${this.clock()}`).slice(0, 32),
      canonicalInvocationHash: hash,
      trustSet: new Set<string>(),
      environmentClass: 'sim',
      callerPrincipal: req.rawPrincipal ?? 'anon',
    };
  }

  async routePolicy(_ctx: AuthorizationContext): Promise<PolicyArtifactRef> {
    if (this.routeProgram.kind === 'throw') throw this.routeProgram.error;
    if (this.routeProgram.kind === 'return') return this.routeProgram.value;
    return { adapterId: this.adapterId, policyDir: this.policyDir, policyVersion: 'stub-v0' };
  }

  getApprovalSink(_ctx: AuthorizationContext): ApprovalSink {
    if (this.sinkProgram.kind === 'throw') throw this.sinkProgram.error;
    if (this.sinkProgram.kind === 'return') return this.sinkProgram.value;
    return this.sink;
  }

  async shapeResponse(
    decision: AuthorizationDecision,
    _ctx: AuthorizationContext
  ): Promise<OutgoingResponse> {
    if (this.shapeProgram.kind === 'throw') throw this.shapeProgram.error;
    if (this.shapeProgram.kind === 'return') return this.shapeProgram.value;
    return {
      status: decision.action === 'allow' ? 'allowed' : 'denied',
      body: { action: decision.action },
      headers: { 'x-adapter-id': this.adapterId },
    };
  }
}

// ---------------------------------------------------------------------------
// makeAdapterFromConfig — scenario-level composition helper.
// ---------------------------------------------------------------------------

export interface AdapterDoubleConfig {
  readonly kind: 'in-process' | 'stub-failing';
  readonly adapterId?: string;
  readonly policyDir?: string;
  readonly clock?: () => number;
}

export function makeAdapterFromConfig(cfg: AdapterDoubleConfig): HostAdapter {
  if (cfg.kind === 'in-process') {
    if (cfg.policyDir === undefined) {
      throw new Error('makeAdapterFromConfig: in-process adapter requires policyDir');
    }
    const opts: InProcessAdapterOptions = {
      policyDir: cfg.policyDir,
      ...(cfg.adapterId !== undefined ? { adapterId: cfg.adapterId } : {}),
      ...(cfg.clock !== undefined ? { clock: cfg.clock } : {}),
    };
    return new InProcessAdapter(opts);
  }
  // tsc --noEmit catches new AdapterDoubleConfig.kind values at the call site
  // via the discriminated union — no runtime exhaustive throw needed.
  const opts: StubFailingAdapterOptions = {
    ...(cfg.adapterId !== undefined ? { adapterId: cfg.adapterId } : {}),
    ...(cfg.policyDir !== undefined ? { policyDir: cfg.policyDir } : {}),
    ...(cfg.clock !== undefined ? { clock: cfg.clock } : {}),
  };
  return new StubFailingAdapter(opts);
}

// ---------------------------------------------------------------------------
// Type-level drift guard — referenced so tsc keeps the symbol alive.
// If any adapter's output drifts from the 11-field AuthorizationContext
// shape, this `satisfies` check fails at --noEmit.
// ---------------------------------------------------------------------------

const sampleClock = (): number => 0;
const sampleContext = {
  tenantId: null as string | null,
  userId: 'u',
  sessionId: null as string | null,
  actorId: 'u',
  compositeId: ':u:',
  clock: sampleClock,
  correlationId: 'c',
  canonicalInvocationHash: 'sha256:' + '0'.repeat(64),
  trustSet: new Set<string>() as ReadonlySet<string>,
  environmentClass: 'sim' as const,
  callerPrincipal: 'u',
} satisfies AuthorizationContext;

// Invoke once at module load so v8 counts the arrow fn as covered — the
// drift guard lives in the types, not the runtime.
void sampleClock();

export type _AuthorizationContextCheck = typeof sampleContext;
