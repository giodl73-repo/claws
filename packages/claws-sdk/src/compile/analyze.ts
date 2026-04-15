/**
 * Analyze orchestrator — lightweight shell that runs governance rules
 * against a CapabilityManifest via a RuleRegistry.
 *
 * P14 and P15 add rules to the registry; P13 creates the orchestrator
 * that runs them.
 *
 * @module claws-sdk/compile/analyze
 */

import type { CapabilityManifest } from '../ir/capability-manifest.js';
import type { GovAnalysis } from '../ir/gov-analysis.js';
import type { RuleRegistry } from '../governance/rule-registry.js';
import type { RuleResult } from '../governance/types.js';

/**
 * Options for analyze().
 */
export interface AnalyzeOptions {
  /** Rule IDs to suppress — matching violations are excluded from results. */
  readonly suppressedRules?: readonly string[];
}

/**
 * Run governance analysis: evaluate all registered rules against the manifest.
 *
 * Returns a GovAnalysis with violations mapped from rule results, plus
 * an empty enforcement plan (populated by downstream passes).
 *
 * If `suppressedRules` is provided, matching violations are filtered out
 * and the count is returned in `suppressedCount`.
 */
export function analyze(
  manifest: CapabilityManifest,
  registry: RuleRegistry,
  options?: AnalyzeOptions,
): GovAnalysis {
  const results: readonly RuleResult[] = registry.evaluate(manifest);

  const allViolations = results.flatMap((r) =>
    r.violations.map((v) => ({
      ruleId: v.ruleId,
      level: severityToLevel(v.severity),
      message: v.message,
      target: v.file,
      diagnosticCode: `CLAWS-${v.ruleId}`,
      fixSuggestions: [],
      toolFuzzyMatches: [],
    })),
  );

  const suppressSet = options?.suppressedRules?.length
    ? new Set(options.suppressedRules)
    : undefined;

  const violations = suppressSet
    ? allViolations.filter((v) => !suppressSet.has(v.ruleId))
    : allViolations;

  return {
    violations,
    warnings: [],
    enforcementPlan: {
      blockedTools: [],
      requiredApprovals: [],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
  };
}

function severityToLevel(severity: string): 1 | 2 | 3 | 4 | 5 {
  switch (severity) {
    case 'critical': return 5;
    case 'high': return 4;
    case 'medium': return 3;
    case 'low': return 2;
    default: return 1;
  }
}
