/**
 * Runtime validation guard for FailMode deserialization.
 *
 * When GovernanceIR is deserialized from JSON, TypeScript's type-level
 * FailMode<5> constraint is gone. This function guards against hand-edited
 * or tampered .claws/compiled/governance-ir.json where an R5 rule has
 * been set to fail-open.
 *
 * @module claws-sdk/ir/validate-fail-modes
 */

import { CLAWS_E001 } from './fail-mode.js';
import type { GovernanceIR } from './governance-ir.js';

/**
 * Validates that no R5 intent has fail-open mode in a deserialized GovernanceIR.
 *
 * R5 rules MUST fail-closed. This is enforced at the type level by
 * `FailMode<5>`, but JSON deserialization loses that constraint.
 * This runtime guard re-establishes the invariant.
 *
 * Checks all R5 vectors:
 * 1. Intent-level failMode property (tampered JSON)
 * 2. Delegation map audit-only mechanism (fail-open semantics)
 * 3. EnforcementPlan auditOnlyRules (R5 must NOT be audit-only)
 * 4. EnforcementPlan ruleSuppressions (R5 must NOT be suppressed)
 * 5. Every R5 violation must have blocking intent (not just warning)
 *
 * @throws {Error} CLAWS-E001 if any R5 rule has fail-open semantics.
 */
export function validateFailModes(ir: GovernanceIR): void {
  // Collect all R5 rule IDs from intents
  const r5RuleIds = new Set<string>();
  for (const intent of ir.intents) {
    if (intent.level === 5) {
      r5RuleIds.add(intent.ruleId);

      // If the intent itself was somehow deserialized with a failMode property
      // (possible from raw JSON), catch it here.
      const raw = intent as unknown as Record<string, unknown>;
      if (raw['failMode'] === 'open') {
        throw new Error(`${CLAWS_E001} (rule: ${intent.ruleId})`);
      }
      // Check ALL delegation entries — audit-only implies fail-open semantics for R5.
      // Use some() instead of find() so we don't miss entries after the first match.
      const hasAuditOnly = ir.delegationMap.some(
        (d) => d.ruleId === intent.ruleId && d.mechanism === 'audit-only',
      );
      if (hasAuditOnly) {
        throw new Error(`${CLAWS_E001} (rule: ${intent.ruleId}, delegation: audit-only)`);
      }
    }
  }

  // Check enforcementPlan.auditOnlyRules — R5 rules must NOT be audit-only
  const plan = ir.analysis.enforcementPlan;
  for (const auditOnlyRuleId of plan.auditOnlyRules) {
    if (r5RuleIds.has(auditOnlyRuleId)) {
      throw new Error(`${CLAWS_E001} (rule: ${auditOnlyRuleId}, enforcementPlan: auditOnlyRules)`);
    }
  }

  // Check enforcementPlan.ruleSuppressions — R5 rules must NOT be suppressed
  for (const suppression of plan.ruleSuppressions) {
    if (r5RuleIds.has(suppression.ruleId)) {
      throw new Error(`${CLAWS_E001} (rule: ${suppression.ruleId}, enforcementPlan: ruleSuppression)`);
    }
  }

  // Every R5 violation must have a blocking intent (not just a warning)
  for (const violation of ir.analysis.violations) {
    if (violation.level === 5) {
      const hasBlockingIntent = ir.intents.some(
        (intent) => intent.ruleId === violation.ruleId && intent.kind === 'deny',
      );
      if (!hasBlockingIntent) {
        throw new Error(`${CLAWS_E001} (rule: ${violation.ruleId}, missing blocking deny intent)`);
      }
    }
  }
}
