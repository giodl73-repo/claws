/**
 * L3 acceptance test — S30 (concurrent-multi-tab) pulse-27 surface.
 *
 * S30 covers multi-tab concurrency concerns (ETag, versioning, lock
 * precedence). Pulse 27 ships the read surface that S30 depends on:
 * /api/governance, /api/status, and the generic /api/oc/{file} Layer 1
 * router. This test asserts the surface-level contracts pulse 27 owns,
 * which downstream write-path pulses (29) will extend with ETag and
 * PATCH support.
 *
 * Specifically covers:
 *   • S30-F01 — endpoint surface present + consistent (all three Layer
 *     1/3 endpoints respond on a compiled workspace).
 *   • S30-F04 — cross-layer state parity: /api/governance and /api/status
 *     reflect the same compiledAt + blockedTools.
 *   • S30-F06 — read endpoints reflect the latest compile without
 *     caching stale results across tabs.
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
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

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
  root = await mkdtemp(join(tmpdir(), 'companion-acc-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

describe('S30 concurrent-multi-tab — pulse 27 surface', () => {
  it('read endpoints reflect the latest compile state consistently across tabs', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- p\n');
    await writeFile(join(root, 'TOOLS.md'), '## Tools\n\n- bash\n');

    // Swap compile output mid-flight: first compile returns clean IR,
    // second returns the violating IR. Simulates two tabs viewing
    // before/after a policy tightening.
    let compileCount = 0;
    const compileFn = async (): Promise<GovernanceIR> => {
      compileCount += 1;
      return compileCount === 1 ? minimalGovernanceIR() : governanceIRWithViolations();
    };

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      violationDebounceMs: 0,
    });
    server = await listenApp(app);

    // Tab A: first compile + read. Governance should be clean, no blocked tools.
    const firstCompile = await post(server, '/compile');
    expect(firstCompile.status).toBe(200);

    const firstGov = await get(server, '/api/governance');
    expect(firstGov.status).toBe(200);
    const firstGovBody = JSON.parse(firstGov.body) as GovernanceResponse;
    expect(firstGovBody.degradedState).toBe('clean');
    expect(firstGovBody.blockedTools).toHaveLength(0);
    expect(firstGovBody.activeViolations).toHaveLength(0);

    const firstStatus = await get(server, '/api/status');
    expect(firstStatus.status).toBe(200);
    const firstStatusBody = JSON.parse(firstStatus.body) as ApiStatusResponse;
    expect(firstStatusBody.compilationStatus).toBe('ok');
    // S30-F04: cross-layer parity — both endpoints agree on compiledAt.
    expect(firstStatusBody.lastCompiled).toBe(firstGovBody.compiledAt);

    // Tab B: second compile fires; the violating IR replaces the clean one.
    const secondCompile = await post(server, '/compile');
    expect(secondCompile.status).toBe(200);

    const secondGov = await get(server, '/api/governance');
    const secondGovBody = JSON.parse(secondGov.body) as GovernanceResponse;
    // Governance surface reflects the NEW state — never serves the stale
    // first-compile result (S30-F06).
    expect(secondGovBody.degradedState).toBe('error');
    expect(secondGovBody.blockedTools).toContain('send-email');
    expect(secondGovBody.activeViolations.length).toBeGreaterThan(0);

    const secondStatus = await get(server, '/api/status');
    const secondStatusBody = JSON.parse(secondStatus.body) as ApiStatusResponse;
    // Cross-layer parity after the second compile.
    expect(secondStatusBody.lastCompiled).toBe(secondGovBody.compiledAt);
    expect(secondStatusBody.violationState.blockedTools).toEqual(secondGovBody.blockedTools);

    // Generic /api/oc/ Layer 1 router serves the on-disk TOOLS.md file
    // regardless of governance state (S30-F01 surface present).
    const tools = await get(server, '/api/oc/TOOLS.md');
    expect(tools.status).toBe(200);
    const toolsBody = JSON.parse(tools.body) as {
      sections: Array<{ heading: string }>;
    };
    expect(toolsBody.sections.map((s) => s.heading)).toEqual(['Tools']);

    // Fragment addressing stays stable across compiles.
    const toolsFrag = await get(server, '/api/oc/TOOLS.md?section=Tools');
    expect(toolsFrag.status).toBe(200);
  });
});
