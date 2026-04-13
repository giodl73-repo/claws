/**
 * G-INPUT rules — input validation for injection defense.
 *
 * 4 rules:
 * - G-INPUT-01: System prompt isolation — detect injection vectors in tool descriptions
 * - G-INPUT-02: Trust labeling — flag unlabeled external content sources
 * - G-INPUT-03: Sanitization — require sanitization for execution-tier tools
 * - G-INPUT-04: URL validation — require URL validation for network tools
 *
 * @module claws-sdk/governance/rules/g-input
 */

import type { CapabilityManifest } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

// ── Injection Detection ─────────────────────────────────────────────────

/**
 * Patterns that indicate prompt injection attempts in tool descriptions.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(previous|all|above)\s+(instructions|prompts?|rules?)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bforget\s+(everything|all|previous)\b/i,
  /\boverride\s+(all|previous|system)\b/i,
  /\bsystem\s+prompt\b.*\b(change|modify|replace|override)\b/i,
  /\bnew\s+instructions?\b/i,
  /\bjailbreak\b/i,
  /\bdisregard\b.*\b(rules?|instructions?|prompts?)\b/i,
];

function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pat) => pat.test(text));
}

// ── Rule Factory ────────────────────────────────────────────────────────

/**
 * Create G-INPUT governance rules for registration in the rule registry.
 *
 * Returns 4 rules:
 * - G-INPUT-01: System prompt isolation
 * - G-INPUT-02: Trust labeling
 * - G-INPUT-03: Sanitization
 * - G-INPUT-04: URL validation
 */
export function createGInputRules(): GovernanceRule[] {
  const systemPromptIsolation: GovernanceRule = {
    id: 'G-INPUT-01',
    name: 'System Prompt Isolation',
    description: 'Detect injection vectors in tool descriptions',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        if (detectInjection(tool.description)) {
          violations.push({
            ruleId: 'G-INPUT-01',
            severity: 'critical',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" description contains prompt injection patterns — system prompt isolation violated`,
            remediation: `Remove or rewrite the description for "${tool.name}" to eliminate injection vectors`,
          });
        }
      }

      return { ruleId: 'G-INPUT-01', passed: violations.length === 0, violations };
    },
  };

  const trustLabeling: GovernanceRule = {
    id: 'G-INPUT-02',
    name: 'Trust Labeling',
    description: 'Flag unlabeled external content sources',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        // Network and communication tools fetch/send external content
        if (tool.classification === 'network' || tool.classification === 'communication') {
          // Only fire if the tool actually lacks trust labels
          const hasTrustLabels = tool.trustLabels && tool.trustLabels.length > 0;
          if (!hasTrustLabels) {
            violations.push({
              ruleId: 'G-INPUT-02',
              severity: 'high',
              file: 'TOOLS.md',
              line: 1,
              message: `Tool "${tool.name}" (${tool.classification}) handles external content without trust labeling — default data flow ceiling PUBLIC applies (CFC-S04-F06)`,
              remediation: `Add trust labels to "${tool.name}" to classify data sensitivity. Prefer restricting access over elevating ceiling (CFC-S04-F03)`,
            });
          }
        }
      }

      return { ruleId: 'G-INPUT-02', passed: violations.length === 0, violations };
    },
  };

  const sanitization: GovernanceRule = {
    id: 'G-INPUT-03',
    name: 'Input Sanitization',
    description: 'Require sanitization for execution-tier tools',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        if (tool.classification === 'execution') {
          violations.push({
            ruleId: 'G-INPUT-03',
            severity: 'high',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" is classified as execution but has no input sanitization declaration`,
            remediation: `Add input sanitization rules for "${tool.name}" (e.g., allowlist, argument escaping, sandboxing)`,
          });
        }
      }

      return { ruleId: 'G-INPUT-03', passed: violations.length === 0, violations };
    },
  };

  const urlValidation: GovernanceRule = {
    id: 'G-INPUT-04',
    name: 'URL Validation',
    description: 'Require URL validation for network tools',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        if (tool.classification === 'network') {
          violations.push({
            ruleId: 'G-INPUT-04',
            severity: 'medium',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" is a network tool without URL validation rules`,
            remediation: `Add URL allowlist or validation patterns for "${tool.name}" to prevent SSRF and data exfiltration`,
          });
        }
      }

      return { ruleId: 'G-INPUT-04', passed: violations.length === 0, violations };
    },
  };

  return [systemPromptIsolation, trustLabeling, sanitization, urlValidation];
}
