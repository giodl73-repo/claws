/**
 * L0 unit tests for GET /api/chunks/memory (Pulse 26).
 *
 * Drives the memory router in isolation with a temp workspace and a
 * stub CompilationHost. Verifies (1) knowledge sources carry per-source
 * data labels, and (2) RESTRICTED sources receive `lock.source:
 * 'governance'` from the assembler.
 *
 * CAP subsections (Knowledge Sources) live under IDENTITY.md since
 * CP-5 M01. Tests write IDENTITY.md §Knowledge Sources with H3 entries
 * for each source.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import type { Chunk, MemoryData } from '@bic/claws-sdk/workspace';
import { CompilationHost } from '../../src/compilation-host.js';
import { chunksMemoryRouter } from '../../src/routes/chunks-memory.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

async function listenApp(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(server: Server, path: string): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

function makeApp(workspaceRoot: string): { app: express.Express; host: CompilationHost } {
  const app = express();
  const host = new CompilationHost(async () => minimalGovernanceIR(), workspaceRoot);
  app.use('/api/chunks', chunksMemoryRouter(host, { workspaceRoot }));
  return { app, host };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-mem-unit-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/chunks/memory', () => {
  it('returns knowledge sources with data labels derived from IDENTITY.md §Knowledge Sources', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\nPreamble.\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      '## Knowledge Sources\n\n### Docs\n\n- public handbook url\n',
    );

    const { app, host } = makeApp(root);
    await host.compile();
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/memory');
    expect(status).toBe(200);
    const chunk = JSON.parse(body) as Chunk<'memory'>;
    const data = chunk.data as MemoryData;
    expect(chunk.tab).toBe('memory');
    expect(data.knowledgeSources).toHaveLength(1);
    expect(data.knowledgeSources[0]!.name).toBe('Docs');
    expect(data.knowledgeSources[0]!.dataLabel).toBe('PUBLIC');
  });

  it('assigns lock.source = "governance" to RESTRICTED knowledge sources', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\nPreamble.\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      '## Knowledge Sources\n\n### Restricted HR files\n\n- restricted personnel records\n',
    );

    const { app, host } = makeApp(root);
    await host.compile();
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/memory');
    expect(status).toBe(200);
    const chunk = JSON.parse(body) as Chunk<'memory'>;
    const data = chunk.data as MemoryData;
    expect(data.knowledgeSources[0]!.dataLabel).toBe('RESTRICTED');
    expect(data.knowledgeSources[0]!.lock.source).toBe('governance');
  });

  it('returns 409 COMPILATION_REQUIRED when no IR has been compiled', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\nPreamble.\n');

    const { app } = makeApp(root);
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/memory');
    expect(status).toBe(409);
    const err = JSON.parse(body) as { error: { code: string } };
    expect(err.error.code).toBe('COMPILATION_REQUIRED');
  });

  it('returns 503 COMPILATION_ERRORED when the cached IR halted', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n');
    const app = express();
    const host = new CompilationHost(async () => {
      const ir = minimalGovernanceIR();
      return { ...ir, conflicts: { ...ir.conflicts, haltReason: 'duplicate SOUL' } };
    }, root);
    await host.compile();
    app.use('/api/chunks', chunksMemoryRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/memory');
    expect(status).toBe(503);
    const err = JSON.parse(body) as { error: { code: string; details?: { haltReason?: string } } };
    expect(err.error.code).toBe('COMPILATION_ERRORED');
    expect(err.error.details?.haltReason).toBe('duplicate SOUL');
  });

  it('forwards WorkspaceError to the centralized error-handler when SOUL.md is absent', async () => {
    const { app, host } = makeApp(root);
    await host.compile();
    const { errorHandler } = await import('../../src/middleware/error-handler.js');
    app.use(errorHandler());
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/memory');
    // WORKSPACE_SOUL_MISSING ends with `_MISSING` → middleware maps to 404.
    expect(status).toBe(404);
    const err = JSON.parse(body) as { error: { code: string } };
    expect(err.error.code).toBe('WORKSPACE_SOUL_MISSING');
  });

  it('forwards non-WorkspaceError failures to the express error handler (500)', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n');
    const sdk = await import('@bic/claws-sdk/workspace');
    const spy = vi.spyOn(sdk, 'parseWorkspace').mockRejectedValueOnce(
      new Error('simulated fs meltdown'),
    );

    const { app, host } = makeApp(root);
    await host.compile();
    // Mount a minimal error handler so the forwarded error resolves with 500.
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: { code: 'INTERNAL', message: String((err as Error).message) } });
    });
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/memory');
    expect(status).toBe(500);
    const err = JSON.parse(body) as { error: { code: string; message: string } };
    expect(err.error.code).toBe('INTERNAL');
    expect(err.error.message).toContain('simulated fs meltdown');
    spy.mockRestore();
  });
});
