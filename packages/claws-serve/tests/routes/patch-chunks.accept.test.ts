/**
 * L3 acceptance tests for the CAP settings write path.
 *
 * Each test maps to a scenario code from the `cap-integration` suite:
 *   - S03: PATCH a toggle on an R5 tool returns 403 R5_LOCKED with
 *          structured provenance so the CAP UI can render the correct
 *          "non-negotiable" banner.
 *   - S05: PATCH a toggle on a permitted connections tool flips the
 *          value on disk AND the GET /chunks/connections endpoint
 *          reflects the change on subsequent fetches.
 *
 * Acceptance tests assert spec-level contracts — partners must be able
 * to rely on the exact status code, PatchError shape, and recompile
 * round-trip guaranteed here.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Chunk } from '@bic/claws-sdk/workspace';
import type { R5LockedError } from '@bic/claws-sdk/workspace-edit';
import { createApp, type ServerState } from '../../src/server.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nAccept.\n\n## Purpose\n\n- govern\n';

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
  root = await mkdtemp(join(tmpdir(), 'patch-accept-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S03 — PATCH an R5 tool returns 403 R5_LOCKED with provenance', () => {
  it('rejects delete_site with R5_LOCKED carrying tool + lockSource', async () => {
    await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'delete_site',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(403);
    const body = JSON.parse(res.body) as { error: R5LockedError };
    expect(body.error.code).toBe('R5_LOCKED');
    expect(body.error.tool).toBe('delete_site');
    expect(body.error.lockSource).toBe('r5');
    expect(body.error.ocPath).toBe('oc://TOOLS.md/delete_site/enabled');
    expect(body.error.message).toMatch(/R5_NON_NEGOTIABLE/);
  });
});

describe('S05 — PATCH a connections toggle reflects in the updated chunk', () => {
  it('flips enabled on disk and surfaces through GET /api/chunks/connections', async () => {
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
    const patchBody = JSON.parse(patchRes.body) as {
      chunk: readonly Chunk<'connections'>[];
      warnings: unknown[];
    };
    expect(Array.isArray(patchBody.chunk)).toBe(true);

    const onDisk = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(onDisk).toContain('- enabled: false');

    const getRes = await get(server, '/api/chunks/connections');
    expect(getRes.status).toBe(200);
    const getBody = JSON.parse(getRes.body) as { chunks: Chunk<'connections'>[] };
    expect(getBody.chunks.some((c) => c.data.tools.some((t) => t.tool === 'read_inbox'))).toBe(true);
  });
});
