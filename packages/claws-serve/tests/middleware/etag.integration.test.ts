import express, { type Express } from 'express';
import type { Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { VersionManager } from '@bic/claws-sdk/workspace-edit';
import {
  commitVersion,
  etagResponse,
  requireIfMatch,
} from '../../src/middleware/etag.js';

function listen(app: Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function getPort(server: Server): number {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server not listening on TCP');
  }
  return address.port;
}

let server: Server | undefined;
let workspace: string;
let manager: VersionManager;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'etag-integ-'));
  manager = new VersionManager({ workspaceRoot: workspace });
});

afterEach(async () => {
  server?.close();
  await rm(workspace, { recursive: true, force: true });
});

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(etagResponse(manager));
  app.use(requireIfMatch(manager));

  app.get('/resource', (_req, res) => {
    res.status(200).json({ value: 'hello' });
  });

  app.patch('/resource', async (_req, res) => {
    await commitVersion(manager, res);
    res.status(200).json({ value: 'updated' });
  });

  // CP-6 R2 F2: POST also mutates state and must honour If-Match.
  app.post('/batch', async (_req, res) => {
    await commitVersion(manager, res);
    res.status(200).json({ value: 'batched' });
  });

  app.delete('/resource', async (_req, res) => {
    await commitVersion(manager, res);
    res.status(204).end();
  });

  return app;
}

describe('etag middleware (integration)', () => {
  it('GET responses include an ETag header with the current version', async () => {
    await manager.incrementVersion();
    await manager.incrementVersion();
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/resource`);
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe('"2"');
  });

  it('PATCH with correct If-Match succeeds and returns the new ETag', async () => {
    await manager.incrementVersion(); // version = 1
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/resource`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'if-match': '"1"',
      },
      body: '{}',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe('"2"');
    expect(manager.getVersion()).toBe(2);
  });

  it('PATCH with a stale If-Match returns 409 with VERSION_CONFLICT', async () => {
    await manager.incrementVersion();
    await manager.incrementVersion();
    await manager.incrementVersion(); // version = 3
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/resource`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'if-match': '"1"',
      },
      body: '{}',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string; current: number; expected: number };
    };
    expect(body.error.code).toBe('VERSION_CONFLICT');
    expect(body.error.current).toBe(3);
    expect(body.error.expected).toBe(1);
    // Counter must not advance on conflict
    expect(manager.getVersion()).toBe(3);
  });

  it('PATCH without an If-Match header returns 428 Precondition Required', async () => {
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/resource`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(428);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('PRECONDITION_REQUIRED');
    expect(manager.getVersion()).toBe(0);
  });

  it('version survives a VersionManager reload via loadVersion', async () => {
    await manager.incrementVersion();
    await manager.incrementVersion();

    const reloaded = new VersionManager({ workspaceRoot: workspace });
    expect(reloaded.getVersion()).toBe(0);
    const loaded = await reloaded.loadVersion();
    expect(loaded).toBe(2);
  });

  // CP-6 R2 F2 / security NEW-1: R1 wired requireIfMatch on
  // POST /api/batch but the method guard short-circuited all non-PATCH
  // verbs, turning the POST mount into a no-op. These cases lock in the
  // post-F2 contract: POST and DELETE go through the same three-branch
  // guard (absent → 428, stale → 409, fresh → 200).
  it('POST without an If-Match header returns 428 (CP-6 R2 F2)', async () => {
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(428);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('PRECONDITION_REQUIRED');
    expect(body.error.message).toContain('POST');
    expect(manager.getVersion()).toBe(0);
  });

  it('POST with a stale If-Match returns 409 VERSION_CONFLICT (CP-6 R2 F2)', async () => {
    await manager.incrementVersion();
    await manager.incrementVersion(); // version = 2
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'if-match': '"0"',
      },
      body: '{}',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; current: number; expected: number } };
    expect(body.error.code).toBe('VERSION_CONFLICT');
    expect(body.error.current).toBe(2);
    expect(body.error.expected).toBe(0);
    expect(manager.getVersion()).toBe(2);
  });

  it('POST with a fresh If-Match succeeds and advances the version (CP-6 R2 F2)', async () => {
    await manager.incrementVersion(); // version = 1
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'if-match': '"1"',
      },
      body: '{}',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe('"2"');
    expect(manager.getVersion()).toBe(2);
  });

  it('DELETE without If-Match returns 428 so the guard covers all mutating verbs', async () => {
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/resource`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(428);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('PRECONDITION_REQUIRED');
    expect(manager.getVersion()).toBe(0);
  });

  it('GET without If-Match passes through unchanged (read verbs are exempt)', async () => {
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/resource`);
    expect(res.status).toBe(200);
  });

  it('rejects a malformed If-Match header with 409 VERSION_CONFLICT', async () => {
    // parseETag returns null for values that don't match the `"N"` shape.
    // The guard maps that to 409 with expected: -1 so callers can distinguish
    // a malformed header from a genuine stale-version conflict.
    await manager.incrementVersion(); // version = 1
    const app = buildApp();
    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/resource`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'if-match': 'not-a-valid-etag',
      },
      body: '{}',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string; message: string; current: number; expected: number };
    };
    expect(body.error.code).toBe('VERSION_CONFLICT');
    expect(body.error.expected).toBe(-1);
    expect(body.error.current).toBe(1);
    expect(body.error.message).toContain('malformed');
    expect(manager.getVersion()).toBe(1);
  });
});
