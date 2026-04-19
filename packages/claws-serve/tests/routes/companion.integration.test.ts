/**
 * L1 integration tests for pulse 27 companion endpoints.
 *
 * Drives the full Express app via `createApp` with a real workspace on
 * disk, verifies /api/governance counts match the compiled IR, and
 * confirms the generic Layer 1 router serves TOOLS.md and IDENTITY.md
 * with section addressing.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';
import type { GovernanceResponse } from '../../src/routes/governance.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
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

async function drive(server: Server, path: string, method: string): Promise<Response> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  return fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'companion-int-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('companion endpoints — L1', () => {
  it('governance rule counts and risk distribution match compiled IR', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => governanceIRWithViolations();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    const compileRes = await drive(server, '/compile', 'POST');
    expect(compileRes.status).toBe(200);

    const res = await get(server, '/api/governance');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as GovernanceResponse;

    // Fixture has 3 tools: 1 critical, 1 high, 1 low.
    expect(body.riskDistribution.critical).toBe(1);
    expect(body.riskDistribution.high).toBe(1);
    expect(body.riskDistribution.low).toBe(1);
    // Fixture halts the compile (haltReason != null) so state is "error".
    expect(body.degradedState).toBe('error');
    expect(body.blockedTools).toContain('send-email');
    expect(body.activeViolations.length).toBeGreaterThan(0);
  });

  it('serves TOOLS.md with ?section= fragment addressing', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    await writeFile(
      join(root, 'TOOLS.md'),
      '## Tools\n\nAllowed tools.\n\n## Deny\n\nBlocked.\n',
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => governanceIRWithViolations();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    const full = await get(server, '/api/oc/TOOLS.md');
    expect(full.status).toBe(200);
    const fullBody = JSON.parse(full.body) as {
      sections: Array<{ heading: string }>;
    };
    expect(fullBody.sections.map((s) => s.heading)).toEqual(['Tools', 'Deny']);

    const frag = await get(server, '/api/oc/TOOLS.md?section=Tools');
    expect(frag.status).toBe(200);
    const fragBody = JSON.parse(frag.body) as {
      file: string;
      section: { heading: string; body: string };
    };
    expect(fragBody.file).toBe('TOOLS.md');
    expect(fragBody.section.heading).toBe('Tools');
    expect(fragBody.section.body).toContain('Allowed tools.');
  });

  it('serves IDENTITY.md via the generic Layer 1 router', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      '## Organization\n\n- Organization: Acme\n- Team: Platform\n',
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => governanceIRWithViolations();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    const res = await get(server, '/api/oc/IDENTITY.md');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      file: string;
      sections: Array<{ heading: string; body: string }>;
    };
    expect(body.file).toBe('IDENTITY.md');
    expect(body.sections).toHaveLength(1);
    expect(body.sections[0]!.heading).toBe('Organization');
    expect(body.sections[0]!.body).toContain('Acme');
  });
});
