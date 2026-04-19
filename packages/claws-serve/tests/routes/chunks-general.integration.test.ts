/**
 * L1 integration tests for Pulse 24 chunk routes.
 *
 * Spins up the full Express app via `createApp` and drives a real
 * `/compile` pass before exercising the General and Preferences chunk
 * endpoints. Exercises the wiring in `server.ts` end-to-end.
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

async function get(server: Server, path: string): Promise<{ status: number; json: unknown }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  const body = await res.text();
  return { status: res.status, json: body.length > 0 ? JSON.parse(body) : null };
}

async function post(server: Server, path: string, body: object): Promise<number> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.status;
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-pulse24-int-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

async function bootstrap(): Promise<Server> {
  const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
  const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
  const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
  const s = await listen(app);
  expect(await post(s, '/compile', {})).toBe(200);
  return s;
}

describe('Pulse 24 chunk routes — integration', () => {
  it('general/identity reflects IDENTITY.md + AGENTS.md parsed fields', async () => {
    await writeFile(
      join(root, 'SOUL.md'),
      '# Soul\n\nParse me completely.\n\n## Purpose\n\n- validate\n',
      'utf-8',
    );
    await writeFile(
      join(root, 'IDENTITY.md'),
      '# Identity\n\n## Organization\n\n- Organization: ClawsCo\n- Team: Gateway\n- Language: French (France)\n',
      'utf-8',
    );
    await writeFile(join(root, 'AGENTS.md'), '# Agents\n\n## Selene\n\nLead.\n', 'utf-8');

    server = await bootstrap();
    const { status, json } = await get(server, '/api/chunks/general/identity');
    expect(status).toBe(200);
    const body = json as { data: { name: string; language: string; managedBy: { name: string; role: string } } };
    expect(body.data.name).toBe('ClawsCo');
    expect(body.data.language).toBe('French (France)');
    expect(body.data.managedBy).toEqual({ name: 'Selene', role: 'Gateway' });
  });

  it('preferences endpoints expose writeBack URLs for editable sections', async () => {
    await writeFile(
      join(root, 'SOUL.md'),
      '# Soul\n\nBe deliberate.\n\n## Purpose\n\n- review\n',
      'utf-8',
    );
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## Every 5 minutes\n\n- tick\n',
      'utf-8',
    );

    server = await bootstrap();
    const instructions = await get(server, '/api/chunks/preferences/instructions');
    expect(instructions.status).toBe(200);
    expect((instructions.json as { writeBack: { method: string; url: string } }).writeBack).toEqual({
      method: 'PATCH',
      url: '/api/chunks/preferences/instructions',
    });

    const schedule = await get(server, '/api/chunks/preferences/schedule');
    expect(schedule.status).toBe(200);
    const scheduleBody = schedule.json as { writeBack: { method: string; url: string }; data: { schedule?: { frequency: string } } };
    expect(scheduleBody.writeBack).toEqual({
      method: 'PATCH',
      url: '/api/chunks/preferences/schedule',
    });
    expect(scheduleBody.data.schedule?.frequency).toBe('Every 5 minutes');
  });
});
