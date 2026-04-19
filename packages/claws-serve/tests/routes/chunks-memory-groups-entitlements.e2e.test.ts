/**
 * L2 e2e test for Pulse 26: hits `/api/chunks/memory`, `/groups`, and
 * `/entitlements` from a fixture workspace via the full server stack
 * (createApp → HTTP → response JSON).
 *
 * Knowledge sources and entitlements live under IDENTITY.md subsections
 * since CP-5 M01.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import type {
  Chunk,
  EntitlementsData,
  GroupsData,
  MemoryData,
} from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(server: Server, path: string): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

async function primeCompile(server: Server): Promise<void> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}/compile`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (res.status !== 200) throw new Error(`compile failed: ${String(res.status)}`);
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-mge-e2e-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('E2E: chunks memory/groups/entitlements', () => {
  it('serves the three chunks end-to-end from a populated workspace', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\nPreamble.\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      [
        '## M365',
        '',
        '- Finance',
        '',
        '## Security',
        '',
        '- SecOps',
        '',
        '## On-Premise',
        '',
        '- LDAP',
        '',
        '## Knowledge Sources',
        '',
        '### Public Handbook',
        '',
        '- url',
        '',
        '## Entitlements',
        '',
        '### Paid tier',
        '',
        '- gpt-4',
        '',
        '### Governance',
        '',
        '- approver',
        '',
      ].join('\n'),
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root, noWs: true });
    server = await listenApp(app);
    await primeCompile(server);

    const mem = await get(server, '/api/chunks/memory');
    expect(mem.status).toBe(200);
    const memoryChunk = JSON.parse(mem.body) as Chunk<'memory'>;
    const memData = memoryChunk.data as MemoryData;
    expect(memData.knowledgeSources).toHaveLength(1);
    expect(memData.knowledgeSources[0]!.dataLabel).toBe('PUBLIC');

    const grp = await get(server, '/api/chunks/groups');
    expect(grp.status).toBe(200);
    const grpData = (JSON.parse(grp.body) as Chunk<'groups'>).data as GroupsData;
    expect(grpData.m365).toEqual(['Finance']);
    expect(grpData.security).toEqual(['SecOps']);
    expect(grpData.onPremise).toEqual(['LDAP']);

    const ent = await get(server, '/api/chunks/entitlements');
    expect(ent.status).toBe(200);
    const entChunk = JSON.parse(ent.body) as Chunk<'entitlements'>;
    const entData = entChunk.data as EntitlementsData;
    expect(entData.core.map((e) => e.role)).toEqual(['gpt-4']);
    expect(entData.governance.map((e) => e.role)).toEqual(['approver']);
    expect(entChunk.writeBack).toBeUndefined();
  });
});
