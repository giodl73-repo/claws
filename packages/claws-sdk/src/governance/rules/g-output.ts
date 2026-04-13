/**
 * G-OUTPUT rules — output guard layer for injection defense.
 *
 * 4 rules:
 * - G-OUTPUT-01: Data redaction — flag CONFIDENTIAL data in output channels
 * - G-OUTPUT-02: URL rules — validate output destination URLs
 * - G-OUTPUT-03: Format validation — ensure structured output format compliance
 * - G-OUTPUT-04: Chain validation — governance gates across multi-step pipelines
 *
 * @module claws-sdk/governance/rules/g-output
 */

import type { CapabilityManifest } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

// ── Sensitive Data Patterns ─────────────────────────────────────────────

const SENSITIVE_PATTERNS: RegExp[] = [
  /\bCONFIDENTIAL\b/i,
  /\bSECRET\b/i,
  /\bRESTRICTED\b/i,
  /\bPII\b/,
  /\bcredential/i,
  /\bpassword\b/i,
  /\bapi[_-]?key\b/i,
];

function detectSensitiveData(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pat) => pat.test(text));
}

// ── Rule Factory ────────────────────────────────────────────────────────

/**
 * Create G-OUTPUT governance rules for registration in the rule registry.
 *
 * Returns 4 rules:
 * - G-OUTPUT-01: Data redaction
 * - G-OUTPUT-02: URL rules
 * - G-OUTPUT-03: Format validation
 * - G-OUTPUT-04: Chain validation
 */
export function createGOutputRules(): GovernanceRule[] {
  const dataRedaction: GovernanceRule = {
    id: 'G-OUTPUT-01',
    name: 'Data Redaction',
    description: 'Flag CONFIDENTIAL data in output channels',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        // Communication tools that reference sensitive data need redaction
        if (tool.classification === 'communication' && detectSensitiveData(tool.description)) {
          violations.push({
            ruleId: 'G-OUTPUT-01',
            severity: 'critical',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" is a communication channel with sensitive data references — redaction rules required`,
            remediation: `Add data redaction rules for "${tool.name}" to strip CONFIDENTIAL/SECRET/PII before output`,
          });
        }
      }

      return { ruleId: 'G-OUTPUT-01', passed: violations.length === 0, violations };
    },
  };

  const urlRules: GovernanceRule = {
    id: 'G-OUTPUT-02',
    name: 'Output URL Rules',
    description: 'Validate output destination URLs',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        // Network tools with high risk can exfiltrate to arbitrary destinations
        if (tool.classification === 'network' && (tool.riskLevel === 'high' || tool.riskLevel === 'critical')) {
          violations.push({
            ruleId: 'G-OUTPUT-02',
            severity: 'high',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" is a high-risk network tool — output URL validation required to prevent data exfiltration`,
            remediation: `Add URL allowlist for "${tool.name}" output destinations`,
          });
        }
      }

      return { ruleId: 'G-OUTPUT-02', passed: violations.length === 0, violations };
    },
  };

  const formatValidation: GovernanceRule = {
    id: 'G-OUTPUT-03',
    name: 'Format Validation',
    description: 'Ensure structured output format compliance',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        // Communication tools need format validation
        if (tool.classification === 'communication' && !detectSensitiveData(tool.description)) {
          violations.push({
            ruleId: 'G-OUTPUT-03',
            severity: 'medium',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" is a communication tool without output format validation`,
            remediation: `Add output schema or format validation for "${tool.name}" to prevent malformed messages`,
          });
        }
      }

      return { ruleId: 'G-OUTPUT-03', passed: violations.length === 0, violations };
    },
  };

  const chainValidation: GovernanceRule = {
    id: 'G-OUTPUT-04',
    name: 'Chain Validation',
    description: 'Governance gates across multi-step pipelines',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      // Check workflows with mixed network+communication tools
      const hasNetworkTool = manifest.tools.some((t) => t.classification === 'network');
      const hasCommTool = manifest.tools.some((t) => t.classification === 'communication');

      for (const workflow of manifest.workflows) {
        if (hasNetworkTool && hasCommTool && !workflow.requiresApproval) {
          violations.push({
            ruleId: 'G-OUTPUT-04',
            severity: 'high',
            file: 'lobster.yaml',
            line: 1,
            message: `Workflow "${workflow.name}" has network→communication chain without approval gates — output chain validation required`,
            remediation: `Add requiresApproval: true or insert governance gates between network and communication steps in "${workflow.name}"`,
          });
        }
      }

      return { ruleId: 'G-OUTPUT-04', passed: violations.length === 0, violations };
    },
  };

  return [dataRedaction, urlRules, formatValidation, chainValidation];
}
