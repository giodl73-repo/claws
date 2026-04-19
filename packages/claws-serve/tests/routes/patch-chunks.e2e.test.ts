/**
 * L2 e2e tests for PATCH /api/chunks/:tab — full round-trips on a
 * reference workspace directory.
 *
 * Unlike L1, these tests treat claws-serve as an opaque HTTP daemon:
 * they create the app via the public `createApp` entry point, mount on a
 * real port, and talk to it through `fetch()`. The `compileFn` is a
 * stable fixture IR so the recompile step is deterministic.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Chunk } from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nE2E workspace.\n\n## Purpose\n\n- write\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function patch(server: Server, path: string, body: unknown) {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const payload = JSON.stringify(body);
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

async function get(server: Server, path: string) {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'patch-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('PATCH /api/chunks/:tab — L2 e2e', () => {
  it('runs a full PATCH → validate → write → compile → GET cycle', async () => {
    const tools = `# Tools

## read_inbox

- enabled: true
- description: Read inbox
`;
    await writeFile(join(root, 'TOOLS.md'), tools, 'utf-8');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const patchRes = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    });
    expect(patchRes.status).toBe(200);

    const onDisk = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(onDisk).toContain('- enabled: false');

    const getRes = await get(server, '/api/chunks/connections');
    expect(getRes.status).toBe(200);
    const body = JSON.parse(getRes.body) as { chunks: Chunk<'connections'>[] };
    expect(body.chunks.some((c) => c.data.server === 'outlook')).toBe(true);
  });

  it('R5 PATCH returns 403 and leaves the file unchanged on disk', async () => {
    await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
    const before = await readFile(join(root, 'TOOLS.md'), 'utf-8');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const patchRes = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'delete_site',
      field: 'enabled',
      value: false,
    });
    expect(patchRes.status).toBe(403);
    const body = JSON.parse(patchRes.body) as { error: { code: string } };
    expect(body.error.code).toBe('R5_LOCKED');

    const after = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(after).toBe(before);
  });
});
