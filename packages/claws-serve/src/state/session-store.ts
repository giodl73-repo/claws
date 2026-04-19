/**
 * Session runtime-state persistent store (P61).
 *
 * Backs the `/api/sessions` surface with durable runtime state at
 * `<workspaceRoot>/.claws/sessions.json`. AGENTS.md is authoritative for
 * session *definitions* (which cron schedules exist, which channel
 * connectors are configured); this store tracks only the runtime layer:
 * per-session status, lastActiveAt, runCount, and a bounded run history
 * sidecar used by the `GET /api/sessions/:id/runs` endpoint.
 *
 * Writes are atomic — temp file (`.tmp-<pid>-<hex>`) + `fs.rename` — so a
 * crash mid-write never corrupts the committed state. Loads tolerate a
 * missing file (fresh workspace) and malformed JSON (logged, treated as
 * empty so the server still responds).
 *
 * The store is intentionally NOT a business-logic module. Session-scoped
 * tool permission derivation lives in `claws-sdk/src/workspace/session-tool-resolver.ts`;
 * this file owns I/O and shape validation only.
 *
 * @module claws-serve/state/session-store
 */

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type {
  SessionConfig,
  SessionRunStatus,
  SessionState,
  SessionType,
} from '../../../claws-sdk/src/workspace/index.js';

/** Relative location inside the workspace where runtime state persists. */
export const SESSION_STATE_FILE = '.claws/sessions.json';

/** A single run entry in the per-session run history sidecar. */
export interface SessionRun {
  readonly id: string;
  readonly status: SessionRunStatus;
  readonly startedAt: string;
  readonly durationMs?: number;
  readonly toolCalls?: number;
  readonly auditEvents?: number;
  readonly error?: string;
}

/** Persisted record for one session: state + config + bounded run history. */
export interface SessionRecord {
  readonly state: SessionState;
  readonly config: SessionConfig;
  readonly runCount: number;
  readonly lastRunAt?: string;
  readonly lastRunStatus?: SessionRunStatus;
  readonly runs: readonly SessionRun[];
}

/** Persisted JSON envelope. Versioned so future shape changes can migrate. */
interface StoredEnvelope {
  readonly version: 1;
  readonly sessions: readonly SessionRecord[];
}

const CURRENT_VERSION = 1 as const;
const TEMPFILE_MARKER = '.tmp-';

const VALID_SESSION_TYPES = new Set<SessionType>(['main', 'cron', 'channel', 'agent']);
const VALID_SESSION_STATUSES = new Set<SessionState['status']>(['active', 'idle', 'terminated']);
const VALID_RUN_STATUSES = new Set<SessionRunStatus>(['success', 'error', 'timeout']);

/** Thrown for malformed input — constructors guard the public contract. */
export class SessionStoreError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SessionStoreError';
    this.code = code;
  }
}

/** Options for {@link createSessionStore}. */
export interface SessionStoreOptions {
  /** Absolute path to the workspace root. */
  readonly workspaceRoot: string;
  /** Override the state file path (testing). Defaults to `.claws/sessions.json`. */
  readonly stateFile?: string;
}

/** Public API the store exposes to routes. */
export interface SessionStore {
  /** Snapshot of every persisted session, keyed by id. */
  load(): Promise<Map<string, SessionRecord>>;
  /** Insert or replace a session record. Validates shape. */
  upsert(record: SessionRecord): Promise<void>;
  /** Remove a session record. Missing ids are a no-op. */
  remove(id: string): Promise<void>;
  /** Resolved absolute path of the backing file. */
  readonly filePath: string;
}

/** Factory — build a store bound to a workspace root. */
export function createSessionStore(opts: SessionStoreOptions): SessionStore {
  const filePath = join(opts.workspaceRoot, opts.stateFile ?? SESSION_STATE_FILE);

  async function readEnvelope(): Promise<StoredEnvelope> {
    try {
      const raw = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      return normalizeEnvelope(parsed);
    } catch (err) {
      if (isENOENT(err)) {
        return emptyEnvelope();
      }
      if (err instanceof SyntaxError) {
        // Corrupt store — fall back to empty so reads never 500. Operators
        // see the parse error in server logs; a subsequent write persists
        // a fresh envelope that overwrites the corruption.
        // eslint-disable-next-line no-console
        console.error(`[session-store] corrupt ${filePath}, ignoring: ${err.message}`);
        return emptyEnvelope();
      }
      /* c8 ignore next -- non-ENOENT non-SyntaxError readFile failure (EACCES etc.) propagates; covered implicitly by the Node.js contract. */
      throw err;
    }
  }

  async function writeEnvelope(env: StoredEnvelope): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const nonce = randomBytes(8).toString('hex');
    const tempPath = `${filePath}${TEMPFILE_MARKER}${process.pid}-${nonce}`;
    const body = JSON.stringify(env, null, 2);
    /* c8 ignore start -- write-error path (ENOSPC / EACCES on the tempfile) is infrastructure-level; exercised manually on platform-specific regressions. */
    try {
      await writeFile(tempPath, body, 'utf-8');
      await rename(tempPath, filePath);
    } catch (err) {
      // Best-effort sweep of the half-written tempfile. `rm` with `force`
      // tolerates ENOENT so a rename-failure after a successful write
      // still propagates the original error.
      try {
        await rm(tempPath, { force: true });
      } catch {
        // Swallow — original error below is what operators need to see.
      }
      throw err;
    }
    /* c8 ignore stop */
  }

  return {
    filePath,

    async load(): Promise<Map<string, SessionRecord>> {
      const env = await readEnvelope();
      const map = new Map<string, SessionRecord>();
      for (const rec of env.sessions) map.set(rec.state.id, rec);
      return map;
    },

    async upsert(record: SessionRecord): Promise<void> {
      validateRecord(record);
      const env = await readEnvelope();
      const kept = env.sessions.filter((r) => r.state.id !== record.state.id);
      kept.push(record);
      await writeEnvelope({ ...env, sessions: kept });
    },

    async remove(id: string): Promise<void> {
      const env = await readEnvelope();
      if (!env.sessions.some((r) => r.state.id === id)) return;
      const kept = env.sessions.filter((r) => r.state.id !== id);
      await writeEnvelope({ ...env, sessions: kept });
    },
  };
}

function emptyEnvelope(): StoredEnvelope {
  return { version: CURRENT_VERSION, sessions: [] };
}

function normalizeEnvelope(parsed: unknown): StoredEnvelope {
  if (typeof parsed !== 'object' || parsed === null) return emptyEnvelope();
  const obj = parsed as Record<string, unknown>;
  const rawSessions = Array.isArray(obj['sessions']) ? obj['sessions'] : [];
  const normalized: SessionRecord[] = [];
  for (const raw of rawSessions) {
    const rec = normalizeRecord(raw);
    if (rec !== null) normalized.push(rec);
  }
  return { version: CURRENT_VERSION, sessions: normalized };
}

function normalizeRecord(raw: unknown): SessionRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const state = normalizeState(obj['state']);
  if (state === null) return null;
  const config = normalizeConfig(obj['config'], state.type);
  if (config === null) return null;

  const runCountRaw = obj['runCount'];
  const runCount =
    typeof runCountRaw === 'number' && Number.isFinite(runCountRaw) && runCountRaw >= 0
      ? Math.floor(runCountRaw)
      : 0;

  const runs = Array.isArray(obj['runs']) ? obj['runs'] : [];
  const normalizedRuns: SessionRun[] = [];
  for (const r of runs) {
    const run = normalizeRun(r);
    if (run !== null) normalizedRuns.push(run);
  }

  const record: Mutable<SessionRecord> = { state, config, runCount, runs: normalizedRuns };
  if (typeof obj['lastRunAt'] === 'string') record.lastRunAt = obj['lastRunAt'];
  if (
    typeof obj['lastRunStatus'] === 'string' &&
    VALID_RUN_STATUSES.has(obj['lastRunStatus'] as SessionRunStatus)
  ) {
    record.lastRunStatus = obj['lastRunStatus'] as SessionRunStatus;
  }
  return record;
}

function normalizeState(raw: unknown): SessionState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const id = obj['id'];
  const type = obj['type'];
  const status = obj['status'];
  const createdAt = obj['createdAt'];
  const lastActiveAt = obj['lastActiveAt'];
  if (typeof id !== 'string' || id.length === 0) return null;
  if (typeof type !== 'string' || !VALID_SESSION_TYPES.has(type as SessionType)) return null;
  if (
    typeof status !== 'string' ||
    !VALID_SESSION_STATUSES.has(status as SessionState['status'])
  ) {
    return null;
  }
  if (typeof createdAt !== 'string' || typeof lastActiveAt !== 'string') return null;
  const state: Mutable<SessionState> = {
    id,
    type: type as SessionType,
    status: status as SessionState['status'],
    createdAt,
    lastActiveAt,
  };
  const metadata = obj['metadata'];
  if (typeof metadata === 'object' && metadata !== null) {
    state.metadata = metadata as Record<string, unknown>;
  }
  return state;
}

function normalizeConfig(raw: unknown, expectedType: SessionType): SessionConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (obj['type'] !== expectedType) return null;
  switch (expectedType) {
    case 'main':
      return { type: 'main' };
    case 'cron': {
      const schedule = obj['schedule'];
      if (typeof schedule !== 'string') return null;
      const allowRaw = obj['toolAllowlist'];
      const allow = Array.isArray(allowRaw)
        ? allowRaw.filter((t): t is string => typeof t === 'string')
        : undefined;
      const cfg: { type: 'cron'; schedule: string; toolAllowlist?: readonly string[] } = {
        type: 'cron',
        schedule,
      };
      if (allow !== undefined) cfg.toolAllowlist = allow;
      return cfg;
    }
    case 'channel': {
      const channel = obj['channel'];
      if (typeof channel !== 'string') return null;
      return { type: 'channel', channel };
    }
    case 'agent': {
      const delegator = obj['delegatorSessionId'];
      if (typeof delegator !== 'string') return null;
      const revokedRaw = obj['revokedTools'];
      const revoked = Array.isArray(revokedRaw)
        ? revokedRaw.filter((t): t is string => typeof t === 'string')
        : undefined;
      const cfg: {
        type: 'agent';
        delegatorSessionId: string;
        revokedTools?: readonly string[];
      } = { type: 'agent', delegatorSessionId: delegator };
      if (revoked !== undefined) cfg.revokedTools = revoked;
      return cfg;
    }
  }
}

function normalizeRun(raw: unknown): SessionRun | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const id = obj['id'];
  const status = obj['status'];
  const startedAt = obj['startedAt'];
  if (typeof id !== 'string' || id.length === 0) return null;
  if (typeof status !== 'string' || !VALID_RUN_STATUSES.has(status as SessionRunStatus)) {
    return null;
  }
  if (typeof startedAt !== 'string') return null;
  const run: Mutable<SessionRun> = {
    id,
    status: status as SessionRunStatus,
    startedAt,
  };
  if (typeof obj['durationMs'] === 'number') run.durationMs = obj['durationMs'];
  if (typeof obj['toolCalls'] === 'number') run.toolCalls = obj['toolCalls'];
  if (typeof obj['auditEvents'] === 'number') run.auditEvents = obj['auditEvents'];
  if (typeof obj['error'] === 'string') run.error = obj['error'];
  return run;
}

function validateRecord(record: SessionRecord): void {
  const { state, config } = record;
  if (typeof state.id !== 'string' || state.id.length === 0) {
    throw new SessionStoreError('session id must be a non-empty string', 'SESSION_INVALID_ID');
  }
  if (!VALID_SESSION_TYPES.has(state.type)) {
    throw new SessionStoreError(`invalid session type: ${state.type}`, 'SESSION_INVALID_TYPE');
  }
  if (!VALID_SESSION_STATUSES.has(state.status)) {
    throw new SessionStoreError(
      `invalid session status: ${state.status}`,
      'SESSION_INVALID_STATUS',
    );
  }
  if (config.type !== state.type) {
    throw new SessionStoreError(
      `config.type=${config.type} does not match state.type=${state.type}`,
      'SESSION_TYPE_MISMATCH',
    );
  }
}

function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}

type Mutable<T> = { -readonly [P in keyof T]: T[P] };
