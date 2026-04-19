/**
 * @bic/openclaw-snap/store/inMemoryStore — reference SnapshotStore backend
 * for tests and single-process deploys.
 *
 * All state lives in two Maps: `byId` and `currentId`. Promote/rollback
 * swap the `current` pointer atomically; the prior `current` is moved to
 * `superseded` in the same tick. Nothing is ever deleted.
 *
 * @module @bic/openclaw-snap/store/inMemoryStore
 */

import { parseOcPath, type OcPath } from '@bic/openclaw-workspace/path';
import type {
  ListOpts,
  PromoteContext,
  ResolveResult,
  Snapshot,
  SnapshotMeta,
  SnapshotStore,
} from '../types.js';

interface InMemoryState {
  byId: Map<string, Snapshot>;
  currentId: string | null;
}

function cloneSnapshot(snap: Snapshot, patch: Partial<Snapshot>): Snapshot {
  return { ...snap, ...patch } as Snapshot;
}

export type ResolveChunk = NonNullable<ResolveResult['chunk']>;

export function buildChunk(parsed: OcPath): ResolveChunk {
  const chunk: { file: string; section?: string; item?: string; field?: string } = { file: parsed.file };
  if (parsed.section !== undefined) chunk.section = parsed.section;
  if (parsed.item !== undefined) chunk.item = parsed.item;
  if (parsed.field !== undefined) chunk.field = parsed.field;
  return chunk;
}

export function inMemoryStore(): SnapshotStore {
  const state: InMemoryState = { byId: new Map(), currentId: null };

  return {
    async put(snapshot: Snapshot): Promise<void> {
      state.byId.set(snapshot.id, snapshot);
    },

    async get(id: string): Promise<Snapshot | null> {
      return state.byId.get(id) ?? null;
    },

    async list(opts: ListOpts = {}): Promise<readonly SnapshotMeta[]> {
      const all: SnapshotMeta[] = [];
      for (const snap of state.byId.values()) {
        if (opts.status !== undefined && snap.status !== opts.status) continue;
        all.push({
          id: snap.id,
          createdAt: snap.createdAt,
          author: snap.author,
          status: snap.status,
        });
      }
      all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
      const limit = opts.limit ?? all.length;
      return all.slice(0, limit);
    },

    async promote(id: string, _ctx: PromoteContext): Promise<{ readonly promotedAt: string }> {
      const snap = state.byId.get(id);
      if (snap === undefined) {
        throw new Error(`Snapshot not found: ${id}`);
      }
      const promotedAt = new Date().toISOString();
      const priorCurrent = state.currentId;
      if (priorCurrent !== null && priorCurrent !== id) {
        const prior = state.byId.get(priorCurrent) as Snapshot;
        state.byId.set(priorCurrent, cloneSnapshot(prior, { status: 'superseded' }));
      }
      state.byId.set(id, cloneSnapshot(snap, { status: 'current' }));
      state.currentId = id;
      return { promotedAt };
    },

    async rollback(toId: string, ctx: PromoteContext): Promise<{ readonly restoredAt: string }> {
      const { promotedAt } = await this.promote(toId, ctx);
      return { restoredAt: promotedAt };
    },

    async current(): Promise<Snapshot | null> {
      if (state.currentId === null) return null;
      return state.byId.get(state.currentId) as Snapshot;
    },

    async resolveOcPath(uri: string, id?: string): Promise<ResolveResult | null> {
      const parsed = parseOcPath(uri);
      const targetId = id ?? state.currentId;
      if (targetId === null) return null;
      const snap = state.byId.get(targetId);
      if (snap === undefined) return null;
      const content = snap.files[parsed.file];
      if (content === undefined) return null;
      return { snapshotId: snap.id, content, chunk: buildChunk(parsed) };
    },
  };
}
