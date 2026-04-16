/**
 * Guardrail provider types — SDK-level representation of the
 * GuardrailProvider composition model from the OpenClaw governance spec.
 *
 * These types bridge claws risk classification with host-level approval UX.
 * All naming is vendor-neutral — works with ANY host, not just Aether.
 *
 * @module claws-sdk/governance/guardrail-types
 */

/**
 * Numeric risk levels for tool classification (R1–R5).
 */
export type RiskLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Authorization decisions — discriminated union on the `decision` field.
 *
 * Each variant carries only its valid fields.
 */
export type AuthorizationDecision =
  | AllowDecision
  | DenyDecision
  | ReviewDecision
  | ModifyDecision;

/**
 * Tool call proceeds. Provider may signal the host to gate it.
 */
export interface AllowDecision {
  readonly decision: 'allow';

  /**
   * Signals the host to gate this tool call through its approval UX.
   *
   * Default: false.
   * R3+ MUST be true unless fleet override explicitly permits false.
   * R5: always true regardless of fleet policy or provider setting.
   */
  readonly requiresExternalApproval?: boolean;

  /** Risk classification (if the provider performs classification). */
  readonly riskLevel?: RiskLevel;

  /** Provider-specific metadata. Consumers MUST ignore unknown keys. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Tool call is blocked. Agent is informed.
 */
export interface DenyDecision {
  readonly decision: 'deny';

  /** Why the tool was blocked. Required for deny decisions. */
  readonly reason: string;

  /** Machine-readable rule identifier. */
  readonly ruleId?: string;

  /** Risk classification (if the provider performs classification). */
  readonly riskLevel?: RiskLevel;

  /** Provider-specific metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Tool call is held for human review. Implicitly requires external approval.
 */
export interface ReviewDecision {
  readonly decision: 'review';

  /**
   * Always true for review decisions — review inherently requires
   * external confirmation. Cannot be set to false.
   */
  readonly requiresExternalApproval: true;

  /** Why the tool needs review. */
  readonly reason?: string;

  /** Risk classification (if the provider performs classification). */
  readonly riskLevel?: RiskLevel;

  /** Provider-specific metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Tool call proceeds with modified arguments.
 */
export interface ModifyDecision {
  readonly decision: 'modify';

  /** The rewritten arguments. Required for modify decisions. */
  readonly modifiedArguments: Readonly<Record<string, unknown>>;

  /** Signals the host to gate the modified call. */
  readonly requiresExternalApproval?: boolean;

  /** Risk classification (if the provider performs classification). */
  readonly riskLevel?: RiskLevel;

  /** Provider-specific metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Fail-mode behavior when a provider throws an exception.
 *
 * Per risk level:
 * - R1-R2: fail-open (tool proceeds)
 * - R3-R4: configurable (default fail-closed, fleet can override to fail-open)
 * - R5: fail-closed (non-negotiable, non-configurable)
 */
export type FailMode = 'fail-open' | 'fail-closed';

/**
 * Fail-mode configuration for a specific risk level.
 */
export interface FailModeConfig {
  /** Risk level this config applies to. */
  readonly riskLevel: RiskLevel;
  /** The fail-mode behavior. */
  readonly failMode: FailMode;
  /** Whether fleet policy can override this fail-mode. */
  readonly overridable: boolean;
}

/**
 * Default fail-mode mappings per risk level.
 *
 * R1-R2 → fail-open, R3-R4 → fail-closed (overridable), R5 → fail-closed (non-negotiable).
 */
export const DEFAULT_FAIL_MODES: readonly FailModeConfig[] = [
  { riskLevel: 1, failMode: 'fail-open', overridable: false },
  { riskLevel: 2, failMode: 'fail-open', overridable: false },
  { riskLevel: 3, failMode: 'fail-closed', overridable: true },
  { riskLevel: 4, failMode: 'fail-closed', overridable: true },
  { riskLevel: 5, failMode: 'fail-closed', overridable: false },
] as const;

/**
 * Look up the fail-mode for a given risk level.
 *
 * Returns fail-closed for unknown risk levels (defensive).
 */
export function getFailMode(riskLevel: RiskLevel): FailModeConfig {
  const config = DEFAULT_FAIL_MODES.find(c => c.riskLevel === riskLevel);
  if (config) return config;
  return { riskLevel, failMode: 'fail-closed', overridable: false };
}
