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

function buildApp(manager: VersionManager): Express {
  const app = express();
  app.use(express.json());
  app.use(etagResponse(manager));
  app.use(requireIfMatch(manager));
  app.get('/resource', (_req, res) => {
    res.status(200).json({ value: 'current' });
  });
  app.patch('/resource', async (_req, res) => {
    await commitVersion(manager, res);
    res.status(200).json({ value: 'updated' });
  });
  return app;
}

let server: Server | undefined;
let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'etag-e2e-'));
});

afterEach(async () => {
  server?.close();
  await rm(workspace, { recursive: true, force: true });
});

describe('workspace versioning (e2e)', () => {
  it('GET round-trips an ETag through a successful PATCH', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const app = buildApp(manager);
    server = await listen(app);
    const port = getPort(server);
    const base = `http://127.0.0.1:${String(port)}`;

    const get1 = await fetch(`${base}/resource`);
    expect(get1.status).toBe(200);
    const etag1 = get1.headers.get('etag');
    expect(etag1).toBe('"0"');

    const patch = await fetch(`${base}/resource`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'if-match': etag1 ?? '',
      },
      body: '{}',
    });
    expect(patch.status).toBe(200);
    const etag2 = patch.headers.get('etag');
    expect(etag2).toBe('"1"');

    const get2 = await fetch(`${base}/resource`);
    expect(get2.headers.get('etag')).toBe('"1"');
  });

  it('two concurrent PATCHes: one succeeds, the other receives 409', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const app = buildApp(manager);
    server = await listen(app);
    const port = getPort(server);
    const base = `http://127.0.0.1:${String(port)}`;

    const get = await fetch(`${base}/resource`);
    const etag = get.headers.get('etag');
    expect(etag).toBe('"0"');

    const first = fetch(`${base}/resource`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'if-match': etag ?? '',
      },
      body: '{}',
    });
    const second = fetch(`${base}/resource`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'if-match': etag ?? '',
      },
      body: '{}',
    });

    const [r1, r2] = await Promise.all([first, second]);
    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);

    const winner = r1.status === 200 ? r1 : r2;
    const loser = r1.status === 409 ? r1 : r2;
    expect(winner.headers.get('etag')).toBe('"1"');
    const body = (await loser.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VERSION_CONFLICT');
    expect(manager.getVersion()).toBe(1);
  });
});
