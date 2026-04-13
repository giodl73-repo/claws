/**
 * G-ELICIT rules — elicitation gates for R5/OBO tools.
 *
 * 4 rules:
 * - G-ELICIT-GATE: Attach elicitRequired:true to every R5/OBO tool
 * - G-ELICIT-TIMEOUT: Timeout deny-default — R5 tools cannot have allow on timeout
 * - G-ELICIT-PREAUTH: Distinguish pre-authorized from ungoverned R5/OBO tools
 * - G-ELICIT-CHAIN: Chain limit enforcement on delegation depth
 *
 * @module claws-sdk/governance/rules/g-elicit
 */

import type { CapabilityManifest } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

// ── Config Types ────────────────────────────────────────────────────────

/**
 * Configuration for a single tool in the elicitation gate config.
 */
export interface ElicitToolEntry {
  readonly name: string;
  readonly riskLevel: number;
  readonly obo: boolean;
  readonly elicitRequired: boolean;
  /** Timeout action: 'deny' (correct) or 'allow' (violation). */
  readonly timeoutAction?: 'deny' | 'allow';
  /** Delegation depth for chain limit enforcement. */
  readonly delegationDepth?: number;
  /** Whether this tool uses schedule-based delegation. */
  readonly scheduleDelegation?: boolean;
}

/**
 * Configuration for G-ELICIT rules.
 */
export interface ElicitConfig {
  readonly tools: readonly ElicitToolEntry[];
  /** Tools pre-authorized by USER.md authority. */
  readonly userAuthority: readonly string[];
  /** Timeout in milliseconds for elicitation gates. */
  readonly timeoutMs: number;
  /** Maximum delegation chain depth. */
  readonly chainLimit: number;
}

// ── Rule Factory ────────────────────────────────────────────────────────

/**
 * Create G-ELICIT governance rules for registration in the rule registry.
 *
 * Returns 4 rules: GATE, TIMEOUT, PREAUTH, CHAIN.
 */
export function createGElicitRules(config: ElicitConfig): GovernanceRule[] {
  const gateRule: GovernanceRule = {
    id: 'G-ELICIT-GATE',
    name: 'Elicitation Gate — R5/OBO',
    description: 'Every R5/OBO tool must have elicitRequired:true',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of config.tools) {
        if (tool.riskLevel >= 5 && !tool.elicitRequired) {
          violations.push({
            ruleId: 'G-ELICIT-GATE',
            severity: 'critical',
            file: 'TOOLS.md',
            line: 1,
            message: `R5 tool "${tool.name}" does not have elicitRequired:true — approval gate missing`,
            remediation: `Set elicitRequired: true for "${tool.name}" in governance configuration`,
          });
        }
      }

      return {
        ruleId: 'G-ELICIT-GATE',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const timeoutRule: GovernanceRule = {
    id: 'G-ELICIT-TIMEOUT',
    name: 'Elicitation Timeout — Deny Default',
    description: 'R5 tools must deny on timeout — allow-on-timeout is forbidden',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of config.tools) {
        if (tool.riskLevel >= 5 && tool.timeoutAction === 'allow') {
          violations.push({
            ruleId: 'G-ELICIT-TIMEOUT',
            severity: 'critical',
            file: 'TOOLS.md',
            line: 1,
            message: `R5 tool "${tool.name}" has timeout action 'allow' — must deny on timeout for R5 tools`,
            remediation: `Set timeoutAction to 'deny' for "${tool.name}" — deny-default is non-negotiable for R5`,
          });
        }
      }

      return {
        ruleId: 'G-ELICIT-TIMEOUT',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const preauthRule: GovernanceRule = {
    id: 'G-ELICIT-PREAUTH',
    name: 'Elicitation Pre-Authorization',
    description: 'Distinguish pre-authorized tools (USER.md authority) from ungoverned tools',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];
      const authoritySet = new Set(config.userAuthority);

      for (const tool of config.tools) {
        // Only check R5/OBO tools
        if (tool.riskLevel < 5 || !tool.obo) continue;

        // Pre-authorized tools are governed — no violation
        if (authoritySet.has(tool.name)) continue;

        // Not pre-authorized and not explicitly governed => ungoverned
        if (!tool.elicitRequired) {
          violations.push({
            ruleId: 'G-ELICIT-PREAUTH',
            severity: 'high',
            file: 'USER.md',
            line: 1,
            message: `R5/OBO tool "${tool.name}" is ungoverned — not pre-authorized in USER.md and elicitRequired is false`,
            remediation: `Either add "${tool.name}" to USER.md authority list or set elicitRequired: true`,
          });
        }
      }

      return {
        ruleId: 'G-ELICIT-PREAUTH',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const chainRule: GovernanceRule = {
    id: 'G-ELICIT-CHAIN',
    name: 'Elicitation Chain Limit',
    description: 'Enforce maximum delegation chain depth for R5 tools',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of config.tools) {
        if (tool.delegationDepth === undefined) continue;
        if (tool.delegationDepth <= config.chainLimit) continue;

        const severity = tool.scheduleDelegation ? 'critical' : 'high';
        const scheduleNote = tool.scheduleDelegation
          ? ' (schedule delegation traces to subagent R5 tool)'
          : '';

        violations.push({
          ruleId: 'G-ELICIT-CHAIN',
          severity,
          file: 'AGENTS.md',
          line: 1,
          message: `Tool "${tool.name}" delegation chain depth ${tool.delegationDepth} exceeds limit ${config.chainLimit}${scheduleNote}`,
          remediation: `Reduce delegation depth for "${tool.name}" to ${config.chainLimit} or raise chain limit with justification`,
        });
      }

      return {
        ruleId: 'G-ELICIT-CHAIN',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  return [gateRule, timeoutRule, preauthRule, chainRule];
}
