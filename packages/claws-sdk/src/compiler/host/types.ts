/**
 * Compilation host types -- inputs and outputs for the `compile()` entry.
 *
 * `compile()` wires together pulses 1..10 and produces a structured
 * CompileResult. All types here are plain JSON-serializable shapes so the
 * full result can be round-tripped through the cache.
 *
 * @module claws-sdk/compiler/host/types
 */

import type { EmitTarget, EmitResult } from '../emit/types.js';
import type { ValidationReport } from '../validate/types.js';
import type { AuditChain } from '../audit/chain.js';
import type { CompilerEventBus } from '../events/bus.js';
import type { StageName as CacheStageName } from '../cache/types.js';

/**
 * Named pipeline stage for per-stage incremental caching (CL-04 §IS.3).
 *
 * 9 reader leaves followed by 5 downstream stages, in canonical order. The
 * order is part of the contract: `stageTimings` consumers rely on iterating
 * it deterministically. Re-exported from `cache/types.js` so the whole
 * compiler shares a single authoritative `StageName` surface.
 */
export type StageName = Extract<
  CacheStageName,
  | 'soul'
  | 'tools'
  | 'agents'
  | 'memory'
  | 'identity'
  | 'user'
  | 'heartbeat'
  | 'skills'
  | 'lobster'
  | 'modelToIR'
  | 'baselineAnalysis'
  | 'enforceR5'
  | 'emit'
  | 'validate'
>;

/**
 * Per-stage timing entry exposed on `CompileResult.stageTimings` (§IS.4).
 *
 * `cacheHit` is `true` when the stage was served from the per-stage cache
 * OR synthesized from a compile-level cache hit. `durationMs` is wall-clock
 * for the stage run — cache hits report the hit-path duration, not a fake
 * zero. `byteHash` equals the stage's effective cache-key input hash so
 * consumers can trace a timing entry back to its on-disk entry.
 */
export interface StageTiming {
  readonly stage: StageName;
  readonly cacheHit: boolean;
  readonly durationMs: number;
  readonly byteHash: string;
}

/**
 * A single diagnostic produced by the compilation host.
 *
 * Mirrors the narrower shape used across readers/sidecar/emit; carries the
 * pipeline stage so consumers can filter/group by origin.
 */
export interface CompileDiagnostic {
  /** Short stable code (e.g. `HOST-001`, `CACHE-MISS`). */
  readonly code: string;
  /** Severity classification. */
  readonly severity: 'error' | 'warning' | 'info';
  /** Human-readable message. */
  readonly message: string;
  /** Pipeline stage that produced the diagnostic. */
  readonly stage: CompileStage;
}

/**
 * Pipeline stages the host walks through -- surfaced on diagnostics.
 */
export type CompileStage =
  | 'read'
  | 'sidecar'
  | 'ir'
  | 'enforce'
  | 'emit'
  | 'validate'
  | 'cache'
  | 'audit';

/**
 * Options passed to `compile()`.
 */
export interface CompileOptions {
  /** Emit targets to produce artifacts for. Must be a subset of the free-tier targets. */
  readonly targets: readonly EmitTarget[];
  /** Directory where emitted artifacts are written. */
  readonly outputDir: string;
  /** Enable the content-addressable compilation cache. */
  readonly cacheEnabled: boolean;
  /** Directory where the compilation cache lives. Required when `cacheEnabled` is true. */
  readonly cacheDir?: string;
  /** Maximum cache size in bytes when caching is enabled. */
  readonly cacheMaxSize?: number;
  /** When true, emitters skip disk writes. */
  readonly dryRun?: boolean;
  /** When true, emitters emit info-level diagnostics as well. */
  readonly verbose?: boolean;
  /**
   * ISO 8601 timestamp to embed as `IR.compiler.compiledAt`. Defaults to a
   * fixed epoch (`'1970-01-01T00:00:00.000Z'`) so two compiles on
   * byte-identical input produce byte-identical output. Callers that want
   * wall-clock semantics should pass `new Date().toISOString()`.
   */
  readonly now?: string;
  /**
   * Optional audit chain. When provided, the host appends signed entries at
   * each pipeline stage boundary (`compile.start`, `enforce.*`, `emit.*`,
   * `validate.*`, `compile.complete` / `compile.failed`). Chain construction
   * and verification is the caller's responsibility.
   */
  readonly auditChain?: AuditChain;
  /**
   * Optional `CompilerEventBus` hook surface (CL-14 §9). When provided, the
   * host fires typed events at every stage boundary (`compile.start`,
   * `read.*`, `enforce.*`, `emit.*`, `validate.*`, `cache.*`,
   * `compile.complete` / `compile.failed`). Absence is zero-cost: no bus
   * is allocated and no events fire. Listeners observe only — the bus does
   * not gate, mutate, or block the compile.
   */
  readonly events?: CompilerEventBus;
}

/**
 * Outcome of a `compile()` call.
 *
 * Populated on both success and failure -- the `success` flag and
 * `diagnostics` convey the overall verdict. On a cache hit, the result is
 * returned verbatim from the cache and `cacheHit` is true.
 */
export interface CompileResult {
  /** True iff the pipeline produced emit artifacts without fatal errors. */
  readonly success: boolean;
  /** Whether this result was served from the cache. */
  readonly cacheHit: boolean;
  /** Emit results keyed by target. Empty when emit did not run. */
  readonly emitResults: Readonly<Record<EmitTarget, EmitResult>>;
  /** The validation report produced after emit. `undefined` when validate did not run. */
  readonly validationReport?: ValidationReport;
  /** Wall-clock duration in milliseconds, from entry to exit. */
  readonly duration: number;
  /** Aggregated diagnostics across all pipeline stages. */
  readonly diagnostics: readonly CompileDiagnostic[];
  /** Content hash of the workspace input; stable across compiles of identical input. */
  readonly contentHash: string;
  /**
   * Per-stage outcomes in canonical order (CL-04 §IS.4).
   *
   * Always populated: both when per-stage caches serve the compile AND when
   * the compile-level cache short-circuits (in that case entries are
   * synthesized with `cacheHit: true` and `durationMs: 0`).
   */
  readonly stageTimings: readonly StageTiming[];
}
