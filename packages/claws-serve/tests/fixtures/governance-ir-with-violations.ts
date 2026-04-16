/**
 * GovernanceIR fixture with violations, conflicts, and multiple tools
 * for testing diagnostics, tensions, and classify endpoints.
 */

import type { GovernanceIR } from '@bic/claws-sdk';

export function governanceIRWithViolations(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        {
          name: 'read_file',
          description: 'Read a file from disk',
          riskLevel: 'low',
          oboFlag: false,
          classification: 'filesystem',
        },
        {
          name: 'send-email',
          description: 'Send email on behalf of user',
          riskLevel: 'critical',
          oboFlag: true,
          classification: 'communication',
        },
        {
          name: 'exec-shell',
          description: 'Execute shell commands',
          riskLevel: 'high',
          oboFlag: false,
          classification: 'execution',
        },
      ],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [
        {
          ruleId: 'GOV-001',
          level: 5,
          message: 'R5 tool send-email missing approval gate',
          target: 'policy.yaml:12',
          diagnosticCode: 'G-TOOL-01',
          fixSuggestions: [
            {
              direction: 'tighten',
              description: 'Add approval gate for send-email',
              target: 'policy.yaml',
            },
          ],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'GOV-002',
          level: 3,
          message: 'exec-shell has no audit trail',
          target: 'rules/exec.crest:5',
          diagnosticCode: 'G-AUDIT-01',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
      ],
      warnings: [
        {
          ruleId: 'GOV-003',
          level: 2,
          message: 'read_file missing trust labels',
          subRuleDiagnosticCode: 'G-INPUT-02',
          category: 'G-INPUT',
          subRuleIndex: 2,
        },
      ],
      enforcementPlan: {
        blockedTools: ['send-email'],
        requiredApprovals: ['admin'],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [
        {
          toolName: 'send-email',
          grantRuleId: 'GRANT-001',
          denyRuleId: 'DENY-001',
          severity: 'error',
          grantLevel: 4,
          denyLevel: 5,
          description: 'OBO grant/deny conflict on send-email',
          oboWithoutElicit: true,
        },
      ],
      multiConstraintConflicts: [
        {
          target: 'exec-shell',
          ruleIds: ['RULE-A', 'RULE-B', 'RULE-C'],
          severity: 'warning',
          description: 'Three rules conflict on exec-shell permissions',
        },
      ],
      haltReason: 'OBO conflict on send-email blocks EMIT',
      hasOboWithoutElicit: true,
      totalConflicts: 2,
    },
    compiler: {
      compilerVersion: '0.1.0',
      compiledAt: '2026-04-15T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}
