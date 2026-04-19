/**
 * L1 integration tests for Pulse 26 chunks.
 *
 * Spins up the full Express app via `createApp` with a real workspace
 * directory on disk. Verifies (1) memory knowledge sources match the
 * parsed IDENTITY.md §Knowledge Sources with governance-derived locks,
 * and (2) entitlements separate core vs governance roles from
 * IDENTITY.md §Entitlements.
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
  root = await mkdtemp(join(tmpdir(), 'chunks-mge-int-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/chunks/{memory,groups,entitlements} — integration', () => {
  it('memory chunk knowledge sources match IDENTITY.md §Knowledge Sources with governance locks for RESTRICTED', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\nPreamble.\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      [
        '## Knowledge Sources',
        '',
        '### Public Docs',
        '',
        '- handbook url',
        '',
        '### Confidential HR SharePoint',
        '',
        '- employee records',
        '',
        '### Restricted Financials',
        '',
        '- restricted revenue data',
        '',
      ].join('\n'),
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);
    await primeCompile(server);

    const res = await get(server, '/api/chunks/memory');
    expect(res.status).toBe(200);
    const chunk = JSON.parse(res.body) as Chunk<'memory'>;
    const data = chunk.data as MemoryData;
    expect(data.knowledgeSources.map((s) => s.name)).toEqual([
      'Public Docs',
      'Confidential HR SharePoint',
      'Restricted Financials',
    ]);
    const [pub, conf, restr] = data.knowledgeSources;
    expect(pub!.dataLabel).toBe('PUBLIC');
    expect(pub!.lock.source).toBe('none');
    expect(conf!.dataLabel).toBe('CONFIDENTIAL');
    expect(conf!.lock.source).toBe('governance');
    expect(restr!.dataLabel).toBe('RESTRICTED');
    expect(restr!.lock.source).toBe('governance');
  });

  it('entitlements chunk separates core vs governance role arrays from IDENTITY.md §Entitlements', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\nPreamble.\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      [
        '## Entitlements',
        '',
        '### Paid tier',
        '',
        '- gpt-4-turbo',
        '- whisper-large',
        '',
        '### Governance review',
        '',
        '- dpo-approver',
        '',
      ].join('\n'),
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);
    await primeCompile(server);

    const res = await get(server, '/api/chunks/entitlements');
    expect(res.status).toBe(200);
    const chunk = JSON.parse(res.body) as Chunk<'entitlements'>;
    const data = chunk.data as EntitlementsData;
    expect(data.core.map((e) => e.role)).toEqual(['gpt-4-turbo', 'whisper-large']);
    expect(data.core[0]!.type).toBe('Paid tier');
    expect(data.governance.map((e) => e.role)).toEqual(['dpo-approver']);
    expect(data.governance[0]!.type).toBe('Governance review');
    expect(chunk.writeBack).toBeUndefined();
  });
});
