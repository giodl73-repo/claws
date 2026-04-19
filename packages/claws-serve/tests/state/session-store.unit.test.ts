/**
 * L0 unit tests for `createSessionStore` (Pulse 61).
 *
 * Exercises load/upsert/remove + envelope normalization + validation
 * against a temp-directory filesystem. Ensures the per-file coverage
 * threshold (95/90/95/95) holds for `src/state/session-store.ts`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createSessionStore,
  SessionStoreError,
  SESSION_STATE_FILE,
  type SessionRecord,
} from '../../src/state/session-store.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'session-store-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function mkRec(id: string, overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    state: {
      id,
      type: 'main',
      status: 'active',
      createdAt: '2026-04-17T10:00:00Z',
      lastActiveAt: '2026-04-17T10:00:00Z',
    },
    config: { type: 'main' },
    runCount: 0,
    runs: [],
    ...overrides,
  };
}

describe('createSessionStore', () => {
  it('returns an empty map when the state file is missing', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    const map = await store.load();
    expect(map.size).toBe(0);
    expect(store.filePath).toBe(join(root, SESSION_STATE_FILE));
  });

  it('persists upsert + load round-trip', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert(mkRec('main'));
    await store.upsert(
      mkRec('cron:triage', {
        state: {
          id: 'cron:triage',
          type: 'cron',
          status: 'idle',
          createdAt: '2026-04-17T08:00:00Z',
          lastActiveAt: '2026-04-17T09:00:00Z',
          metadata: { owner: 'alice' },
        },
        config: { type: 'cron', schedule: '0 6 * * *', toolAllowlist: ['read-email'] },
        runCount: 2,
        lastRunAt: '2026-04-16T06:00:00Z',
        lastRunStatus: 'success',
        runs: [
          {
            id: 'r-01',
            status: 'success',
            startedAt: '2026-04-15T06:00:00Z',
            durationMs: 45_000,
            toolCalls: 8,
            auditEvents: 8,
          },
        ],
      }),
    );

    const reloaded = createSessionStore({ workspaceRoot: root });
    const map = await reloaded.load();
    expect(map.size).toBe(2);
    const cron = map.get('cron:triage');
    expect(cron?.state.metadata).toEqual({ owner: 'alice' });
    expect(cron?.config.type === 'cron' && cron.config.toolAllowlist).toEqual(['read-email']);
    expect(cron?.runs[0]?.durationMs).toBe(45_000);
  });

  it('upsert replaces an existing record by id', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert(mkRec('main'));
    await store.upsert(
      mkRec('main', { runCount: 5, lastRunStatus: 'error' }),
    );
    const map = await store.load();
    expect(map.size).toBe(1);
    expect(map.get('main')?.runCount).toBe(5);
    expect(map.get('main')?.lastRunStatus).toBe('error');
  });

  it('remove drops the record; missing ids are a no-op', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert(mkRec('main'));
    await store.upsert(mkRec('cron:a', { state: { id: 'cron:a', type: 'cron', status: 'idle', createdAt: 'x', lastActiveAt: 'x' }, config: { type: 'cron', schedule: '* * * * *' } }));
    await store.remove('cron:a');
    await store.remove('does-not-exist'); // no-op
    const map = await store.load();
    expect([...map.keys()]).toEqual(['main']);
  });

  it('tolerates corrupt JSON by falling back to an empty envelope', async () => {
    const stateFile = '.claws/sessions.json';
    const path = join(root, stateFile);
    await mkdir(join(root, '.claws'), { recursive: true });
    await writeFile(path, '{ not json', 'utf-8');
    const store = createSessionStore({ workspaceRoot: root, stateFile });
    const map = await store.load();
    expect(map.size).toBe(0);
    // Writes after corruption overwrite the bad file.
    await store.upsert(mkRec('main'));
    const raw = await readFile(path, 'utf-8');
    expect(JSON.parse(raw)).toEqual(
      expect.objectContaining({ version: 1 }),
    );
  });

  it('drops malformed records on load without surfacing an error', async () => {
    const path = join(root, '.claws/sessions.json');
    await mkdir(join(root, '.claws'), { recursive: true });
    await writeFile(
      path,
      JSON.stringify({
        version: 1,
        sessions: [
          // valid
          {
            state: {
              id: 'main',
              type: 'main',
              status: 'active',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'main' },
            runCount: 1,
            lastRunStatus: 'success',
            runs: [{ id: 'r', status: 'success', startedAt: 't' }],
          },
          // missing state
          { config: { type: 'main' }, runCount: 0, runs: [] },
          // bad type
          { state: { id: 'x', type: 'nope' }, config: {} },
          // config.type mismatch
          {
            state: {
              id: 'y',
              type: 'cron',
              status: 'idle',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'main' },
          },
          // bad run status — record kept, bad run dropped
          {
            state: {
              id: 'z',
              type: 'channel',
              status: 'idle',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'channel', channel: 'teams:a' },
            runs: [{ id: 'r', status: 'nope', startedAt: 't' }],
          },
          // garbage entry
          'nope',
        ],
      }),
      'utf-8',
    );
    const store = createSessionStore({ workspaceRoot: root });
    const map = await store.load();
    expect([...map.keys()].sort()).toEqual(['main', 'z']);
    expect(map.get('z')?.runs).toEqual([]);
    expect(map.get('main')?.runs[0]?.id).toBe('r');
  });

  it('validates upsert input and rejects invalid records', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await expect(
      store.upsert({
        ...mkRec(''),
      }),
    ).rejects.toBeInstanceOf(SessionStoreError);
    await expect(
      store.upsert({
        ...mkRec('main'),
        state: { ...mkRec('main').state, type: 'bogus' as 'main' },
      }),
    ).rejects.toBeInstanceOf(SessionStoreError);
    await expect(
      store.upsert({
        ...mkRec('main'),
        state: { ...mkRec('main').state, status: 'bogus' as 'active' },
      }),
    ).rejects.toBeInstanceOf(SessionStoreError);
    await expect(
      store.upsert({
        state: {
          id: 'x',
          type: 'cron',
          status: 'idle',
          createdAt: 'x',
          lastActiveAt: 'x',
        },
        config: { type: 'main' },
        runCount: 0,
        runs: [],
      }),
    ).rejects.toBeInstanceOf(SessionStoreError);
  });

  it('normalizeEnvelope rejects non-object payloads on load', async () => {
    const path = join(root, '.claws/sessions.json');
    await mkdir(join(root, '.claws'), { recursive: true });
    // JSON array — not a StoredEnvelope — should normalize to empty.
    await writeFile(path, '[]', 'utf-8');
    const store = createSessionStore({ workspaceRoot: root });
    const map = await store.load();
    expect(map.size).toBe(0);
  });

  it('dropping records covers every validate-fail branch', async () => {
    const path = join(root, '.claws/sessions.json');
    await mkdir(join(root, '.claws'), { recursive: true });
    await writeFile(
      path,
      JSON.stringify({
        sessions: [
          // raw === null inside `sessions`
          null,
          // state: missing id
          {
            state: {
              type: 'main',
              status: 'active',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'main' },
          },
          // state: empty id
          {
            state: {
              id: '',
              type: 'main',
              status: 'active',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'main' },
          },
          // state: bad status
          {
            state: {
              id: 'a',
              type: 'main',
              status: 'bogus',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'main' },
          },
          // state: non-string createdAt
          {
            state: {
              id: 'a',
              type: 'main',
              status: 'active',
              createdAt: 123,
              lastActiveAt: 'x',
            },
            config: { type: 'main' },
          },
          // state: null raw
          { state: null, config: { type: 'main' } },
          // config: null
          {
            state: {
              id: 'a',
              type: 'main',
              status: 'active',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: null,
          },
          // config: cron with non-string schedule
          {
            state: {
              id: 'c',
              type: 'cron',
              status: 'idle',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'cron', schedule: 42 },
          },
          // config: channel with non-string channel
          {
            state: {
              id: 'ch',
              type: 'channel',
              status: 'idle',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'channel', channel: 0 },
          },
          // config: agent with non-string delegator
          {
            state: {
              id: 'ag',
              type: 'agent',
              status: 'active',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'agent', delegatorSessionId: null },
          },
          // run: null raw
          {
            state: {
              id: 'r1',
              type: 'main',
              status: 'active',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'main' },
            runs: [null, { id: '', status: 'success', startedAt: 't' }, { id: 'r', status: 'success', startedAt: 42 }],
          },
          // runCount negative / non-finite
          {
            state: {
              id: 'n',
              type: 'main',
              status: 'active',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'main' },
            runCount: -1,
          },
          // VALID with all the optional agent revokedTools filter path
          {
            state: {
              id: 'ag-ok',
              type: 'agent',
              status: 'active',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: {
              type: 'agent',
              delegatorSessionId: 'main',
              revokedTools: ['a', 42, 'b'], // 42 filtered out
            },
            runs: 'not an array', // falls back to []
          },
          // VALID cron with array toolAllowlist containing non-strings
          {
            state: {
              id: 'cr-ok',
              type: 'cron',
              status: 'idle',
              createdAt: 'x',
              lastActiveAt: 'x',
            },
            config: { type: 'cron', schedule: '* * * * *', toolAllowlist: ['t', 1, 't2'] },
          },
        ],
      }),
      'utf-8',
    );
    const store = createSessionStore({ workspaceRoot: root });
    const map = await store.load();
    // Only the two valid records survive — 'r1' (runs sanitized), 'n'
    // (runCount defaulted to 0), 'ag-ok', 'cr-ok'.
    const keys = [...map.keys()].sort();
    expect(keys).toEqual(['ag-ok', 'cr-ok', 'n', 'r1']);
    expect(map.get('n')?.runCount).toBe(0);
    expect(map.get('r1')?.runs).toEqual([]);
    const agOk = map.get('ag-ok');
    expect(agOk?.config.type === 'agent' && agOk.config.revokedTools).toEqual(['a', 'b']);
    const crOk = map.get('cr-ok');
    expect(crOk?.config.type === 'cron' && crOk.config.toolAllowlist).toEqual(['t', 't2']);
  });

  it('persists each of the four session types with their config fields', async () => {
    const store = createSessionStore({ workspaceRoot: root });
    await store.upsert(mkRec('main'));
    await store.upsert({
      state: {
        id: 'cron:a',
        type: 'cron',
        status: 'idle',
        createdAt: 'x',
        lastActiveAt: 'x',
      },
      config: { type: 'cron', schedule: '0 6 * * *' },
      runCount: 0,
      runs: [],
    });
    await store.upsert({
      state: {
        id: 'channel:c',
        type: 'channel',
        status: 'idle',
        createdAt: 'x',
        lastActiveAt: 'x',
      },
      config: { type: 'channel', channel: 'slack:C1' },
      runCount: 0,
      runs: [],
    });
    await store.upsert({
      state: {
        id: 'agent:a',
        type: 'agent',
        status: 'active',
        createdAt: 'x',
        lastActiveAt: 'x',
      },
      config: { type: 'agent', delegatorSessionId: 'main', revokedTools: ['send-email'] },
      runCount: 0,
      runs: [],
    });
    const reloaded = createSessionStore({ workspaceRoot: root });
    const map = await reloaded.load();
    const agent = map.get('agent:a');
    expect(agent?.config.type === 'agent' && agent.config.revokedTools).toEqual(['send-email']);
    const channel = map.get('channel:c');
    expect(channel?.config.type === 'channel' && channel.config.channel).toBe('slack:C1');
  });
});
