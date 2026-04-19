/**
 * GovernanceIR + TOOLS.md fixture with tools at every risk level (R1…R5).
 *
 * Powers the allow-all integration + e2e happy path: R1-R4 enable, R5 skip,
 * audit records the split.
 */

import type { GovernanceIR } from '@bic/claws-sdk';

export function governanceIRMixedRisk(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        // R1 — trivial/read-only
        {
          name: 'ping',
          description: 'Ping a service',
          riskLevel: 'low',
          oboFlag: false,
          classification: 'filesystem',
          mcpServer: 'local',
        },
        // R2 — read
        {
          name: 'read_inbox',
          description: 'Read inbox',
          riskLevel: 'low',
          oboFlag: false,
          classification: 'communication',
          mcpServer: 'outlook',
        },
        // R3 — message
        {
          name: 'post_message',
          description: 'Post a Teams message',
          riskLevel: 'medium',
          oboFlag: false,
          classification: 'communication',
          mcpServer: 'teams',
        },
        // R4 — OBO write
        {
          name: 'send_mail',
          description: 'Send email as user',
          riskLevel: 'high',
          oboFlag: true,
          classification: 'communication',
          mcpServer: 'outlook',
        },
        // R5 — critical, must be skipped
        {
          name: 'delete_site',
          description: 'Delete a SharePoint site',
          riskLevel: 'critical',
          oboFlag: false,
          classification: 'data',
          mcpServer: 'sharepoint',
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
      effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
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

/**
 * TOOLS.md covering every fixture tool. Every tool starts with
 * `enabled: false` so the allow-all batch has work to do.
 */
export const MIXED_RISK_TOOLS_MD = `# Tools

## ping

- enabled: false
- description: Ping a service

## read_inbox

- enabled: false
- description: Read inbox

## post_message

- enabled: false
- description: Post Teams

## send_mail

- enabled: false
- description: Send mail

## delete_site

- enabled: false
- description: Delete site
`;
