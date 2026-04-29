/**
 * @bic/openclaw-snap/store/inMemoryStore — in-process v2 SnapshotStore.
 *
 * Backed by two Maps:
 *   - `workspaces`  WorkspaceId → live content (mutated by tests/callers)
 *   - `bundles`     SnapshotId  → immutable captured bytes
 *
 * `capture(ws)` snapshots the current `workspaces[ws]` content, computes
 * a deterministic id via `@bic/openclaw-workspace/canonicalize`, and
 * stashes the byte-identical bundle in `bundles`. Capture is idempotent
 * by id — capturing the same content twice returns the same id and does
 * not duplicate storage.
 *
 * @module @bic/openclaw-snap/store/inMemoryStore
 */

import type {
  ListOpts,
  Snapshot,
  SnapshotId,
  SnapshotInternalPath,
  SnapshotStore,
  WorkspaceId,
} from '../types.js';
import { SnapshotErrorImpl } from '../types.js';
import { computeSnapshotId } from '../canonical.js';

const TEXT_DECODER = new TextDecoder('utf-8');
const TEXT_ENCODER = new TextEncoder();

interface BundleEntry {
  readonly id: SnapshotId;
  readonly workspace: WorkspaceId;
  readonly capturedAt: string;
  readonly files: ReadonlyMap<SnapshotInternalPath, Uint8Array>;
}

export interface InMemoryStoreOptions {
  /**
   * Initial workspace content. Subsequent edits via `setWorkspace` /
   * `mutateFile` mutate this in place.
   */
  readonly workspaces?: Readonly<Record<WorkspaceId, Readonly<Record<SnapshotInternalPath, string | Uint8Array>>>>;
  /** Override `Date.now()` for deterministic tests. */
  readonly now?: () => Date;
}

/**
 * In-memory `SnapshotStore` impl. Test ergonomics:
 *
 *   const store = inMemoryStore({ workspaces: { ws: { 'a.txt': 'hi' } } });
 *   const id = await store.capture('ws');
 *   await store.read(id, 'a.txt'); // → bytes of 'hi'
 *
 * The returned object is the `SnapshotStore` interface plus a `setWorkspace`
 * extension method for evolving content between captures.
 */
export interface InMemorySnapshotStore extends SnapshotStore {
  /** Replace workspace content wholesale. */
  setWorkspace(ws: WorkspaceId, files: Readonly<Record<SnapshotInternalPath, string | Uint8Array>>): void;
  /** Set or overwrite a single file inside a workspace. */
  setFile(ws: WorkspaceId, path: SnapshotInternalPath, content: string | Uint8Array): void;
  /** Remove a file from a workspace. */
  removeFile(ws: WorkspaceId, path: SnapshotInternalPath): void;
}

function asBytes(content: string | Uint8Array): Uint8Array {
  return typeof content === 'string' ? TEXT_ENCODER.encode(content) : content;
}

export function inMemoryStore(opts: InMemoryStoreOptions = {}): InMemorySnapshotStore {
  const workspaces = new Map<WorkspaceId, Map<SnapshotInternalPath, Uint8Array>>();
  const bundles = new Map<SnapshotId, BundleEntry>();
  const byWorkspace = new Map<WorkspaceId, SnapshotId[]>();
  const now = opts.now ?? (() => new Date());

  if (opts.workspaces !== undefined) {
    for (const [ws, files] of Object.entries(opts.workspaces)) {
      const m = new Map<SnapshotInternalPath, Uint8Array>();
      for (const [p, c] of Object.entries(files)) m.set(p, asBytes(c));
      workspaces.set(ws, m);
    }
  }

  return {
    setWorkspace(ws, files) {
      const m = new Map<SnapshotInternalPath, Uint8Array>();
      for (const [p, c] of Object.entries(files)) m.set(p, asBytes(c));
      workspaces.set(ws, m);
    },
    setFile(ws, path, content) {
      let m = workspaces.get(ws);
      if (m === undefined) {
        m = new Map();
        workspaces.set(ws, m);
      }
      m.set(path, asBytes(content));
    },
    removeFile(ws, path) {
      workspaces.get(ws)?.delete(path);
    },

    async capture(workspace) {
      const live = workspaces.get(workspace);
      if (live === undefined) {
        throw new SnapshotErrorImpl(
          'SNAP_CAPTURE_FAILED',
          `No content registered for workspace ${workspace}`,
        );
      }
      const fileMap: Record<string, string> = {};
      for (const [p, bytes] of live) fileMap[p] = TEXT_DECODER.decode(bytes);
      const id = computeSnapshotId(fileMap);
      if (!bundles.has(id)) {
        const frozen = new Map<SnapshotInternalPath, Uint8Array>();
        for (const [p, b] of live) frozen.set(p, new Uint8Array(b));
        bundles.set(id, {
          id,
          workspace,
          capturedAt: now().toISOString(),
          files: frozen,
        });
        const arr = byWorkspace.get(workspace) ?? [];
        arr.unshift(id);
        byWorkspace.set(workspace, arr);
      }
      return id;
    },

    async read(snap, path) {
      const bundle = bundles.get(snap);
      if (bundle === undefined) {
        throw new SnapshotErrorImpl('SNAP_NOT_FOUND', `Snapshot not found: ${snap}`);
      }
      const bytes = bundle.files.get(path);
      if (bytes === undefined) {
        throw new SnapshotErrorImpl(
          'SNAP_INVALID_PATH',
          `Path not in snapshot: ${path} (snap=${snap})`,
        );
      }
      return new Uint8Array(bytes);
    },

    async list(workspace, opts = {}) {
      const ids = byWorkspace.get(workspace) ?? [];
      const limit = opts.limit ?? ids.length;
      const out: Snapshot[] = [];
      for (const id of ids.slice(0, limit)) {
        const b = bundles.get(id);
        if (b === undefined) continue;
        out.push({ id: b.id, workspace: b.workspace, capturedAt: b.capturedAt });
      }
      return out;
    },
  };
}
