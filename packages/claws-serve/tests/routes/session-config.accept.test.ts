/**
 * L3 acceptance for PATCH /api/sessions/:id/config (Pulse 65).
 *
 * Scenario S11/S13 — "cron session with R3 tool pre-auth in HEARTBEAT.md
 * passes validation; same tool without pre-auth is rejected."
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import { createSessionStore } from '../../src/state/session-store.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

const SOUL_MD = '# Soul\n\n## Purpose\n\n- govern\n';

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'session-config-accept-'));
  await writeFile(join(root, 'SOUL.md'), SOUL_MD, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('R3 tool pre-auth acceptance', () => {
  it('pre-auth entry in HEARTBEAT.md permits R3 tool add; missing pre-auth rejects', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert({
      state: {
        id: 'cron:triage',
        type: 'cron',
        status: 'idle',
        createdAt: '2026-04-17T00:00:00Z',
        lastActiveAt: '2026-04-17T06:00:00Z',
      },
      config: { type: 'cron', schedule: '0 6 * * *' },
      runCount: 0,
      runs: [],
    });

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => governanceIRMultiServer();

    // First run: no pre-auth section. The editor must reject the R3
    // tool add with PRE_AUTH_REQUIRED.
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## On Start\n\n- boot\n',
      'utf-8',
    );
    server = await listenApp(createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root }));
    const addr = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${String(addr.port)}`;
    await fetch(`${base}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    // CP-7 R1 FIX-D: cron `tool-add` now requires T1 minimum — escalate
    // first so this scenario exercises PRE_AUTH_REQUIRED rather than the
    // tier gate.
    await fetch(`${base}/api/trust/escalate`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetTier: 'T1', justification: 'accept-test' }),
    });

    const rejected = await fetch(`${base}/api/sessions/cron:triage/config`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'tool-add', tool: 'post_message' }),
    });
    expect(rejected.status).toBe(403);
    const rejectedBody = (await rejected.json()) as { error: { code: string } };
    expect(rejectedBody.error.code).toBe('PRE_AUTH_REQUIRED');

    // Second run: HEARTBEAT.md carries the pre-auth line. Same PATCH
    // now succeeds because the editor sees `post_message` pre-authorized.
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## On Start\n\n- boot\n\n## Cron Pre-Auth\n\n- tool:post_message\n',
      'utf-8',
    );

    const accepted = await fetch(`${base}/api/sessions/cron:triage/config`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'tool-add', tool: 'post_message' }),
    });
    expect(accepted.status).toBe(200);
    const acceptedBody = (await accepted.json()) as { config: { toolAllowlist: string[] } };
    expect(acceptedBody.config.toolAllowlist).toEqual(['post_message']);
  });
});
