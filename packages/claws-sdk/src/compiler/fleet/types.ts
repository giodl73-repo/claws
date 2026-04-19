/**
 * Fleet compile types per CL-01 v1.2 §`claws fleet compile`.
 *
 * `FleetCompileOptions` wraps the per-workspace `compile()` inputs and adds
 * the concurrency cap. `FleetWorkspaceResult` is a success|failure
 * discriminated union surfaced one-per-workspace on `--json`. `FleetSummary`
 * is the aggregate observability payload (AC-14) returned by
 * `fleetCompile()` and emitted as the final `--json` line.
 *
 * @module claws-sdk/compiler/fleet/types
 */

import type { CompileResult, CompileOptions } from '../host/types.js';
import type { CompileDiagnostic } from './diagnostic.js';

/**
 * Per-workspace fleet compile outcome.
 *
 * - `status: 'success'` — compile produced artifacts without fatal errors.
 * - `status: 'failure'` — compile surfaced a structured `CompileDiagnostic`.
 * - `status: 'cancelled'` — SIGINT/SIGTERM cancelled this in-flight task.
 * - `status: 'not-started'` — batch was cancelled before this workspace
 *   acquired a permit.
 *
 * `elapsedMs` is the wall-clock cost of the compile attempt; `0` for
 * `not-started`.
 */
export type FleetWorkspaceResult =
  | {
      readonly status: 'success';
      readonly workspace: string;
      readonly result: CompileResult;
      readonly elapsedMs: number;
    }
  | {
      readonly status: 'failure';
      readonly workspace: string;
      readonly diagnostic: CompileDiagnostic;
      readonly elapsedMs: number;
    }
  | {
      readonly status: 'cancelled';
      readonly workspace: string;
      readonly elapsedMs: number;
    }
  | {
      readonly status: 'not-started';
      readonly workspace: string;
      readonly elapsedMs: number;
    };

/**
 * Aggregate run summary (AC-14). `parallelismRatio` is observed-concurrent-
 * work-ms / wall-clock-ms — `>= 1` when any real parallelism ran, `= 1` on
 * serial or single-workspace runs. `peakConcurrency` is the monotonic
 * high-water-mark from the semaphore (AC-13).
 */
export interface FleetSummary {
  readonly totalWorkspaces: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly skipped: number;
  readonly wallClockMs: number;
  readonly peakConcurrency: number;
  readonly parallelismRatio: number;
  readonly maxConcurrency: number;
}

/**
 * Top-level orchestrator result. `workspaces` are in lexicographic order,
 * which is also the compile-start order (AC-15/AC-17).
 */
export interface FleetCompileResult {
  readonly workspaces: readonly FleetWorkspaceResult[];
  readonly summary: FleetSummary;
}

/**
 * Options for `fleetCompile()`. The per-workspace compile inherits the
 * fields on `compileOptions` verbatim; the orchestrator rewrites
 * `cacheDir` to a per-workspace subdirectory so each compile has its own
 * cache state (AC-05).
 */
export interface FleetCompileOptions {
  /** Upper bound on in-flight compiles. Must be a positive integer. */
  readonly maxConcurrency: number;
  /**
   * Base compile options applied to every workspace. `cacheDir` here is
   * treated as the fleet-wide cache root — each workspace gets a
   * `<cacheDir>/<workspace-basename>/` subdirectory (AC-05). `outputDir`
   * is treated likewise: each workspace receives its own subdirectory.
   */
  readonly compileOptions: CompileOptions;
  /**
   * Optional abort signal. When aborted, the orchestrator stops accepting
   * new work from the queue, cancels in-flight compiles via the
   * propagated signal (best-effort), and marks remaining workspaces
   * `not-started` (AC-08).
   */
  readonly signal?: AbortSignal;
}
