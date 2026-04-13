/**
 * GovernanceValidator — orchestrates all 12 governance checks
 * and aggregates results.
 *
 * @module @bic/claws-test/governance/validator
 */

import type { GovernanceCheckInput, CheckResult, ValidationResult, GovernanceCheck } from '../types.js';

import { checkRiskLevel } from './checks/risk-level.js';
import { checkOboBoundary } from './checks/obo-boundary.js';
import { checkDataLabels } from './checks/data-labels.js';
import { checkFailMode } from './checks/fail-mode.js';
import { checkCapabilities } from './checks/capabilities.js';
import { checkElicitation } from './checks/elicitation.js';
import { checkA2ATrust } from './checks/a2a-trust.js';
import { checkInputValidation } from './checks/input-validation.js';
import { checkOutputGuards } from './checks/output-guards.js';
import { checkBoundedReasoning } from './checks/bounded-reasoning.js';
import { checkAuditCompleteness } from './checks/audit-completeness.js';
import { checkSupplyChain } from './checks/supply-chain.js';

/**
 * The 12 governance checks in execution order.
 */
const ALL_CHECKS: readonly GovernanceCheck[] = [
  checkRiskLevel,
  checkOboBoundary,
  checkDataLabels,
  checkFailMode,
  checkCapabilities,
  checkElicitation,
  checkA2ATrust,
  checkInputValidation,
  checkOutputGuards,
  checkBoundedReasoning,
  checkAuditCompleteness,
  checkSupplyChain,
];

/**
 * Name-to-function registry — maps check names to their functions
 * so validateSubset can look up checks without executing them.
 */
const CHECK_REGISTRY: ReadonlyMap<string, GovernanceCheck> = new Map<string, GovernanceCheck>([
  ['risk-level', checkRiskLevel],
  ['obo-boundary', checkOboBoundary],
  ['data-labels', checkDataLabels],
  ['fail-mode', checkFailMode],
  ['capabilities', checkCapabilities],
  ['elicitation', checkElicitation],
  ['a2a-trust', checkA2ATrust],
  ['input-validation', checkInputValidation],
  ['output-guards', checkOutputGuards],
  ['bounded-reasoning', checkBoundedReasoning],
  ['audit-completeness', checkAuditCompleteness],
  ['supply-chain', checkSupplyChain],
]);

/**
 * Run all 12 governance checks against the provided input.
 *
 * @param input - Governance check input describing the skill's governance posture
 * @returns Aggregated validation result
 */
export function validate(input: GovernanceCheckInput): ValidationResult {
  const checks: CheckResult[] = [];

  for (const check of ALL_CHECKS) {
    checks.push(check(input));
  }

  const passedChecks = checks.filter(c => c.pass).length;
  const failedChecks = checks.filter(c => !c.pass).length;
  const findings = checks.flatMap(c => [...c.findings]);

  return {
    pass: failedChecks === 0,
    totalChecks: checks.length,
    passedChecks,
    failedChecks,
    checks,
    findings,
  };
}

/**
 * Run a specific subset of checks by name.
 * Uses CHECK_REGISTRY for O(1) name lookup — each matching check executes exactly once.
 */
export function validateSubset(
  input: GovernanceCheckInput,
  checkNames: readonly string[],
): ValidationResult {
  const checks: CheckResult[] = [];
  for (const name of checkNames) {
    const check = CHECK_REGISTRY.get(name);
    if (check) {
      checks.push(check(input));
    }
  }

  const passedChecks = checks.filter(c => c.pass).length;
  const failedChecks = checks.filter(c => !c.pass).length;
  const findings = checks.flatMap(c => [...c.findings]);

  return {
    pass: failedChecks === 0,
    totalChecks: checks.length,
    passedChecks,
    failedChecks,
    checks,
    findings,
  };
}
