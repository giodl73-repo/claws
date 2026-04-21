/**
 * test/e2e/harness/host-context — CL-07 §1a HostContext construction.
 *
 * The `HostContext` is the 6-field record the harness constructs at
 * `startHarness` time and passes to every provider's `init(ctx)` call:
 *
 *   - `auditSink`          → pulse-43 audit chain writer (write-only contract
 *                            the provider uses to emit sink entries; the real
 *                            chain writer lands in pulse 43, this pulse wires
 *                            a forwardable shape).
 *   - `identityBridge`     → `adapter.extractIdentity` wrapped so the
 *                            provider can resolve principals without depending
 *                            directly on the host-adapter module.
 *   - `approvalHandleSigner` → pulse-38 `hmac-signer.sign` bound to a scenario
 *                              signing key, so providers can mint handles
 *                              without owning the registry.
 *   - `snapshot`           → harness-owned mutable snapshot state with a
 *                            `promote(id)` setter.
 *   - `stageMode`          → current `StageMode`, mutable via the harness's
 *                            `setStageMode` setter.
 *   - `logger`             → structured logger (no `console.log`).
 *
 * Providers receive a frozen view (`Readonly` fields), but the underlying
 * harness-owned state is mutable through the separate `HostContextHandle`
 * returned by `buildHostContext`. This split is load-bearing: a provider
 * cannot accidentally mutate the snapshot or stage-mode, but the harness
 * driver can rotate them between decisions (SC-03 F-01 decision-start
 * capture).
 *
 * @module test/e2e/harness/host-context
 */
import type {
  AuthorizationContext,
  HostAdapter,
  IncomingRequest,
  SinkDecisionEntry,
  SinkApprovalEntry,
} from './host-adapter-test-doubles.ts';
import type { SigningKey } from './hmac-signer.ts';
import { sign as hmacSign } from './hmac-signer.ts';
import type { StageMode } from './provider-lifecycle.ts';

// ---------------------------------------------------------------------------
// Logger — structured, console.log-free.
// ---------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  readonly level: LogLevel;
  readonly message: string;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly emittedAt: number;
}

export interface Logger {
  debug(message: string, fields?: Readonly<Record<string, unknown>>): void;
  info(message: string, fields?: Readonly<Record<string, unknown>>): void;
  warn(message: string, fields?: Readonly<Record<string, unknown>>): void;
  error(message: string, fields?: Readonly<Record<string, unknown>>): void;
}

/**
 * A `ReadableLogger` exposes its accumulated records so tests can assert on
 * emitted log lines. Harness-scoped by default — scenarios get a fresh one.
 */
export interface ReadableLogger extends Logger {
  records(): readonly LogRecord[];
}

export function createLogger(clock: () => number): ReadableLogger {
  const records: LogRecord[] = [];
  const emit = (
    level: LogLevel,
    message: string,
    fields?: Readonly<Record<string, unknown>>,
  ): void => {
    records.push({
      level,
      message,
      fields: fields ?? {},
      emittedAt: clock(),
    });
  };
  return {
    debug: (m, f) => emit('debug', m, f),
    info: (m, f) => emit('info', m, f),
    warn: (m, f) => emit('warn', m, f),
    error: (m, f) => emit('error', m, f),
    records: () => records,
  };
}

// ---------------------------------------------------------------------------
// AuditSink — the write-only surface exposed to providers via HostContext.
// Pulse 43 lands the cross-linked hash-chain writer; this pulse defines the
// interface so every CP-5 pulse can depend on the same shape.
// ---------------------------------------------------------------------------

export type AuditSinkDecisionInput = Omit<
  SinkDecisionEntry,
  'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'
>;

export type AuditSinkApprovalInput = Omit<
  SinkApprovalEntry,
  'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'
>;

export interface AuditSink {
  writeDecision(entry: AuditSinkDecisionInput): Promise<SinkDecisionEntry>;
  writeApproval(entry: AuditSinkApprovalInput): Promise<SinkApprovalEntry>;
}

// ---------------------------------------------------------------------------
// IdentityBridge — thin wrap around adapter.extractIdentity so the provider
// only depends on HostContext, not on the adapter module directly.
// ---------------------------------------------------------------------------

export interface IdentityBridge {
  extract(req: IncomingRequest): Promise<AuthorizationContext>;
}

// ---------------------------------------------------------------------------
// ApprovalHandleSigner — scenario-bound HMAC signer (pulse 38 seam).
// ---------------------------------------------------------------------------

export interface ApprovalHandleSigner {
  readonly keyId: string;
  sign(payload: Uint8Array): string;
}

// ---------------------------------------------------------------------------
// Snapshot — harness-owned mutable snapshot state.
// ---------------------------------------------------------------------------

export interface Snapshot {
  readonly currentId: string | null;
  promote(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// HostContext — the 6-field record passed to every provider.init(ctx).
// ---------------------------------------------------------------------------

export interface HostContext {
  readonly auditSink: AuditSink;
  readonly identityBridge: IdentityBridge;
  readonly approvalHandleSigner: ApprovalHandleSigner;
  readonly snapshot: Snapshot;
  readonly stageMode: StageMode;
  readonly logger: Logger;
}

// ---------------------------------------------------------------------------
// HostContextHandle — harness-side mutator. Providers only see HostContext.
// ---------------------------------------------------------------------------

export interface HostContextHandle {
  readonly context: HostContext;
  setStageMode(mode: StageMode): void;
}

export interface BuildHostContextOptions {
  readonly auditSink: AuditSink;
  readonly adapter: HostAdapter;
  readonly signingKey: SigningKey;
  readonly clock?: () => number;
  readonly initialSnapshotId?: string | null;
  readonly initialStageMode?: StageMode;
  readonly logger?: Logger;
  /** Hook that fires when the harness promotes a snapshot; pulse 41 wires it. */
  readonly onSnapshotPromote?: (id: string) => Promise<void> | void;
}

/**
 * Build the CL-07 §1a `HostContext` + its mutator handle. The context held
 * inside `handle.context` is frozen at the top level, but `snapshot.currentId`
 * and `stageMode` flip through the handle accessors, so providers reading
 * `ctx.snapshot.currentId` at different decision starts see different values
 * (SC-03 F-01).
 */
export function buildHostContext(
  opts: BuildHostContextOptions,
): HostContextHandle {
  const clock = opts.clock ?? (() => Date.now());
  const logger = opts.logger ?? createLogger(clock);

  const adapter = opts.adapter;
  const identityBridge: IdentityBridge = {
    extract: (req) => adapter.extractIdentity(req),
  };

  const signingKey = opts.signingKey;
  const approvalHandleSigner: ApprovalHandleSigner = {
    keyId: signingKey.keyId,
    sign: (payload) => hmacSign(payload, signingKey),
  };

  let snapshotCurrentId: string | null = opts.initialSnapshotId ?? null;
  const snapshot: Snapshot = {
    get currentId(): string | null {
      return snapshotCurrentId;
    },
    promote: async (id: string): Promise<void> => {
      snapshotCurrentId = id;
      if (opts.onSnapshotPromote !== undefined) {
        await opts.onSnapshotPromote(id);
      }
    },
  };

  let stageMode: StageMode = opts.initialStageMode ?? 'current';

  const context: HostContext = {
    auditSink: opts.auditSink,
    identityBridge,
    approvalHandleSigner,
    snapshot,
    get stageMode(): StageMode {
      return stageMode;
    },
    logger,
  };

  return {
    context,
    setStageMode: (mode: StageMode) => {
      stageMode = mode;
    },
  };
}
