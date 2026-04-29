/**
 * @bic/openclaw-snap/store/filesystemStore — disk-backed v2 SnapshotStore.
 *
 * Layout under `root`:
 *   {root}/bundles/{id}/manifest.json
 *   {root}/bundles/{id}/files/<snapshot-internal-path>
 *
 * `manifest.json` contains `{ id, workspace, capturedAt }` plus an
 * ordered file inventory used to reconstruct `list()` and validate
 * bundle integrity. Files are written byte-identical — no canonicalization
 * inside the bundle (canonicalization is applied to the manifest input
 * to compute the id, not to the stored bytes).
 *
 * The workspace passed to `capture()` is interpreted as a directory path:
 * the impl reads it recursively, applies the optional `ignore` filter,
 * and bundles the result.
 *
 * @module @bic/openclaw-snap/store/filesystemStore
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
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

export interface FilesystemStoreOptions {
  /** Root dir for bundle storage. Created if missing. */
  readonly root: string;
  /**
   * Predicate applied to each candidate path during `capture`. Return
   * `true` to skip. Paths are relative POSIX-style, e.g. `'src/a.ts'`.
   * Defaults to skipping `node_modules/`, `.git/`, `dist/`, and anything
   * inside the snap's own bundle dir if the workspace and store happen
   * to nest.
   */
  readonly ignore?: (relPath: SnapshotInternalPath) => boolean;
  /** Override `Date.now()` for deterministic tests. */
  readonly now?: () => Date;
}

interface ManifestJson {
  readonly id: SnapshotId;
  readonly workspace: WorkspaceId;
  readonly capturedAt: string;
  readonly files: readonly string[];
}

const DEFAULT_IGNORE = (rel: string): boolean =>
  rel === '' ||
  rel.startsWith('node_modules/') ||
  rel.startsWith('.git/') ||
  rel.startsWith('dist/') ||
  rel === 'node_modules' ||
  rel === '.git' ||
  rel === 'dist';

async function writeAtomic(target: string, data: string | Uint8Array): Promise<void> {
  const tmp = `${target}.tmp-${String(process.pid)}-${String(Date.now())}`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, target);
}

async function* walk(
  root: string,
  base: string,
  ignore: (rel: SnapshotInternalPath) => boolean,
): AsyncIterable<{ rel: string; abs: string }> {
  const entries = await fs.readdir(path.join(root, base), { withFileTypes: true });
  for (const ent of entries) {
    const rel = base === '' ? ent.name : `${base}/${ent.name}`;
    if (ignore(rel)) continue;
    const abs = path.join(root, rel);
    if (ent.isDirectory()) {
      yield* walk(root, rel, ignore);
    } else if (ent.isFile()) {
      yield { rel, abs };
    }
  }
}

export function filesystemStore(opts: FilesystemStoreOptions): SnapshotStore {
  const bundlesDir = path.join(opts.root, 'bundles');
  const ignore = opts.ignore ?? DEFAULT_IGNORE;
  const now = opts.now ?? (() => new Date());

  function bundleDir(id: SnapshotId): string {
    return path.join(bundlesDir, id);
  }

  async function ensureRoot(): Promise<void> {
    await fs.mkdir(bundlesDir, { recursive: true });
  }

  return {
    async capture(workspace) {
      try {
        await fs.access(workspace);
      } catch (err) {
        throw new SnapshotErrorImpl(
          'SNAP_CAPTURE_FAILED',
          `Workspace dir not accessible: ${workspace}`,
          err,
        );
      }
      const fileMap: Record<string, string> = {};
      const fileBytes = new Map<string, Uint8Array>();
      for await (const { rel, abs } of walk(workspace, '', ignore)) {
        const bytes = await fs.readFile(abs);
        const u8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        fileBytes.set(rel, u8);
        fileMap[rel] = TEXT_DECODER.decode(u8);
      }
      const id = computeSnapshotId(fileMap);
      const dir = bundleDir(id);
      try {
        await fs.access(path.join(dir, 'manifest.json'));
        return id;
      } catch {
        // bundle does not yet exist; write it.
      }
      await ensureRoot();
      await fs.mkdir(path.join(dir, 'files'), { recursive: true });
      const sortedFiles = [...fileBytes.keys()].sort();
      for (const rel of sortedFiles) {
        const target = path.join(dir, 'files', rel);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await writeAtomic(target, fileBytes.get(rel) as Uint8Array);
      }
      const manifest: ManifestJson = {
        id,
        workspace,
        capturedAt: now().toISOString(),
        files: sortedFiles,
      };
      await writeAtomic(
        path.join(dir, 'manifest.json'),
        JSON.stringify(manifest, null, 2) + '\n',
      );
      return id;
    },

    async read(snap, internalPath) {
      const target = path.join(bundleDir(snap), 'files', internalPath);
      try {
        const buf = await fs.readFile(target);
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          // Distinguish missing snapshot from missing file inside a snapshot.
          try {
            await fs.access(path.join(bundleDir(snap), 'manifest.json'));
            throw new SnapshotErrorImpl(
              'SNAP_INVALID_PATH',
              `Path not in snapshot: ${internalPath} (snap=${snap})`,
            );
          } catch (manifestErr) {
            if (manifestErr instanceof SnapshotErrorImpl) throw manifestErr;
            throw new SnapshotErrorImpl(
              'SNAP_NOT_FOUND',
              `Snapshot not found: ${snap}`,
              err,
            );
          }
        }
        throw new SnapshotErrorImpl(
          'SNAP_STORE_UNAVAILABLE',
          `Failed to read ${internalPath} from ${snap}`,
          err,
        );
      }
    },

    async list(workspace, listOpts: ListOpts = {}) {
      let entries: readonly string[];
      try {
        entries = await fs.readdir(bundlesDir);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw new SnapshotErrorImpl(
          'SNAP_STORE_UNAVAILABLE',
          `Failed to list bundles dir`,
          err,
        );
      }
      const out: Snapshot[] = [];
      for (const id of entries) {
        try {
          const text = await fs.readFile(
            path.join(bundleDir(id), 'manifest.json'),
            'utf8',
          );
          const m = JSON.parse(text) as ManifestJson;
          if (m.workspace === workspace) {
            out.push({ id: m.id, workspace: m.workspace, capturedAt: m.capturedAt });
          }
        } catch {
          // Skip malformed bundles.
        }
      }
      out.sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : a.capturedAt > b.capturedAt ? -1 : 0));
      const limit = listOpts.limit ?? out.length;
      return out.slice(0, limit);
    },
  };
}
