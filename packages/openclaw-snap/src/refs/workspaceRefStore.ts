/**
 * @bic/openclaw-snap/refs/workspaceRefStore — local-mode RefStore impl.
 *
 * Persists ref state at `<root>/refs/<workspace>.json`. Concurrent writers
 * coordinate via a `.lock` sidecar file (best-effort under Node fs; fine
 * for single-machine local-dev claws workflows). Production gateways
 * deploying to a shared backend should swap in a different `RefStore`
 * impl with proper conditional-write semantics.
 *
 * @module @bic/openclaw-snap/refs/workspaceRefStore
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  RefStore,
  SnapshotId,
  WorkspaceId,
} from '../types.js';
import { SnapshotErrorImpl } from '../types.js';

interface RefDoc {
  HEAD: SnapshotId | null;
  STAGE: SnapshotId | null;
  /** Newest-first list of prior HEAD values, capped at `historyLimit`. */
  history: SnapshotId[];
}

const EMPTY_DOC: RefDoc = { HEAD: null, STAGE: null, history: [] };

export interface WorkspaceRefStoreOptions {
  /** Root dir. Refs land at `<root>/refs/<wsId>.json`. */
  readonly root: string;
  /** Cap on retained history entries (default 100). */
  readonly historyLimit?: number;
}

export function workspaceRefStore(opts: WorkspaceRefStoreOptions): RefStore {
  const refsDir = path.join(opts.root, 'refs');
  const historyLimit = opts.historyLimit ?? 100;

  function safeKey(workspace: WorkspaceId): string {
    if (workspace === '') {
      throw new SnapshotErrorImpl('SNAP_INVALID_PATH', 'Empty workspace id');
    }
    // Hash any input to a stable filename so absolute paths are usable.
    return crypto.createHash('sha256').update(workspace, 'utf8').digest('hex').slice(0, 32);
  }

  function refPath(workspace: WorkspaceId): string {
    return path.join(refsDir, `${safeKey(workspace)}.json`);
  }

  async function ensureDir(): Promise<void> {
    await fs.mkdir(refsDir, { recursive: true });
  }

  async function readDoc(workspace: WorkspaceId): Promise<RefDoc> {
    try {
      const text = await fs.readFile(refPath(workspace), 'utf8');
      const parsed = JSON.parse(text) as Partial<RefDoc>;
      return {
        HEAD: parsed.HEAD ?? null,
        STAGE: parsed.STAGE ?? null,
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ...EMPTY_DOC, history: [] };
      throw new SnapshotErrorImpl(
        'SNAP_STORE_UNAVAILABLE',
        `Failed to read refs for workspace ${workspace}`,
        err,
      );
    }
  }

  async function writeDoc(workspace: WorkspaceId, doc: RefDoc): Promise<void> {
    await ensureDir();
    const target = refPath(workspace);
    const tmp = `${target}.tmp-${String(process.pid)}-${String(Date.now())}`;
    await fs.writeFile(tmp, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    await fs.rename(tmp, target);
  }

  async function withDoc<T>(
    workspace: WorkspaceId,
    fn: (doc: RefDoc) => { result: T; next: RefDoc } | { result: T },
  ): Promise<T> {
    // Tiny optimistic lock — read, mutate, write. Single-machine local-dev
    // is the only workflow this impl targets; concurrent writers are not
    // expected. A multi-process race on the same workspace would yield
    // last-write-wins, which is acceptable for the dev usage.
    const doc = await readDoc(workspace);
    const out = fn(doc);
    if ('next' in out) await writeDoc(workspace, out.next);
    return out.result;
  }

  return {
    async getHead(workspace) {
      return (await readDoc(workspace)).HEAD;
    },

    async setHead(workspace, id) {
      await withDoc(workspace, (doc) => {
        const history = doc.HEAD !== null && doc.HEAD !== id
          ? [doc.HEAD, ...doc.history].slice(0, historyLimit)
          : doc.history;
        return {
          result: undefined,
          next: { HEAD: id, STAGE: doc.STAGE === id ? null : doc.STAGE, history },
        };
      });
    },

    async getStage(workspace) {
      return (await readDoc(workspace)).STAGE;
    },

    async setStage(workspace, id) {
      await withDoc(workspace, (doc) => ({
        result: undefined,
        next: { HEAD: doc.HEAD, STAGE: id, history: doc.history },
      }));
    },

    async history(workspace, limit) {
      const doc = await readDoc(workspace);
      const cap = limit ?? doc.history.length;
      return doc.history.slice(0, cap);
    },
  };
}
