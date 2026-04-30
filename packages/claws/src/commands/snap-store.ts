/**
 * `claws snap` v2 verbs — capture/registry/promote/rollback/discard/status/diff/checkout/read.
 *
 * In-process bindings to `@bic/openclaw-snap`'s v2 SnapshotStore + RefStore.
 * Replaces the prior HTTP-client surface (which talked to `claws snap serve`,
 * now removed). The store + refs land under `<workspace>/.openclaw/snapshots/`.
 *
 * @module claws-cli/commands/snap-store
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  filesystemStore,
  workspaceRefStore,
  type SnapshotStore,
  type RefStore,
  type SnapshotId,
} from '@bic/openclaw-snap';

const TEXT_DECODER = new TextDecoder('utf-8');

export interface SnapStoreOptions {
  readonly json: boolean;
}

interface Bindings {
  readonly store: SnapshotStore;
  readonly refs: RefStore;
  readonly workspace: string;
}

/**
 * Resolve the workspace root, honoring an env override for deployment
 * scenarios where the workspace lives at a path different from cwd —
 * e.g. inside an Aether container with a FUSE-mounted workspace at
 * `/mnt/workspace/` (rclone → OneDrive/SharePoint/blob).
 *
 * In that mode plain `node:fs/promises` writes land in cloud storage
 * transparently, so `filesystemStore` reaches OneDrive without any
 * per-backend code. See `.craft/waves/260427+hapi-the-bringer+
 * openclaw-upstream/carve-consumer-catalog.md` § "Backend storage —
 * FUSE-via-rclone (default)".
 */
function resolveWorkspaceRoot(workspaceRoot: string): string {
  return process.env['OPENCLAW_WORKSPACE_ROOT'] ?? workspaceRoot;
}

function bind(workspaceRoot: string): Bindings {
  const ws = resolveWorkspaceRoot(workspaceRoot);
  const root = path.join(ws, '.openclaw', 'snapshots');
  return {
    store: filesystemStore({ root }),
    refs: workspaceRefStore({ root }),
    workspace: ws,
  };
}

function emit(line: string): void {
  process.stdout.write(line + '\n');
}

function emitErr(line: string): void {
  process.stderr.write(line + '\n');
}

function asJson(opts: SnapStoreOptions, payload: Record<string, unknown>): void {
  if (opts.json) emit(JSON.stringify(payload));
}

async function reportError(opts: SnapStoreOptions, err: unknown, label: string): Promise<number> {
  const message = err instanceof Error ? err.message : String(err);
  if (opts.json) {
    emitErr(JSON.stringify({ status: 'error', op: label, message }));
  } else {
    emitErr(`${label}: ${message}`);
  }
  return 3;
}

/**
 * `claws snap capture` — capture the workspace into a new immutable bundle
 * and update STAGE to point at it.
 */
export async function runSnapCapture(workspaceRoot: string, opts: SnapStoreOptions): Promise<number> {
  const { store, refs, workspace } = bind(workspaceRoot);
  try {
    const id = await store.capture(workspace);
    await refs.setStage(workspace, id);
    if (opts.json) asJson(opts, { status: 'ok', op: 'capture', stageId: id });
    else emit(`captured ${id} → STAGE`);
    return 0;
  } catch (err) {
    return reportError(opts, err, 'capture');
  }
}

/**
 * `claws snap promote` — move STAGE → HEAD. Requires a STAGE pointer.
 */
export async function runSnapPromote(workspaceRoot: string, opts: SnapStoreOptions): Promise<number> {
  const { refs, workspace } = bind(workspaceRoot);
  try {
    const stage = await refs.getStage(workspace);
    if (stage === null) {
      const message = 'no STAGE — run `claws snap capture` first';
      if (opts.json) emitErr(JSON.stringify({ status: 'error', op: 'promote', message }));
      else emitErr(`promote: ${message}`);
      return 3;
    }
    await refs.setHead(workspace, stage);
    if (opts.json) asJson(opts, { status: 'ok', op: 'promote', headId: stage });
    else emit(`promoted ${stage} → HEAD`);
    return 0;
  } catch (err) {
    return reportError(opts, err, 'promote');
  }
}

/**
 * `claws snap rollback [id]` — set HEAD to a prior snapshot. With no
 * argument, rolls back to the previous HEAD from history[0].
 */
export async function runSnapRollback(
  workspaceRoot: string,
  id: string | undefined,
  opts: SnapStoreOptions,
): Promise<number> {
  const { refs, workspace } = bind(workspaceRoot);
  try {
    let target: SnapshotId | undefined = id;
    if (target === undefined) {
      const hist = await refs.history(workspace, 1);
      target = hist[0];
    }
    if (target === undefined) {
      const message = 'no rollback target — pass an id or have a prior HEAD in history';
      if (opts.json) emitErr(JSON.stringify({ status: 'error', op: 'rollback', message }));
      else emitErr(`rollback: ${message}`);
      return 3;
    }
    await refs.setHead(workspace, target);
    if (opts.json) asJson(opts, { status: 'ok', op: 'rollback', headId: target });
    else emit(`rolled back ${target} → HEAD`);
    return 0;
  } catch (err) {
    return reportError(opts, err, 'rollback');
  }
}

/**
 * `claws snap discard` — clear STAGE pointer. Bytes stay in the store
 * for GC; only the pointer is dropped.
 */
export async function runSnapDiscard(workspaceRoot: string, opts: SnapStoreOptions): Promise<number> {
  const { refs, workspace } = bind(workspaceRoot);
  try {
    await refs.setStage(workspace, null);
    if (opts.json) asJson(opts, { status: 'ok', op: 'discard' });
    else emit('STAGE cleared');
    return 0;
  } catch (err) {
    return reportError(opts, err, 'discard');
  }
}

/**
 * `claws snap status` — show HEAD, STAGE, history depth.
 */
export async function runSnapStatus(workspaceRoot: string, opts: SnapStoreOptions): Promise<number> {
  const { refs, workspace } = bind(workspaceRoot);
  try {
    const [head, stage, history] = await Promise.all([
      refs.getHead(workspace),
      refs.getStage(workspace),
      refs.history(workspace),
    ]);
    if (opts.json) {
      asJson(opts, { status: 'ok', op: 'status', head, stage, historyDepth: history.length });
    } else {
      emit(`HEAD:    ${head ?? '(none)'}`);
      emit(`STAGE:   ${stage ?? '(none)'}`);
      emit(`history: ${history.length} entries`);
    }
    return 0;
  } catch (err) {
    return reportError(opts, err, 'status');
  }
}

/**
 * `claws snap registry [--limit N]` — list all snapshots in the store
 * for this workspace, newest-first, annotated with HEAD/STAGE markers.
 */
export async function runSnapRegistry(
  workspaceRoot: string,
  opts: SnapStoreOptions & { readonly limit?: number },
): Promise<number> {
  const { store, refs, workspace } = bind(workspaceRoot);
  try {
    const listOpts = opts.limit !== undefined ? { limit: opts.limit } : undefined;
    const [snaps, head, stage] = await Promise.all([
      store.list(workspace, listOpts),
      refs.getHead(workspace),
      refs.getStage(workspace),
    ]);
    if (opts.json) {
      asJson(opts, {
        status: 'ok',
        op: 'registry',
        head,
        stage,
        snapshots: snaps.map((s) => ({
          id: s.id,
          capturedAt: s.capturedAt,
          marker: s.id === head ? 'HEAD' : s.id === stage ? 'STAGE' : null,
        })),
      });
    } else if (snaps.length === 0) {
      emit('(no snapshots)');
    } else {
      for (const s of snaps) {
        const marker = s.id === head ? ' HEAD' : s.id === stage ? ' STAGE' : '';
        emit(`${s.id}  ${s.capturedAt}${marker}`);
      }
    }
    return 0;
  } catch (err) {
    return reportError(opts, err, 'registry');
  }
}

/**
 * `claws snap checkout <id>` — restore the workspace files from a snapshot.
 * Files outside the snapshot are left in place (additive checkout).
 */
export async function runSnapCheckout(
  workspaceRoot: string,
  id: string,
  opts: SnapStoreOptions,
): Promise<number> {
  const { store, workspace } = bind(workspaceRoot);
  try {
    // We don't have a list-files-in-snapshot API on the v2 contract.
    // The filesystem store's bundle dir has a manifest; we read it via
    // a known path (`.manifest`-shaped). For now: read paths via the
    // captured manifest by reading the bundles dir directly. This is
    // an impl-coupled escape hatch — fine for the local-mode CLI.
    const manifestPath = path.join(workspaceRoot, '.openclaw', 'snapshots', 'bundles', id, 'manifest.json');
    let manifest: { files: readonly (string | { path: string })[] };
    try {
      const text = await fs.readFile(manifestPath, 'utf8');
      manifest = JSON.parse(text) as typeof manifest;
    } catch {
      const message = `snapshot ${id} not found in local store`;
      if (opts.json) emitErr(JSON.stringify({ status: 'error', op: 'checkout', message }));
      else emitErr(`checkout: ${message}`);
      return 3;
    }
    let restored = 0;
    for (const entry of manifest.files) {
      const rel = typeof entry === 'string' ? entry : entry.path;
      const bytes = await store.read(id, rel);
      const target = path.join(workspace, rel);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, bytes);
      restored++;
    }
    if (opts.json) asJson(opts, { status: 'ok', op: 'checkout', id, restored });
    else emit(`checked out ${id} (${restored} files)`);
    return 0;
  } catch (err) {
    return reportError(opts, err, 'checkout');
  }
}

/**
 * `claws snap read <id> <path>` — print bytes of a file inside a snapshot.
 */
export async function runSnapRead(
  workspaceRoot: string,
  id: string,
  internalPath: string,
  opts: SnapStoreOptions,
): Promise<number> {
  const { store } = bind(workspaceRoot);
  try {
    const bytes = await store.read(id, internalPath);
    if (opts.json) {
      asJson(opts, { status: 'ok', op: 'read', id, path: internalPath, content: TEXT_DECODER.decode(bytes) });
    } else {
      process.stdout.write(bytes);
    }
    return 0;
  } catch (err) {
    return reportError(opts, err, 'read');
  }
}

/**
 * `claws snap diff [id1] [id2]` — list paths changed between two snapshots.
 * With no arguments, diffs HEAD vs STAGE. Output is a path-level diff
 * (added / removed / modified); semantic content diffing is downstream.
 */
export async function runSnapDiff(
  workspaceRoot: string,
  id1: string | undefined,
  id2: string | undefined,
  opts: SnapStoreOptions,
): Promise<number> {
  const { store, refs, workspace } = bind(workspaceRoot);
  try {
    let from = id1;
    let to = id2;
    if (from === undefined && to === undefined) {
      from = (await refs.getHead(workspace)) ?? undefined;
      to = (await refs.getStage(workspace)) ?? undefined;
      if (from === undefined || to === undefined) {
        const message = 'no HEAD/STAGE to diff — pass two snapshot ids';
        if (opts.json) emitErr(JSON.stringify({ status: 'error', op: 'diff', message }));
        else emitErr(`diff: ${message}`);
        return 3;
      }
    }
    if (from === undefined || to === undefined) {
      const message = 'diff requires two snapshot ids';
      if (opts.json) emitErr(JSON.stringify({ status: 'error', op: 'diff', message }));
      else emitErr(`diff: ${message}`);
      return 3;
    }
    const fromFiles = await readManifest(workspaceRoot, from);
    const toFiles = await readManifest(workspaceRoot, to);
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    for (const p of toFiles) {
      if (!fromFiles.includes(p)) added.push(p);
      else {
        const a = await store.read(from, p);
        const b = await store.read(to, p);
        if (!bytesEqual(a, b)) modified.push(p);
      }
    }
    for (const p of fromFiles) if (!toFiles.includes(p)) removed.push(p);
    if (opts.json) {
      asJson(opts, { status: 'ok', op: 'diff', from, to, added, removed, modified });
    } else {
      for (const p of added) emit(`+ ${p}`);
      for (const p of removed) emit(`- ${p}`);
      for (const p of modified) emit(`~ ${p}`);
      if (added.length === 0 && removed.length === 0 && modified.length === 0) emit('(no changes)');
    }
    return 0;
  } catch (err) {
    return reportError(opts, err, 'diff');
  }
}

async function readManifest(workspaceRoot: string, id: SnapshotId): Promise<readonly string[]> {
  const manifestPath = path.join(workspaceRoot, '.openclaw', 'snapshots', 'bundles', id, 'manifest.json');
  const text = await fs.readFile(manifestPath, 'utf8');
  const m = JSON.parse(text) as { files: readonly (string | { path: string })[] };
  return m.files.map((entry) => (typeof entry === 'string' ? entry : entry.path));
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}
