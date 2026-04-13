/**
 * G-A2A rules — agent-to-agent trust boundary enforcement.
 *
 * 5 rules:
 * - G-A2A-IDENTITY: Warns when L0 default insufficient for configured A2A
 * - G-A2A-TRUST: Detects subagent trust level exceeding parent
 * - G-A2A-DELEGATE: Flags phantom tools via FE6 cross-reference against manifest
 * - G-A2A-FLOW: Enforces data flow ceiling on SENT data only
 * - G-A2A-ESCALATE: Advisory warning for trust escalation (advisory mode = high, otherwise = critical)
 *
 * @module claws-sdk/governance/rules/g-a2a
 */

import type { CapabilityManifest } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

// ── Sensitivity Ordering ────────────────────────────────────────────────

/**
 * Sensitivity labels ordered from least to most sensitive.
 */
export type SensitivityLabel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

const SENSITIVITY_RANK: Record<SensitivityLabel, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};

// ── Config Types ────────────────────────────────────────────────────────

/**
 * Declaration of a subagent in the A2A configuration.
 */
export interface SubagentDeclaration {
  readonly name: string;
  readonly trustLevel: number;
  readonly tools: readonly string[];
  readonly dataCeiling: SensitivityLabel;
  /** Whether this subagent sends data to other agents. */
  readonly sendsData?: boolean;
  /** Sensitivity level of data this subagent sends. */
  readonly sendsCeiling?: SensitivityLabel;
}

/**
 * Configuration for A2A trust boundary rules.
 */
export interface A2AConfig {
  readonly subagents: readonly SubagentDeclaration[];
  readonly parentTrustLevel: number;
  readonly a2aEnabled: boolean;
  /** When true, rules still fire but are informational only. ESCALATE ignores this. */
  readonly advisoryMode?: boolean;
}

// ── Minimum Trust for A2A ───────────────────────────────────────────────

/** Minimum trust level required for A2A communication. L0 is insufficient. */
const MIN_A2A_TRUST = 1;

// ── Rule Factory ────────────────────────────────────────────────────────

/**
 * Create G-A2A governance rules for registration in the rule registry.
 *
 * Returns 5 rules: IDENTITY, TRUST, DELEGATE, FLOW, ESCALATE.
 */
export function createGA2ARules(config: A2AConfig): GovernanceRule[] {
  const identityRule: GovernanceRule = {
    id: 'G-A2A-IDENTITY',
    name: 'A2A Identity Verification',
    description: 'Warn when L0 default trust is insufficient for configured A2A',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      if (config.a2aEnabled && config.parentTrustLevel < MIN_A2A_TRUST) {
        violations.push({
          ruleId: 'G-A2A-IDENTITY',
          severity: 'high',
          file: 'AGENTS.md',
          line: 1,
          message: `Parent agent trust L0 is insufficient for A2A communication — minimum L${MIN_A2A_TRUST} required`,
          remediation: 'Set parent agent trust level to at least L1 in IDENTITY.md',
        });
      }

      for (const sub of config.subagents) {
        if (sub.trustLevel < MIN_A2A_TRUST && config.a2aEnabled) {
          violations.push({
            ruleId: 'G-A2A-IDENTITY',
            severity: 'high',
            file: 'AGENTS.md',
            line: 1,
            message: `Subagent "${sub.name}" has L0 trust — insufficient for A2A communication`,
            remediation: `Set trust level for "${sub.name}" to at least L${MIN_A2A_TRUST}`,
          });
        }
      }

      return {
        ruleId: 'G-A2A-IDENTITY',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const trustRule: GovernanceRule = {
    id: 'G-A2A-TRUST',
    name: 'A2A Trust Boundary',
    description: 'Detect subagent trust level exceeding parent (privilege escalation)',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const sub of config.subagents) {
        if (sub.trustLevel > config.parentTrustLevel) {
          violations.push({
            ruleId: 'G-A2A-TRUST',
            severity: 'critical',
            file: 'AGENTS.md',
            line: 1,
            message: `Subagent "${sub.name}" trust L${sub.trustLevel} exceeds parent trust L${config.parentTrustLevel} — privilege escalation`,
            remediation: `Reduce "${sub.name}" trust to L${config.parentTrustLevel} or lower, or elevate parent trust`,
          });
        }
      }

      return {
        ruleId: 'G-A2A-TRUST',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const delegateRule: GovernanceRule = {
    id: 'G-A2A-DELEGATE',
    name: 'A2A Delegation — Phantom Tool Detection (FE6)',
    description: 'Cross-reference delegated tools against CapabilityManifest; flag phantom tools',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];
      const knownTools = new Set(manifest.tools.map((t) => t.name));

      for (const sub of config.subagents) {
        for (const toolName of sub.tools) {
          if (!knownTools.has(toolName)) {
            violations.push({
              ruleId: 'G-A2A-DELEGATE',
              severity: 'critical',
              file: 'AGENTS.md',
              line: 1,
              message: `Phantom tool "${toolName}" delegated to "${sub.name}" — not found in TOOLS.md manifest`,
              remediation: `Add "${toolName}" to TOOLS.md or remove it from "${sub.name}" delegation`,
            });
          }
        }
      }

      return {
        ruleId: 'G-A2A-DELEGATE',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const flowRule: GovernanceRule = {
    id: 'G-A2A-FLOW',
    name: 'A2A Data Flow Ceiling',
    description: 'Enforce data flow ceiling on SENT data only, not externally retrieved',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const sub of config.subagents) {
        // Only enforce on agents that send data
        if (!sub.sendsData) continue;

        const sendsCeiling = sub.sendsCeiling ?? sub.dataCeiling;
        const agentCeiling = sub.dataCeiling;

        const sendsRank = SENSITIVITY_RANK[sendsCeiling];
        const ceilingRank = SENSITIVITY_RANK[agentCeiling];

        if (sendsRank > ceilingRank) {
          violations.push({
            ruleId: 'G-A2A-FLOW',
            severity: 'high',
            file: 'AGENTS.md',
            line: 1,
            message: `Subagent "${sub.name}" sends ${sendsCeiling} data but has ${agentCeiling} ceiling — data flow ceiling breach`,
            remediation: `Reduce sent data sensitivity to ${agentCeiling} or raise "${sub.name}" data ceiling`,
          });
        }
      }

      return {
        ruleId: 'G-A2A-FLOW',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const escalateRule: GovernanceRule = {
    id: 'G-A2A-ESCALATE',
    name: 'A2A Trust Escalation — Advisory',
    description: 'Advisory warning for trust escalation when advisory mode is enabled; hard error otherwise',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const sub of config.subagents) {
        if (sub.trustLevel > config.parentTrustLevel) {
          if (config.advisoryMode) {
            // Advisory mode: warn but don't block — distinct from TRUST rule's hard violation
            violations.push({
              ruleId: 'G-A2A-ESCALATE',
              severity: 'high',
              file: 'AGENTS.md',
              line: 1,
              message: `Trust escalation advisory: "${sub.name}" (L${sub.trustLevel}) > parent (L${config.parentTrustLevel}) — review recommended`,
              remediation: 'Advisory: review trust configuration. Reduce subagent trust or elevate parent trust before disabling advisory mode.',
            });
          } else {
            // Non-advisory: hard error, same as TRUST but distinct rule ID for audit trail
            violations.push({
              ruleId: 'G-A2A-ESCALATE',
              severity: 'critical',
              file: 'AGENTS.md',
              line: 1,
              message: `Trust escalation: "${sub.name}" (L${sub.trustLevel}) > parent (L${config.parentTrustLevel}) — blocked`,
              remediation: 'Trust escalation cannot be downgraded. Resolve by reducing subagent trust or escalating to human review.',
            });
          }
        }
      }

      return {
        ruleId: 'G-A2A-ESCALATE',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  return [identityRule, trustRule, delegateRule, flowRule, escalateRule];
}
