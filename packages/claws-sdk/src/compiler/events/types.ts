/**
 * `CompilerEvent` — typed discriminated union of every compile-pipeline event.
 *
 * Every variant shares three invariants from CL-14 §9.2 + §9.3:
 *   • `type` is the discriminator.
 *   • `workspace: string` identifies the workspace (fleet-mode correlation).
 *   • `monotonicNs: bigint` is a monotonic nanosecond timestamp
 *     (`process.hrtime.bigint()`-sourced). Wall-clock is NEVER authoritative.
 *   • `wallClockIso?: string` is an optional operator-log sidecar — the bus
 *     MAY populate it when a caller-supplied `now` or compiler wall-clock is
 *     available, but consumers MUST NOT use it for duration math.
 *
 * Stability: this surface is extension-only per CL-14 §9.5.
 * Payload fields MAY be added in minor versions; consumers MUST treat the
 * union as open-set (ignore unknown `type` values; do not rely on field
 * absence as negative signal).
 *
 * @module claws-sdk/compiler/events/types
 */
import type { StageName } from '../cache/types.js';
import type { EmitTarget, EmittedFile } from '../emit/types.js';
import type { FailClosedViolation } from '../enforce/types.js';
import type { ValidationReport } from '../validate/types.js';
import type { CompileDiagnostic, CompileResult } from '../host/types.js';

/** Shared timing / routing envelope carried by every variant. */
interface EventEnvelope {
  readonly workspace: string;
  readonly monotonicNs: bigint;
  readonly wallClockIso?: string;
}

export interface CompileStartEvent extends EventEnvelope {
  readonly type: 'compile.start';
  readonly contentHash: string;
  readonly targets: readonly EmitTarget[];
  readonly cacheEnabled: boolean;
  readonly now: string;
}

export interface ReadStartEvent extends EventEnvelope {
  readonly type: 'read.start';
  readonly stage: StageName;
  readonly inputPath: string;
}

export interface ReadCompleteEvent extends EventEnvelope {
  readonly type: 'read.complete';
  readonly stage: StageName;
  readonly cacheHit: boolean;
  readonly durationMs: number;
  readonly byteHash: string;
}

export interface ReadFailedEvent extends EventEnvelope {
  readonly type: 'read.failed';
  readonly stage: StageName;
  readonly error: string;
}

export interface EnforceStartEvent extends EventEnvelope {
  readonly type: 'enforce.start';
  readonly violationCount: number;
}

export interface EnforceDeniedEvent extends EventEnvelope {
  readonly type: 'enforce.denied';
  readonly violations: readonly FailClosedViolation[];
  readonly severity: 'critical' | 'high' | 'medium';
}

export interface EnforceCompleteEvent extends EventEnvelope {
  readonly type: 'enforce.complete';
  readonly durationMs: number;
}

export interface EmitStartEvent extends EventEnvelope {
  readonly type: 'emit.start';
  readonly target: EmitTarget;
}

export interface EmitCompleteEvent extends EventEnvelope {
  readonly type: 'emit.complete';
  readonly target: EmitTarget;
  readonly files: readonly EmittedFile[];
  readonly durationMs: number;
}

export interface EmitFailedEvent extends EventEnvelope {
  readonly type: 'emit.failed';
  readonly target: EmitTarget;
  readonly error: string;
}

export interface ValidateStartEvent extends EventEnvelope {
  readonly type: 'validate.start';
  readonly target: EmitTarget;
}

export interface ValidateCompleteEvent extends EventEnvelope {
  readonly type: 'validate.complete';
  readonly target: EmitTarget;
  readonly report: ValidationReport;
  readonly durationMs: number;
}

export interface ValidateFailedEvent extends EventEnvelope {
  readonly type: 'validate.failed';
  readonly target: EmitTarget;
  readonly report: ValidationReport;
}

/**
 * `stage` absent → compile-level cache boundary (the keyed-by-content-hash
 * cache around the whole pipeline).
 * `stage` present → per-stage cache boundary (CL-04 §IS-1 incremental
 * stages). Consumers distinguishing the two MUST branch on the presence
 * of `stage`.
 */
export interface CacheHitEvent extends EventEnvelope {
  readonly type: 'cache.hit';
  readonly key: string;
  readonly stage?: StageName;
}

export interface CacheMissEvent extends EventEnvelope {
  readonly type: 'cache.miss';
  readonly key: string;
  readonly stage?: StageName;
}

/**
 * Fires ONLY on the success path per CL-14 §9.3 amendment. A `compile()`
 * that denies via enforce, throws in emit, or fails validate MUST NOT emit
 * `cache.write` and MUST NOT persist a cache entry. `hot-reload/S01-F07`
 * is the originating finding.
 */
export interface CacheWriteEvent extends EventEnvelope {
  readonly type: 'cache.write';
  readonly key: string;
  readonly stage?: StageName;
  readonly sizeBytes: number;
}

export interface CompileCompleteEvent extends EventEnvelope {
  readonly type: 'compile.complete';
  readonly durationMs: number;
  readonly result: CompileResult;
}

export interface CompileFailedEvent extends EventEnvelope {
  readonly type: 'compile.failed';
  readonly durationMs: number;
  readonly diagnostics: readonly CompileDiagnostic[];
}

/**
 * Fires when a running compile is aborted mid-flight — paired with watch-mode
 * cancellation (claws watch SIGINT, an in-flight compile-queue stale-discard,
 * or an explicit `AbortSignal`). Distinct from `compile.failed` because the
 * compile did not produce diagnostics or a result; it was interrupted before
 * the normal terminal event could fire. Consumers MUST treat cancellation as
 * "no outcome" — not a success and not a validation-style failure.
 */
export interface CompileCancelledEvent extends EventEnvelope {
  readonly type: 'compile.cancelled';
  readonly durationMs: number;
  readonly reason: string;
}

/**
 * Fires when an existing stage-cache or compile-level-cache entry is
 * evicted under pressure (LRU, quota, TTL, or an explicit `cache clear`).
 * Scoped diagnostics and operators MAY subscribe to cache churn analysis;
 * consumers MUST treat this as advisory — the next compile will rebuild
 * the entry from scratch, so evictions never affect correctness.
 */
export interface CacheEvictedEvent extends EventEnvelope {
  readonly type: 'cache.evicted';
  readonly key: string;
  readonly stage?: StageName;
  readonly reason: 'lru' | 'quota' | 'ttl' | 'clear';
  readonly sizeBytes: number;
}

/**
 * The discriminated union every listener switches on. Per CL-14 §9.3
 * amendment every variant carries `workspace` and `monotonicNs`.
 */
export type CompilerEvent =
  | CompileStartEvent
  | ReadStartEvent
  | ReadCompleteEvent
  | ReadFailedEvent
  | EnforceStartEvent
  | EnforceDeniedEvent
  | EnforceCompleteEvent
  | EmitStartEvent
  | EmitCompleteEvent
  | EmitFailedEvent
  | ValidateStartEvent
  | ValidateCompleteEvent
  | ValidateFailedEvent
  | CacheHitEvent
  | CacheMissEvent
  | CacheWriteEvent
  | CacheEvictedEvent
  | CompileCompleteEvent
  | CompileFailedEvent
  | CompileCancelledEvent;

/**
 * Minimal logger shape the bus uses to surface listener exceptions. The
 * compile host supplies `console` by default; callers may inject a narrower
 * implementation (e.g. a structured logger) via `CompilerEventBus` options.
 */
export interface CompilerEventLogger {
  /* c8 ignore next -- injected implementations vary; interface contract only. */
  error(...args: unknown[]): void;
}
