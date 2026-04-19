/**
 * L0 unit tests for /api/chunks/connections.
 *
 * Exercises the thin HTTP adapter in isolation via `createApp` with a
 * governance IR that spreads tools across multiple MCP servers. The
 * assembler is real; only the compile function and workspace bytes are
 * fixture-driven.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  Chunk,
  ConnectionsData,
  ConnectionsToolEntry,
} from '@bic/claws-sdk/workspace';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nAgent purpose line.\n\n## Purpose\n\n- ship\n';

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

async function writeMultiServerWorkspace(root: string): Promise<void> {
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-conn-unit-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

async function bootApp(ir: GovernanceIR = governanceIRMultiServer()): Promise<Server> {
  const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
  const app = createApp(state, {
    compileFn: async () => ir,
    trustSigningKey: TEST_TRUST_SIGNING_KEY,
    workspaceRoot: root,
  });
  const s = await listenApp(app);
  server = s;
  return s;
}

describe('GET /api/chunks/connections — L0 unit', () => {
  it('returns one chunk per MCP server grouped from the IR', async () => {
    await writeMultiServerWorkspace(root);
    const s = await bootApp();

    const res = await get(s, '/api/chunks/connections');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { chunks: Chunk<'connections'>[] };
    const servers = body.chunks.map((c) => c.data.server).sort();
    expect(servers).toEqual(['local', 'outlook', 'sharepoint', 'teams']);
    for (const chunk of body.chunks) {
      expect(chunk.tab).toBe('connections');
      expect(chunk.section).toBe(chunk.data.server);
    }
  });

  it('returns a single chunk for GET /connections/:server', async () => {
    await writeMultiServerWorkspace(root);
    const s = await bootApp();

    const res = await get(s, '/api/chunks/connections/teams');
    expect(res.status).toBe(200);
    const chunk = JSON.parse(res.body) as Chunk<'connections'>;
    expect(chunk.data.server).toBe('teams');
    expect(chunk.data.tools).toHaveLength(1);
    expect(chunk.data.tools[0]!.tool).toBe('post_message');
  });

  it('returns 404 with structured error for unknown server', async () => {
    await writeMultiServerWorkspace(root);
    const s = await bootApp();

    const res = await get(s, '/api/chunks/connections/gmail');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('CONNECTIONS_SERVER_NOT_FOUND');
    expect(body.error.message).toContain('gmail');
  });

  it('tools absent from TOOLS.md default to R5 fail-closed with unclassified lock', async () => {
    // SOUL only — no TOOLS.md declarations — every IR tool is unclassified.
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const s = await bootApp();

    const res = await get(s, '/api/chunks/connections');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { chunks: Chunk<'connections'>[] };
    const local = body.chunks.find((c) => c.data.server === 'local');
    expect(local).toBeDefined();
    const readFile = local!.data.tools.find((t) => t.tool === 'read_file');
    expect(readFile).toBeDefined();
    expect(readFile!.lock.source).toBe('unclassified');
    expect(readFile!.enabled).toBe(false);
  });

  it('R5 tools carry lock.source=r5 and an R5 reason', async () => {
    await writeMultiServerWorkspace(root);
    const s = await bootApp();

    const res = await get(s, '/api/chunks/connections/sharepoint');
    expect(res.status).toBe(200);
    const chunk = JSON.parse(res.body) as Chunk<'connections'>;
    const deleteSite = chunk.data.tools.find((t) => t.tool === 'delete_site');
    expect(deleteSite).toBeDefined();
    expect(deleteSite!.risk.level).toBe(5);
    expect(deleteSite!.lock.source).toBe('r5');
    expect(deleteSite!.lock.reason).toContain('non-negotiable');
    expect(deleteSite!.approvalRequired).toBe(true);
  });

  it('per-server summary reports total, enabled, gated, r5Count accurately', async () => {
    await writeMultiServerWorkspace(root);
    const s = await bootApp();

    const res = await get(s, '/api/chunks/connections/sharepoint');
    expect(res.status).toBe(200);
    const chunk = JSON.parse(res.body) as Chunk<'connections'>;
    const tools = chunk.data.tools as ConnectionsToolEntry[];
    const data = chunk.data as ConnectionsData;
    expect(data.summary.total).toBe(2);
    expect(data.summary.enabled).toBe(tools.filter((t) => t.enabled).length);
    expect(data.summary.gated).toBe(tools.filter((t) => t.approvalRequired).length);
    expect(data.summary.r5Count).toBe(1);
  });

  it('returns 503 COMPILATION_ERRORED when compilation halts (both collection + item endpoints)', async () => {
    await writeMultiServerWorkspace(root);
    const haltedIR = { ...governanceIRMultiServer(), conflicts: { ...governanceIRMultiServer().conflicts, haltReason: 'halt-connections' } };
    const s = await bootApp(haltedIR);

    const allRes = await get(s, '/api/chunks/connections');
    expect(allRes.status).toBe(503);
    const allBody = JSON.parse(allRes.body) as { error: { code: string; details?: { haltReason?: string } } };
    expect(allBody.error.code).toBe('COMPILATION_ERRORED');
    expect(allBody.error.details?.haltReason).toBe('halt-connections');

    const oneRes = await get(s, '/api/chunks/connections/teams');
    expect(oneRes.status).toBe(503);
    const oneBody = JSON.parse(oneRes.body) as { error: { code: string } };
    expect(oneBody.error.code).toBe('COMPILATION_ERRORED');
  });

  it('forwards WorkspaceError to the centralized error-handler when SOUL.md is missing from the workspace', async () => {
    // No SOUL.md — parseWorkspace throws WorkspaceError, which bubbles to
    // the centralized errorHandler. WORKSPACE_SOUL_MISSING ends with
    // `_MISSING` so the middleware discriminator maps it to 404 (not 400).
    const s = await bootApp();

    const allRes = await get(s, '/api/chunks/connections');
    expect(allRes.status).toBe(404);
    const allBody = JSON.parse(allRes.body) as { error: { code: string } };
    expect(allBody.error.code).toBe('WORKSPACE_SOUL_MISSING');

    const oneRes = await get(s, '/api/chunks/connections/teams');
    expect(oneRes.status).toBe(404);
    const oneBody = JSON.parse(oneRes.body) as { error: { code: string } };
    expect(oneBody.error.code).toBe('WORKSPACE_SOUL_MISSING');
  });

  it('falls through to the error handler on unexpected compile errors', async () => {
    // Bypass createApp to inject a compile function that throws a generic
    // (non-WorkspaceError) error, exercising the `next(err)` branch.
    await writeMultiServerWorkspace(root);
    const express = (await import('express')).default;
    const { chunksConnectionsRouter } = await import(
      '../../src/routes/chunks-connections.js'
    );
    const { CompilationHost } = await import('../../src/compilation-host.js');
    const { errorHandler, notFoundHandler } = await import(
      '../../src/middleware/error-handler.js'
    );

    const app = express();
    app.use(express.json());
    const host = new CompilationHost(
      async () => {
        throw new Error('boom');
      },
      root,
    );
    app.use('/api/chunks', chunksConnectionsRouter(host, { workspaceRoot: root }));
    app.use(notFoundHandler());
    app.use(errorHandler());

    const errorServer = await listenApp(app);
    try {
      const allRes = await get(errorServer, '/api/chunks/connections');
      expect(allRes.status).toBe(500);
      const allBody = JSON.parse(allRes.body) as { error: { code: string } };
      expect(allBody.error.code).toBe('INTERNAL_ERROR');

      const oneRes = await get(errorServer, '/api/chunks/connections/teams');
      expect(oneRes.status).toBe(500);
      const oneBody = JSON.parse(oneRes.body) as { error: { code: string } };
      expect(oneBody.error.code).toBe('INTERNAL_ERROR');
    } finally {
      errorServer.close();
    }
  });
});
