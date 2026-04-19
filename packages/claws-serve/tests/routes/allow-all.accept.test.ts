/**
 * L3 acceptance test for PATCH /api/chunks/connections/allow-all — S05.
 *
 * Scenario S05 (`cap-integration`): an all-R5 workspace must respond 200
 * with 0 tools enabled. This is the P-282 fail-closed contract: there is
 * no admin override, no flag, no bypass — the bulk action must be
 * idempotent-and-safe when every tool is critical.
 *
 * The response summary is the partner contract: it must carry exactly
 * one `skipped` entry per tool, each tagged `reason: 'r5'`, so the CAP UI
 * can render "every tool is critical — allow-all cannot help here" without
 * inferring state from absence.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, type ServerState } from '../../src/server.js';
import type { AllowAllResponse } from '../../src/routes/allow-all.js';
import { governanceIRAllR5, ALL_R5_TOOLS_MD } from '../fixtures/all-r5-workspace.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nAllow-all acceptance.\n\n## Purpose\n\n- govern\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function patch(server: Server, path: string): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const payload = '{}';
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
    },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'allow-all-accept-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), ALL_R5_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S05 — allow-all on all-R5 workspace', () => {
  it('approves 0 tools, returns 200, and leaves every tool disabled on disk', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRAllR5(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const before = await readFile(join(root, 'TOOLS.md'), 'utf-8');

    const res = await patch(server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;

    // Zero tools enabled, zero already enabled. Every tool in the
    // skipped list must carry the 'r5' reason so the CAP UI can render
    // the correct banner without inferring.
    expect(body.summary.enabled).toBe(0);
    expect(body.summary.alreadyEnabled).toBe(0);
    expect(body.summary.skipped.length).toBeGreaterThan(0);
    for (const entry of body.summary.skipped) {
      expect(entry.reason).toBe('r5');
    }

    // Disk is byte-for-byte unchanged — no writes of any kind.
    const after = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(after).toBe(before);
  });
});
