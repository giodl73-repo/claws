/**
 * @bic/openclaw-snap/refs/inMemoryRefStore — RefStore for tests.
 *
 * State lives in two Maps. Same semantics as `workspaceRefStore` minus
 * the file IO. `setHead` automatically rolls the prior HEAD into history
 * (newest-first) and clears STAGE when promoting a staged id.
 *
 * @module @bic/openclaw-snap/refs/inMemoryRefStore
 */

import type { RefStore, SnapshotId, WorkspaceId } from '../types.js';

interface RefState {
  HEAD: SnapshotId | null;
  STAGE: SnapshotId | null;
  history: SnapshotId[];
}

export interface InMemoryRefStoreOptions {
  readonly historyLimit?: number;
}

export function inMemoryRefStore(opts: InMemoryRefStoreOptions = {}): RefStore {
  const byWorkspace = new Map<WorkspaceId, RefState>();
  const historyLimit = opts.historyLimit ?? 100;

  function getState(workspace: WorkspaceId): RefState {
    let s = byWorkspace.get(workspace);
    if (s === undefined) {
      s = { HEAD: null, STAGE: null, history: [] };
      byWorkspace.set(workspace, s);
    }
    return s;
  }

  return {
    async getHead(workspace) {
      return getState(workspace).HEAD;
    },
    async setHead(workspace, id) {
      const s = getState(workspace);
      if (s.HEAD !== null && s.HEAD !== id) {
        s.history = [s.HEAD, ...s.history].slice(0, historyLimit);
      }
      s.HEAD = id;
      if (s.STAGE === id) s.STAGE = null;
    },
    async getStage(workspace) {
      return getState(workspace).STAGE;
    },
    async setStage(workspace, id) {
      getState(workspace).STAGE = id;
    },
    async history(workspace, limit) {
      const s = getState(workspace);
      const cap = limit ?? s.history.length;
      return s.history.slice(0, cap);
    },
  };
}
