/**
 * L2 e2e test — start the full serve app, compile, call GET /api/oc/,
 * and verify a complete schema response.
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
async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function port(server: Server): number {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  return addr.port;
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ws-schema-e2e-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('E2E: workspace schema introspection', () => {
  it('full server lifecycle — compile then GET /api/oc/ returns complete response', async () => {
    await writeFile(
      join(root, 'SOUL.md'),
      '# Soul\n\nPersona preamble.\n\n## Purpose\n\n- deliver\n\n## Boundaries\n\n- no pii\n',
    );
    await writeFile(
      join(root, 'IDENTITY.md'),
      [
        '## Organization',
        '',
        '- Organization: Acme',
        '',
        '## RBAC',
        '',
        '- Owner: me',
        '',
        '## Entitlements',
        '',
        '### Paid tier',
        '',
        '- gpt-enterprise',
        '',
      ].join('\n'),
    );
    await writeFile(join(root, 'TOOLS.md'), '## read_file\n\nReads.\n');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);
    const p = port(server);

    const compileRes = await fetch(`http://127.0.0.1:${String(p)}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(compileRes.status).toBe(200);

    const schemaRes = await fetch(`http://127.0.0.1:${String(p)}/api/oc/`);
    expect(schemaRes.status).toBe(200);
    const body = (await schemaRes.json()) as {
      schemaVersion: number;
      workspaceRoot: string;
      files: Array<{
        name: string;
        exists: boolean;
        sections: Array<{ heading: string; chunk?: { tab: string; section: string }; editable: boolean }>;
        hasViolation: boolean;
      }>;
      sessions: unknown[];
      compilation: { kind: string; compiledAt: string | null; hash: string | null };
      violationState: { kind: string; pendingViolations: string[] };
    };

    expect(body.schemaVersion).toBe(1);
    expect(body.workspaceRoot).toBe(root);
    expect(body.files).toHaveLength(7);

    const identity = body.files.find((f) => f.name === 'IDENTITY.md')!;
    expect(identity.exists).toBe(true);
    const org = identity.sections.find((s) => s.heading === 'Organization')!;
    expect(org.chunk).toEqual({ tab: 'general', section: 'identity' });
    const rbac = identity.sections.find((s) => s.heading === 'RBAC')!;
    expect(rbac.chunk).toEqual({ tab: 'preferences', section: 'prefs' });
    const ent = identity.sections.find((s) => s.heading === 'Entitlements')!;
    expect(ent.chunk).toEqual({ tab: 'entitlements', section: 'grants' });
    expect(ent.editable).toBe(false);

    const memory = body.files.find((f) => f.name === 'MEMORY.md')!;
    expect(memory.exists).toBe(false);
    expect(memory.sections).toEqual([]);

    expect(body.compilation.kind).toBe('clean');
    expect(body.violationState.kind).toBe('clean');
  });
});
