/**
 * violation-aware-compile — wraps a compile function so that violations are
 * NEVER accepted into the serving GovernanceIR.
 *
 * The invariant: a compile pass either returns a clean IR (no violations)
 * or leaves the previous good IR in place while the violation state machine
 * records the failure. Callers must treat the returned `ir` as the current
 * SERVING IR — it may be the freshly compiled one (clean case) or the
 * stale one (degraded case).
 *
 * The wrapper is deliberately thin: its only job is to route the violation
 * set into the state machine and preserve the last-good IR. Violation
 * classification is the caller's responsibility — they supply a classifier
 * that maps `GovernanceIR.analysis.violations` onto the
 * `ViolationInput` shape.
 *
 * @module claws-sdk/compile/violation-aware-compile
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { ViolationInput, ViolationStateMachine } from '../workspace/violation-state.js';
import { ViolationState } from '../workspace/violation-types.js';

/**
 * Classifier — turns the domain-neutral GovernanceIR analysis into the set
 * of `ViolationInput`s the state machine understands. Returning an empty
 * array signals a clean compile.
 */
export type ViolationClassifier = (ir: GovernanceIR) => readonly ViolationInput[];

/**
 * Minimal compile signature — the wrapper doesn't care whether the real
 * compiler is sync, async, in-process or forked.
 */
export type CompileFn = () => Promise<GovernanceIR>;

export interface ViolationAwareCompileOptions {
  readonly compile: CompileFn;
  readonly classify: ViolationClassifier;
  readonly machine: ViolationStateMachine;
  /** Latest workspace version (monotonic counter from the VersionManager). */
  readonly currentVersion: number;
  /**
   * Emergency handler invoked when the underlying compile function throws
   * (e.g. SOUL.md is unparseable). Should produce a synthetic violation so
   * the machine still transitions to ERROR. When omitted, the wrapper
   * rethrows.
   */
  readonly onCompileError?: (err: unknown) => readonly ViolationInput[];
}

export interface ViolationAwareCompileResult {
  /** The IR that should be served. May be stale when `degraded` is true. */
  readonly ir: GovernanceIR | undefined;
  /** Whether the compile pass itself produced violations. */
  readonly degraded: boolean;
  /** Post-transition state. */
  readonly state: ViolationState;
}

/**
 * Run a compile + reconcile the violation state.
 *
 * The function is stateful by design: it mutates the supplied state
 * machine, and stores the last-good IR on its own closure via the caller
 * providing a `lastGoodIR` getter/setter indirection.
 *
 * For simplicity we surface the last-good IR by returning it — callers
 * keep their own cache reference (mirroring `CompilationHost.getCachedIR`)
 * and update it only when `degraded === false`.
 */
export async function compileWithViolationGuard(
  options: ViolationAwareCompileOptions,
  lastGoodIR: GovernanceIR | undefined,
): Promise<ViolationAwareCompileResult> {
  let freshIR: GovernanceIR | undefined;
  let classified: readonly ViolationInput[];

  try {
    freshIR = await options.compile();
    classified = options.classify(freshIR);
  } catch (err) {
    if (options.onCompileError === undefined) {
      throw err;
    }
    classified = options.onCompileError(err);
    freshIR = undefined;
  }

  const newState = options.machine.applyRecompile({
    violations: classified,
    lastGoodVersion: options.currentVersion,
  });

  if (newState === ViolationState.CLEAN && freshIR !== undefined) {
    return { ir: freshIR, degraded: false, state: newState };
  }

  // Degraded: keep serving the last good IR (may be undefined on cold-start
  // — that case yields an empty IR surface until the first clean compile).
  return { ir: lastGoodIR, degraded: true, state: newState };
}
