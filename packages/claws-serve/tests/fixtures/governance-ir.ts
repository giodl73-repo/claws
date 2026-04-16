/**
 * Minimal GovernanceIR fixture for claws-serve tests.
 */

import type { GovernanceIR } from '@bic/claws-sdk';

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
      ],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.1.0',
      compiledAt: '2026-04-15T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}
