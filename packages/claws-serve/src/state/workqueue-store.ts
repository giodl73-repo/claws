/**
 * WorkQueue runtime-state persistent store (P-280).
 *
 * Backs `GET /api/workqueue` with durable runtime state at
 * `<workspaceRoot>/.claws/workqueue.json`. HEARTBEAT.md is authoritative
 * for scheduled task definitions; this store tracks only the runtime layer:
 * status transitions, completion timestamps, user-/agent-/fleet-authored
 * tasks that have no HEARTBEAT anchor.
 *
 * Writes are atomic — temp file (`.tmp-<pid>-<hex>`) + `fs.rename` — so a
 * crash mid-write never corrupts the committed state. Loads tolerate a
 * missing file (fresh workspace) and malformed JSON (logged, treated as
 * empty so the server still responds).
 *
 * The store is intentionally NOT a business-logic module — merging with
 * HEARTBEAT.md happens in `claws-sdk/src/workspace/workqueue-builder.ts`
 * via {@link buildWorkQueue}. This file owns I/O and state-transition
 * validation only.
 *
 * @module claws-serve/state/workqueue-store
 */

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { WorkQueueRuntimeState } from '../../../claws-sdk/src/workspace/index.js';

/** Relative location inside the workspace where runtime state persists. */
export const WORKQUEUE_STATE_FILE = '.claws/workqueue.json';

/** Persisted JSON envelope. Versioned so future shape changes can migrate. */
interface StoredEnvelope {
  readonly version: 1;
  /** Hash of the HEARTBEAT.md content used to seed the last cleanup sweep. */
  readonly heartbeatAnchor: string;
  readonly tasks: readonly WorkQueueRuntimeState[];
}

const CURRENT_VERSION = 1 as const;
const TEMPFILE_MARKER = '.tmp-';

/** Allowed runtime statuses accepted on writes. */
const VALID_STATUSES = new Set<WorkQueueRuntimeState['status']>([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'scheduled',
]);

const VALID_SOURCES = new Set<WorkQueueRuntimeState['source']>([
  'heartbeat',
  'user',
  'agent',
  'fleet',
]);

/**
 * Status-transition table. Keys are the current status; values are the
 * statuses a caller is allowed to move *to*. Terminal statuses (completed,
 * failed) cannot be transitioned out of — the task must be deleted and
 * re-created if reopened.
 */
const TRANSITIONS: Record<WorkQueueRuntimeState['status'], ReadonlySet<WorkQueueRuntimeState['status']>> = {
  scheduled: new Set(['pending', 'in_progress', 'failed']),
  pending: new Set(['in_progress', 'completed', 'failed']),
  in_progress: new Set(['completed', 'failed', 'pending']),
  completed: new Set(),
  failed: new Set(),
};

/** Thrown for invalid inputs or rejected state transitions. */
export class WorkQueueStoreError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'WorkQueueStoreError';
    this.code = code;
  }
}

/** Options for {@link createWorkQueueStore}. */
export interface WorkQueueStoreOptions {
  /** Absolute path to the workspace root. */
  readonly workspaceRoot: string;
  /** Override the state file path (testing). Defaults to `.claws/workqueue.json`. */
  readonly stateFile?: string;
}

/** Public API the store exposes to routes. */
export interface WorkQueueStore {
  /** Snapshot of every persisted runtime task, keyed by id. */
  load(): Promise<Map<string, WorkQueueRuntimeState>>;
  /** Insert or replace a task's runtime state. Validates status transition. */
  upsert(state: WorkQueueRuntimeState): Promise<void>;
  /** Delete a task from the store. Missing ids are a no-op. */
  remove(id: string): Promise<void>;
  /**
   * Drop any HEARTBEAT-anchored task whose id is absent from `validIds` —
   * i.e. the heading was renamed or deleted. Returns the number of removed
   * entries. Runtime-sourced (user/agent/fleet) tasks are never swept.
   */
  cleanupStale(validIds: ReadonlySet<string>): Promise<number>;
  /** Resolved absolute path of the backing file. */
  readonly filePath: string;
}

/**
 * Per-store async mutex registry. Keyed by resolved `filePath` so two stores
 * bound to the SAME file (test-harness plus live route, or two imports
 * building independent store instances against the same workspace) serialise
 * their read-modify-write cycles and never interleave rename()s.
 *
 * The value is a promise chain: every write awaits the previous chain tip
 * before running, then replaces the tip with its own completion. Release
 * in `finally` is guaranteed — a throwing task still unblocks the next
 * waiter (otherwise a single write failure would deadlock the store).
 *
 * This is an in-process lock only. Cross-process concurrency is
 * out-of-scope for claws-serve (single serve process per workspace); the
 * temp+rename write still protects against crash-mid-rename across
 * processes.
 */
const LOCKS = new Map<string, Promise<void>>();

async function withFileLock<T>(filePath: string, task: () => Promise<T>): Promise<T> {
  const prev = LOCKS.get(filePath) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Chain: each waiter blocks on the previous tip AND installs itself as
  // the new tip before awaiting, so concurrent callers queue FIFO behind
  // whoever got there first. The map entry persists — entries are one
  // resolved promise per distinct workqueue.json path (bounded by fleet
  // size, never a GC concern).
  const chained = prev.then(() => next);
  LOCKS.set(filePath, chained);
  try {
    await prev;
    return await task();
  } finally {
    release();
  }
}

/** Factory — build a store bound to a workspace root. */
export function createWorkQueueStore(opts: WorkQueueStoreOptions): WorkQueueStore {
  const filePath = join(opts.workspaceRoot, opts.stateFile ?? WORKQUEUE_STATE_FILE);

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
        console.error(`[workqueue-store] corrupt ${filePath}, ignoring: ${err.message}`);
        return emptyEnvelope();
      }
      throw err;
    }
  }

  async function writeEnvelope(env: StoredEnvelope): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const nonce = randomBytes(8).toString('hex');
    const tempPath = `${filePath}${TEMPFILE_MARKER}${process.pid}-${nonce}`;
    const body = JSON.stringify(env, null, 2);
    try {
      await writeFile(tempPath, body, 'utf-8');
      await rename(tempPath, filePath);
    } catch (err) {
      // Best-effort sweep of the half-written tempfile. `rm` with `force`
      // tolerates ENOENT so a rename-failure after a successful write
      // still propagates the original error.
      try {
        await rm(tempPath, { force: true });
      } /* c8 ignore start -- tempfile cleanup is best-effort; a failure here is strictly less important than the original write error. */ catch {
        // Swallow — original error below is what operators need to see.
      }
      /* c8 ignore stop */
      throw err;
    }
  }

  return {
    filePath,

    async load(): Promise<Map<string, WorkQueueRuntimeState>> {
      const env = await readEnvelope();
      const map = new Map<string, WorkQueueRuntimeState>();
      for (const task of env.tasks) map.set(task.id, task);
      return map;
    },

    async upsert(state: WorkQueueRuntimeState): Promise<void> {
      // Validate OUTSIDE the lock — invalid inputs fail fast without
      // blocking a concurrent well-formed write waiting for the file.
      validateState(state);
      await withFileLock(filePath, async () => {
        const env = await readEnvelope();
        const existing = env.tasks.find((t) => t.id === state.id);
        if (existing !== undefined) {
          const allowed = TRANSITIONS[existing.status];
          if (existing.status !== state.status && !allowed.has(state.status)) {
            throw new WorkQueueStoreError(
              `Invalid status transition ${existing.status} → ${state.status} for task ${state.id}`,
              'WORKQUEUE_INVALID_TRANSITION',
            );
          }
        }
        const tasks = env.tasks.filter((t) => t.id !== state.id);
        tasks.push(state);
        await writeEnvelope({ ...env, tasks });
      });
    },

    async remove(id: string): Promise<void> {
      await withFileLock(filePath, async () => {
        const env = await readEnvelope();
        if (!env.tasks.some((t) => t.id === id)) return;
        const tasks = env.tasks.filter((t) => t.id !== id);
        await writeEnvelope({ ...env, tasks });
      });
    },

    async cleanupStale(validIds: ReadonlySet<string>): Promise<number> {
      return withFileLock(filePath, async () => {
        const env = await readEnvelope();
        const kept: WorkQueueRuntimeState[] = [];
        let removed = 0;
        for (const task of env.tasks) {
          if (task.source !== 'heartbeat' || validIds.has(task.id)) {
            kept.push(task);
          } else {
            removed += 1;
          }
        }
        if (removed === 0) return 0;
        await writeEnvelope({ ...env, tasks: kept });
        return removed;
      });
    },
  };
}

function emptyEnvelope(): StoredEnvelope {
  return { version: CURRENT_VERSION, heartbeatAnchor: '', tasks: [] };
}

function normalizeEnvelope(parsed: unknown): StoredEnvelope {
  if (typeof parsed !== 'object' || parsed === null) return emptyEnvelope();
  const obj = parsed as Record<string, unknown>;
  const tasks = Array.isArray(obj['tasks']) ? obj['tasks'] : [];
  const normalized: WorkQueueRuntimeState[] = [];
  for (const raw of tasks) {
    const task = normalizeTask(raw);
    if (task !== null) normalized.push(task);
  }
  return {
    version: CURRENT_VERSION,
    heartbeatAnchor: typeof obj['heartbeatAnchor'] === 'string' ? obj['heartbeatAnchor'] : '',
    tasks: normalized,
  };
}

function normalizeTask(raw: unknown): WorkQueueRuntimeState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const id = obj['id'];
  const status = obj['status'];
  const source = obj['source'];
  if (typeof id !== 'string' || id.length === 0) return null;
  if (typeof status !== 'string' || !VALID_STATUSES.has(status as WorkQueueRuntimeState['status'])) {
    return null;
  }
  if (typeof source !== 'string' || !VALID_SOURCES.has(source as WorkQueueRuntimeState['source'])) {
    return null;
  }
  const task: Mutable<WorkQueueRuntimeState> = {
    id,
    status: status as WorkQueueRuntimeState['status'],
    source: source as WorkQueueRuntimeState['source'],
  };
  if (typeof obj['title'] === 'string') task.title = obj['title'];
  if (typeof obj['priority'] === 'number') task.priority = obj['priority'];
  if (typeof obj['dueAt'] === 'string') task.dueAt = obj['dueAt'];
  if (typeof obj['assignedBy'] === 'string') task.assignedBy = obj['assignedBy'];
  if (typeof obj['assignedAt'] === 'string') task.assignedAt = obj['assignedAt'];
  if (typeof obj['completedAt'] === 'string') task.completedAt = obj['completedAt'];
  if (Array.isArray(obj['requiredTools'])) {
    const tools = obj['requiredTools'].filter((t): t is string => typeof t === 'string');
    task.requiredTools = tools;
  }
  return task;
}

function validateState(state: WorkQueueRuntimeState): void {
  if (typeof state.id !== 'string' || state.id.length === 0) {
    throw new WorkQueueStoreError('task id must be a non-empty string', 'WORKQUEUE_INVALID_ID');
  }
  if (!VALID_STATUSES.has(state.status)) {
    throw new WorkQueueStoreError(`invalid status: ${state.status}`, 'WORKQUEUE_INVALID_STATUS');
  }
  if (!VALID_SOURCES.has(state.source)) {
    throw new WorkQueueStoreError(`invalid source: ${state.source}`, 'WORKQUEUE_INVALID_SOURCE');
  }
}

function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}

type Mutable<T> = { -readonly [P in keyof T]: T[P] };
