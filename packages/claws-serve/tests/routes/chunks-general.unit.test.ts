/**
 * L0 unit tests for the General chunk route.
 *
 * Exercises the handler in isolation (mount on a fresh Express app) and
 * asserts response shape + per-field editability types derived from the
 * assembler.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chunksGeneralRouter } from '../../src/routes/chunks-general.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
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

async function writeMinimal(root: string): Promise<void> {
  await writeFile(
    join(root, 'SOUL.md'),
    '# Soul\n\nAgentY helps ship safely.\n\n## Purpose\n\n- ship\n',
    'utf-8',
  );
  await writeFile(
    join(root, 'IDENTITY.md'),
    '# Identity\n\n## Organization\n\n- Organization: AgentY\n- Team: Platform\n- Language: English (United States)\n',
    'utf-8',
  );
  await writeFile(join(root, 'AGENTS.md'), '# Agents\n\n## Robert\n\nOwner.\n', 'utf-8');
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-general-unit-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /general/identity', () => {
  it('returns 200 with a Chunk<general> shape including governance + writeBack', async () => {
    await writeMinimal(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksGeneralRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/general/identity');
    expect(status).toBe(200);
    const body = json as { tab: string; section: string; writeBack: { method: string; url: string }; governance: unknown; data: Record<string, unknown> };
    expect(body.tab).toBe('general');
    expect(body.section).toBe('identity');
    expect(body.writeBack).toEqual({ method: 'PATCH', url: '/api/chunks/general/identity' });
    expect(body.governance).toBeDefined();
    expect(body.data['name']).toBe('AgentY');
    expect(body.data['language']).toBe('English (United States)');
    expect(body.data['managedBy']).toEqual({ name: 'Robert', role: 'Platform' });
  });

  it('passes through an optional fleetPolicy to the assembler', async () => {
    await writeMinimal(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksGeneralRouter(host, { workspaceRoot: root, fleetPolicy: { overrides: [] } }));
    server = await listen(app);

    const { status, json } = await get(server, '/general/identity');
    expect(status).toBe(200);
    expect((json as { tab: string }).tab).toBe('general');
  });

  it('returns 404 with IDENTITY_MISSING when IDENTITY.md is absent', async () => {
    // SOUL.md only — IDENTITY.md deliberately missing.
    await writeFile(
      join(root, 'SOUL.md'),
      '# Soul\n\nNo identity here.\n\n## Purpose\n\n- ok\n',
      'utf-8',
    );
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksGeneralRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/general/identity');
    expect(status).toBe(404);
    const body = json as { error: { code: string; message: string } };
    expect(body.error.code).toBe('IDENTITY_MISSING');
    expect(body.error.message).toContain('IDENTITY.md');
  });

  it('returns 409 COMPILATION_REQUIRED when no /compile has run yet', async () => {
    await writeMinimal(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    // NOTE: no host.compile() — cache stays empty.

    const app = express();
    app.use(chunksGeneralRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/general/identity');
    expect(status).toBe(409);
    const body = json as { error: { code: string } };
    expect(body.error.code).toBe('COMPILATION_REQUIRED');
  });

  it('returns 503 COMPILATION_ERRORED when the cached IR halted', async () => {
    await writeMinimal(root);
    const host = new CompilationHost(async () => {
      const ir = minimalGovernanceIR();
      return { ...ir, conflicts: { ...ir.conflicts, haltReason: 'halt-general' } };
    }, root);
    await host.compile();

    const app = express();
    app.use(chunksGeneralRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/general/identity');
    expect(status).toBe(503);
    const body = json as { error: { code: string; details?: { haltReason?: string } } };
    expect(body.error.code).toBe('COMPILATION_ERRORED');
    expect(body.error.details?.haltReason).toBe('halt-general');
  });

  it('forwards WorkspaceError to the centralized error-handler when SOUL.md is missing', async () => {
    // No SOUL.md — parseWorkspace throws WorkspaceError and the route
    // lets it bubble to the errorHandler middleware. The middleware
    // discriminates on `code`: WORKSPACE_SOUL_MISSING → 404.
    await writeFile(
      join(root, 'IDENTITY.md'),
      '# Identity\n\n## Organization\n\n- Organization: X\n',
      'utf-8',
    );
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);

    const app = express();
    app.use(chunksGeneralRouter(host, { workspaceRoot: root }));
    const { errorHandler } = await import('../../src/middleware/error-handler.js');
    app.use(errorHandler());
    server = await listen(app);

    const { status, json } = await get(server, '/general/identity');
    expect(status).toBe(404);
    const body = json as { error: { code: string; details?: { workspaceRoot: string } } };
    expect(body.error.code).toBe('WORKSPACE_SOUL_MISSING');
    expect(body.error.details?.workspaceRoot).toBe(root);
  });

  it('forwards unexpected errors to Express next() for 500 serialization', async () => {
    // parseWorkspace swallows per-file I/O errors but CompilationHost's
    // compileFn runs inline in tests. Here we stub getCachedIR to return
    // a value AND inject a fleet policy that, combined with a corrupt
    // workspace, makes assembleChunks' stat-based mtime reader throw a
    // raw error (not a WorkspaceError). The handler must forward via next().
    await writeMinimal(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    // Monkey-patch getCachedIR to throw a non-WorkspaceError after the
    // initial parse. This triggers the `next(err)` branch without needing
    // to reach into the SDK internals.
    const boom = new Error('boom — simulated runtime failure');
    host.getCachedIR = (): never => { throw boom; };

    const app = express();
    app.use(chunksGeneralRouter(host, { workspaceRoot: root }));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    });
    server = await listen(app);

    const { status, json } = await get(server, '/general/identity');
    expect(status).toBe(500);
    expect((json as { error: string }).error).toContain('boom');
  });

  it('exposes editable fields with correct types and required flags', async () => {
    await writeMinimal(root);
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();

    const app = express();
    app.use(chunksGeneralRouter(host, { workspaceRoot: root }));
    server = await listen(app);

    const { status, json } = await get(server, '/general/identity');
    expect(status).toBe(200);
    const body = json as { editable: Record<string, { type: string; required?: boolean; options?: readonly string[]; lock?: unknown }> };
    expect(body.editable['name']).toEqual({ type: 'string', required: true });
    expect(body.editable['description']!.type).toBe('text');
    expect(body.editable['language']!.type).toBe('enum');
    expect(body.editable['language']!.options).toContain('English (United States)');
    expect(body.editable['managedBy']!.type).toBe('object');
    expect(body.editable['managedBy']!.lock).toEqual({ source: 'none' });
  });
});
