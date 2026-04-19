/**
 * L0 unit tests for GET /api/chunks/groups (Pulse 26).
 *
 * Verifies that groups chunk separates memberships into m365, security,
 * and on-premise arrays based on IDENTITY.md headings. Also covers the
 * compilation-required precondition.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import type { Chunk, GroupsData } from '@bic/claws-sdk/workspace';
import { VersionStore } from '@bic/claws-sdk/workspace';
import { CompilationHost } from '../../src/compilation-host.js';
import { timeTravelMiddleware } from '../../src/middleware/time-travel.js';
import { chunksGroupsRouter } from '../../src/routes/chunks-groups.js';
import { TIME_TRAVEL_CACHE_CONTROL } from '../../src/routes/ir-resolution.js';
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
  app.use('/api/chunks', chunksGroupsRouter(host, { workspaceRoot }));
  return { app, host };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-grp-unit-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/chunks/groups', () => {
  it('separates m365 / security / onPremise arrays from IDENTITY.md', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\nPreamble.\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      [
        '## M365',
        '',
        '- Finance-Team',
        '- Eng-All',
        '',
        '## Security',
        '',
        '- SecOps',
        '',
        '## On-Premise',
        '',
        '- LDAP-Users',
        '',
      ].join('\n'),
    );

    const { app, host } = makeApp(root);
    await host.compile();
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/groups');
    expect(status).toBe(200);
    const chunk = JSON.parse(body) as Chunk<'groups'>;
    const data = chunk.data as GroupsData;
    expect(chunk.tab).toBe('groups');
    expect(data.m365).toEqual(['Finance-Team', 'Eng-All']);
    expect(data.security).toEqual(['SecOps']);
    expect(data.onPremise).toEqual(['LDAP-Users']);
  });

  it('returns 409 COMPILATION_REQUIRED when no IR has been compiled', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n');
    const { app } = makeApp(root);
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/groups');
    expect(status).toBe(409);
    const err = JSON.parse(body) as { error: { code: string } };
    expect(err.error.code).toBe('COMPILATION_REQUIRED');
  });

  it('returns 503 COMPILATION_ERRORED when the cached IR halted', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n');
    const app = express();
    const host = new CompilationHost(async () => {
      const ir = minimalGovernanceIR();
      return { ...ir, conflicts: { ...ir.conflicts, haltReason: 'halt-groups' } };
    }, root);
    await host.compile();
    app.use('/api/chunks', chunksGroupsRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/groups');
    expect(status).toBe(503);
    const err = JSON.parse(body) as { error: { code: string; details?: { haltReason?: string } } };
    expect(err.error.code).toBe('COMPILATION_ERRORED');
    expect(err.error.details?.haltReason).toBe('halt-groups');
  });

  it('forwards WorkspaceError to the centralized error-handler when SOUL.md is absent', async () => {
    const { app, host } = makeApp(root);
    await host.compile();
    const { errorHandler } = await import('../../src/middleware/error-handler.js');
    app.use(errorHandler());
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/groups');
    // WORKSPACE_SOUL_MISSING ends with `_MISSING` → middleware maps to 404.
    expect(status).toBe(404);
    const err = JSON.parse(body) as { error: { code: string } };
    expect(err.error.code).toBe('WORKSPACE_SOUL_MISSING');
  });

  it('stamps immutable Cache-Control when the resolver returns a historical IR (?at=v1)', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      ['## M365', '', '- Only-Team', ''].join('\n'),
    );

    const store = new VersionStore();
    store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'IDENTITY.md': 'h-v1' },
      governanceIR: minimalGovernanceIR(),
    });

    const app = express();
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();
    app.use(
      '/api',
      timeTravelMiddleware({
        resolver: { store, workspaceRoot: root },
        respondDirectly: false,
      }),
    );
    app.use('/api/chunks', chunksGroupsRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');
    const res = await fetch(
      `http://127.0.0.1:${String(addr.port)}/api/chunks/groups?at=v1`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(TIME_TRAVEL_CACHE_CONTROL);
    const chunk = JSON.parse(await res.text()) as Chunk<'groups'>;
    expect(chunk.tab).toBe('groups');
  });

  it('forwards non-WorkspaceError failures to the express error handler (500)', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n');
    const sdk = await import('@bic/claws-sdk/workspace');
    const spy = vi.spyOn(sdk, 'parseWorkspace').mockRejectedValueOnce(
      new Error('simulated fs meltdown'),
    );

    const { app, host } = makeApp(root);
    await host.compile();
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: { code: 'INTERNAL', message: String((err as Error).message) } });
    });
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/chunks/groups');
    expect(status).toBe(500);
    const err = JSON.parse(body) as { error: { code: string; message: string } };
    expect(err.error.message).toContain('simulated fs meltdown');
    spy.mockRestore();
  });
});
