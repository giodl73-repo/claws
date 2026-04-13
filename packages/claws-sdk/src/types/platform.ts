/**
 * Platform types — the 7 supported agent platforms and their
 * enforcement model capabilities.
 *
 * @module claws-sdk/types/platform
 */

/**
 * The 7 supported agent platforms for governance compilation.
 */
export type Platform =
  | 'openclaw'
  | 'cursor'
  | 'claude-code'
  | 'github-copilot'
  | 'bedrock'
  | 'langgraph'
  | 'crewai';

/**
 * Enforcement model — how strictly the platform can enforce governance rules.
 *
 * - `full`: Platform supports blocking enforcement (hooks, tool deny).
 * - `advisory`: Platform can surface warnings but cannot block.
 * - `explicit-only`: Enforcement requires explicit opt-in per rule.
 */
export type EnforcementModel = 'full' | 'advisory' | 'explicit-only';

/**
 * Platform capability descriptor — maps a platform to its enforcement
 * model and default trust tier.
 */
export interface PlatformCapability {
  readonly platform: Platform;
  readonly enforcement: EnforcementModel;
  /** Default trust tier (1–5) for agents on this platform. */
  readonly defaultTrustTier: number;
}
