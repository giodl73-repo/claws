/**
 * chunk-assembler L1 integration tests.
 *
 * 4 tests — full 9-tab assembly from a fixture workspace + compiled IR,
 * connections grouped by MCP server, entitlements core vs governance,
 * writeBack URL well-formed for all editable chunks.
 *
 * CAP subsections (Knowledge Sources, Entitlements) live under IDENTITY.md
 * since CP-5 M01.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assembleChunks, parseWorkspace } from '../../src/workspace/index.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

const SOUL = `# Soul

Full agent for integration testing.

## Purpose

Validate assembleChunks end-to-end.
`;

const IDENTITY = `# Identity

## Organization

- Organization: IntegrationAgent
- Team: QA
- Language: English (United States)
- Trust: T3

## RBAC

- admin: qa-lead

## Knowledge Sources

### Mailbox

- CONFIDENTIAL email

## Entitlements

### Core

- gpt-enterprise

### Governance

- auditor-readonly
- policy-admin
`;

const AGENTS = `# Agents

## QA Lead

Owner.
`;

const TOOLS = `# Tools

## read_file

Reader.

## write_file

Writer.

## execute_command

Executor.

## send_email

Emailer.

## delete_database

Deleter.

## outlook_send

Sender on outlook server.
`;

const HEARTBEAT = `# Heartbeat

## Daily Triage

- Triage inbox
`;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunk-asm-int-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeAll() {
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'IDENTITY.md'), IDENTITY, 'utf-8');
  await writeFile(join(root, 'AGENTS.md'), AGENTS, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), TOOLS, 'utf-8');
  await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT, 'utf-8');
}

function irWithOutlookServer(): GovernanceIR {
  const base = minimalGovernanceIR();
  return {
    ...base,
    capabilities: {
      ...base.capabilities,
      tools: [
        ...base.capabilities.tools,
        {
          name: 'outlook_send',
          description: 'Send email via Outlook',
          riskLevel: 'high',
          oboFlag: true,
          classification: 'communication',
          mcpServer: 'outlook',
        },
      ],
    },
  };
}

describe('assembleChunks — L1 integration', () => {
  it('produces all 9 tab keys from a fixture workspace + compiled IR', async () => {
    await writeAll();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, irWithOutlookServer());

    expect(result.general).toBeDefined();
    expect(result.preferences).toBeDefined();
    expect(Array.isArray(result.connections)).toBe(true);
    expect(result.memory).toBeDefined();
    expect(result.groups).toBeDefined();
    expect(result.entitlements).toBeDefined();
    expect(result.trust).toBeDefined();
    expect(result.schedule).toBeDefined();
    expect(result.workqueue).toBeDefined();
    expect(result.snapshotStale).toBe(false);
  });

  it('groups connections by MCP server with per-server summaries', async () => {
    await writeAll();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, irWithOutlookServer());

    const servers = result.connections.map((c) => c.section).sort();
    expect(servers).toEqual(['local', 'outlook']);
    const outlook = result.connections.find((c) => c.section === 'outlook');
    expect(outlook?.data.tools).toHaveLength(1);
    expect(outlook?.data.summary).toEqual({ total: 1, enabled: 1, gated: 1, r5Count: 0 });
    const local = result.connections.find((c) => c.section === 'local');
    expect(local?.data.summary.total).toBeGreaterThanOrEqual(5);
  });

  it('separates entitlements into core vs governance arrays', async () => {
    await writeAll();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, irWithOutlookServer());

    expect(result.entitlements.data.core.map((e) => e.role)).toContain('gpt-enterprise');
    expect(result.entitlements.data.governance.map((e) => e.role)).toContain('auditor-readonly');
    expect(result.entitlements.data.governance).toHaveLength(2);
    expect(result.entitlements.writeBack).toBeUndefined();
  });

  it('projects preferences reviewers from RBAC, schedule recurrence, trust tier, knowledge classifications', async () => {
    await writeAll();
    // Rewrite IDENTITY.md with a richer Knowledge Sources subsection covering
    // all KnowledgeSourceEntry types, and rewrite HEARTBEAT for recurrence
    // variants. Entitlements and RBAC stay as before.
    await writeFile(
      join(root, 'IDENTITY.md'),
      [
        '# Identity',
        '',
        '## Organization',
        '',
        '- Organization: IntegrationAgent',
        '- Team: QA',
        '- Language: English (United States)',
        '- Trust: T3',
        '',
        '## RBAC',
        '',
        '- admin: qa-lead',
        '',
        '## Knowledge Sources',
        '',
        '### Mailbox',
        '',
        '- email',
        '',
        '### Teams channels',
        '',
        '- INTERNAL',
        '',
        '### OneDrive tables',
        '',
        '- RESTRICTED',
        '',
        '### External URL list',
        '',
        '- PUBLIC',
        '',
        '### Files Repo',
        '',
        '- INTERNAL',
        '',
        '## Entitlements',
        '',
        '### Core',
        '',
        '- gpt-enterprise',
        '',
      ].join('\n'),
      'utf-8',
    );
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## On Start\n\n- Warm up\n\n## Daily Triage\n\n- Triage\n\n## Every 5 Minutes\n\n- Liveness\n\n## Ad Hoc\n\n- Fallback\n',
      'utf-8',
    );
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, irWithOutlookServer());

    expect(result.preferences.data.reviewers.map((r) => r.name)).toContain('admin');
    const kinds = result.memory.data.knowledgeSources.map((k) => k.type).sort();
    expect(kinds).toEqual(['channels', 'email', 'files', 'tables', 'urls']);
    const recurrences = result.schedule.data.events.map((e) => e.recurrence);
    expect(recurrences).toContain('on-start');
    expect(recurrences).toContain('daily');
    expect(recurrences).toContain('manual');
    expect(recurrences.some((r) => r.startsWith('Every'))).toBe(true);
    expect(result.trust.data.currentTier).toBe('T3');
  });

  it('handles a workspace with no identity/heartbeat files via defaults', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\nBare bones.\n\n## Purpose\n\nTest defaults.\n', 'utf-8');
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());
    expect(result.general.data.name).toBe('Unnamed Agent');
    expect(result.general.data.managedBy.name).toBe('Unassigned');
    expect(result.memory.data.knowledgeSources).toHaveLength(0);
    expect(result.schedule.data.events).toHaveLength(0);
    expect(result.trust.data.currentTier).toBe('T0');
    expect(result.groups.data.m365).toHaveLength(0);
    expect(result.preferences.data.reviewers).toHaveLength(0);
  });

  it('marks non-R5 tools absent from TOOLS.md as unclassified and disabled', async () => {
    // Omit write_file (R3, low-medium) from TOOLS.md — R5 tools can't be unclassified
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\nX.\n', 'utf-8');
    await writeFile(
      join(root, 'TOOLS.md'),
      '# Tools\n\n## read_file\n\nR.\n\n## execute_command\n\nE.\n\n## send_email\n\nS.\n\n## delete_database\n\nD.\n',
      'utf-8',
    );
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());
    const local = result.connections.find((c) => c.section === 'local');
    const wf = local?.data.tools.find((t) => t.tool === 'write_file');
    expect(wf?.lock.source).toBe('unclassified');
    expect(wf?.enabled).toBe(false);
  });

  it('emits well-formed writeBack URLs for every editable chunk', async () => {
    await writeAll();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, irWithOutlookServer());

    const editable = [
      result.general.writeBack,
      result.preferences.writeBack,
      result.memory.writeBack,
      result.groups.writeBack,
      result.schedule.writeBack,
      result.workqueue.writeBack,
      ...result.connections.map((c) => c.writeBack),
    ];
    for (const wb of editable) {
      expect(wb).toBeDefined();
      expect(wb?.method).toBe('PATCH');
      expect(wb?.url.startsWith('/api/chunks/')).toBe(true);
      expect(wb?.url.split('/').length).toBeGreaterThanOrEqual(4);
    }
    // Entitlements + trust are read-only — no writeBack.
    expect(result.entitlements.writeBack).toBeUndefined();
    expect(result.trust.writeBack).toBeUndefined();
  });
});
