/**
 * L3 acceptance — Scenario S02 (CL-10 Chunk Format).
 *
 * Verifies a full workspace parsed through the General and Preferences
 * endpoints returns JSON that matches the CL-10 Chunk<K> shape: `tab`,
 * `section`, `data`, `editable`, `governance`, `writeBack`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
function listen(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

async function req(server: Server, path: string, init: RequestInit = {}): Promise<Response> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  return fetch(`http://127.0.0.1:${String(addr.port)}${path}`, init);
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-pulse24-accept-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S02 — General + Preferences chunk acceptance', () => {
  it('matches CL-10 Chunk<K> JSON spec across both endpoints', async () => {
    await writeFile(
      join(root, 'SOUL.md'),
      '# Soul\n\nEnterprise compliance agent.\n\n## Purpose\n\n- audit\n',
      'utf-8',
    );
    await writeFile(
      join(root, 'IDENTITY.md'),
      '# Identity\n\n## Organization\n\n- Organization: Enterprise\n- Team: Compliance\n- Language: English (United States)\n\n## RBAC\n\n- admin: corp-admins\n',
      'utf-8',
    );
    await writeFile(join(root, 'AGENTS.md'), '# Agents\n\n## Auditor\n\nOwner.\n', 'utf-8');
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## On Start\n\n- warm\n',
      'utf-8',
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listen(app);

    const compileRes = await req(server, '/compile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(compileRes.status).toBe(200);

    const endpoints = [
      '/api/chunks/general/identity',
      '/api/chunks/preferences/instructions',
      '/api/chunks/preferences/schedule',
    ];

    for (const endpoint of endpoints) {
      const res = await req(server, endpoint);
      expect(res.status, `endpoint ${endpoint}`).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      // CL-10 Chunk<K>: mandatory fields
      expect(body['tab'], `tab for ${endpoint}`).toBeTypeOf('string');
      expect(body['section'], `section for ${endpoint}`).toBeTypeOf('string');
      expect(body['data'], `data for ${endpoint}`).toBeTypeOf('object');
      expect(body['editable'], `editable for ${endpoint}`).toBeTypeOf('object');
      expect(body['writeBack'], `writeBack for ${endpoint}`).toBeTypeOf('object');
      const writeBack = body['writeBack'] as Record<string, unknown>;
      expect(writeBack['method']).toBe('PATCH');
      expect(writeBack['url']).toBeTypeOf('string');
      // governance is optional on the type but the SDK always emits it on
      // these chunks (warnings/violations projection).
      expect(body['governance'], `governance for ${endpoint}`).toBeTypeOf('object');
    }
  });
});
