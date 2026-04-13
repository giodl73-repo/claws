/**
 * AuditEvent — canonical audit event type for all governance activity.
 *
 * Every audit-producing code path MUST emit this type. Added per review
 * amendment C08.
 *
 * @module claws-sdk/ir/audit-event
 */

import type { RuleLevel } from './fail-mode.js';

/**
 * Outcome of an audited governance action.
 */
export type AuditOutcome = 'allow' | 'deny' | 'elicit' | 'error';

/**
 * Supported HMAC algorithms for audit signing.
 */
export type AuditAlgorithm = 'sha256' | 'sha384' | 'sha512';

/**
 * Canonical audit event. All audit-producing code across all pulses
 * MUST emit this type.
 */
export interface AuditEvent {
  /** ISO 8601 timestamp of the event. */
  readonly timestamp: string;
  /** Category of the event (e.g. "tool-call", "policy-check"). */
  readonly eventType: string;
  /** Who triggered the event (agent ID, user ID). */
  readonly actor: string;
  /** What the event applies to (tool name, resource). */
  readonly target: string;
  /** The action taken (e.g. "invoke", "approve", "block"). */
  readonly action: string;
  /** Result of the action. */
  readonly outcome: AuditOutcome;
  /** Rule that triggered this event. */
  readonly ruleId: string;
  /** Severity of the rule. */
  readonly severity: RuleLevel;
  /** Policy version at the time of the event. */
  readonly policyVersion: string;
  /** HMAC signature of the event payload (hex-encoded). */
  readonly hmacSignature: string;
  /** Key ID used for signing. */
  readonly keyId: string;
  /** Algorithm used for HMAC signing. */
  readonly algorithm: AuditAlgorithm;
}
