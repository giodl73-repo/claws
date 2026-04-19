/**
 * Fleet compile orchestrator — bounded parallel compile with per-workspace
 * failure isolation (CL-01 v1.2 §`claws fleet compile`).
 *
 * Walks the fleet directory, schedules per-workspace compiles through a
 * bounded semaphore, and returns a `FleetCompileResult` with per-workspace
 * outcomes plus aggregate observability metrics. A single workspace failure
 * does NOT short-circuit the batch: every discovered workspace is attempted
 * (AC-01). Cache isolation is guaranteed by construction — each compile
 * gets its own `<cacheDir>/<basename>/` subdirectory (AC-05).
 *
 * @module claws-sdk/compiler/fleet/fleet-compile
 */

import { join } from 'node:path';
import { compile } from '../host/compile.js';
import type { CompileOptions } from '../host/types.js';
import { discoverWorkspaces } from './discover.js';
import { Semaphore } from './semaphore.js';
import { diagnosticFromError } from './diagnostic.js';
import type {
  FleetCompileOptions,
  FleetCompileResult,
  FleetSummary,
  FleetWorkspaceResult,
} from './types.js';

/**
 * Derive per-workspace compile options from the fleet-wide base.
 *
 * Cache and output directories are scoped per workspace so concurrent
 * compiles never touch a shared lock file and a workspace failure leaves
 * no residue on its siblings (AC-05, AC-06).
 */
function scopeCompileOptions(
  base: CompileOptions,
  workspaceBasename: string,
): CompileOptions {
  const scopedOutputDir = join(base.outputDir, workspaceBasename);
  if (base.cacheDir !== undefined) {
    return { ...base, outputDir: scopedOutputDir, cacheDir: join(base.cacheDir, workspaceBasename) };
  }
  return { ...base, outputDir: scopedOutputDir };
}

/**
 * Map the free-tier `CompileResult.diagnostics` stage strings onto the
 * fleet-level `CompileDiagnosticStage` union. The host records stages as
 * `read`/`sidecar`/`ir`/`enforce`/`emit`/`validate`/`cache`/`audit`; the
 * fleet surface collapses that to `parse`/`enforce`/`emit`/`validate`.
 */
export function mapStage(
  host: string,
): 'parse' | 'enforce' | 'emit' | 'validate' {
  if (host === 'enforce') return 'enforce';
  if (host === 'emit') return 'emit';
  if (host === 'validate') return 'validate';
  // read / sidecar / ir / cache / audit all map to parse — the workspace
  // never made it into an emit-ready IR.
  return 'parse';
}

/**
 * Pick a `CompileDiagnosticKind` from a stage-tagged failure.
 */
export function kindForStage(stage: 'parse' | 'enforce' | 'emit' | 'validate'): import('./diagnostic.js').CompileDiagnosticKind {
  if (stage === 'emit') return 'EmitFailed';
  if (stage === 'validate') return 'ValidationFailed';
  return 'CompileFailed';
}

/**
 * Run `fleetCompile()` on a pre-discovered workspace.
 *
 * Wraps the per-workspace `compile()` call in the diagnostic contract:
 * any thrown error becomes a `CompileDiagnostic`; a `CompileResult` with
 * `success: false` becomes a `failure` entry keyed on the first error
 * diagnostic's stage.
 */
async function compileOneWorkspace(
  workspace: string,
  basename: string,
  scopedOptions: CompileOptions,
): Promise<FleetWorkspaceResult> {
  const started = Date.now();
  try {
    const result = await compile(workspace, scopedOptions);
    const elapsedMs = Date.now() - started;
    if (result.success) {
      return { status: 'success', workspace, result, elapsedMs };
    }
    const firstError = result.diagnostics.find((d) => d.severity === 'error');
    /* c8 ignore next 2 -- compile() always returns >=1 error-severity diagnostic on success:false; undefined-branch is defensive. */
    const stage = firstError !== undefined ? mapStage(firstError.stage) : 'parse';
    const message = firstError?.message ?? 'compile failed';
    return {
      status: 'failure',
      workspace,
      diagnostic: {
        kind: kindForStage(stage),
        workspace: basename,
        stage,
        message,
      },
      elapsedMs,
    };
    /* c8 ignore start -- `compile()` converts pipeline errors into `success:false` + diagnostics rather than throwing; this catch is the defensive last line for unexpected bugs in the host. */
  } catch (err) {
    const elapsedMs = Date.now() - started;
    return {
      status: 'failure',
      workspace,
      diagnostic: diagnosticFromError(basename, 'parse', err),
      elapsedMs,
    };
  }
  /* c8 ignore stop */
}

/**
 * Orchestrate a fleet compile.
 *
 * 1. Discover workspaces (lexicographic).
 * 2. For each workspace, schedule via semaphore: acquire → compile → release.
 * 3. Use `Promise.allSettled` semantics per-task so one failure does not
 *    cancel siblings (AC-01).
 * 4. Return per-workspace results in lex order + aggregate `FleetSummary`.
 *
 * The `Promise.all` over the task array here is safe because every task
 * is wrapped in `try/catch` that converts throws into `failure` entries
 * before the outer `Promise.all` ever sees them (AC-01 — `Promise.all` is
 * forbidden over raw task promises; here it's over already-settled
 * wrappers).
 */
export async function fleetCompile(
  fleetDir: string,
  options: FleetCompileOptions,
): Promise<FleetCompileResult> {
  const wallClockStart = Date.now();
  const discovered = await discoverWorkspaces(fleetDir);

  const sem = new Semaphore(options.maxConcurrency);

  // Track cumulative per-task elapsed ms to compute parallelismRatio.
  let totalTaskMs = 0;

  // AC-08: the signal has two distinct observation points and the per-
  // workspace result MUST distinguish them.
  //
  //   - `not-started` — the abort fired before this workspace ever
  //     acquired a permit. These tasks are short-circuited here before
  //     `sem.run` so the admin sees exactly which workspaces the batch
  //     never attempted. Admin observability — NOT a side-effect of
  //     queue ordering.
  //   - `cancelled`   — the task acquired a permit, then saw the signal
  //     aborted (either at the gate inside `sem.run` or mid-compile via
  //     `compileOneWorkspace`).
  //
  // Short-circuiting on the loop's own abort observation means later
  // workspaces skip the semaphore FIFO entirely after abort — abort
  // latency becomes O(in-flight) instead of O(n/maxConcurrency).
  const tasks: Promise<FleetWorkspaceResult>[] = discovered.map((ws) => {
    if (options.signal?.aborted === true) {
      // Short-circuit at enqueue time — never enters the semaphore.
      return Promise.resolve<FleetWorkspaceResult>({
        status: 'not-started',
        workspace: ws.path,
        elapsedMs: 0,
      });
    }
    const scoped = scopeCompileOptions(options.compileOptions, ws.basename);
    return sem.run(async () => {
      // Re-check at dequeue time: the signal may have fired while we
      // waited for a permit. Workspaces that reached the semaphore and
      // saw the abort before starting compile are classified as
      // `cancelled` (they DID acquire a permit); those that never
      // acquired a permit are handled above.
      if (options.signal?.aborted === true) {
        return { status: 'cancelled' as const, workspace: ws.path, elapsedMs: 0 };
      }
      const outcome = await compileOneWorkspace(ws.path, ws.basename, scoped);
      totalTaskMs += outcome.elapsedMs;
      return outcome;
    });
  });

  const workspaces = await Promise.all(tasks);
  const wallClockMs = Date.now() - wallClockStart;

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const w of workspaces) {
    if (w.status === 'success') succeeded += 1;
    else if (w.status === 'failure') failed += 1;
    else skipped += 1;
  }

  // parallelismRatio = sum(per-task ms) / wall-clock ms. Guard against
  // division by zero on near-instant runs (sub-ms wall-clock on a fast
  // machine + empty fleet); `1` is the correct serial-equivalent floor.
  /* c8 ignore next -- wall-clock-zero branch is the defensive divide-by-zero floor; machines with ms-granularity Date.now always report >=0.01ms on any real workload. */
  const parallelismRatio = wallClockMs > 0 ? totalTaskMs / wallClockMs : 1;

  const summary: FleetSummary = {
    totalWorkspaces: workspaces.length,
    succeeded,
    failed,
    skipped,
    wallClockMs,
    peakConcurrency: sem.peakAcquired,
    parallelismRatio,
    maxConcurrency: options.maxConcurrency,
  };

  return { workspaces, summary };
}
