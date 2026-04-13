/**
 * Rule registry — extensible, function-per-rule governance evaluation.
 *
 * Follows the compiler-sdk pass registry pattern: register a function,
 * lookup by rule ID, iterate all rules. New rules are added by calling
 * register(), not by modifying core code.
 *
 * @module claws-sdk/governance/rule-registry
 */

import type { CapabilityManifest } from '../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from './types.js';

/**
 * Current governance policy version.
 */
const POLICY_VERSION = '1.0.0';

/**
 * RuleRegistry — the public API for governance rule management.
 */
export interface RuleRegistry {
  /** Register a governance rule. Replaces any existing rule with the same ID. */
  register(rule: GovernanceRule): void;
  /** Retrieve a rule by ID. Returns undefined if not found. */
  get(id: string): GovernanceRule | undefined;
  /** Return all registered rules in registration order. */
  all(): readonly GovernanceRule[];
  /** Evaluate all registered rules against a capability manifest. */
  evaluate(manifest: CapabilityManifest): readonly RuleResult[];
}

/**
 * Create a new, empty rule registry.
 */
export function createRegistry(): RuleRegistry {
  const rules = new Map<string, GovernanceRule>();
  const order: string[] = [];

  return {
    register(rule: GovernanceRule): void {
      if (!rules.has(rule.id)) {
        order.push(rule.id);
      }
      rules.set(rule.id, rule);
    },

    get(id: string): GovernanceRule | undefined {
      return rules.get(id);
    },

    all(): readonly GovernanceRule[] {
      return order.map((id) => rules.get(id)!);
    },

    evaluate(manifest: CapabilityManifest): readonly RuleResult[] {
      const now = Date.now();
      return order.map((id) => {
        const result = rules.get(id)!.evaluate(manifest);
        const stamped: readonly Violation[] = result.violations.map((v) => ({
          ...v,
          timestamp: now,
          policyVersion: POLICY_VERSION,
        }));
        return { ...result, violations: stamped };
      });
    },
  };
}
