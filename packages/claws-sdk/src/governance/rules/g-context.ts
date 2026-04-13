/**
 * G-CONTEXT rules — context isolation for injection defense.
 *
 * 4 rules:
 * - G-CONTEXT-01: Boundary markers — enforce context boundaries in multi-agent setups
 * - G-CONTEXT-02: Tool isolation — ensure tools cannot access other tools' contexts
 * - G-CONTEXT-03: Memory isolation — enforce memory boundaries between agents
 * - G-CONTEXT-04: Skill isolation — ensure skills cannot access cross-agent state
 *
 * @module claws-sdk/governance/rules/g-context
 */

import type { CapabilityManifest } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

/**
 * Create G-CONTEXT governance rules for registration in the rule registry.
 *
 * Returns 4 rules:
 * - G-CONTEXT-01: Boundary markers
 * - G-CONTEXT-02: Tool isolation
 * - G-CONTEXT-03: Memory isolation
 * - G-CONTEXT-04: Skill isolation
 */
export function createGContextRules(): GovernanceRule[] {
  const boundaryMarkers: GovernanceRule = {
    id: 'G-CONTEXT-01',
    name: 'Boundary Markers',
    description: 'Enforce context boundary markers in multi-agent setups',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      // Multi-agent setups require explicit context boundary markers
      if (manifest.agents.length > 1) {
        const hasDelegations = manifest.agents.some((a) => a.delegations.length > 0);
        if (hasDelegations) {
          violations.push({
            ruleId: 'G-CONTEXT-01',
            severity: 'high',
            file: 'AGENTS.md',
            line: 1,
            message: `Multi-agent workspace with ${manifest.agents.length} agents and active delegations requires context boundary markers`,
            remediation: 'Add explicit context boundary declarations between agents to prevent cross-agent prompt contamination',
          });
        }
      }

      return { ruleId: 'G-CONTEXT-01', passed: violations.length === 0, violations };
    },
  };

  const toolIsolation: GovernanceRule = {
    id: 'G-CONTEXT-02',
    name: 'Tool Isolation',
    description: 'Ensure tools cannot access other tools contexts',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      // In multi-agent setups, check that delegated tools have isolation
      if (manifest.agents.length > 1) {
        for (const agent of manifest.agents) {
          for (const delegation of agent.delegations) {
            if (delegation.permissions.includes('EXECUTE')) {
              violations.push({
                ruleId: 'G-CONTEXT-02',
                severity: 'high',
                file: 'AGENTS.md',
                line: 1,
                message: `Agent "${agent.name}" delegates EXECUTE to "${delegation.to}" — tool isolation required to prevent cross-agent tool context leakage`,
                remediation: `Add tool isolation boundary between "${agent.name}" and "${delegation.to}" for EXECUTE permissions`,
              });
            }
          }
        }
      }

      return { ruleId: 'G-CONTEXT-02', passed: violations.length === 0, violations };
    },
  };

  const memoryIsolation: GovernanceRule = {
    id: 'G-CONTEXT-03',
    name: 'Memory Isolation',
    description: 'Enforce memory boundaries between agents',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      // Multi-agent setups with WRITE delegations need memory isolation
      if (manifest.agents.length > 1) {
        for (const agent of manifest.agents) {
          for (const delegation of agent.delegations) {
            if (delegation.permissions.includes('WRITE')) {
              violations.push({
                ruleId: 'G-CONTEXT-03',
                severity: 'high',
                file: 'AGENTS.md',
                line: 1,
                message: `Agent "${agent.name}" delegates WRITE to "${delegation.to}" — memory isolation required to prevent cross-agent state corruption`,
                remediation: `Add memory isolation between "${agent.name}" and "${delegation.to}". Each agent should have its own memory namespace`,
              });
            }
          }
        }
      }

      return { ruleId: 'G-CONTEXT-03', passed: violations.length === 0, violations };
    },
  };

  const skillIsolation: GovernanceRule = {
    id: 'G-CONTEXT-04',
    name: 'Skill Isolation',
    description: 'Ensure skills cannot access cross-agent state',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      // Skills that require high-governance tools in multi-agent contexts
      if (manifest.agents.length > 1 && manifest.skills.length > 0) {
        for (const skill of manifest.skills) {
          if (skill.governanceLevel >= 3) {
            violations.push({
              ruleId: 'G-CONTEXT-04',
              severity: 'medium',
              file: 'skills/',
              line: 1,
              message: `Skill "${skill.name}" (governance level ${skill.governanceLevel}) in multi-agent workspace requires skill isolation boundaries`,
              remediation: `Scope skill "${skill.name}" to a specific agent or add cross-agent skill isolation declarations`,
            });
          }
        }
      }

      return { ruleId: 'G-CONTEXT-04', passed: violations.length === 0, violations };
    },
  };

  return [boundaryMarkers, toolIsolation, memoryIsolation, skillIsolation];
}
