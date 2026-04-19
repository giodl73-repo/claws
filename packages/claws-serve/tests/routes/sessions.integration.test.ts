/**
 * L1 integration tests for GET /api/sessions (Pulse 61).
 *
 * Boots the full Express app via `createApp`, persists sessions via the
 * real SessionStore on a temp-directory workspace, and asserts the four
 * route endpoints against live state.
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
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';
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

async function get(server: Server, path: string): Promise<{ status: number; body: unknown }> {
  const addr = server.address() as AddressInfo | null;
  if (addr === null) throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: (await res.json()) as unknown };
}

const SOUL_MD = '# Soul\n\n## Purpose\n\n- govern\n';
const HEARTBEAT_MD = '# Heartbeat\n\n## On Start\n\n- boot\n';

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'sessions-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL_MD, 'utf-8');
  await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

function bootApp(): ReturnType<typeof createApp> {
  const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
  const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
  return createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
}

describe('GET /api/sessions (integration)', () => {
  it('session list reflects the persisted workspace state', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert({
      state: {
        id: 'main',
        type: 'main',
        status: 'active',
        createdAt: '2026-04-17T09:00:00Z',
        lastActiveAt: '2026-04-17T11:00:00Z',
      },
      config: { type: 'main' },
      runCount: 0,
      runs: [],
    });
    await store.upsert({
      state: {
        id: 'cron:triage',
        type: 'cron',
        status: 'idle',
        createdAt: '2026-04-10T00:00:00Z',
        lastActiveAt: '2026-04-17T06:00:00Z',
      },
      config: { type: 'cron', schedule: '0 6 * * *' },
      runCount: 5,
      lastRunAt: '2026-04-17T06:00:00Z',
      lastRunStatus: 'success',
      runs: [],
    });

    server = await listenApp(bootApp());
    const { status, body } = await get(server, '/api/sessions');
    expect(status).toBe(200);
    const typed = body as { sessions: { id: string; type: string; lastRunStatus?: string }[] };
    expect(typed.sessions.map((s) => s.id)).toEqual(['main', 'cron:triage']);
    expect(typed.sessions[1]?.lastRunStatus).toBe('success');
  });

  it('session detail matches the created session', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert({
      state: {
        id: 'channel:team',
        type: 'channel',
        status: 'idle',
        createdAt: '2026-04-01T00:00:00Z',
        lastActiveAt: '2026-04-14T16:30:00Z',
        metadata: { owner: 'bob' },
      },
      config: { type: 'channel', channel: 'teams:design' },
      runCount: 0,
      runs: [],
    });

    server = await listenApp(bootApp());
    const { status, body } = await get(server, '/api/sessions/channel:team');
    expect(status).toBe(200);
    const typed = body as { session: { id: string; type: string; metadata?: { owner: string } } };
    expect(typed.session.id).toBe('channel:team');
    expect(typed.session.type).toBe('channel');
    expect(typed.session.metadata?.owner).toBe('bob');
  });

  it('run history orders by most-recent-first and respects ?limit=', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert({
      state: {
        id: 'cron:triage',
        type: 'cron',
        status: 'idle',
        createdAt: '2026-04-01T00:00:00Z',
        lastActiveAt: '2026-04-17T06:00:00Z',
      },
      config: { type: 'cron', schedule: '0 6 * * *' },
      runCount: 3,
      runs: [
        { id: 'r-01', status: 'success', startedAt: '2026-04-15T06:00:00Z' },
        { id: 'r-03', status: 'success', startedAt: '2026-04-17T06:00:00Z' },
        { id: 'r-02', status: 'error', startedAt: '2026-04-16T06:00:00Z', error: 'Budget' },
      ],
    });

    server = await listenApp(bootApp());
    const all = await get(server, '/api/sessions/cron:triage/runs');
    expect(all.status).toBe(200);
    const allBody = all.body as { runs: { id: string }[] };
    expect(allBody.runs.map((r) => r.id)).toEqual(['r-03', 'r-02', 'r-01']);

    const limited = await get(server, '/api/sessions/cron:triage/runs?limit=2');
    const limitedBody = limited.body as { runs: { id: string }[] };
    expect(limitedBody.runs.map((r) => r.id)).toEqual(['r-03', 'r-02']);

    const bad = await get(server, '/api/sessions/cron:triage/runs?limit=-1');
    expect(bad.status).toBe(400);
  });

  it('tool list respects session-type restrictions (cron narrows to R1-R2)', async () => {
    // Stand up a workspace with a real TOOLS.md + a compiled IR so
    // `loadWorkspaceTools` produces a non-empty list. The cron session's
    // allowlist narrows that list to R1-R2 tools that appear in the
    // allowlist; R4+ tools (send_mail, delete_site) are filtered out.
    // The main session sees the full workspace list.
    await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');

    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert({
      state: {
        id: 'main',
        type: 'main',
        status: 'active',
        createdAt: '2026-04-17T09:00:00Z',
        lastActiveAt: '2026-04-17T11:00:00Z',
      },
      config: { type: 'main' },
      runCount: 0,
      runs: [],
    });
    await store.upsert({
      state: {
        id: 'cron:triage',
        type: 'cron',
        status: 'idle',
        createdAt: '2026-04-01T00:00:00Z',
        lastActiveAt: '2026-04-17T06:00:00Z',
      },
      config: {
        type: 'cron',
        schedule: '0 6 * * *',
        toolAllowlist: ['read_inbox', 'list_sites', 'read_file'],
      },
      runCount: 0,
      runs: [],
    });

    // Boot an app with a fleet policy that bars `send_mail` via the
    // enforcement plan so we exercise the `violationImpact` branch.
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const ir = {
      ...governanceIRMultiServer(),
      analysis: {
        ...governanceIRMultiServer().analysis,
        enforcementPlan: {
          ...governanceIRMultiServer().analysis.enforcementPlan,
          blockedTools: ['send_mail'],
        },
      },
    };
    const compileFn = async (): Promise<GovernanceIR> => ir;
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });

    server = await listenApp(app);

    // Trigger a compile so the CompilationHost caches the IR before the
    // tools endpoint is hit (the read path does not force a compile).
    const addr = server.address() as AddressInfo | null;
    if (addr === null) throw new Error('no addr');
    const port = addr.port;
    await fetch(`http://127.0.0.1:${port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });

    const cron = await get(server, '/api/sessions/cron:triage/tools');
    expect(cron.status).toBe(200);
    const cronBody = cron.body as { tools: { name: string; violationImpact?: unknown }[] };
    const cronNames = cronBody.tools.map((t) => t.name).sort();
    // Cron allowlist narrows to the three R1-R2 tools that appear in the
    // list; R4 send_mail, R3 post_message, R5 delete_site are filtered.
    expect(cronNames).toEqual(['list_sites', 'read_file', 'read_inbox']);

    const main = await get(server, '/api/sessions/main/tools');
    const mainBody = main.body as { tools: { name: string; violationImpact?: unknown }[] };
    const mainNames = mainBody.tools.map((t) => t.name).sort();
    expect(mainNames).toContain('send_mail');
    // violationImpact present only on the blocked tool.
    const sendMail = mainBody.tools.find((t) => t.name === 'send_mail');
    expect(sendMail?.violationImpact).toEqual({
      blocked: true,
      reason: 'compiled_governance_block',
    });
  });
});

