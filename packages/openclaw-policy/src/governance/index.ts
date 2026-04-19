/**
 * Governance runtime — rule application for decision loop.
 *
 * @module @bic/openclaw-policy/governance
 */

export {
  applyRules,
  type ApplyResult,
  type GovernanceDecision,
  type GovernanceEvent,
  type GovernanceViolation,
  type ProvenanceTrace,
} from './rule-apply.js';
