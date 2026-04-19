/**
 * L2 end-to-end test for Pulse 24 chunk routes.
 *
 * Drives a full fixture workspace through /compile and exercises both the
 * General and Preferences endpoints over the same listening server to
 * validate that pipeline output matches expected partner consumption.
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
  root = await mkdtemp(join(tmpdir(), 'chunks-pulse24-e2e-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('Pulse 24 — General + Preferences e2e', () => {
  it('drives a full fixture workspace through both chunk endpoints', async () => {
    await writeFile(
      join(root, 'SOUL.md'),
      '# Soul\n\nPartner-ready agent.\n\n## Purpose\n\n- deliver\n',
      'utf-8',
    );
    await writeFile(
      join(root, 'IDENTITY.md'),
      '# Identity\n\n## Organization\n\n- Organization: Harbor\n- Team: Docks\n- Language: English (United States)\n\n## RBAC\n\n- admin: platform-team\n- auditor: sec-ops\n',
      'utf-8',
    );
    await writeFile(join(root, 'AGENTS.md'), '# Agents\n\n## Captain\n\nOwner.\n', 'utf-8');
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## On Start\n\n- warm caches\n',
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

    const generalRes = await req(server, '/api/chunks/general/identity');
    expect(generalRes.status).toBe(200);
    const general = await generalRes.json() as { tab: string; data: Record<string, unknown> };
    expect(general.tab).toBe('general');
    expect(general.data['name']).toBe('Harbor');

    const instrRes = await req(server, '/api/chunks/preferences/instructions');
    expect(instrRes.status).toBe(200);
    const instructions = await instrRes.json() as { data: { instructions: string; reviewers: Array<{ name: string; id: string }> } };
    expect(instructions.data.instructions).toBe('Partner-ready agent.');
    expect(instructions.data.reviewers).toEqual([
      { name: 'admin', id: 'platform-team' },
      { name: 'auditor', id: 'sec-ops' },
    ]);

    const schedRes = await req(server, '/api/chunks/preferences/schedule');
    expect(schedRes.status).toBe(200);
    const schedule = await schedRes.json() as { data: { schedule?: { frequency: string } } };
    expect(schedule.data.schedule?.frequency).toBe('on-start');
  });
});
