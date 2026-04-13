/**
 * Frozen OC Gateway type snapshot for MockGateway structural compliance (C11).
 *
 * This file captures the shape of OC Gateway before_tool_call events as of
 * the current OC Gateway version. If the Gateway types change, the structural
 * test in mock-gateway.unit.test.ts will break — forcing an update.
 *
 * This is NOT imported at runtime. It exists for type-level structural tests.
 */

/**
 * OC Gateway decision for a before_tool_call hook.
 */
export type OCGatewayDecision = 'allow' | 'deny' | 'require-approval';

/**
 * OC Gateway before_tool_call event shape.
 */
export interface OCBeforeToolCallEvent {
  /** The tool/skill name being invoked. */
  readonly toolName: string;
  /** The governance decision for this invocation. */
  readonly decision: OCGatewayDecision;
  /** Governance metadata from skill annotations. */
  readonly governanceMetadata: Record<string, unknown>;
  /** Timestamp of the event (ISO 8601). */
  readonly timestamp: string;
}

/**
 * OC Gateway event listener signature.
 */
export type OCGatewayEventListener = (event: OCBeforeToolCallEvent) => void;
