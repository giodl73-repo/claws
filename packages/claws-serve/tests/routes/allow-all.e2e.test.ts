/**
 * L2 e2e test for PATCH /api/chunks/connections/allow-all.
 *
 * Treats claws-serve as an opaque HTTP daemon: creates the app through the
 * public `createApp` entry point, mounts on a real port, and drives the
 * endpoint via `fetch()`. Asserts the end-to-end round trip:
 *   PATCH allow-all → 200 summary → disk reflects the batch → GET
 *   /api/chunks/connections reflects the new enabled state.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Chunk } from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import type { AllowAllResponse } from '../../src/routes/allow-all.js';
import {
  governanceIRMixedRisk,
  MIXED_RISK_TOOLS_MD,
} from '../fixtures/mixed-risk-workspace.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nAllow-all e2e.\n\n## Purpose\n\n- allow\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function patch(
  server: Server,
  path: string,
): Promise<{ status: number; body: string }> {
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

async function get(server: Server, path: string): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'allow-all-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MIXED_RISK_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('PATCH /api/chunks/connections/allow-all — L2 e2e', () => {
  it('runs PATCH allow-all → disk write → GET reflects change on a mixed workspace', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    // Capture pre-state on disk to confirm the batch actually wrote.
    const before = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(before).toMatch(/## send_mail\s*\n\n- enabled: false/);

    // Run the allow-all action.
    const patchRes = await patch(server, '/api/chunks/connections/allow-all');
    expect(patchRes.status).toBe(200);
    const body = JSON.parse(patchRes.body) as AllowAllResponse;
    expect(body.summary.enabled).toBe(4);
    expect(body.summary.alreadyEnabled).toBe(0);
    expect(body.summary.skipped).toEqual([{ tool: 'delete_site', reason: 'r5' }]);

    // The R5 tool stays disabled on disk; every other tool flips.
    const after = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(after).toMatch(/## delete_site\s*\n\n- enabled: false/);
    expect(after).toMatch(/## send_mail\s*\n\n- enabled: true/);

    // GET reflects the enabled state for every non-R5 tool.
    const getRes = await get(server, '/api/chunks/connections');
    expect(getRes.status).toBe(200);
    const getBody = JSON.parse(getRes.body) as { chunks: Chunk<'connections'>[] };
    const findEntry = (tool: string) =>
      getBody.chunks.flatMap((c) => c.data.tools).find((e) => e.tool === tool);
    expect(findEntry('send_mail')?.enabled).toBe(true);
    expect(findEntry('delete_site')?.lock.source).toBe('r5');
  });
});
