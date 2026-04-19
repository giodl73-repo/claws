/**
 * L1 integration tests for GET /api/oc/ (Pulse 64).
 *
 * Spins up the full Express app via `createApp` with a real workspace
 * directory on disk and asserts the schema response shape across three
 * scenarios: full workspace, partial workspace (only SOUL.md), and a
 * workspace with live sessions + compilation.
 *
 * The schema surfaces the 7 markdown OC files; CAP subsections migrated
 * from DENY/KNOWLEDGE/ENTITLEMENTS now appear as IDENTITY.md H2 overrides.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
interface SchemaResponse {
  schemaVersion: number;
  workspaceRoot: string;
  files: Array<{
    name: string;
    exists: boolean;
    sections: Array<{
      heading: string;
      chunk?: { tab: string; section: string };
      editable: boolean;
    }>;
    hasViolation: boolean;
  }>;
  sessions: Array<{ id: string; label?: string; startedAt?: string }>;
  compilation: { kind: string; compiledAt: string | null; hash: string | null };
  violationState: { kind: string; pendingViolations: string[] };
}

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
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
  root = await mkdtemp(join(tmpdir(), 'ws-schema-int-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/oc/ — workspace schema', () => {
  it('returns a full schema when all 7 markdown OC files exist', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- deliver\n');
    await writeFile(join(root, 'MEMORY.md'), '## Personal\n\n- fact\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      [
        '## Organization',
        '',
        '- Organization: Acme',
        '',
        '## Deny Rules',
        '',
        '### No prod writes',
        '',
        'Block.',
        '',
        '## Knowledge Sources',
        '',
        '### Runbooks',
        '',
        '- rb',
        '',
        '## Entitlements',
        '',
        '### Paid tier',
        '',
        '- gpt',
        '',
      ].join('\n'),
    );
    await writeFile(join(root, 'TOOLS.md'), '## bash\n\nShell.\n');
    await writeFile(join(root, 'AGENTS.md'), '## planner\n\nPlans.\n');
    await writeFile(join(root, 'USER.md'), '## Contact\n\n- u@x\n');
    await writeFile(join(root, 'HEARTBEAT.md'), '## On Start\n\n- check\n');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    const res = await get(server, '/api/oc/');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as SchemaResponse;

    expect(body.schemaVersion).toBe(1);
    expect(body.workspaceRoot).toBe(root);
    expect(body.files).toHaveLength(7);
    for (const file of body.files) {
      expect(file.exists).toBe(true);
      expect(file.hasViolation).toBe(false);
    }
    const soul = body.files.find((f) => f.name === 'SOUL.md')!;
    expect(soul.sections).toHaveLength(1);
    expect(soul.sections[0]!.chunk).toEqual({ tab: 'preferences', section: 'purpose' });
    expect(soul.sections[0]!.editable).toBe(true);
    expect(body.compilation.kind).toBe('uncompiled');
    expect(body.violationState).toEqual({ kind: 'clean', pendingViolations: [] });
  });

  it('reports a partial workspace with exists: false for missing files', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\nOnly soul.\n');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    const res = await get(server, '/api/oc/');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as SchemaResponse;

    const byName = new Map(body.files.map((f) => [f.name, f]));
    expect(byName.get('SOUL.md')!.exists).toBe(true);
    expect(byName.get('MEMORY.md')!.exists).toBe(false);
    expect(byName.get('MEMORY.md')!.sections).toEqual([]);
    expect(byName.get('HEARTBEAT.md')!.exists).toBe(false);
    // All 7 entries must still appear — never a 404 for missing optional files.
    expect(body.files).toHaveLength(7);
  });

  it('includes runtime sessions and compilation hash once /compile has run', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    // Drive a compile so CompilationHost has a cached IR.
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');
    const compileRes = await fetch(`http://127.0.0.1:${String(addr.port)}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(compileRes.status).toBe(200);

    const res = await get(server, '/api/oc/');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as SchemaResponse;
    expect(body.compilation.kind).toBe('clean');
    expect(typeof body.compilation.hash).toBe('string');
    expect(typeof body.compilation.compiledAt).toBe('string');
    // No runtime sessions wired in the default server path — schema still
    // serializes them as an empty array, never undefined.
    expect(body.sessions).toEqual([]);
  });
});
