/**
 * L1 integration tests for the startup health check → server mode flow.
 *
 * Wires `runStartupHealthCheck` into a real `createApp` instance and
 * verifies that (a) the mode observed via `GET /health` reflects the
 * check result and (b) PATCH endpoints return 503 with the degraded
 * body when the server enters degraded mode.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationHost } from '../../src/compilation-host.js';
import { runStartupHealthCheck } from '../../src/lifecycle/health-check.js';
import { createApp, type ServerState } from '../../src/server.js';
import { governanceIRMultiServer } from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nHC integration.\n\n## Purpose\n\n- govern\n';
const TOOLS = `# Tools

## read_inbox

- enabled: true
`;

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(server: Server, path: string) {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

async function patch(server: Server, path: string, body: unknown) {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const payload = JSON.stringify(body);
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
    },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'hc-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), TOOLS, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('startup health check → server mode (L1)', () => {
  it('healthy startup → mode=healthy exposed via /health', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0, mode: 'healthy' };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });

    // Simulate the startServer post-listen health check — explicit wiring
    // so we can await the result in-line rather than racing a promise.
    const host = new CompilationHost(async () => governanceIRMultiServer(), root);
    const result = await runStartupHealthCheck({ host });
    state.mode = result.mode;
    state.degradedReason = result.reason;

    server = await listenApp(app);
    const res = await get(server, '/health');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { mode: string };
    expect(body.mode).toBe('healthy');
  });

  it('broken startup → mode=degraded → PATCH returns 503 with diagnostic (S33)', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0, mode: 'healthy' };
    const app = createApp(state, {
      compileFn: async () => {
        throw new Error('workspace is broken: TOOLS.md missing required field');
      },
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });

    const host = new CompilationHost(async () => {
      throw new Error('workspace is broken: TOOLS.md missing required field');
    }, root);
    const result = await runStartupHealthCheck({ host });
    state.mode = result.mode;
    state.degradedReason = result.reason;
    expect(state.mode).toBe('degraded');

    server = await listenApp(app);
    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(503);
    const body = JSON.parse(res.body) as {
      error: {
        code: string;
        message: string;
        reasonCode?: string;
        reason?: unknown;
      };
    };
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    // K2 sanitization: the compiler message is logged server-side but
    // never echoed to the 503 body. Only the stable code is exposed.
    expect(body.error.reasonCode).toBe('COMPILATION_FAILED_AT_STARTUP');
    expect(body.error.reason).toBeUndefined();
    expect(body.error.message).not.toContain('TOOLS.md missing required field');
  });
});
