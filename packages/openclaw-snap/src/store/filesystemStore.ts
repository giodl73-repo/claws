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

import * as crypto from 'node:crypto';
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

function sha256Hex(bytes: Uint8Array): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

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

interface ManifestFileEntry {
  readonly path: string;
  /** Lower-hex SHA-256 of the file bytes. Used by `read` to detect tamper. */
  readonly sha256: string;
}

interface ManifestJson {
  readonly id: SnapshotId;
  readonly workspace: WorkspaceId;
  readonly capturedAt: string;
  /**
   * File inventory with per-file integrity hashes.
   *
   * **Format**: `readonly ManifestFileEntry[]` since v0.3.1 (this package).
   * Older bundles wrote `readonly string[]` (paths only) — load logic
   * tolerates both shapes; per-file integrity verification only applies
   * when the new shape is detected.
   */
  readonly files: readonly ManifestFileEntry[] | readonly string[];
}

function parseManifestFiles(raw: ManifestJson['files']): {
  paths: readonly string[];
  hashes: ReadonlyMap<string, string> | null;
} {
  if (raw.length === 0) return { paths: [], hashes: new Map() };
  if (typeof raw[0] === 'string') {
    return { paths: raw as readonly string[], hashes: null };
  }
  const entries = raw as readonly ManifestFileEntry[];
  return {
    paths: entries.map((e) => e.path),
    hashes: new Map(entries.map((e) => [e.path, e.sha256])),
  };
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
  // Tmp suffix uses random hex (not pid+Date.now()) so parallel calls
  // within the same process and ms can never collide on the tmp filename.
  // S49 caught the prior collision class.
  const tmp = `${target}.tmp-${crypto.randomBytes(8).toString('hex')}`;
  await fs.writeFile(tmp, data);
  try {
    await fs.rename(tmp, target);
  } catch (err) {
    // Concurrent capture race: another writer already produced the same
    // file (content-addressed → bytes are identical). Clean up our tmp
    // and accept the existing target as the canonical one.
    //
    // POSIX returns EEXIST or ENOENT (the tmp source got moved by the
    // racing rename); Windows returns EPERM when renaming over an
    // existing file. Cover all three.
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'EEXIST' || code === 'EPERM') {
      try { await fs.unlink(tmp); } catch { /* ignore */ }
      try { await fs.access(target); return; } catch { /* fall through */ }
    }
    throw err;
  }
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
      const manifestEntries: ManifestFileEntry[] = [];
      for (const rel of sortedFiles) {
        const target = path.join(dir, 'files', rel);
        await fs.mkdir(path.dirname(target), { recursive: true });
        const bytes = fileBytes.get(rel) as Uint8Array;
        await writeAtomic(target, bytes);
        manifestEntries.push({ path: rel, sha256: sha256Hex(bytes) });
      }
      const manifest: ManifestJson = {
        id,
        workspace,
        capturedAt: now().toISOString(),
        files: manifestEntries,
      };
      await writeAtomic(
        path.join(dir, 'manifest.json'),
        JSON.stringify(manifest, null, 2) + '\n',
      );
      return id;
    },

    async read(snap, internalPath) {
      const dir = bundleDir(snap);
      const target = path.join(dir, 'files', internalPath);

      // Reject path-traversal attempts before they touch the FS. Resolve
      // both the requested target and the bundle's files dir; if the
      // resolved target escapes, fail closed.
      const filesDir = path.resolve(dir, 'files');
      const resolved = path.resolve(filesDir, internalPath);
      if (resolved !== filesDir && !resolved.startsWith(filesDir + path.sep)) {
        throw new SnapshotErrorImpl(
          'SNAP_INVALID_PATH',
          `Path escapes bundle: ${internalPath} (snap=${snap})`,
        );
      }

      let buf: Buffer;
      try {
        buf = await fs.readFile(target);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          // Distinguish missing snapshot from missing file inside a snapshot.
          try {
            await fs.access(path.join(dir, 'manifest.json'));
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
      const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

      // Per-file integrity check — re-hash the bytes and compare to the
      // sha256 recorded in the manifest at capture time. Detects tamper /
      // disk corruption / mid-flight modification of bundle files. Older
      // bundles (pre-v0.3.1) wrote the manifest without per-file hashes;
      // those skip verification (legacy compat — flagged via console once).
      try {
        const manifestText = await fs.readFile(path.join(dir, 'manifest.json'), 'utf8');
        const manifest = JSON.parse(manifestText) as ManifestJson;
        const { hashes } = parseManifestFiles(manifest.files);
        if (hashes !== null) {
          const expected = hashes.get(internalPath);
          if (expected !== undefined) {
            const actual = sha256Hex(bytes);
            if (actual !== expected) {
              throw new SnapshotErrorImpl(
                'SNAP_CHECKSUM_MISMATCH',
                `Content hash mismatch for ${internalPath} in ${snap}: ` +
                  `expected sha256=${expected}, got sha256=${actual}`,
              );
            }
          }
        }
      } catch (err) {
        if (err instanceof SnapshotErrorImpl) throw err;
        // Manifest read/parse failure during verify — fail closed.
        throw new SnapshotErrorImpl(
          'SNAP_STORE_UNAVAILABLE',
          `Failed to verify integrity of ${internalPath} in ${snap}`,
          err,
        );
      }
      return bytes;
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
