/**
 * Platform detection — scan workspace roots for agent platform markers.
 *
 * @module claws-sdk/detect
 */

export { detect } from './detect.js';
export { resolve } from './resolve.js';
export type { ResolveConfig } from './resolve.js';
export type {
  PlatformId,
  TrustTierDefault,
  MarkerResult,
  MarkerSpec,
  PlatformInfo,
  PlatformInventory,
  PlatformTarget,
  ResolutionMethod,
} from './types.js';
export type { EnforcementCapabilityVector, LossMatrixEntry } from './types.js';
export { MARKER_REGISTRY, getMarkerSpecs } from './marker-registry.js';
export { computeLossMatrix } from './loss-matrix.js';
export { detectOpenClaw } from './markers/openclaw.js';
export { detectCursor } from './markers/cursor.js';
export { detectClaudeCode } from './markers/claude-code.js';
export { detectCopilot } from './markers/copilot.js';
export { detectBedrock } from './markers/bedrock.js';
export { detectLangGraph } from './markers/langgraph.js';
export { detectCrewAI } from './markers/crewai.js';
