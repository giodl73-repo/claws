/**
 * L0 unit tests for the workspace-schema route — targets the context
 * branching (sessions / violationState optional spreads) and the
 * compilation-status helper's `??` null fallbacks.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { CompilationHost } from '../../src/compilation-host.js';
import { workspaceSchemaRouter } from '../../src/routes/workspace-schema.js';
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

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ws-schema-unit-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('workspaceSchemaRouter — context & compilation helpers', () => {
  it('passes both sessions and violationState through to the builder when provided', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- ok\n');
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    const app = express();
    app.use('/api/oc', workspaceSchemaRouter(host, {
      workspaceRoot: root,
      getContext: () => ({
        sessions: [{ id: 'sess-1', label: 'cron:daily' }],
        violationState: { kind: 'degraded', pendingViolations: ['TOOLS.md'] },
      }),
    }));
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/oc/');
    expect(status).toBe(200);
    const schema = JSON.parse(body) as {
      sessions: readonly { id: string }[];
      violationState: { kind: string; pendingViolations: readonly string[] };
    };
    expect(schema.sessions).toEqual([{ id: 'sess-1', label: 'cron:daily' }]);
    expect(schema.violationState.kind).toBe('degraded');
    expect(schema.violationState.pendingViolations).toEqual(['TOOLS.md']);
  });

  it('falls back to defaults when the context supplier is omitted', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- ok\n');
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    const app = express();
    app.use('/api/oc', workspaceSchemaRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/oc/');
    expect(status).toBe(200);
    const schema = JSON.parse(body) as {
      sessions: readonly unknown[];
      violationState: { kind: string };
    };
    expect(schema.sessions).toEqual([]);
    expect(schema.violationState.kind).toBe('clean');
  });

  it('returns compilation status `clean` + real compiledAt/hash when the IR has no violations', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- ok\n');
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    await host.compile();
    const app = express();
    app.use('/api/oc', workspaceSchemaRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/oc/');
    expect(status).toBe(200);
    const schema = JSON.parse(body) as {
      compilation: { kind: string; compiledAt: string | null; hash: string | null };
    };
    expect(schema.compilation.kind).toBe('clean');
    expect(schema.compilation.compiledAt).toBeTypeOf('string');
    expect(schema.compilation.hash).toBeTypeOf('string');
  });

  it('returns compilation status `stale` when the cached IR carries violations', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- ok\n');
    const host = new CompilationHost(async () => {
      const ir = minimalGovernanceIR();
      return {
        ...ir,
        analysis: {
          ...ir.analysis,
          violations: [{
            ruleId: 'G-CLASS-01',
            diagnosticCode: 'G-CLASS-01',
            level: 4,
            target: 'read_file',
            message: 'demo',
          }],
        },
      };
    }, root);
    await host.compile();
    const app = express();
    app.use('/api/oc', workspaceSchemaRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const { status, body } = await get(server, '/api/oc/');
    expect(status).toBe(200);
    const schema = JSON.parse(body) as { compilation: { kind: string } };
    expect(schema.compilation.kind).toBe('stale');
  });
});
