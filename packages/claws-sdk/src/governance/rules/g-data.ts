/**
 * G-DATA rules — sensitivity labels with high-water-mark enforcement.
 *
 * 2 rules:
 * - G-DATA-LABEL: Enforce sensitivity ceiling on data flows (high-water-mark)
 * - G-DATA-NOLABEL: Distinguish "no labels declared" from "labels declared as PUBLIC"
 *
 * Labels: PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED
 *
 * When AGENTS.md omits a ceiling, the default is PUBLIC (least privilege).
 * This is distinct from explicitly declaring PUBLIC — the NOLABEL rule catches
 * the difference and warns about missing declarations.
 *
 * @module claws-sdk/governance/rules/g-data
 */

import type { CapabilityManifest } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

// ── Sensitivity Labels ──────────────────────────────────────────────────

/**
 * Sensitivity labels in ascending order of sensitivity.
 */
export type SensitivityLabel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

/**
 * Numeric ordering: PUBLIC(0) < INTERNAL(1) < CONFIDENTIAL(2) < RESTRICTED(3).
 */
export const SENSITIVITY_ORDER: Record<SensitivityLabel, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};

// ── Config Types ────────────────────────────────────────────────────────

/**
 * A single data flow between tools with a sensitivity label.
 */
export interface DataFlowEntry {
  readonly from: string;
  readonly to: string;
  readonly label: SensitivityLabel;
}

/**
 * Configuration for G-DATA rules.
 */
export interface DataConfig {
  /** Agent's declared sensitivity ceiling. undefined = not declared. */
  readonly agentCeiling: SensitivityLabel | undefined;
  /** Data flows between tools with sensitivity labels. */
  readonly dataFlows: readonly DataFlowEntry[];
}

// ── Rule Factory ────────────────────────────────────────────────────────

/**
 * Create G-DATA governance rules for registration in the rule registry.
 *
 * Returns 2 rules: LABEL, NOLABEL.
 */
export function createGDataRules(config: DataConfig): GovernanceRule[] {
  /** Effective ceiling — defaults to PUBLIC when not declared. */
  const effectiveCeiling = config.agentCeiling ?? 'PUBLIC';
  const ceilingRank = SENSITIVITY_ORDER[effectiveCeiling];

  const labelRule: GovernanceRule = {
    id: 'G-DATA-LABEL',
    name: 'Data Sensitivity — High-Water-Mark',
    description: 'Enforce sensitivity ceiling on data flows using high-water-mark',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const flow of config.dataFlows) {
        const flowRank = SENSITIVITY_ORDER[flow.label];

        if (flowRank > ceilingRank) {
          violations.push({
            ruleId: 'G-DATA-LABEL',
            severity: 'critical',
            file: 'AGENTS.md',
            line: 1,
            message: `Data flow ${flow.from} -> ${flow.to} labeled ${flow.label} exceeds agent ceiling ${effectiveCeiling} — high-water-mark breach`,
            remediation: `Reduce data flow sensitivity to ${effectiveCeiling} or raise agent ceiling in AGENTS.md`,
          });
        }
      }

      return {
        ruleId: 'G-DATA-LABEL',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const nolabelRule: GovernanceRule = {
    id: 'G-DATA-NOLABEL',
    name: 'Data Sensitivity — Missing Declaration',
    description: 'Warn when AGENTS.md omits sensitivity ceiling (distinct from declaring PUBLIC)',
    evaluate(_manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      if (config.agentCeiling === undefined) {
        violations.push({
          ruleId: 'G-DATA-NOLABEL',
          severity: 'medium',
          file: 'AGENTS.md',
          line: 1,
          message: 'No sensitivity ceiling declared in AGENTS.md — undeclared ceiling defaults to PUBLIC (least privilege)',
          remediation: 'Explicitly declare data-ceiling in AGENTS.md, even if PUBLIC, to distinguish intentional from accidental omission',
        });
      }

      return {
        ruleId: 'G-DATA-NOLABEL',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  return [labelRule, nolabelRule];
}
