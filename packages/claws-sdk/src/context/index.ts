/**
 * Context module — content-addressed DAG for fleet structural sharing
 * and PRESS compression pipeline.
 *
 * @module claws-sdk/context
 */

// ── Context DAG ───────────────────────────────────────────────────────
export {
  hashFragment,
  hashDeltaWithBase,
  extractSharedFragment,
  extractDeltaFragment,
  buildDag,
  resolveAgent,
  resolveAll,
  computeStorageMetrics,
  invalidateNode,
  rebuildWithUpdatedShared,
} from './context-dag.js';

export type {
  DagNode,
  GovernanceFragment,
  AgentDelta,
  ContextDag,
  DagStorageMetrics,
  ResolvedAgent,
} from './context-dag.js';

// ── Context PRESS ─────────────────────────────────────────────────────
export {
  press,
} from './context-press.js';

export type {
  PressConfig,
  PressStageMetrics,
  PressResult,
} from './context-press.js';
