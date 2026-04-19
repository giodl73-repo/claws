/**
 * Static stage dependency graph for incremental compile (CL-04 §IS.3).
 *
 * Shape:
 *   9 readers (leaves) → modelToIR → baselineAnalysis → enforceR5 → emit
 *                                                                  → validate
 *
 * `emit` and `validate` are both consumers of `enforceR5`; neither depends
 * on the other. Downstream cache keys fold in the byte-hash of every
 * upstream stage they consume so a stale upstream invalidates them.
 *
 * @module claws-sdk/compiler/host/stage-deps
 */
import type { StageName } from './types.js';

/**
 * Reader-stage names in declaration order. The order is part of the
 * contract — `STAGE_ORDER` reuses it so `stageTimings` is deterministic.
 */
export const READER_STAGES: readonly StageName[] = [
  'soul',
  'tools',
  'agents',
  'memory',
  'identity',
  'user',
  'heartbeat',
  'skills',
  'lobster',
];

/**
 * Downstream stages in pipeline order.
 */
export const DOWNSTREAM_STAGES: readonly StageName[] = [
  'modelToIR',
  'baselineAnalysis',
  'enforceR5',
  'emit',
  'validate',
];

/**
 * All 14 stages in canonical declaration order. Consumers that iterate
 * `stageTimings` rely on this order (§IS.4).
 */
export const STAGE_ORDER: readonly StageName[] = [
  ...READER_STAGES,
  ...DOWNSTREAM_STAGES,
];

const READER_SET = new Set<StageName>(READER_STAGES);

/**
 * Return the direct upstream stages `stage` consumes (one hop).
 *
 * Readers have no upstream. `modelToIR` reads all 9 readers.
 * `baselineAnalysis` reads `modelToIR`. `enforceR5` reads `baselineAnalysis`
 * AND `modelToIR` (it uses IR directly). `emit` and `validate` both depend
 * on `enforceR5` and `modelToIR` (they consume both the IR and the
 * gov-analysis).
 */
export function upstreamOf(stage: StageName): readonly StageName[] {
  switch (stage) {
    case 'soul':
    case 'tools':
    case 'agents':
    case 'memory':
    case 'identity':
    case 'user':
    case 'heartbeat':
    case 'skills':
    case 'lobster':
      return [];
    case 'modelToIR':
      return READER_STAGES;
    case 'baselineAnalysis':
      return ['modelToIR'];
    case 'enforceR5':
      return ['modelToIR', 'baselineAnalysis'];
    case 'emit':
      return ['modelToIR', 'enforceR5'];
    case 'validate':
      return ['modelToIR', 'enforceR5', 'emit'];
  }
}

/**
 * Return every stage that is (transitively) downstream of `stage`.
 *
 * Used by invalidation walks: on a reader miss, walk `downstreamOf(reader)`
 * to force every dependent stage to re-run. Readers never appear in the
 * result (they are only reachable via themselves).
 */
export function downstreamOf(stage: StageName): readonly StageName[] {
  const result: StageName[] = [];
  for (const candidate of STAGE_ORDER) {
    if (candidate === stage) continue;
    if (isTransitivelyUpstream(stage, candidate)) {
      result.push(candidate);
    }
  }
  return result;
}

/**
 * `true` when `ancestor` is a (transitive) upstream of `descendant`.
 */
function isTransitivelyUpstream(ancestor: StageName, descendant: StageName): boolean {
  const visited = new Set<StageName>();
  const frontier: StageName[] = [...upstreamOf(descendant)];
  while (frontier.length > 0) {
    const next = frontier.pop() as StageName;
    if (next === ancestor) return true;
    /* c8 ignore next -- the compiler DAG has no duplicate upstream edges today; this guards against future diamond dependencies. */
    if (visited.has(next)) continue;
    visited.add(next);
    for (const u of upstreamOf(next)) frontier.push(u);
  }
  return false;
}

/**
 * `true` iff `stage` is one of the 9 reader leaves.
 */
export function isReaderStage(stage: StageName): boolean {
  return READER_SET.has(stage);
}
