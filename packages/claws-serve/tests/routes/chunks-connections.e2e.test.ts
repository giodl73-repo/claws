/**
 * L2 end-to-end test for /api/chunks/connections.
 *
 * Walks the full surface: a real workspace directory, a real compile
 * request (POST /compile), and two GETs against both connections
 * endpoints. Asserts governance fields, summary math, and 404 shape.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Chunk } from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nEnd-to-end agent.\n\n## Purpose\n\n- ship\n';
const IDENTITY = '# Identity\n\n## Organization\n\n- Organization: Acme\n- Team: Platform\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(
  server: Server,
  path: string,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

async function post(
  server: Server,
  path: string,
  body: object,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-conn-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'IDENTITY.md'), IDENTITY, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/chunks/connections — L2 end-to-end', () => {
  it('drives compile + all-servers + single-server + 404 against a real workspace', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    // 1) Drive a compile so CompilationHost has a cached IR.
    const compileRes = await post(server, '/compile', {});
    expect(compileRes.status).toBe(200);

    // 2) All-servers endpoint returns a chunk per server.
    const allRes = await get(server, '/api/chunks/connections');
    expect(allRes.status).toBe(200);
    const all = JSON.parse(allRes.body) as { chunks: Chunk<'connections'>[] };
    const serverNames = all.chunks.map((c) => c.data.server).sort();
    expect(serverNames).toEqual(['local', 'outlook', 'sharepoint', 'teams']);

    // Every chunk has a valid writeBack url.
    for (const chunk of all.chunks) {
      expect(chunk.writeBack?.method).toBe('PATCH');
      expect(chunk.writeBack?.url).toContain('/api/chunks/connections/');
    }

    // 3) Single-server sharepoint endpoint carries R5 lock on delete_site.
    const oneRes = await get(server, '/api/chunks/connections/sharepoint');
    expect(oneRes.status).toBe(200);
    const one = JSON.parse(oneRes.body) as Chunk<'connections'>;
    expect(one.data.server).toBe('sharepoint');
    expect(one.data.summary.r5Count).toBe(1);
    const deleteSite = one.data.tools.find((t) => t.tool === 'delete_site')!;
    expect(deleteSite.lock.source).toBe('r5');

    // 4) Unknown server yields 404 with structured error.
    const missRes = await get(server, '/api/chunks/connections/dropbox');
    expect(missRes.status).toBe(404);
    const miss = JSON.parse(missRes.body) as { error: { code: string } };
    expect(miss.error.code).toBe('CONNECTIONS_SERVER_NOT_FOUND');
  });
});
