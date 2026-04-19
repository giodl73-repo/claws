/**
 * StructuredEditor — orchestrates lossless edits through the CAP chunk
 * write path with atomic Windows-safe writes and an in-process serialisation
 * queue per file.
 *
 * Flow: validate → read → apply (in memory) → write.tmp → rename original
 * to .bak → rename .tmp to original → delete .bak. Startup recovery scans
 * a workspace for `.tmp` / `.bak` remnants and restores the correct state.
 *
 * Concurrent edits to the same file serialise through a chained promise
 * queue so the write sequence cannot interleave.
 *
 * @module claws-sdk/workspace-edit/editor
 */

import { createHash } from 'node:crypto';
import { readFile, rename, unlink, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

import { applyLossless, previewLossless } from './lossless.js';
import {
  CHUNK_EDITABLE_FILES,
  EDITABLE_FILES,
  EditableFilesError,
  EditTargetError,
  type ChunkEditableFile,
  type Diff,
  type EditOperation,
  type EditResult,
  type ValidationResult,
} from './types.js';

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recover from interrupted atomic-write cycles.
 *
 * Rules (P3 — write-atomicity-trace F:P3):
 * - If `.bak` exists and the original does not → rename `.bak` → original.
 * - If both `.bak` and `.tmp` exist → delete `.tmp`; rename `.bak` → original.
 * - If only `.tmp` exists and original does not → rename `.tmp` → original.
 * - Otherwise no action.
 */
export async function recoverAtomicWrite(originalPath: string): Promise<void> {
  const tmp = `${originalPath}.tmp`;
  const bak = `${originalPath}.bak`;
  const hasOriginal = await pathExists(originalPath);
  const hasTmp = await pathExists(tmp);
  const hasBak = await pathExists(bak);

  if (hasBak && hasTmp) {
    await unlink(tmp);
    if (!hasOriginal) {
      await rename(bak, originalPath);
    } else {
      await unlink(bak);
    }
    return;
  }
  if (hasBak && !hasOriginal) {
    await rename(bak, originalPath);
    return;
  }
  if (hasTmp && !hasOriginal) {
    await rename(tmp, originalPath);
  }
}

/**
 * Notifier called around each write-sequence. The StructuredEditor invokes
 * `start` before the first rename and `end` after the rename chain completes
 * (success or failure). Used by the file watcher to suppress spurious events
 * (P6 — write-atomicity-trace F:P6).
 */
export interface WatcherNotifier {
  start(absolutePath: string): void;
  end(absolutePath: string, ok: boolean): void;
}

const NOOP_NOTIFIER: WatcherNotifier = {
  start: () => {},
  end: () => {},
};

export interface StructuredEditorOptions {
  readonly workspaceRoot: string;
  readonly watcher?: WatcherNotifier;
}

/**
 * Snapshot captured inside the per-file mutex. `existed: false` means the
 * file did not exist at snapshot time; rollback "restores" this by deleting
 * whatever the apply phase wrote.
 */
export type FileSnapshot =
  | { readonly existed: true; readonly content: string }
  | { readonly existed: false };

/**
 * Outcome of a raw write or delete operation. `ok: false` carries the
 * filesystem error message; callers map this to `ROLLBACK_FAILED`.
 */
export type RawWriteResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

/**
 * Transaction handle exposed to {@link StructuredEditor.withFileLocks} callbacks.
 *
 * All four operations run without re-acquiring the mutex — the caller already
 * holds every file's lock via `withFileLocks`, so the callback can safely
 * interleave snapshot/apply/rollback without another writer racing.
 */
export interface EditorTransaction {
  /** Read the file's current content under the held lock. */
  snapshot(file: ChunkEditableFile): Promise<FileSnapshot>;
  /** Apply a structured edit under the held lock. */
  apply(op: EditOperation): Promise<EditResult>;
  /** Atomically overwrite the file with raw content under the held lock. */
  writeRaw(file: ChunkEditableFile, content: string): Promise<RawWriteResult>;
  /** Atomically delete the file (if it exists) under the held lock. */
  deleteRaw(file: ChunkEditableFile): Promise<RawWriteResult>;
}

/**
 * In-process mutex keyed by absolute file path. Each file's writes chain
 * through a single promise so concurrent `apply()` calls serialise without
 * interleaving their atomic-write phases.
 *
 * `run` wraps a task with an exclusive hold. `acquire` returns a release
 * callback for long-lived holds that must span multiple operations — the
 * BatchExecutor transaction uses this so snapshot, apply, compile-verify,
 * and rollback all sit inside the same mutex window (closes the D3 TOCTOU).
 */
class FileMutex {
  private chains = new Map<string, Promise<unknown>>();

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    const next = prev.then(task);
    this.chains.set(key, next);
    return next;
  }

  /**
   * Acquire the mutex for `key` without running a specific task. Returns a
   * release function the caller invokes to unblock the next waiter. The
   * returned promise resolves once the lock is held.
   */
  async acquire(key: string): Promise<() => void> {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prev = this.chains.get(key) ?? Promise.resolve();
    const myTurn = prev.then(() => held);
    this.chains.set(key, myTurn);
    await prev;
    return release;
  }
}

export class StructuredEditor {
  private readonly workspaceRoot: string;
  private readonly watcher: WatcherNotifier;
  private readonly mutex = new FileMutex();

  constructor(options: StructuredEditorOptions) {
    this.workspaceRoot = options.workspaceRoot;
    this.watcher = options.watcher ?? NOOP_NOTIFIER;
  }

  /**
   * Resolve the on-disk path for an editable file.
   *
   * Throws {@link EditableFilesError} when the target is outside
   * `CHUNK_EDITABLE_FILES`.
   */
  private resolveTarget(file: ChunkEditableFile): string {
    if (!CHUNK_EDITABLE_FILES.includes(file)) {
      throw new EditableFilesError(
        `File "${file}" is not in CHUNK_EDITABLE_FILES`,
        'CHUNK_EDITABLE_FILES_VIOLATION',
      );
    }
    return join(this.workspaceRoot, file);
  }

  /**
   * Validate the shape of an operation before any I/O. Returns `ok: false`
   * with a machine-readable code when the operation targets a disallowed
   * file or has missing fields.
   */
  validate(op: EditOperation): ValidationResult {
    if (!CHUNK_EDITABLE_FILES.includes(op.file)) {
      return {
        ok: false,
        code: 'CHUNK_EDITABLE_FILES_VIOLATION',
        message: `File "${op.file}" cannot be edited through the chunk write path`,
      };
    }
    if (op.section.trim().length === 0) {
      return { ok: false, code: 'EDIT_SECTION_REQUIRED', message: 'section is required' };
    }
    if ((op.kind === 'toggle' || op.kind === 'set') && op.field.trim().length === 0) {
      return { ok: false, code: 'EDIT_FIELD_REQUIRED', message: 'field is required' };
    }
    if ((op.kind === 'append' || op.kind === 'remove') && op.item.trim().length === 0) {
      return { ok: false, code: 'EDIT_ITEM_REQUIRED', message: 'item is required' };
    }
    return { ok: true };
  }

  /**
   * Produce a preview without touching disk. Reads the target file and
   * applies the edit in memory only.
   */
  async preview(op: EditOperation): Promise<Diff> {
    const target = this.resolveTarget(op.file);
    const raw = await readFile(target, 'utf-8');
    const { before, after, changedLines } = previewLossless(raw, op);
    return { file: op.file, before, after, changedLines };
  }

  /**
   * Apply an edit operation with atomic writes and per-file serialisation.
   *
   * Write sequence (Windows-safe):
   *   1. write `.tmp`
   *   2. rename original → `.bak`
   *   3. rename `.tmp` → original
   *   4. delete `.bak`
   */
  async apply(op: EditOperation): Promise<EditResult> {
    const validation = this.validate(op);
    if (!validation.ok) {
      return {
        success: false,
        file: op.file,
        before: '',
        after: '',
        error: `${validation.code}: ${validation.message}`,
      };
    }

    const target = this.resolveTarget(op.file);
    return this.mutex.run(target, () => this.applyLocked(op, target));
  }

  /**
   * Run `fn` while holding the per-file mutex for every entry in `files`.
   *
   * Locks are acquired in a deterministic sorted order so concurrent callers
   * requesting overlapping file sets never deadlock. The returned transaction
   * handle exposes snapshot / apply / write-raw / delete-raw operations that
   * run WITHOUT re-acquiring the mutex — so the caller can serialise
   * snapshot → apply → verify → rollback inside a single exclusive window.
   *
   * Releases every held lock (even on throw) before returning.
   */
  async withFileLocks<T>(
    files: readonly ChunkEditableFile[],
    fn: (tx: EditorTransaction) => Promise<T>,
  ): Promise<T> {
    const uniqueFiles = Array.from(new Set(files));
    const targets = uniqueFiles.map((f) => ({ file: f, target: this.resolveTarget(f) }));
    // Sort by absolute path so any two callers with overlapping file sets
    // acquire in the same order — eliminates cross-lock deadlock.
    targets.sort((a, b) => (a.target < b.target ? -1 : a.target > b.target ? 1 : 0));
    const releases: Array<() => void> = [];
    try {
      for (const { target } of targets) {
        releases.push(await this.mutex.acquire(target));
      }
      const tx: EditorTransaction = {
        snapshot: (file) => this.snapshotLocked(file),
        apply: (op) => this.applyLocked(op, this.resolveTarget(op.file)),
        writeRaw: (file, content) => this.writeRawLocked(this.resolveTarget(file), content, file),
        deleteRaw: (file) => this.deleteRawLocked(this.resolveTarget(file), file),
      };
      return await fn(tx);
    } finally {
      // Release in reverse order of acquisition.
      for (let i = releases.length - 1; i >= 0; i -= 1) {
        releases[i]!();
      }
    }
  }

  private async snapshotLocked(file: ChunkEditableFile): Promise<FileSnapshot> {
    const target = this.resolveTarget(file);
    try {
      const content = await readFile(target, 'utf-8');
      return { existed: true, content };
    } catch {
      return { existed: false };
    }
  }

  /**
   * Write raw content atomically through the StructuredEditor contract — same
   * `.tmp → rename → .bak → unlink` chain as `applyLocked`, same watcher
   * notifications, same mutex assumption (caller already holds it).
   *
   * Used by {@link withFileLocks} transactions to perform rollback writes
   * that would otherwise bypass the atomic-write / watcher / mutex guarantees.
   */
  private async writeRawLocked(
    target: string,
    content: string,
    _file: ChunkEditableFile,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const tmp = `${target}.tmp`;
    const bak = `${target}.bak`;
    try {
      this.watcher.start(target);
      await writeFile(tmp, content, 'utf-8');
      // If the target exists, rotate it to .bak so the rename sequence is
      // identical to applyLocked's. Otherwise skip the rotate (first-write
      // restore — but that's not used by rollback today; kept for completeness).
      if (await pathExists(target)) {
        await rename(target, bak);
        await rename(tmp, target);
        await unlink(bak);
      } else {
        await rename(tmp, target);
      }
      this.watcher.end(target, true);
      return { ok: true };
    } catch (err) {
      this.watcher.end(target, false);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Atomically delete a file through the editor contract. Rotates the file
   * to `.bak`, then removes `.bak`. If any step throws, the watcher is
   * notified with `ok: false` and the caller receives the reason.
   *
   * Used by rollback for the "first-write" case — the pre-batch state was
   * "no file", so restoring means deleting the written file.
   */
  private async deleteRawLocked(
    target: string,
    _file: ChunkEditableFile,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const bak = `${target}.bak`;
    try {
      this.watcher.start(target);
      if (!(await pathExists(target))) {
        this.watcher.end(target, true);
        return { ok: true };
      }
      await rename(target, bak);
      await unlink(bak);
      this.watcher.end(target, true);
      return { ok: true };
    } catch (err) {
      this.watcher.end(target, false);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async applyLocked(op: EditOperation, target: string): Promise<EditResult> {
    const tmp = `${target}.tmp`;
    const bak = `${target}.bak`;
    try {
      this.watcher.start(target);
      const raw = await readFile(target, 'utf-8');
      const next = applyLossless(raw, op);
      const before = sha256(raw);
      const after = sha256(next);

      await writeFile(tmp, next, 'utf-8');
      await rename(target, bak);
      await rename(tmp, target);
      await unlink(bak);

      this.watcher.end(target, true);
      return { success: true, file: op.file, before, after };
    } catch (err) {
      this.watcher.end(target, false);
      if (err instanceof EditTargetError || err instanceof EditableFilesError) {
        return {
          success: false,
          file: op.file,
          before: '',
          after: '',
          error: `${err.code}: ${err.message}`,
        };
      }
      return {
        success: false,
        file: op.file,
        before: '',
        after: '',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export { EDITABLE_FILES, CHUNK_EDITABLE_FILES };
