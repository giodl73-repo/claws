/**
 * @bic/openclaw-guardrails/approvals — Type guards and validators.
 *
 * Pure functions — no side effects, no I/O.
 */

import type {
  ApprovalRequestEvent,
  ApprovalResponseEvent,
  ApprovalTimeoutPolicy,
} from './types.js';

export function isApprovalRequest(value: unknown): value is ApprovalRequestEvent {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj['schemaVersion'] === 1 &&
    obj['type'] === 'approval_request' &&
    typeof obj['requestId'] === 'string' &&
    typeof obj['timestamp'] === 'string'
  );
}

export function isApprovalResponse(value: unknown): value is ApprovalResponseEvent {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj['schemaVersion'] === 1 &&
    obj['type'] === 'approval_response' &&
    typeof obj['requestId'] === 'string' &&
    typeof obj['timestamp'] === 'string'
  );
}

/**
 * Returns null if valid, or an error message if invalid. R5 force-external
 * semantics are enforced by composeDecisions in registry.ts.
 */
export function validateTimeoutPolicy(policy: ApprovalTimeoutPolicy): string | null {
  if (policy.defaultTtlSeconds <= 0) {
    return 'defaultTtlSeconds must be positive';
  }

  if (policy.onTimeout !== 'deny' && policy.onTimeout !== 'escalate') {
    return `onTimeout must be "deny" or "escalate", got "${String(policy.onTimeout)}"`;
  }

  if (policy.escalationTargets !== undefined) {
    if (!Array.isArray(policy.escalationTargets)) {
      return 'escalationTargets must be an array when provided';
    }
    for (const target of policy.escalationTargets) {
      if (typeof target !== 'string' || target.length === 0) {
        return 'escalationTargets entries must be non-empty strings';
      }
    }
  }

  if (policy.onTimeout === 'escalate' && (!policy.escalationTargets || policy.escalationTargets.length === 0)) {
    return 'escalationTargets must be non-empty when onTimeout is "escalate"';
  }

  return null;
}
