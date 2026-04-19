/**
 * L0 unit tests for the Preferences chunk route.
 *
 * Covers the two sub-sections (instructions + schedule) and the
 * null-schedule fallback when HEARTBEAT.md is absent.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chunksPreferencesRouter } from '../../src/routes/chunks-preferences.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

async function get(server: Server, path: string): Promise<{ status: number; json: unknown }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  const body = await res.text();
  return { status: res.status, json: body.length > 0 ? JSON.parse(body) : null };
}

async function writeSoul(root: string): Promise<void> {
  await writeFile(
    join(root, 'SOUL.md'),
    '# Soul\n\nBe kind and correct.\n\n## Purpose\n\n- care\n',
    'utf-8',
  );
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-prefs-unit-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /preferences/instructions', () => {
  it('returns 200 with the preamble as instructions text', async () => {
    await writeSoul(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksPreferencesRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/instructions');
    expect(status).toBe(200);
    const body = json as { tab: string; section: string; data: { instructions: string }; writeBack: { method: string; url: string } };
    expect(body.tab).toBe('preferences');
    expect(body.section).toBe('instructions');
    expect(body.data.instructions).toBe('Be kind and correct.');
    expect(body.writeBack).toEqual({ method: 'PATCH', url: '/api/chunks/preferences/instructions' });
  });
});

describe('GET /preferences/instructions — edge cases', () => {
  it('passes a fleet policy through to the assembler', async () => {
    await writeSoul(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksPreferencesRouter(host, {
      workspaceRoot: root,
      fleetPolicy: { overrides: [] },
    }));
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/instructions');
    expect(status).toBe(200);
    expect((json as { tab: string }).tab).toBe('preferences');
  });

  it('omits schedule when HEARTBEAT.md exists but has no sections', async () => {
    await writeSoul(root);
    await writeFile(join(root, 'HEARTBEAT.md'), '# Heartbeat\n\nNo sections — preamble only.\n', 'utf-8');
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksPreferencesRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/schedule');
    expect(status).toBe(200);
    const body = json as { data: Record<string, unknown> };
    expect(body.data['schedule']).toBeUndefined();
  });
});

describe('GET /preferences/instructions — error paths', () => {
  it('returns 409 COMPILATION_REQUIRED when no compile has run', async () => {
    await writeSoul(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    // no compile

    const app = express();
    app.use(chunksPreferencesRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/instructions');
    expect(status).toBe(409);
    expect((json as { error: { code: string } }).error.code).toBe('COMPILATION_REQUIRED');
  });

  it('returns 503 COMPILATION_ERRORED when the cached IR halted', async () => {
    await writeSoul(root);
    const host = new CompilationHost(async () => {
      const ir = minimalGovernanceIR();
      return { ...ir, conflicts: { ...ir.conflicts, haltReason: 'halt-prefs' } };
    }, root);
    await host.compile();

    const app = express();
    app.use(chunksPreferencesRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/instructions');
    expect(status).toBe(503);
    const body = json as { error: { code: string; details?: { haltReason?: string } } };
    expect(body.error.code).toBe('COMPILATION_ERRORED');
    expect(body.error.details?.haltReason).toBe('halt-prefs');
  });

  it('forwards WorkspaceError to the centralized error-handler when SOUL.md is missing', async () => {
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);

    const app = express();
    app.use(chunksPreferencesRouter(host, { workspaceRoot: root }));
    const { errorHandler } = await import('../../src/middleware/error-handler.js');
    app.use(errorHandler());
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/instructions');
    // WORKSPACE_SOUL_MISSING ends with `_MISSING` → middleware maps to 404.
    expect(status).toBe(404);
    expect((json as { error: { code: string } }).error.code).toBe('WORKSPACE_SOUL_MISSING');
  });

  it('forwards unexpected errors to Express next()', async () => {
    await writeSoul(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const boom = new Error('boom — simulated runtime failure');
    host.getCachedIR = (): never => { throw boom; };

    const app = express();
    app.use(chunksPreferencesRouter(host, { workspaceRoot: root }));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    });
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/instructions');
    expect(status).toBe(500);
    expect((json as { error: string }).error).toContain('boom');
  });
});

describe('GET /preferences/schedule', () => {
  it('omits the schedule field when HEARTBEAT.md is absent', async () => {
    await writeSoul(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksPreferencesRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/schedule');
    expect(status).toBe(200);
    const body = json as { tab: string; section: string; data: Record<string, unknown>; writeBack: { url: string } };
    expect(body.tab).toBe('preferences');
    expect(body.section).toBe('schedule');
    expect(body.data['schedule']).toBeUndefined();
    expect(body.writeBack.url).toBe('/api/chunks/preferences/schedule');
  });

  it('populates schedule with a daily frequency when heartbeat heading says daily', async () => {
    await writeSoul(root);
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## Daily sync\n\n- sync\n',
      'utf-8',
    );
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksPreferencesRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/schedule');
    expect(status).toBe(200);
    const body = json as { data: { schedule?: { frequency: string } } };
    expect(body.data.schedule?.frequency).toBe('daily');
  });

  it('falls back to "manual" frequency when heading lacks a schedule keyword', async () => {
    await writeSoul(root);
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## Ad-hoc\n\n- note\n',
      'utf-8',
    );
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksPreferencesRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/preferences/schedule');
    expect(status).toBe(200);
    const body = json as { data: { schedule?: { frequency: string } } };
    expect(body.data.schedule?.frequency).toBe('manual');
  });
});
