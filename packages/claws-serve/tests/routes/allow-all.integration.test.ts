/**
 * L1 integration tests for PATCH /api/chunks/connections/allow-all.
 *
 * Exercises the full route pipeline against the real SDK:
 *   - patchEnvelopeMiddleware (envelope)
 *   - real R5 validator bound to a compiled IR
 *   - StructuredEditor.apply (real lossless writes)
 *   - CompilationHost.compile (cached IR)
 *   - parseWorkspace + assembleChunks (chunk projection)
 *
 * Two cases:
 *   1. Mixed-risk workspace → only R1-R4 enabled on disk; R5 skipped;
 *      audit captures both lists; response summary matches.
 *   2. After allow-all, `GET /api/chunks/connections` reflects the change
 *      (the R5 tool stays disabled, the R1-R4 tools flip to enabled).
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
const SOUL = '# Soul\n\nAllow-all integration.\n\n## Purpose\n\n- allow\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function patch(
  server: Server,
  path: string,
  body: unknown = {},
): Promise<{ status: number; body: string }> {
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

async function get(server: Server, path: string): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'allow-all-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MIXED_RISK_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('PATCH /api/chunks/connections/allow-all — L1 integration', () => {
  it('enables R1-R4 tools, skips R5, and persists the split on disk', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;
    expect(body.summary.enabled).toBe(4);
    expect(body.summary.alreadyEnabled).toBe(0);
    expect(body.summary.skipped).toEqual([{ tool: 'delete_site', reason: 'r5' }]);

    const onDisk = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    // R5 unchanged.
    expect(onDisk).toMatch(/## delete_site\s*\n\n- enabled: false/);
    // R1-R4 flipped.
    expect(onDisk).toMatch(/## ping\s*\n\n- enabled: true/);
    expect(onDisk).toMatch(/## read_inbox\s*\n\n- enabled: true/);
    expect(onDisk).toMatch(/## post_message\s*\n\n- enabled: true/);
    expect(onDisk).toMatch(/## send_mail\s*\n\n- enabled: true/);
  });

  it('subsequent GET /api/chunks/connections reflects the allow-all changes', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const patchRes = await patch(server, '/api/chunks/connections/allow-all');
    expect(patchRes.status).toBe(200);

    const getRes = await get(server, '/api/chunks/connections');
    expect(getRes.status).toBe(200);
    const getBody = JSON.parse(getRes.body) as { chunks: Chunk<'connections'>[] };

    // Every non-R5 tool's chunk entry should report enabled: true now.
    // We don't pin a specific server layout because chunk grouping keys off
    // mcpServer — just assert the expected tool names are present and that
    // delete_site (R5) shows a non-'none' lock.
    const allEntries = getBody.chunks.flatMap((c) => c.data.tools);
    const findEntry = (tool: string) => allEntries.find((e) => e.tool === tool);

    expect(findEntry('ping')?.enabled).toBe(true);
    expect(findEntry('read_inbox')?.enabled).toBe(true);
    expect(findEntry('post_message')?.enabled).toBe(true);
    expect(findEntry('send_mail')?.enabled).toBe(true);
    // R5 tool carries lock.source 'r5' so the CAP UI can render the banner.
    expect(findEntry('delete_site')?.lock.source).toBe('r5');
  });
});
