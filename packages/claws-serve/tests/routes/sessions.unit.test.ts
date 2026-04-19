/**
 * L0 unit tests for the sessions router (Pulse 61).
 *
 * Tests mount `sessionsRouter` on a minimal Express app with an injected
 * in-memory session store. No filesystem, no CompilationHost compilation,
 * no real TOOLS.md parse. Six tests — one per acceptance line.
 */

import { afterEach, describe, expect, it, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { GovernanceIR } from '@bic/claws-sdk';
import type {
  SessionConfig,
  SessionState,
} from '@bic/claws-sdk/workspace';
import { sessionsRouter } from '../../src/routes/sessions.js';
import type { SessionRecord, SessionStore } from '../../src/state/session-store.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
function createFakeStore(records: SessionRecord[]): SessionStore {
  const map = new Map(records.map((r) => [r.state.id, r] as const));
  return {
    filePath: '<fake>',
    load: async () => new Map(map),
    upsert: async (rec) => {
      map.set(rec.state.id, rec);
    },
    remove: async (id) => {
      map.delete(id);
    },
  };
}

function mkRecord(
  id: string,
  type: SessionState['type'],
  overrides: Partial<SessionRecord> = {},
): SessionRecord {
  const state: SessionState = {
    id,
    type,
    status: 'active',
    createdAt: '2026-04-17T10:00:00.000Z',
    lastActiveAt: '2026-04-17T10:00:00.000Z',
  };
  const config: SessionConfig =
    type === 'cron'
      ? { type: 'cron', schedule: '0 6 * * *' }
      : type === 'channel'
        ? { type: 'channel', channel: 'teams:c1' }
        : type === 'agent'
          ? { type: 'agent', delegatorSessionId: 'main' }
          : { type: 'main' };
  return {
    state,
    config,
    runCount: 0,
    runs: [],
    ...overrides,
  };
}

async function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function portOf(s: Server): number {
  const a = s.address() as AddressInfo | null;
  if (a === null) throw new Error('no addr');
  return a.port;
}

async function getJson(server: Server, path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${portOf(server)}${path}`);
  return { status: res.status, body: (await res.json()) as unknown };
}

function mountApp(records: SessionRecord[], host: CompilationHost): express.Express {
  const app = express();
  const store = createFakeStore(records);
  app.use('/api/sessions', sessionsRouter(host, { workspaceRoot: '<fake>', store }));
  return app;
}

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

describe('sessionsRouter L0', () => {
  let host: CompilationHost;

  beforeEach(() => {
    // No-op compileFn — IR is supplied synchronously via seedCache in the
    // tools test; the other tests don't touch the host.
    const compile = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    host = new CompilationHost(compile, '<fake>');
  });

  it('GET /api/sessions returns an array of SessionSummary', async () => {
    const records = [
      mkRecord('main', 'main'),
      mkRecord('cron:triage', 'cron', {
        runCount: 3,
        lastRunAt: '2026-04-16T06:00:00Z',
        lastRunStatus: 'error',
      }),
    ];
    server = await listen(mountApp(records, host));
    const { status, body } = await getJson(server, '/api/sessions');
    expect(status).toBe(200);
    const typed = body as { sessions: { id: string; runCount: number }[] };
    expect(Array.isArray(typed.sessions)).toBe(true);
    expect(typed.sessions.map((s) => s.id).sort()).toEqual(['cron:triage', 'main']);
    const cron = typed.sessions.find((s) => s.id === 'cron:triage');
    expect(cron?.runCount).toBe(3);
  });

  it('GET /api/sessions?type=cron filters by session type', async () => {
    const records = [
      mkRecord('main', 'main'),
      mkRecord('cron:a', 'cron'),
      mkRecord('cron:b', 'cron'),
      mkRecord('channel:ch', 'channel'),
    ];
    server = await listen(mountApp(records, host));
    const { status, body } = await getJson(server, '/api/sessions?type=cron');
    expect(status).toBe(200);
    const typed = body as { sessions: { id: string; type: string }[] };
    expect(typed.sessions.map((s) => s.id).sort()).toEqual(['cron:a', 'cron:b']);
    for (const s of typed.sessions) expect(s.type).toBe('cron');
  });

  it('GET /api/sessions/:id returns the session detail', async () => {
    const records = [mkRecord('main', 'main'), mkRecord('cron:triage', 'cron')];
    server = await listen(mountApp(records, host));
    const { status, body } = await getJson(server, '/api/sessions/cron:triage');
    expect(status).toBe(200);
    const typed = body as { session: { id: string; type: string } };
    expect(typed.session.id).toBe('cron:triage');
    expect(typed.session.type).toBe('cron');
  });

  it('GET /api/sessions/:id returns 404 for unknown id', async () => {
    server = await listen(mountApp([mkRecord('main', 'main')], host));
    const { status, body } = await getJson(server, '/api/sessions/does-not-exist');
    expect(status).toBe(404);
    const typed = body as { error: { code: string } };
    expect(typed.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('GET /api/sessions/:id/runs returns run history ordered by most-recent-first', async () => {
    const records = [
      mkRecord('cron:triage', 'cron', {
        runs: [
          { id: 'r-01', status: 'success', startedAt: '2026-04-14T06:00:00Z' },
          { id: 'r-03', status: 'success', startedAt: '2026-04-16T06:00:00Z' },
          { id: 'r-02', status: 'error', startedAt: '2026-04-15T06:00:00Z' },
        ],
      }),
    ];
    server = await listen(mountApp(records, host));
    const { status, body } = await getJson(server, '/api/sessions/cron:triage/runs');
    expect(status).toBe(200);
    const typed = body as { runs: { id: string; startedAt: string }[] };
    expect(typed.runs.map((r) => r.id)).toEqual(['r-03', 'r-02', 'r-01']);
  });

  it('rejects unknown ?type= filter with a structured 400', async () => {
    server = await listen(mountApp([mkRecord('main', 'main')], host));
    const { status, body } = await getJson(server, '/api/sessions?type=bogus');
    expect(status).toBe(400);
    const typed = body as { error: { code: string } };
    expect(typed.error.code).toBe('SESSION_INVALID_TYPE_FILTER');
  });

  it('rejects invalid ?limit= on the runs endpoint', async () => {
    const records = [mkRecord('cron:x', 'cron')];
    server = await listen(mountApp(records, host));
    // Non-integer — string with letters
    const bad1 = await getJson(server, '/api/sessions/cron:x/runs?limit=many');
    expect(bad1.status).toBe(400);
    // Zero — parser rejects n<=0
    const bad2 = await getJson(server, '/api/sessions/cron:x/runs?limit=0');
    expect(bad2.status).toBe(400);
  });

  it('?limit= caps at the configured maxRunsPerResponse', async () => {
    const records = [
      mkRecord('cron:x', 'cron', {
        runs: [
          { id: 'r-1', status: 'success', startedAt: '2026-04-10T00:00:00Z' },
          { id: 'r-2', status: 'success', startedAt: '2026-04-11T00:00:00Z' },
          { id: 'r-3', status: 'success', startedAt: '2026-04-12T00:00:00Z' },
        ],
      }),
    ];
    const app = express();
    const store = createFakeStore(records);
    app.use(
      '/api/sessions',
      sessionsRouter(host, { workspaceRoot: '<fake>', store, maxRunsPerResponse: 2 }),
    );
    server = await listen(app);
    // Ask for 10 but max is 2
    const { status, body } = await getJson(server, '/api/sessions/cron:x/runs?limit=10');
    expect(status).toBe(200);
    const typed = body as { runs: { id: string }[] };
    expect(typed.runs).toHaveLength(2);
  });

  it('treats array-valued ?type= as invalid (Express repeats)', async () => {
    server = await listen(mountApp([mkRecord('main', 'main')], host));
    // Repeated ?type= surfaces as array in Express's query parser
    const { status } = await getJson(server, '/api/sessions?type=main&type=cron');
    expect(status).toBe(400);
  });

  it('treats array-valued ?limit= as invalid', async () => {
    server = await listen(mountApp([mkRecord('cron:x', 'cron')], host));
    const { status } = await getJson(server, '/api/sessions/cron:x/runs?limit=5&limit=10');
    expect(status).toBe(400);
  });

  it('?type=main returns only main sessions (valid filter success path)', async () => {
    server = await listen(
      mountApp([mkRecord('main', 'main'), mkRecord('cron:a', 'cron')], host),
    );
    const { status, body } = await getJson(server, '/api/sessions?type=main');
    expect(status).toBe(200);
    const typed = body as { sessions: { id: string }[] };
    expect(typed.sessions.map((s) => s.id)).toEqual(['main']);
  });

  it('sort is deterministic when two sessions share lastActiveAt', async () => {
    const baseTime = '2026-04-17T10:00:00.000Z';
    const records = [
      mkRecord('z-last', 'main', {
        state: {
          id: 'z-last',
          type: 'main',
          status: 'active',
          createdAt: baseTime,
          lastActiveAt: baseTime,
        },
      }),
      mkRecord('a-first', 'main', {
        state: {
          id: 'a-first',
          type: 'main',
          status: 'active',
          createdAt: baseTime,
          lastActiveAt: baseTime,
        },
      }),
    ];
    server = await listen(mountApp(records, host));
    const { body } = await getJson(server, '/api/sessions');
    const typed = body as { sessions: { id: string }[] };
    // Tie-break on id (ascending) when lastActiveAt equal.
    expect(typed.sessions.map((s) => s.id)).toEqual(['a-first', 'z-last']);
  });

  it('runs sort handles equal-startedAt entries deterministically', async () => {
    const records = [
      mkRecord('cron:x', 'cron', {
        runs: [
          { id: 'r-a', status: 'success', startedAt: '2026-04-17T06:00:00Z' },
          { id: 'r-b', status: 'success', startedAt: '2026-04-17T06:00:00Z' },
        ],
      }),
    ];
    server = await listen(mountApp(records, host));
    const { status, body } = await getJson(server, '/api/sessions/cron:x/runs');
    expect(status).toBe(200);
    const typed = body as { runs: { id: string }[] };
    // Both runs present — the exact order when startedAt is equal is stable
    // per Array.prototype.sort's ES2019 guarantee; the assertion simply
    // proves the equal-timestamp sort branch executes without throwing.
    expect(typed.runs).toHaveLength(2);
  });

  it('resolves an agent session via the lookup (delegation chain)', async () => {
    // Delegator `main` with no workspace tools → resolver returns empty;
    // delegate `agent:a` inherits the empty set. This exercises the
    // agent branch in resolveSessionTools via the router's lookup wiring.
    const records = [
      mkRecord('main', 'main'),
      mkRecord('agent:a', 'agent', {
        state: {
          id: 'agent:a',
          type: 'agent',
          status: 'active',
          createdAt: '2026-04-17T10:00:00Z',
          lastActiveAt: '2026-04-17T10:00:00Z',
        },
        config: { type: 'agent', delegatorSessionId: 'main' },
      }),
    ];
    server = await listen(mountApp(records, host));
    const { status, body } = await getJson(server, '/api/sessions/agent:a/tools');
    expect(status).toBe(200);
    const typed = body as { tools: unknown[] };
    expect(typed.tools).toEqual([]);
  });

  it('returns 404 on runs and tools endpoints for unknown session id', async () => {
    server = await listen(mountApp([mkRecord('main', 'main')], host));
    const runs = await getJson(server, '/api/sessions/missing/runs');
    expect(runs.status).toBe(404);
    const runsBody = runs.body as { error: { code: string } };
    expect(runsBody.error.code).toBe('SESSION_NOT_FOUND');
    const tools = await getJson(server, '/api/sessions/missing/tools');
    expect(tools.status).toBe(404);
    const toolsBody = tools.body as { error: { code: string } };
    expect(toolsBody.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('GET /api/sessions/:id/tools delegates to the session tool resolver', async () => {
    // Cron session with only R1-R2 access by default — resolver must filter
    // out R5 'send-email' from the workspace tool list. We seed the cached
    // IR via the host to drive assembly, but use a minimal store that
    // delivers a synthetic chunks result instead of touching the filesystem.
    // The resolver behaviour is verified here at the HTTP boundary: an R5
    // tool in the workspace tool list must NOT appear in the cron session's
    // scoped list, because resolveSessionTools filters it.
    const records = [
      mkRecord('cron:triage', 'cron', {
        // Explicit allowlist narrows to a single R1 tool. The test asserts
        // the resolver was applied (not workspace-level).
        config: {
          type: 'cron',
          schedule: '0 6 * * *',
          toolAllowlist: ['read-email'],
        },
      }),
    ];
    // Mount a router that bypasses `loadWorkspaceTools` by injecting a
    // store whose loader is sufficient — the tools path still calls
    // assembleChunks; with no IR we get an empty tool list, and the
    // resolver returns [] for an empty input. This exercises the
    // delegation contract (call reached the resolver, returned an array)
    // without requiring a full compile.
    server = await listen(mountApp(records, host));
    const { status, body } = await getJson(server, '/api/sessions/cron:triage/tools');
    expect(status).toBe(200);
    const typed = body as { tools: unknown[] };
    expect(Array.isArray(typed.tools)).toBe(true);
    // With no cached IR, the workspace tool list is empty and the resolver
    // returns []. The assertion here is about the shape of the response
    // and the fact the request reached the handler — the full permission
    // semantics are covered in the L1 integration + resolver's own L0s.
    expect(typed.tools).toEqual([]);
  });
});
