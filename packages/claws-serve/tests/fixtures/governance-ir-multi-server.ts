/**
 * GovernanceIR fixture with tools spread across multiple MCP servers —
 * used to exercise the /api/chunks/connections endpoint which groups
 * tools by `mcpServer`.
 */

import type { GovernanceIR } from '@bic/claws-sdk';

/**
 * Four servers (outlook, teams, sharepoint, local) covering each risk
 * level plus an OBO tool so tests can assert summary math, R5 locks, and
 * approval-source derivation.
 */
export function governanceIRMultiServer(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        // outlook — R4 OBO + R2 read
        {
          name: 'send_mail',
          description: 'Send email via Outlook',
          riskLevel: 'high',
          oboFlag: true,
          classification: 'communication',
          mcpServer: 'outlook',
        },
        {
          name: 'read_inbox',
          description: 'Read Outlook inbox',
          riskLevel: 'low',
          oboFlag: false,
          classification: 'communication',
          mcpServer: 'outlook',
        },
        // teams — R3 message
        {
          name: 'post_message',
          description: 'Post Teams message',
          riskLevel: 'medium',
          oboFlag: false,
          classification: 'communication',
          mcpServer: 'teams',
        },
        // sharepoint — R5 critical + R2 read
        {
          name: 'delete_site',
          description: 'Delete SharePoint site',
          riskLevel: 'critical',
          oboFlag: false,
          classification: 'data',
          mcpServer: 'sharepoint',
        },
        {
          name: 'list_sites',
          description: 'List SharePoint sites',
          riskLevel: 'low',
          oboFlag: false,
          classification: 'filesystem',
          mcpServer: 'sharepoint',
        },
        // local — R1 read (no mcpServer → 'local')
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

/** TOOLS.md declaring every tool in `governanceIRMultiServer()`. */
export const MULTI_SERVER_TOOLS_MD = `# Tools

## send_mail

Send email.

## read_inbox

Read inbox.

## post_message

Post a Teams message.

## delete_site

Delete a SharePoint site.

## list_sites

List SharePoint sites.

## read_file

Read a file.
`;
