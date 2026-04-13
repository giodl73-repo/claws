/**
 * G-BOUND rules — bounded reasoning for injection defense.
 *
 * 4 rules:
 * - G-BOUND-01: Step limits — cap workflow step counts
 * - G-BOUND-02: Tool limits — cap total tool count per workspace
 * - G-BOUND-03: Budget limits — cap high-risk tool concentration
 * - G-BOUND-04: Recursion limits — detect delegation cycles (A→B→C→A)
 *
 * G-BOUND-04 delegation cycle detection complements recursion limits
 * per CFC-S05-F03: both must be present.
 *
 * @module claws-sdk/governance/rules/g-bound
 */

import type { CapabilityManifest } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

// ── Thresholds ──────────────────────────────────────────────────────────

/** Maximum workflow steps before triggering a warning. */
const MAX_WORKFLOW_STEPS = 50;

/** Maximum tools per workspace before triggering a warning. */
const MAX_TOOL_COUNT = 100;

/** Maximum percentage of critical-risk tools before flagging. */
const MAX_CRITICAL_RATIO = 0.5;

/** Minimum critical count to trigger budget limit. */
const MIN_CRITICAL_COUNT = 10;

// ── Delegation Cycle Detection ──────────────────────────────────────────

/**
 * Detect delegation cycles using DFS with color marking.
 * Returns all cycles found as arrays of agent names.
 */
function detectDelegationCycles(
  agents: readonly { name: string; delegations: readonly { to: string }[] }[],
): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const agent of agents) {
    const targets = agent.delegations.map((d) => d.to);
    adjacency.set(agent.name, targets);
  }

  const cycles: string[][] = [];
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const path: string[] = [];

  for (const agent of agents) {
    color.set(agent.name, WHITE);
  }

  function dfs(node: string): void {
    color.set(node, GRAY);
    path.push(node);

    const neighbors = adjacency.get(node) ?? [];
    for (const next of neighbors) {
      const nextColor = color.get(next);
      if (nextColor === GRAY) {
        // Back-edge found: extract cycle from path
        const cycleStart = path.indexOf(next);
        cycles.push(path.slice(cycleStart).concat(next));
      } else if (nextColor === WHITE || nextColor === undefined) {
        dfs(next);
      }
    }

    path.pop();
    color.set(node, BLACK);
  }

  for (const agent of agents) {
    if (color.get(agent.name) === WHITE) {
      dfs(agent.name);
    }
  }

  return cycles;
}

// ── Rule Factory ────────────────────────────────────────────────────────

/**
 * Create G-BOUND governance rules for registration in the rule registry.
 *
 * Returns 4 rules:
 * - G-BOUND-01: Step limits
 * - G-BOUND-02: Tool limits
 * - G-BOUND-03: Budget limits
 * - G-BOUND-04: Recursion limits (delegation cycle detection)
 */
export function createGBoundRules(): GovernanceRule[] {
  const stepLimits: GovernanceRule = {
    id: 'G-BOUND-01',
    name: 'Step Limits',
    description: 'Cap workflow step counts to prevent unbounded execution',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const workflow of manifest.workflows) {
        if (workflow.steps.length > MAX_WORKFLOW_STEPS) {
          violations.push({
            ruleId: 'G-BOUND-01',
            severity: 'medium',
            file: 'lobster.yaml',
            line: 1,
            message: `Workflow "${workflow.name}" has ${workflow.steps.length} steps (limit: ${MAX_WORKFLOW_STEPS}) — unbounded step execution risk`,
            remediation: `Split "${workflow.name}" into smaller sub-workflows or add checkpoint gates`,
          });
        }
      }

      return { ruleId: 'G-BOUND-01', passed: violations.length === 0, violations };
    },
  };

  const toolLimits: GovernanceRule = {
    id: 'G-BOUND-02',
    name: 'Tool Limits',
    description: 'Cap total tool count per workspace',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      if (manifest.tools.length > MAX_TOOL_COUNT) {
        violations.push({
          ruleId: 'G-BOUND-02',
          severity: 'medium',
          file: 'TOOLS.md',
          line: 1,
          message: `Workspace has ${manifest.tools.length} tools (limit: ${MAX_TOOL_COUNT}) — excessive tool surface increases attack surface`,
          remediation: 'Reduce tool count by removing unused tools or consolidating overlapping functionality',
        });
      }

      return { ruleId: 'G-BOUND-02', passed: violations.length === 0, violations };
    },
  };

  const budgetLimits: GovernanceRule = {
    id: 'G-BOUND-03',
    name: 'Budget Limits',
    description: 'Cap high-risk tool concentration',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      if (manifest.tools.length > 0) {
        const criticalCount = manifest.tools.filter(
          (t) => t.riskLevel === 'critical',
        ).length;

        const ratio = criticalCount / manifest.tools.length;

        if (criticalCount >= MIN_CRITICAL_COUNT && ratio > MAX_CRITICAL_RATIO) {
          violations.push({
            ruleId: 'G-BOUND-03',
            severity: 'high',
            file: 'TOOLS.md',
            line: 1,
            message: `${criticalCount} of ${manifest.tools.length} tools (${Math.round(ratio * 100)}%) are critical risk — exceeds budget limit of ${Math.round(MAX_CRITICAL_RATIO * 100)}%`,
            remediation: 'Reduce critical-risk tool concentration by reclassifying, removing, or sandboxing high-risk tools',
          });
        }
      }

      return { ruleId: 'G-BOUND-03', passed: violations.length === 0, violations };
    },
  };

  const recursionLimits: GovernanceRule = {
    id: 'G-BOUND-04',
    name: 'Recursion Limits',
    description: 'Detect delegation cycles to prevent infinite recursion',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      const cycles = detectDelegationCycles(manifest.agents);
      for (const cycle of cycles) {
        violations.push({
          ruleId: 'G-BOUND-04',
          severity: 'critical',
          file: 'AGENTS.md',
          line: 1,
          message: `Delegation cycle detected: ${cycle.join(' → ')} — infinite recursion risk`,
          remediation: 'Break the delegation cycle by removing one delegation edge or converting to a linear chain',
        });
      }

      return { ruleId: 'G-BOUND-04', passed: violations.length === 0, violations };
    },
  };

  return [stepLimits, toolLimits, budgetLimits, recursionLimits];
}
