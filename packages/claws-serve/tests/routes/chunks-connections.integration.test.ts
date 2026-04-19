/**
 * L1 integration tests for /api/chunks/connections.
 *
 * Spins up the full Express app with a real workspace on disk and asserts
 * the multi-module wiring: parseWorkspace → assembleChunks → HTTP JSON.
 * Exercises the three governance paths that partners care about:
 *   - tools declared in TOOLS.md + compiled IR produce real risk entries
 *   - fleet override flips approvalSource + lock.source to 'fleet'
 *   - OBO tools (R4 + oboFlag) report approvalRequired=true
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Chunk, FleetPolicy } from '@bic/claws-sdk/workspace';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nMulti-server agent.\n\n## Purpose\n\n- coordinate\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(
  server: Server,
  path: string,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-conn-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/chunks/connections — L1 integration', () => {
  it('projects every IR tool with governance-derived risk, OBO, approval fields', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const ir: GovernanceIR = governanceIRMultiServer();
    const app = createApp(state, { compileFn: async () => ir, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    const res = await get(server, '/api/chunks/connections');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { chunks: Chunk<'connections'>[] };

    const byServer = new Map(body.chunks.map((c) => [c.data.server, c]));
    // outlook.send_mail — high + OBO → approvalRequired, lock.source=none
    const sendMail = byServer.get('outlook')!.data.tools.find((t) => t.tool === 'send_mail')!;
    expect(sendMail.risk.level).toBe(4);
    expect(sendMail.risk.capability).toBe('execute');
    expect(sendMail.obo).toBe(true);
    expect(sendMail.approvalRequired).toBe(true);
    expect(sendMail.approvalSource).toBe('compiled');
    expect(sendMail.lock.source).toBe('none');

    // outlook.read_inbox — low → not gated
    const readInbox = byServer.get('outlook')!.data.tools.find((t) => t.tool === 'read_inbox')!;
    expect(readInbox.risk.level).toBe(2);
    expect(readInbox.approvalRequired).toBe(false);

    // sharepoint.delete_site — critical → locked r5
    const deleteSite = byServer
      .get('sharepoint')!
      .data.tools.find((t) => t.tool === 'delete_site')!;
    expect(deleteSite.risk.level).toBe(5);
    expect(deleteSite.lock.source).toBe('r5');
  });

  it('fleet-overridden tools have lock.source=fleet and approvalSource=fleet-override', async () => {
    const fleet: FleetPolicy = {
      overrides: [
        {
          tool: 'post_message',
          server: 'teams',
          requires_approval: true,
          reason: 'Fleet policy: all Teams posts require approval',
          authorizedBy: 'fleet-admin',
          authorizedAt: '2026-04-17T00:00:00.000Z',
        },
      ],
    };

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const ir: GovernanceIR = governanceIRMultiServer();

    // Wire via a wrapping createApp call that injects fleet via patched server.ts
    // Since createApp does not accept fleet directly yet, we reach through the
    // chunk route module by constructing an Express app manually for this
    // specific test — proves the `getFleetPolicy` plumbing works.
    const app = createApp(state, { compileFn: async () => ir, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    // Swap in a fleet-aware router on the chunks prefix. We cannot re-enter
    // createApp's internal prefixes, so instead register a stub route that
    // calls the assembler directly for a known server and assert shape.
    //
    // Simpler: drive the public API with a fleet-injecting createApp
    // alternative. We import and mount the router ourselves.
    //
    // For L1 coverage purposes the scaffold test below proves composition;
    // here we exercise the fleet branch by installing a second route with
    // a fleet-aware wrapper.
    const { chunksConnectionsRouter } = await import(
      '../../src/routes/chunks-connections.js'
    );
    const express = (await import('express')).default;
    const fleetApp = express();
    fleetApp.use(express.json());
    // Use the scaffold's CompilationHost indirectly — construct a new one.
    const { CompilationHost } = await import('../../src/compilation-host.js');
    const host = new CompilationHost(async () => ir, root);
    await host.compile();
    fleetApp.use(
      '/api/chunks',
      chunksConnectionsRouter(host, {
        workspaceRoot: root,
        getFleetPolicy: () => fleet,
      }),
    );
    const fleetServer = await new Promise<Server>((resolve) => {
      const s = fleetApp.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      const res = await get(fleetServer, '/api/chunks/connections/teams');
      expect(res.status).toBe(200);
      const chunk = JSON.parse(res.body) as Chunk<'connections'>;
      const tool = chunk.data.tools.find((t) => t.tool === 'post_message')!;
      expect(tool.approvalRequired).toBe(true);
      expect(tool.approvalSource).toBe('fleet-override');
      expect(tool.lock.source).toBe('fleet');
      expect(tool.lock.reason).toContain('Fleet policy');
      // governance.fleetOverride is set because at least one tool was overridden
      expect(chunk.governance?.fleetOverride).toBe(true);
    } finally {
      fleetServer.close();
    }

    // Original (non-fleet) app still reachable and unchanged.
    server = await listenApp(app);
    const plain = await get(server, '/api/chunks/connections/teams');
    const plainChunk = JSON.parse(plain.body) as Chunk<'connections'>;
    const postMessage = plainChunk.data.tools.find((t) => t.tool === 'post_message')!;
    expect(postMessage.approvalSource).toBe('compiled');
    expect(postMessage.lock.source).toBe('none');
  });

  it('OBO tools surface approvalRequired=true with compiled approvalSource', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const ir: GovernanceIR = governanceIRMultiServer();
    const app = createApp(state, { compileFn: async () => ir, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    const res = await get(server, '/api/chunks/connections/outlook');
    expect(res.status).toBe(200);
    const chunk = JSON.parse(res.body) as Chunk<'connections'>;
    const oboTool = chunk.data.tools.find((t) => t.obo);
    expect(oboTool).toBeDefined();
    expect(oboTool!.approvalRequired).toBe(true);
    expect(oboTool!.approvalSource).toBe('compiled');
  });
});
