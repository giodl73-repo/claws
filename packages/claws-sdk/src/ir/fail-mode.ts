/**
 * FailMode<R> — parameterized fail mode for governance rules.
 *
 * R5 (critical) rules MUST fail-closed. This is enforced at the type level:
 * `FailMode<5>` resolves to `'closed'` only — assigning `'open'` is a
 * TypeScript compilation error.
 *
 * R1–R4 rules may fail either open or closed, per policy configuration.
 *
 * @module claws-sdk/ir/fail-mode
 */

/**
 * Valid rule severity levels (1–5).
 */
export type RuleLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Parameterized fail mode.
 *
 * - `FailMode<5>` = `'closed'` (R5 fail-open is structurally unrepresentable)
 * - `FailMode<1|2|3|4>` = `'open' | 'closed'`
 */
export type FailMode<R extends RuleLevel> = R extends 5
  ? 'closed'
  : 'open' | 'closed';

/**
 * OC-POLICY-E001: R5 rule cannot have fail-open mode.
 *
 * Thrown at runtime when deserializing GovernanceIR from JSON
 * and an R5 rule is found with `failMode: 'open'`.
 */
export const OC_POLICY_E001 = 'OC-POLICY-E001: R5 rule must fail-closed — fail-open is forbidden for critical rules';
