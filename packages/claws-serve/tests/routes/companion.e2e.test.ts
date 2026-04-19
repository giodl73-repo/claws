/**
 * L2 end-to-end test for pulse 27 companion endpoints.
 *
 * Drives the full server stack (CORS, error handler, registerRoutes,
 * CompilationHost, compile → governance → status → oc-generic) from a
 * fixture workspace on disk and asserts every Layer 1/3 endpoint
 * introduced in this pulse returns a consistent, cross-referenced
 * response after a single compile pass.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import type { GovernanceResponse } from '../../src/routes/governance.js';
import type { ApiStatusResponse } from '../../src/routes/status.js';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';

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

async function post(server: Server, path: string): Promise<Response> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  return fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'companion-e2e-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

describe('pulse 27 endpoints — L2 e2e', () => {
  it('compile → governance + status + oc-generic all agree on workspace state', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    await writeFile(join(root, 'TOOLS.md'), '## Tools\n\n- bash\n');
    await writeFile(join(root, 'IDENTITY.md'), '## Organization\n\n- Organization: Acme\n');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => governanceIRWithViolations();
    const app = createApp(state, {
      compileFn,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      violationDebounceMs: 0,
    });
    server = await listenApp(app);

    // Run a compile to populate the cache.
    const compileRes = await post(server, '/compile');
    expect(compileRes.status).toBe(200);

    // /api/governance reflects the cached IR.
    const govRes = await get(server, '/api/governance');
    expect(govRes.status).toBe(200);
    const gov = JSON.parse(govRes.body) as GovernanceResponse;
    expect(gov.compiledAt).not.toBeNull();
    expect(gov.degradedState).toBe('error');
    expect(gov.blockedTools).toContain('send-email');

    // /api/status reflects the same compiled state.
    const statusRes = await get(server, '/api/status');
    expect(statusRes.status).toBe(200);
    const status = JSON.parse(statusRes.body) as ApiStatusResponse;
    expect(status.lastCompiled).toBe(gov.compiledAt);
    expect(status.compilationStatus).toBe('error');
    expect(status.violationState.blockedTools).toEqual(gov.blockedTools);

    // /api/oc/TOOLS.md serves the on-disk file verbatim.
    const toolsRes = await get(server, '/api/oc/TOOLS.md');
    expect(toolsRes.status).toBe(200);
    const tools = JSON.parse(toolsRes.body) as {
      sections: Array<{ heading: string; body: string }>;
    };
    expect(tools.sections[0]!.heading).toBe('Tools');
    expect(tools.sections[0]!.body).toContain('bash');

    // /api/oc/IDENTITY.md via fragment addressing returns only that section.
    const idFrag = await get(server, '/api/oc/IDENTITY.md?section=Organization');
    expect(idFrag.status).toBe(200);
    const id = JSON.parse(idFrag.body) as {
      section: { heading: string; body: string };
    };
    expect(id.section.heading).toBe('Organization');
    expect(id.section.body).toContain('Acme');

    // CP-7 R2 FIX-H mounts the violation-gate on /api/oc/* PATCH. With
    // the fixture producing critical (R5) violations, the machine is in
    // ERROR state after the first compile. TOOLS.md is not in repairPaths
    // (the violation target is policy.yaml), so the gate returns 503
    // GOVERNANCE_DEGRADED. `violationDebounceMs: 0` (set on createApp
    // above) flushes the machine synchronously so this assertion is not
    // racy against FIX-F's default 200ms coalesce window.
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');
    const patchRes = await fetch(
      `http://127.0.0.1:${String(addr.port)}/api/oc/TOOLS.md`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'content-length': '2' },
        body: '{}',
      },
    );
    expect(patchRes.status).toBe(503);
    const patchBody = (await patchRes.json()) as { error: { code: string } };
    expect(patchBody.error.code).toBe('GOVERNANCE_DEGRADED');
  });
});
