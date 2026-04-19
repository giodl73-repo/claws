/**
 * GovernanceIR fixture where every tool is classified R5 (`riskLevel: 'critical'`).
 *
 * Powers the S05 acceptance case: allow-all on such a workspace must
 * approve zero tools and return 200 with `{ enabled: 0, skipped: N × r5 }`.
 */

import type { GovernanceIR } from '@bic/claws-sdk';

export function governanceIRAllR5(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        {
          name: 'delete_site',
          description: 'Delete a SharePoint site',
          riskLevel: 'critical',
          oboFlag: false,
          classification: 'data',
          mcpServer: 'sharepoint',
        },
        {
          name: 'wipe_mailbox',
          description: 'Delete every email in a mailbox',
          riskLevel: 'critical',
          oboFlag: true,
          classification: 'data',
          mcpServer: 'outlook',
        },
        {
          name: 'admin_teardown',
          description: 'Tear down the tenant',
          riskLevel: 'critical',
          oboFlag: true,
          classification: 'data',
          mcpServer: 'admin',
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
      effectiveR5Count: { derived: 3, overridden: 0, total: 3 },
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
      compiledAt: '2026-04-17T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

/** TOOLS.md declaring every R5 tool from the fixture with an `enabled: false` flag. */
export const ALL_R5_TOOLS_MD = `# Tools

## delete_site

- enabled: false
- description: Delete SharePoint

## wipe_mailbox

- enabled: false
- description: Wipe mailbox

## admin_teardown

- enabled: false
- description: Tear down tenant
`;
