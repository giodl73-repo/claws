/**
 * @bic/openclaw-guardrails/approvals
 *
 * Approval event schema (request/response/timeout policy) + HMAC-signed
 * HandleBinding round-trip. Absorbed from the prior approval-events orphan (v0.1.0, MIT).
 */

export type {
  ApprovalRequestEvent,
  ApprovalResponseEvent,
  ApprovalTimeoutPolicy,
  GovernanceApprovalMetadata,
  RiskClassification,
  RiskLevel,
  Sensitivity,
} from './types.js';

export {
  isApprovalRequest,
  isApprovalResponse,
  validateTimeoutPolicy,
} from './guards.js';

export {
  parseHandle,
  signHandle,
  verifyHandle,
} from './handle.js';
export type { HandleBinding, ParsedHandle, SignedBinding, VerifyResult } from './handle.js';
