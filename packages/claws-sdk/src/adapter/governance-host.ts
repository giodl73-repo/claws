/**
 * GovernanceHost — the 6-facet contract between compiled governance
 * and the OC runtime.
 *
 * This interface defines the surface area that generated governance
 * plugins can depend on from the host environment. Each facet maps
 * to a discrete capability that the OC Gateway exposes.
 *
 * @module claws-sdk/adapter/governance-host
 */

/**
 * Policy evaluation result returned by the GovernanceHost.
 */
export interface PolicyResult {
  /** Whether the action is allowed. */
  readonly allowed: boolean;
  /** Human-readable reason when denied. */
  readonly blockReason: string | null;
  /** Rule ID that produced this decision. */
  readonly ruleId: string;
  /** Audit metadata for logging. */
  readonly auditMeta: Record<string, string>;
}

/**
 * GovernanceHost — 6-facet interface between compiled governance and OC runtime.
 *
 * Facets:
 * 1. evaluatePolicy    — core policy evaluation for tool calls
 * 2. emitAuditEvent    — fire-and-forget audit logging
 * 3. getConfig         — read governance configuration values
 * 4. resolveToolRisk   — look up pre-classified tool risk level
 * 5. checkElicitation  — OBO elicitation gate check
 * 6. reportDiagnostic  — surface diagnostics to the operator
 */
export interface GovernanceHost {
  /**
   * Facet 1: Evaluate a governance policy for a tool call.
   *
   * @param toolName - The tool being invoked
   * @param context  - Runtime context (agent, user, etc.)
   * @param signal   - AbortSignal for timeout enforcement
   * @returns Policy evaluation result
   */
  evaluatePolicy(
    toolName: string,
    context: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<PolicyResult>;

  /**
   * Facet 2: Emit an audit event (fire-and-forget, must not throw).
   *
   * @param event - Audit event payload
   */
  emitAuditEvent(event: Record<string, unknown>): void;

  /**
   * Facet 3: Read a governance configuration value.
   *
   * @param key          - Config key (e.g. "hookTimeoutMs", "failMode.R3")
   * @param defaultValue - Fallback if key is not set
   * @returns The config value or the default
   */
  getConfig<T>(key: string, defaultValue: T): T;

  /**
   * Facet 4: Resolve the pre-classified risk level for a tool.
   *
   * @param toolName - The tool to look up
   * @returns Risk level 1-5 (5 = critical), or undefined if not classified
   */
  resolveToolRisk(toolName: string): number | undefined;

  /**
   * Facet 5: Check whether an OBO elicitation gate is satisfied.
   *
   * @param toolName  - The tool requiring elicitation
   * @param principal - The principal requesting OBO access
   * @returns True if elicitation has been satisfied
   */
  checkElicitation(toolName: string, principal: string): Promise<boolean>;

  /**
   * Facet 6: Report a diagnostic to the operator (non-blocking).
   *
   * @param severity - "error" | "warning" | "info"
   * @param code     - Machine-readable diagnostic code
   * @param message  - Human-readable message
   */
  reportDiagnostic(
    severity: 'error' | 'warning' | 'info',
    code: string,
    message: string,
  ): void;
}

/**
 * Names of the 6 GovernanceHost facets, in canonical order.
 * Used for completeness validation in tests.
 */
export const GOVERNANCE_HOST_FACETS = Object.freeze([
  'evaluatePolicy',
  'emitAuditEvent',
  'getConfig',
  'resolveToolRisk',
  'checkElicitation',
  'reportDiagnostic',
] as const);

/**
 * Type-level assertion: GOVERNANCE_HOST_FACETS length must equal 6.
 */
export type AssertSixFacets = typeof GOVERNANCE_HOST_FACETS extends readonly [
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
]
  ? true
  : never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertSix: AssertSixFacets = true;
