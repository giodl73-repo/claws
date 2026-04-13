/**
 * Minimal GovernanceIR fixture for emit tests.
 */

import type { GovernanceIR } from '../../../src/ir/governance-ir.js';

/**
 * Create a minimal GovernanceIR for testing.
 * Contains one tool at each risk level, one deny intent, and one elicit intent.
 */
export function minimalGovernanceIR(): GovernanceIR {
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
          name: 'write_file',
          description: 'Write a file to disk',
          riskLevel: 'medium',
          oboFlag: false,
          classification: 'filesystem',
        },
        {
          name: 'execute_command',
          description: 'Execute a shell command',
          riskLevel: 'high',
          oboFlag: false,
          classification: 'execution',
        },
        {
          name: 'send_email',
          description: 'Send an email on behalf of the user',
          riskLevel: 'critical',
          oboFlag: true,
          classification: 'communication',
        },
        {
          name: 'delete_database',
          description: 'Drop a database table',
          riskLevel: 'critical',
          oboFlag: false,
          classification: 'data',
        },
      ],
      skills: [
        {
          name: 'code-review',
          description: 'Review code changes',
          requiredTools: ['read_file'],
          governanceLevel: 1,
        },
      ],
      agents: [
        {
          name: 'primary',
          description: 'Primary agent',
          delegations: [
            { from: 'primary', to: 'reviewer', permissions: ['read_file'] },
          ],
          maxAutonomousLevel: 3,
        },
        {
          name: 'reviewer',
          description: 'Code review agent',
          delegations: [],
          maxAutonomousLevel: 1,
        },
      ],
      workflows: [
        {
          name: 'review-flow',
          description: 'Code review workflow',
          steps: ['checkout', 'review', 'report'],
          requiresApproval: false,
        },
      ],
    },
    analysis: {
      violations: [
        {
          ruleId: 'SEC-001',
          level: 5,
          message: 'Critical tool without approval gate',
          target: 'delete_database',
          diagnosticCode: 'G-TOOL-01',
          fixSuggestions: [
            {
              direction: 'tighten',
              description: 'Add approval gate for critical tools',
              target: 'delete_database',
            },
          ],
          toolFuzzyMatches: [],
        },
      ],
      warnings: [
        {
          ruleId: 'AUD-001',
          level: 2,
          message: 'Tool missing audit configuration',
          subRuleDiagnosticCode: 'G-AUDIT-01',
          category: 'G-AUDIT',
          subRuleIndex: 1,
        },
      ],
      enforcementPlan: {
        blockedTools: ['delete_database'],
        requiredApprovals: ['execute_command'],
        auditOnlyRules: ['AUD-001'],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
    },
    intents: [
      {
        id: 'intent-001',
        ruleId: 'SEC-001',
        level: 5,
        kind: 'deny',
        description: 'Block delete_database at R5',
        target: 'delete_database',
        reason: 'Critical data destruction — denied by governance',
      },
      {
        id: 'intent-002',
        ruleId: 'OBO-001',
        level: 4,
        kind: 'elicit',
        description: 'Require OBO elicitation for send_email',
        target: 'send_email',
        prompt: 'Do you authorize sending email on your behalf?',
      },
      {
        id: 'intent-003',
        ruleId: 'AUD-001',
        level: 2,
        kind: 'label',
        description: 'Audit label for read_file',
        key: 'read_file',
        value: 'audit-enabled',
      },
    ],
    delegationMap: [
      { ruleId: 'SEC-001', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'OBO-001', mechanism: 'hook', target: 'before_elicitation' },
      { ruleId: 'AUD-001', mechanism: 'audit-only', target: 'on_audit' },
    ],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.1.0',
      compiledAt: '2026-04-12T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}
