/**
 * L0 unit tests for the Layer 1 generic OC router (pulse 27).
 *
 * Covers: full-file read, fragment/section addressing, and 404 for a
 * missing OC file.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ocGenericRouter } from '../../src/routes/oc-generic.js';
import { CompilationHost } from '../../src/compilation-host.js';
import type { GovernanceIR } from '@bic/claws-sdk';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

async function listenApp(app: ReturnType<typeof express>): Promise<Server> {
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

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'oc-generic-u-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('oc-generic router — L0', () => {
  it('returns full file content with parsed sections', async () => {
    await writeFile(
      join(root, 'SOUL.md'),
      '# Soul\n\n## Purpose\n\n- deliver\n\n## Boundaries\n\n- no prod writes\n',
    );
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      root,
    );
    const app = express();
    app.use('/api/oc', ocGenericRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const res = await get(server, '/api/oc/SOUL.md');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      file: string;
      sections: Array<{ heading: string }>;
      preamble: string;
      raw: string;
    };
    expect(body.file).toBe('SOUL.md');
    expect(body.sections.map((s) => s.heading)).toEqual(['Purpose', 'Boundaries']);
    expect(body.preamble).toBe('');
    expect(body.raw).toContain('# Soul');
  });

  it('supports section addressing via ?section= query', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    await writeFile(
      join(root, 'TOOLS.md'),
      '## Tools\n\nAllowed.\n\n## Deny\n\nBlocked.\n',
    );
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      root,
    );
    const app = express();
    app.use('/api/oc', ocGenericRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const res = await get(server, '/api/oc/TOOLS.md?section=Tools');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      file: string;
      section: { heading: string; body: string };
    };
    expect(body.file).toBe('TOOLS.md');
    expect(body.section.heading).toBe('Tools');
    expect(body.section.body).toBe('Allowed.');
  });

  it('returns the full file when ?section= is empty', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    await writeFile(join(root, 'TOOLS.md'), '## Tools\n\nAllowed.\n');
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      root,
    );
    const app = express();
    app.use('/api/oc', ocGenericRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const res = await get(server, '/api/oc/TOOLS.md?section=');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      file: string;
      sections: Array<{ heading: string }>;
    };
    // Empty section query = full-file response.
    expect(body.file).toBe('TOOLS.md');
    expect(body.sections.map((s) => s.heading)).toEqual(['Tools']);
  });

  it('returns 404 for a missing OC file', async () => {
    // Workspace has SOUL.md (required) but no TOOLS.md.
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      root,
    );
    const app = express();
    app.use('/api/oc', ocGenericRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const res = await get(server, '/api/oc/TOOLS.md');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('OC_FILE_MISSING');
  });

  it('falls through to the next handler for unknown OC file names', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      root,
    );
    const app = express();
    app.use('/api/oc', ocGenericRouter(host, { workspaceRoot: root }));
    // Custom 404 handler stands in for notFoundHandler — confirms the
    // oc-generic router called next() instead of writing a body itself.
    app.use((_req, res) => {
      res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND' } });
    });
    server = await listenApp(app);

    const res = await get(server, '/api/oc/UNKNOWN.md');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 404 OC_SECTION_MISSING for an unknown section name via ?section=', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    await writeFile(join(root, 'TOOLS.md'), '## Tools\n\nAllowed.\n');
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      root,
    );
    const app = express();
    app.use('/api/oc', ocGenericRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const res = await get(server, '/api/oc/TOOLS.md?section=Missing');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('OC_SECTION_MISSING');
  });

  it('supports /section/:heading path form for clients that cannot encode ?', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      '## Organization\n\n- Organization: Acme\n',
    );
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      root,
    );
    const app = express();
    app.use('/api/oc', ocGenericRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const res = await get(server, '/api/oc/IDENTITY.md/section/Organization');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      file: string;
      section: { heading: string; body: string };
    };
    expect(body.file).toBe('IDENTITY.md');
    expect(body.section.heading).toBe('Organization');

    // Known file but missing from workspace on /section path -> 404.
    const missing = await get(server, '/api/oc/TOOLS.md/section/Tools');
    expect(missing.status).toBe(404);
    const missingBody = JSON.parse(missing.body) as { error: { code: string } };
    expect(missingBody.error.code).toBe('OC_FILE_MISSING');

    // Known file present, but section heading missing -> OC_SECTION_MISSING.
    const badSection = await get(server, '/api/oc/IDENTITY.md/section/Unknown');
    expect(badSection.status).toBe(404);
    const badSectionBody = JSON.parse(badSection.body) as { error: { code: string } };
    expect(badSectionBody.error.code).toBe('OC_SECTION_MISSING');
  });

  it('PATCH returns 501 OC_PATCH_NOT_IMPLEMENTED for known files and falls through for unknown files', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      root,
    );
    const app = express();
    app.use(express.json());
    app.use('/api/oc', ocGenericRouter(host, { workspaceRoot: root }));
    app.use((_req, res) => {
      res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND' } });
    });
    server = await listenApp(app);

    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');

    const knownRes = await fetch(`http://127.0.0.1:${String(addr.port)}/api/oc/SOUL.md`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(knownRes.status).toBe(501);
    const known = (await knownRes.json()) as { error: { code: string } };
    expect(known.error.code).toBe('OC_PATCH_NOT_IMPLEMENTED');

    const unknownRes = await fetch(`http://127.0.0.1:${String(addr.port)}/api/oc/UNKNOWN.md`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(unknownRes.status).toBe(404);
    const unknown = (await unknownRes.json()) as { error: { code: string } };
    expect(unknown.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('propagates WorkspaceError (missing SOUL.md) through centralized error-handler as 404', async () => {
    // No SOUL.md on disk — parseWorkspace throws WorkspaceError. The route
    // no longer handles this locally; the centralized errorHandler maps
    // WORKSPACE_SOUL_MISSING to 404 (the `_MISSING` discriminator branch).
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      root,
    );
    const app = express();
    app.use('/api/oc', ocGenericRouter(host, { workspaceRoot: root }));
    const { errorHandler } = await import('../../src/middleware/error-handler.js');
    app.use(errorHandler());
    server = await listenApp(app);

    const res = await get(server, '/api/oc/SOUL.md');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('WORKSPACE_SOUL_MISSING');

    // Also exercise the /section path's WorkspaceError branch.
    const resSection = await get(server, '/api/oc/SOUL.md/section/Purpose');
    expect(resSection.status).toBe(404);
    const sectionBody = JSON.parse(resSection.body) as { error: { code: string } };
    expect(sectionBody.error.code).toBe('WORKSPACE_SOUL_MISSING');
  });
});
