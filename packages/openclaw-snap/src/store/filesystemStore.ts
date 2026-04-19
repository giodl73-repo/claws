/**
 * @bic/openclaw-snap/store/filesystemStore — reference SnapshotStore backend
 * for single-node deployments.
 *
 * Layout:
 *   {root}/snapshots/{id}/files.json     — serialized file map
 *   {root}/snapshots/{id}/meta.json      — createdAt/author/status/parentId
 *   {root}/current.json                  — { currentId: string | null }
 *
 * All writes are through `writeFile` + `rename` to an intermediate temp to
 * avoid torn writes under concurrent readers. Promote/rollback update
 * `current.json` atomically after the new-current meta has been written.
 *
 * @module @bic/openclaw-snap/store/filesystemStore
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseOcPath } from '@bic/openclaw-workspace/path';
import type {
  ListOpts,
  PromoteContext,
  ResolveResult,
  Snapshot,
  SnapshotMeta,
  SnapshotStatus,
  SnapshotStore,
} from '../types.js';
import { buildChunk } from './inMemoryStore.js';

interface FsOpts {
  readonly root: string;
}

interface MetaJson {
  readonly createdAt: string;
  readonly author: string;
  readonly status: SnapshotStatus;
  readonly parentId?: string;
}

interface CurrentJson {
  readonly currentId: string | null;
}

async function writeAtomic(target: string, data: string): Promise<void> {
  const tmp = `${target}.tmp-${String(process.pid)}-${String(Date.now())}`;
  await fs.writeFile(tmp, data, 'utf8');
  await fs.rename(tmp, target);
}

async function readJson<T>(p: string): Promise<T | null> {
  try {
    const text = await fs.readFile(p, 'utf8');
    return JSON.parse(text) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export function filesystemStore(opts: FsOpts): SnapshotStore {
  const snapshotsDir = path.join(opts.root, 'snapshots');
  const currentPath = path.join(opts.root, 'current.json');

  async function ensureDirs(): Promise<void> {
    await fs.mkdir(snapshotsDir, { recursive: true });
  }

  function snapDir(id: string): string {
    return path.join(snapshotsDir, id);
  }

  async function readSnapshot(id: string): Promise<Snapshot | null> {
    const dir = snapDir(id);
    const meta = await readJson<MetaJson>(path.join(dir, 'meta.json'));
    if (meta === null) return null;
    const files = await readJson<Record<string, string>>(path.join(dir, 'files.json'));
    if (files === null) return null;
    return {
      id,
      files,
      createdAt: meta.createdAt,
      author: meta.author,
      status: meta.status,
      ...(meta.parentId !== undefined ? { parentId: meta.parentId } : {}),
    };
  }

  async function writeSnapshot(snap: Snapshot): Promise<void> {
    const dir = snapDir(snap.id);
    await fs.mkdir(dir, { recursive: true });
    await writeAtomic(path.join(dir, 'files.json'), JSON.stringify(snap.files));
    const meta: MetaJson = {
      createdAt: snap.createdAt,
      author: snap.author,
      status: snap.status,
      ...(snap.parentId !== undefined ? { parentId: snap.parentId } : {}),
    };
    await writeAtomic(path.join(dir, 'meta.json'), JSON.stringify(meta));
  }

  async function updateStatus(id: string, status: SnapshotStatus): Promise<void> {
    const snap = await readSnapshot(id);
    if (snap === null) return;
    await writeSnapshot({ ...snap, status });
  }

  async function readCurrentId(): Promise<string | null> {
    const data = await readJson<CurrentJson>(currentPath);
    return data?.currentId ?? null;
  }

  async function writeCurrentId(currentId: string | null): Promise<void> {
    await writeAtomic(currentPath, JSON.stringify({ currentId }));
  }

  return {
    async put(snapshot: Snapshot): Promise<void> {
      await ensureDirs();
      await writeSnapshot(snapshot);
    },

    async get(id: string): Promise<Snapshot | null> {
      return readSnapshot(id);
    },

    async list(opts: ListOpts = {}): Promise<readonly SnapshotMeta[]> {
      await ensureDirs();
      const entries = await fs.readdir(snapshotsDir, { withFileTypes: true });
      const metas: SnapshotMeta[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const meta = await readJson<MetaJson>(path.join(snapshotsDir, entry.name, 'meta.json'));
        if (meta === null) continue;
        if (opts.status !== undefined && meta.status !== opts.status) continue;
        metas.push({
          id: entry.name,
          createdAt: meta.createdAt,
          author: meta.author,
          status: meta.status,
        });
      }
      metas.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
      const limit = opts.limit ?? metas.length;
      return metas.slice(0, limit);
    },

    async promote(id: string, _ctx: PromoteContext): Promise<{ readonly promotedAt: string }> {
      await ensureDirs();
      const snap = await readSnapshot(id);
      if (snap === null) {
        throw new Error(`Snapshot not found: ${id}`);
      }
      const priorId = await readCurrentId();
      if (priorId !== null && priorId !== id) {
        await updateStatus(priorId, 'superseded');
      }
      await writeSnapshot({ ...snap, status: 'current' });
      await writeCurrentId(id);
      return { promotedAt: new Date().toISOString() };
    },

    async rollback(toId: string, ctx: PromoteContext): Promise<{ readonly restoredAt: string }> {
      const { promotedAt } = await this.promote(toId, ctx);
      return { restoredAt: promotedAt };
    },

    async current(): Promise<Snapshot | null> {
      const id = await readCurrentId();
      if (id === null) return null;
      return readSnapshot(id);
    },

    async resolveOcPath(uri: string, id?: string): Promise<ResolveResult | null> {
      const parsed = parseOcPath(uri);
      const targetId = id ?? (await readCurrentId());
      if (targetId === null) return null;
      const snap = await readSnapshot(targetId);
      if (snap === null) return null;
      const content = snap.files[parsed.file];
      if (content === undefined) return null;
      return { snapshotId: snap.id, content, chunk: buildChunk(parsed) };
    },
  };
}
