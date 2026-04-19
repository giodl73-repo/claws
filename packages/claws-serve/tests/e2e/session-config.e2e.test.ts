/**
 * L2 e2e test for PATCH /api/sessions/:id/config (Pulse 65).
 *
 * Walks the full lifecycle: boot the server with a real compile function,
 * seed a cron session with no allowlist, PATCH the config to add an R1
 * tool, then GET /api/sessions/:id/tools to confirm the session-scoped
 * permission set reflects the new entry. Proves the entire chain:
 *   editor → store → append HEARTBEAT.md → recompile → resolver → tools GET.
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

async function baseUrl(server: Server): Promise<string> {
  const addr = server.address() as AddressInfo | null;
  if (addr === null) throw new Error('no addr');
  return `http://127.0.0.1:${String(addr.port)}`;
}

const SOUL_MD = '# Soul\n\n## Purpose\n\n- govern\n';
const HEARTBEAT_MD = '# Heartbeat\n\n## On Start\n\n- boot\n';

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'session-config-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL_MD, 'utf-8');
  await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_MD, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('PATCH /api/sessions/:id/config → recompile → tools (e2e)', () => {
  it('adding a cron allowlist entry reshapes the session-tools response', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert({
      state: {
        id: 'cron:triage',
        type: 'cron',
        status: 'idle',
        createdAt: '2026-04-17T00:00:00Z',
        lastActiveAt: '2026-04-17T06:00:00Z',
      },
      // No toolAllowlist yet — the default cron policy permits every
      // R1-R2 tool and denies every R3+ tool until pre-auth appears.
      config: { type: 'cron', schedule: '0 6 * * *' },
      runCount: 0,
      runs: [],
    });

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => governanceIRMultiServer();
    server = await listenApp(createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root }));
    const base = await baseUrl(server);

    // Warm the compile cache so the route can see the workspace tools.
    const compileRes = await fetch(`${base}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(compileRes.status).toBe(200);

    // CP-7 R1 FIX-D — cron tool-add requires T1 minimum. Escalate once
    // so the downstream PATCH exercises the intended success path.
    await fetch(`${base}/api/trust/escalate`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetTier: 'T1', justification: 'e2e' }),
    });

    // Sanity check: without an allowlist, every R1-R2 tool is permitted
    // — the resolver surfaces read_file, read_inbox, list_sites.
    const beforeRes = await fetch(`${base}/api/sessions/cron:triage/tools`);
    const beforeBody = (await beforeRes.json()) as { tools: { name: string }[] };
    expect(beforeBody.tools.map((t) => t.name).sort()).toEqual(
      ['list_sites', 'read_file', 'read_inbox'].sort(),
    );

    // PATCH adds an explicit allowlist entry. Because the allowlist is
    // now non-empty, the cron policy narrows to the intersection: only
    // `read_file` survives.
    const patchRes = await fetch(`${base}/api/sessions/cron:triage/config`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'tool-add', tool: 'read_file' }),
    });
    expect(patchRes.status).toBe(200);

    const afterRes = await fetch(`${base}/api/sessions/cron:triage/tools`);
    const afterBody = (await afterRes.json()) as { tools: { name: string }[] };
    expect(afterBody.tools.map((t) => t.name)).toEqual(['read_file']);
  });
});
