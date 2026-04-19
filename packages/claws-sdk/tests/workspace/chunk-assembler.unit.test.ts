/**
 * chunk-assembler L0 unit tests.
 *
 * 8 tests — GeneralData, ConnectionsData risk, MemoryData locks, field
 * editability, R5 lock, fleet lock, snapshot retry detection, snapshot
 * stale warning after max retries.
 *
 * CAP subsections (Knowledge Sources, Entitlements) live under IDENTITY.md
 * since CP-5 M01. Tests write them as H2 subsections with H3 entries.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assembleChunks,
  parseWorkspace,
  type FleetPolicy,
  type MtimeReader,
} from '../../src/workspace/index.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { SectionBase, WorkspaceState } from '@bic/openclaw-workspace/path';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

function section(
  preamble: string,
  sections: ReadonlyArray<{ heading: string; body?: string; line?: number }>,
): SectionBase {
  return {
    raw: preamble,
    preamble,
    sections: sections.map((s, i) => ({
      heading: s.heading,
      body: s.body ?? '',
      line: s.line ?? i + 1,
    })),
  };
}

const SOUL = `# Soul

AgentX helps with email and scheduling.

## Purpose

Ship governance-safe agents.
`;

const IDENTITY = `# Identity

## Organization

- Organization: AgentX
- Team: Sales
- Language: English (United States)

## RBAC

- admin: platform-eng
- auditor: sec-ops

## Knowledge Sources

### Mailbox

- email: true

### SharePoint sites

- CONFIDENTIAL contents

### External websites

- PUBLIC URL

## Entitlements

### Paid tier

- gpt-enterprise

### Governance

- auditor-readonly
`;

const AGENTS = `# Agents

## Babak Shammas

Primary owner.
`;

const MEMORY = `# Memory

## Personal

- alpha
- beta

## Shared

- gamma
`;

const TOOLS = `# Tools

## read_file

Read a file from disk.

## send_email

Send email on the user's behalf.
`;

const HEARTBEAT = `# Heartbeat

## On Start

- Verify registry

## Every 5 Minutes

- Flush audit buffer
`;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunk-assembler-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeFullWorkspace() {
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'IDENTITY.md'), IDENTITY, 'utf-8');
  await writeFile(join(root, 'AGENTS.md'), AGENTS, 'utf-8');
  await writeFile(join(root, 'MEMORY.md'), MEMORY, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), TOOLS, 'utf-8');
  await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT, 'utf-8');
}

/** Helper — declare every fixture IR tool in TOOLS.md so none are unclassified. */
function irWithDeclaredTools(): GovernanceIR {
  return minimalGovernanceIR();
}

async function writeFullWorkspaceWithAllTools() {
  await writeFullWorkspace();
  const allTools = `# Tools\n\n## read_file\n\nRead.\n\n## write_file\n\nWrite.\n\n## execute_command\n\nExec.\n\n## send_email\n\nEmail.\n\n## delete_database\n\nDelete.\n`;
  await writeFile(join(root, 'TOOLS.md'), allTools, 'utf-8');
}

describe('assembleChunks — L0 unit', () => {
  it('assembles GeneralData from IDENTITY.md + AGENTS.md', async () => {
    await writeFullWorkspace();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());

    expect(result.general.tab).toBe('general');
    expect(result.general.section).toBe('identity');
    expect(result.general.data.name).toBe('AgentX');
    expect(result.general.data.language).toBe('English (United States)');
    expect(result.general.data.managedBy).toEqual({ name: 'Babak Shammas', role: 'Sales' });
    expect(result.general.writeBack?.url).toBe('/api/chunks/general/identity');
  });

  it('assembles ConnectionsData with per-tool risk classification across all reachable levels', async () => {
    await writeFullWorkspaceWithAllTools();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());

    expect(result.connections).toHaveLength(1); // all local
    const local = result.connections[0]!;
    expect(local.section).toBe('local');
    // Covers all 4 ToolRiskLevel → RiskClassification mappings from RISK_LEVEL_MAP:
    //   low → L2 'write', medium → L3 'communicate',
    //   high → L4 'execute', critical → L5 'transact'.
    // Level 1 'read' is a type-system reservation with no current ToolRiskLevel
    // source; the risk-classification.unit.test covers it at the type level.
    const readFile = local.data.tools.find((t) => t.tool === 'read_file');
    expect(readFile?.risk).toEqual({ level: 2, capability: 'write' });
    const writeFile = local.data.tools.find((t) => t.tool === 'write_file');
    expect(writeFile?.risk).toEqual({ level: 3, capability: 'communicate' });
    const executeCommand = local.data.tools.find((t) => t.tool === 'execute_command');
    expect(executeCommand?.risk).toEqual({ level: 4, capability: 'execute' });
    const sendEmail = local.data.tools.find((t) => t.tool === 'send_email');
    expect(sendEmail?.risk).toEqual({ level: 5, capability: 'transact' });
    expect(local.data.summary.r5Count).toBe(2);
  });

  it('assembles MemoryData with CONFIDENTIAL knowledge source locks', async () => {
    await writeFullWorkspace();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());

    const sharepoint = result.memory.data.knowledgeSources.find((k) => k.name === 'SharePoint sites');
    expect(sharepoint?.dataLabel).toBe('CONFIDENTIAL');
    expect(sharepoint?.lock.source).toBe('governance');
    const urls = result.memory.data.knowledgeSources.find((k) => k.name === 'External websites');
    expect(urls?.lock.source).toBe('none');
    expect(result.memory.data.memories.personal.count).toBe(2);
  });

  it('derives field editability with type, options, required, and lock', async () => {
    await writeFullWorkspace();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());

    expect(result.general.editable.name).toEqual({ type: 'string', required: true });
    expect(result.general.editable.description?.type).toBe('text');
    expect(result.general.editable.language?.options).toContain('English (United States)');
    expect(result.general.editable.managedBy?.lock).toEqual({ source: 'none' });
  });

  it('gives R5 tools lock.source "r5" and non-overridable status', async () => {
    await writeFullWorkspaceWithAllTools();
    const workspace = await parseWorkspace(root);
    const fleetPolicy: FleetPolicy = {
      overrides: [
        {
          tool: 'send_email',
          requires_approval: false, // attempt to disable — must be ignored for R5
          reason: 'fleet attempt to override R5',
          authorizedBy: 'fleet-admin',
          authorizedAt: '2026-04-17T00:00:00Z',
        },
      ],
    };
    const result = await assembleChunks(workspace, minimalGovernanceIR(), { fleetPolicy });
    const local = result.connections[0]!;
    const send = local.data.tools.find((t) => t.tool === 'send_email');
    expect(send?.lock.source).toBe('r5');
    expect(send?.approvalRequired).toBe(true);
    expect(send?.approvalSource).toBe('compiled'); // R5 ignores fleet override
  });

  it('gives R3–R4 fleet-overridden tools lock.source "fleet"', async () => {
    await writeFullWorkspaceWithAllTools();
    const workspace = await parseWorkspace(root);
    const fleetPolicy: FleetPolicy = {
      overrides: [
        {
          tool: 'execute_command',
          requires_approval: true,
          reason: 'Fleet requires approval for R4 execution tools',
          authorizedBy: 'fleet-admin',
          authorizedAt: '2026-04-17T00:00:00Z',
        },
      ],
    };
    const result = await assembleChunks(workspace, irWithDeclaredTools(), { fleetPolicy });
    const local = result.connections[0]!;
    const exec = local.data.tools.find((t) => t.tool === 'execute_command');
    expect(exec?.lock.source).toBe('fleet');
    expect(exec?.approvalSource).toBe('fleet-override');
    expect(exec?.lock.reason).toContain('Fleet requires approval');
  });

  it('detects file change mid-assembly and retries until stable', async () => {
    await writeFullWorkspace();
    const workspace = await parseWorkspace(root);
    let attempt = 0;
    // First attempt: shift mtime between pre and post; second: stable.
    const readMtimes: MtimeReader = async (_path) => {
      attempt++;
      // Stable for attempt 2 onwards
      if (attempt <= 2) return 1000 + attempt; // differs between pre(1) and post(2)
      return 2000;
    };
    const result = await assembleChunks(workspace, minimalGovernanceIR(), { readMtimes });
    expect(result.snapshotStale).toBe(false);
    expect(result.general.governance?.snapshotStale).not.toBe(true);
  });

  it('sets snapshotStale after exhausting 3 retries', async () => {
    await writeFullWorkspace();
    const workspace = await parseWorkspace(root);
    // Always shift — every attempt sees drift.
    let call = 0;
    const readMtimes: MtimeReader = async () => {
      call++;
      return call; // never equal between adjacent snapshots
    };
    const result = await assembleChunks(workspace, minimalGovernanceIR(), { readMtimes });
    expect(result.snapshotStale).toBe(true);
    expect(result.general.governance?.snapshotStale).toBe(true);
    expect(result.memory.governance?.snapshotStale).toBe(true);
  });

  it('returns empty CAP projections when IDENTITY.md exists but lacks the subsection', async () => {
    // Covers the `section === undefined` branch in extractIdentityCapEntries
    // for both Knowledge Sources and Entitlements subsections.
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    await writeFile(
      join(root, 'IDENTITY.md'),
      `## Organization\n\n- Organization: X\n- Team: Y\n`,
      'utf-8',
    );
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());
    expect(result.memory.data.knowledgeSources).toEqual([]);
    expect(result.entitlements.data.core).toEqual([]);
    expect(result.entitlements.data.governance).toEqual([]);
  });

  it('returns empty CAP projections when the subsection is present but has no H3 entries', async () => {
    // Covers the `currentHeading === null` tail branch in parseH3Entries.
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    await writeFile(
      join(root, 'IDENTITY.md'),
      `## Knowledge Sources\n\nNo entries yet.\n\n## Entitlements\n\nTBD.\n`,
      'utf-8',
    );
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());
    expect(result.memory.data.knowledgeSources).toEqual([]);
    expect(result.entitlements.data.core).toEqual([]);
    expect(result.entitlements.data.governance).toEqual([]);
  });
});

// Minimal workspace helper: all OC slots null except SOUL (which may be empty).
function emptyWorkspace(soulPreamble = ''): WorkspaceState {
  return {
    workspaceRoot: '/ws',
    soul: section(soulPreamble, []),
    memory: null,
    identity: null,
    tools: null,
    agents: null,
    user: null,
    heartbeat: null,
  };
}

function emptyIR(): GovernanceIR {
  return {
    capabilities: { tools: [], skills: [], agents: [], workflows: [] },
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
    compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-12T00:00:00.000Z', schemaVersion: 1 },
  };
}

describe('assembleChunks — L0 branch coverage', () => {
  it('applies default General fields when Organization section is absent', async () => {
    // Covers L194/L200/L206 `?? 'Unnamed Agent'` / language / role defaults,
    // L198 `'No description provided.'`, and L204 `?? 'Unassigned'`.
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(emptyWorkspace(), emptyIR(), { readMtimes });
    expect(result.general.data.name).toBe('Unnamed Agent');
    expect(result.general.data.description).toBe('No description provided.');
    expect(result.general.data.language).toBe('English (United States)');
    expect(result.general.data.managedBy).toEqual({ name: 'Unassigned', role: 'Owner' });
  });

  it('falls back to Organization section default when section exists but lacks key lines', async () => {
    // valueFromSections L686: separator === -1 path (a body line without a colon).
    const workspace: WorkspaceState = {
      ...emptyWorkspace('Some agent.'),
      identity: section('', [
        { heading: 'Organization', body: '- no-colon-here\n- Organization: AgentZ' },
      ]),
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, emptyIR(), { readMtimes });
    expect(result.general.data.name).toBe('AgentZ');
    // Language/Team keys missing → defaults
    expect(result.general.data.language).toBe('English (United States)');
    expect(result.general.data.managedBy.role).toBe('Owner');
  });

  it('skips RBAC reviewer lines without a leading bullet or without a colon', async () => {
    // L246: !trimmed.startsWith('-') continue; L249: colon === -1 continue.
    const workspace: WorkspaceState = {
      ...emptyWorkspace(''),
      identity: section('', [
        {
          heading: 'RBAC',
          body: 'plain line without bullet\n- nocolonhere\n- admin: platform-eng',
        },
      ]),
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, emptyIR(), { readMtimes });
    const prefs = result.preferences.data;
    expect(prefs.reviewers).toEqual([{ name: 'admin', id: 'platform-eng' }]);
  });

  it('omits schedule when HEARTBEAT.md exists but has no sections', async () => {
    // L291: first === undefined → return null from scheduleFromHeartbeat.
    const workspace: WorkspaceState = {
      ...emptyWorkspace(''),
      heartbeat: section('preamble only', []),
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, emptyIR(), { readMtimes });
    expect((result.preferences.data as { schedule?: unknown }).schedule).toBeUndefined();
  });

  it('derives schedule.frequency for daily, manual, and every-* headings', async () => {
    // L767: startsWith('every'); L768: daily; L770: manual default.
    const dailyWs: WorkspaceState = {
      ...emptyWorkspace(''),
      heartbeat: section('', [{ heading: 'daily sweep' }]),
    };
    const manualWs: WorkspaceState = {
      ...emptyWorkspace(''),
      heartbeat: section('', [{ heading: 'Ad-hoc review' }]),
    };
    const everyWs: WorkspaceState = {
      ...emptyWorkspace(''),
      heartbeat: section('', [{ heading: 'Every 10 Minutes' }]),
    };
    const readMtimes: MtimeReader = async () => null;
    const daily = await assembleChunks(dailyWs, emptyIR(), { readMtimes });
    const manual = await assembleChunks(manualWs, emptyIR(), { readMtimes });
    const every = await assembleChunks(everyWs, emptyIR(), { readMtimes });
    expect(daily.schedule.data.events[0]?.recurrence).toBe('daily');
    expect(manual.schedule.data.events[0]?.recurrence).toBe('manual');
    expect(every.schedule.data.events[0]?.recurrence).toBe('Every 10 Minutes');
  });

  it('singularizes R5 warning when exactly one R5 tool is present', async () => {
    // L335: r5Tools.length === 1 ? '' : 's' — singular branch.
    const ir = emptyIR();
    ir.capabilities.tools = [
      {
        name: 'send_email',
        description: 'email',
        riskLevel: 'critical',
        oboFlag: false,
        classification: 'communication',
      },
    ];
    const workspace: WorkspaceState = {
      ...emptyWorkspace(''),
      tools: section('', [{ heading: 'send_email' }]),
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, ir, { readMtimes });
    const local = result.connections[0]!;
    const gov = local.governance!;
    const hasSingularWarning = (gov.warnings ?? []).some(
      (w) => w.rule === 'G-ELICIT' && /1 R5 tool require/.test(w.message),
    );
    expect(hasSingularWarning).toBe(true);
  });

  it('matches fleet override scoped by mcpServer when declared', async () => {
    // L367: `o.server === undefined || o.server === tool.mcpServer` server-match branch.
    const ir = emptyIR();
    ir.capabilities.tools = [
      {
        name: 'tool_a',
        description: 'a',
        mcpServer: 'svc1',
        riskLevel: 'medium',
        oboFlag: false,
        classification: 'filesystem',
      },
      {
        name: 'tool_a',
        description: 'a on svc2',
        mcpServer: 'svc2',
        riskLevel: 'medium',
        oboFlag: false,
        classification: 'filesystem',
      },
    ];
    const workspace: WorkspaceState = {
      ...emptyWorkspace(''),
      tools: section('', [{ heading: 'tool_a' }]),
    };
    const fleetPolicy: FleetPolicy = {
      overrides: [
        {
          tool: 'tool_a',
          server: 'svc1',
          requires_approval: true,
          reason: 'scoped to svc1 only',
          authorizedBy: 'fleet-admin',
          authorizedAt: '2026-04-17T00:00:00Z',
        },
      ],
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, ir, { fleetPolicy, readMtimes });
    // Two connections chunks — one per server.
    const svc1 = result.connections.find((c) => c.section === 'svc1')!;
    const svc2 = result.connections.find((c) => c.section === 'svc2')!;
    expect(svc1.data.tools[0]?.approvalSource).toBe('fleet-override');
    expect(svc2.data.tools[0]?.approvalSource).toBe('compiled');
    // fleetOverride flag only on svc1's governance.
    expect(svc1.governance?.fleetOverride).toBe(true);
    expect(svc2.governance?.fleetOverride).toBeUndefined();
  });

  it('labels an R5 OBO tool with the OBO-specific lock reason', async () => {
    // Covers the tool.oboFlag ? 'R5 OBO — non-negotiable' : ... branch.
    const ir = emptyIR();
    ir.capabilities.tools = [
      {
        name: 'send_email',
        description: 'email',
        riskLevel: 'critical',
        oboFlag: true,
        classification: 'communication',
      },
    ];
    const workspace: WorkspaceState = {
      ...emptyWorkspace(''),
      tools: section('', [{ heading: 'send_email' }]),
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, ir, { readMtimes });
    const send = result.connections[0]!.data.tools.find((t) => t.tool === 'send_email');
    expect(send?.lock.source).toBe('r5');
    if (send?.lock.source === 'r5') {
      expect(send.lock.reason).toContain('R5 OBO');
    }
  });

  it('assembles Groups and Trust with an absent IDENTITY.md', async () => {
    // L461 identity null path; L508 firstMatchingLine with no sections.
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(emptyWorkspace(), emptyIR(), { readMtimes });
    expect(result.groups.data).toEqual({ m365: [], security: [], onPremise: [] });
    expect(result.trust.data.currentTier).toBe('T0');
  });

  it('extracts trust tier from an identity body line matching L#/T# pattern', async () => {
    // L753 match[1] branch; L761/762 inferTrustTier both branches.
    const workspace: WorkspaceState = {
      ...emptyWorkspace(''),
      identity: section('', [{ heading: 'Trust', body: '- trust: L3 operator' }]),
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, emptyIR(), { readMtimes });
    expect(result.trust.data.currentTier).toBe('T3');
    expect(result.trust.governance?.trustTier).toBe('T3');
  });

  it('falls back to T0 when a trust line matches but has no digit group', async () => {
    // Exercises inferTrustTier second-match fallback (raw exists, m === null).
    // The outer pattern uses L\d+|T\d+, so we need a line where firstMatchingLine
    // finds the outer pattern but inferTrustTier's inner /[LT]([0-4])/i fails —
    // e.g. L9 (outside the 0-4 range).
    const workspace: WorkspaceState = {
      ...emptyWorkspace(''),
      identity: section('', [{ heading: 'T', body: '- trust: L9' }]),
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, emptyIR(), { readMtimes });
    expect(result.trust.data.currentTier).toBe('T0');
  });

  it('classifies knowledge source headings across every type branch', async () => {
    // Covers classifyKnowledgeHeading: channels (L732), tables (L733),
    // urls (L734→already hit for website; add explicit "url"), files (default).
    const ir = emptyIR();
    const workspace: WorkspaceState = {
      ...emptyWorkspace(''),
      identity: section('', [
        {
          heading: 'Knowledge Sources',
          body: [
            '### Teams channels',
            '- shared',
            '### Data tables',
            '- internal',
            '### URL list',
            '- https://example.com',
            '### Project files',
            '- doc.md',
          ].join('\n'),
        },
      ]),
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, ir, { readMtimes });
    const byName = new Map(
      result.memory.data.knowledgeSources.map((k) => [k.name, k]),
    );
    expect(byName.get('Teams channels')?.type).toBe('channels');
    expect(byName.get('Data tables')?.type).toBe('tables');
    expect(byName.get('URL list')?.type).toBe('urls');
    expect(byName.get('Project files')?.type).toBe('files');
  });

  it('infers RESTRICTED data label and applies governance lock', async () => {
    // L740: inferDataLabel restricted branch; lock.source 'governance' for RESTRICTED.
    const workspace: WorkspaceState = {
      ...emptyWorkspace(''),
      identity: section('', [
        {
          heading: 'Knowledge Sources',
          body: '### Secure archive\n\nRESTRICTED legal holds.',
        },
      ]),
    };
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(workspace, emptyIR(), { readMtimes });
    const archive = result.memory.data.knowledgeSources.find((k) => k.name === 'Secure archive');
    expect(archive?.dataLabel).toBe('RESTRICTED');
    expect(archive?.lock.source).toBe('governance');
  });

  it('emits governance with no warnings or violations when the IR analysis is empty', async () => {
    // L579 / L580 — warnings.length === 0 and violations.length === 0 branches.
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(emptyWorkspace(), emptyIR(), { readMtimes });
    const gov = result.general.governance!;
    expect(gov.warnings).toBeUndefined();
    expect(gov.violations).toBeUndefined();
  });

  it('falls back to generic fix guidance when a violation has no fix suggestions', async () => {
    // L575: fixSuggestions[0]?.description ?? 'No fix guidance available'.
    const ir = emptyIR();
    ir.analysis.violations = [
      {
        ruleId: 'TEST-001',
        level: 3,
        message: 'no fix',
        target: 'whatever',
        diagnosticCode: 'G-TEST-01',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      },
    ];
    const readMtimes: MtimeReader = async () => null;
    const result = await assembleChunks(emptyWorkspace(), ir, { readMtimes });
    const violations = result.general.governance?.violations ?? [];
    expect(violations[0]?.fixGuidance).toBe('No fix guidance available');
  });

  it('sets snapshotStale on all chunks including groups/trust/schedule/workqueue', async () => {
    // Covers snapshotStale ternary branches on the chunks that don't build governance
    // via buildGovernance (groups L467-469, trust L516-518, schedule L539,
    // workqueue L552) — the stale-truthy and stale-falsy sides.
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const workspace = await parseWorkspace(root);
    let call = 0;
    const readMtimes: MtimeReader = async () => {
      call++;
      return call;
    };
    const result = await assembleChunks(workspace, emptyIR(), { readMtimes });
    expect(result.snapshotStale).toBe(true);
    expect(result.groups.governance?.snapshotStale).toBe(true);
    expect(result.trust.governance?.snapshotStale).toBe(true);
    expect(result.schedule.governance?.snapshotStale).toBe(true);
    expect(result.workqueue.governance?.snapshotStale).toBe(true);
  });

});
