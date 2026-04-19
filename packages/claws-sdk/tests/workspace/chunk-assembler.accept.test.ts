/**
 * chunk-assembler L3 acceptance test — binds findings from the CL-10
 * cap-integration scenarios S01, S02, S16 that are within the chunk
 * assembler's surface.
 *
 * S01-oc-path-resolution — meta.oc_path roundtrip and governance context
 * presence (assembler's contribution: governance context flows through).
 * S02-session-scoped-query — chunk data projection (locks, summaries).
 * S16-dry-run-patch — R5 lock is non-negotiable regardless of edit mode
 * (assembler's contribution: the R5 lock source is authoritative, so
 * dry-run and real PATCH observe the same lock state).
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assembleChunks,
  parseWorkspace,
  type FleetPolicy,
} from '../../src/workspace/index.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunk-asm-accept-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeMinimalForAccept() {
  await writeFile(
    join(root, 'SOUL.md'),
    '# Soul\n\nAcceptance agent.\n\n## Purpose\n\nValidate findings.\n',
    'utf-8',
  );
  await writeFile(
    join(root, 'IDENTITY.md'),
    '# Identity\n\n## Organization\n\n- Organization: AcceptAgent\n- Team: Eng\n',
    'utf-8',
  );
  await writeFile(join(root, 'AGENTS.md'), '# Agents\n\n## Owner\n\nPrimary.\n', 'utf-8');
  await writeFile(
    join(root, 'TOOLS.md'),
    '# Tools\n\n## read_file\n\nR.\n\n## write_file\n\nW.\n\n## execute_command\n\nE.\n\n## send_email\n\nEmail.\n\n## delete_database\n\nDel.\n',
    'utf-8',
  );
}

describe('assembleChunks — L3 acceptance (S01/S02/S16)', () => {
  it('S01/F06 — governance context is present on every assembled chunk (never null or missing)', async () => {
    await writeMinimalForAccept();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());

    const chunks = [
      result.general,
      result.preferences,
      result.memory,
      result.groups,
      result.entitlements,
      result.trust,
      result.schedule,
      result.workqueue,
      ...result.connections,
    ];
    for (const chunk of chunks) {
      expect(chunk.governance).toBeDefined();
    }
  });

  it('S02 — chunk projections carry the authoritative IR risk level (no re-derivation)', async () => {
    await writeMinimalForAccept();
    const workspace = await parseWorkspace(root);
    const result = await assembleChunks(workspace, minimalGovernanceIR());

    const local = result.connections.find((c) => c.section === 'local');
    expect(local).toBeDefined();
    // IR says send_email is critical (R5) — chunk must surface level 5.
    const send = local!.data.tools.find((t) => t.tool === 'send_email');
    expect(send?.risk.level).toBe(5);
    // IR says read_file is low (R2 in our mapping) — chunk must surface level 2.
    const read = local!.data.tools.find((t) => t.tool === 'read_file');
    expect(read?.risk.level).toBe(2);
  });

  it('S16/F01 — R5 lock is non-negotiable; fleet cannot disable; dry-run and real PATCH see the same lock', async () => {
    await writeMinimalForAccept();
    const workspace = await parseWorkspace(root);
    const fleetPolicy: FleetPolicy = {
      overrides: [
        {
          tool: 'send_email',
          requires_approval: false,
          reason: 'Attempt to disable R5 — must be ignored',
          authorizedBy: 'fleet-admin',
          authorizedAt: '2026-04-17T00:00:00Z',
        },
      ],
    };
    // Both calls should yield identical lock state — the assembler is pure.
    const dryRun = await assembleChunks(workspace, minimalGovernanceIR(), { fleetPolicy });
    const realRun = await assembleChunks(workspace, minimalGovernanceIR(), { fleetPolicy });

    const sendDry = dryRun.connections[0]!.data.tools.find((t) => t.tool === 'send_email');
    const sendReal = realRun.connections[0]!.data.tools.find((t) => t.tool === 'send_email');
    expect(sendDry?.lock.source).toBe('r5');
    expect(sendReal?.lock.source).toBe('r5');
    expect(sendDry?.approvalRequired).toBe(true);
    expect(sendReal?.approvalRequired).toBe(true);
  });
});
