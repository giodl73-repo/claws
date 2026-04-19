/**
 * AutoSnapshotTriggerHook — intercepts file watcher events, integrity-
 * checks the post-edit state, and asks the AutoSnapshotManager to
 * capture the PREVIOUS compiled state before the recompile runs.
 *
 * The recompile queue (in the serve layer) does not need to know the
 * hook exists — it runs whether or not the hook fires. The hook's job
 * is only to preserve a rollback point for external writes:
 *
 * 1. File watcher fires with a stability-window-deduped event.
 * 2. Integrity check: does the current on-disk file parse? If not
 *    (partially written, OneDrive mid-sync), skip the snapshot — the
 *    recompile will surface the same unparseable state as an ERROR
 *    and no snapshot is a better outcome than a snapshot of garbage.
 * 3. If parseable, call
 *    {@link import('./auto-snapshot.js').AutoSnapshotManager.save}
 *    with the PREVIOUS version's metadata.
 * 4. Control returns to the watcher, which then enqueues the recompile.
 *
 * Business logic sits in this module. The serve-layer file watcher is
 * a thin adapter that calls {@link invokeAutoSnapshotHook} with the
 * current state and a read-through callback.
 *
 * @module claws-sdk/workspace/auto-snapshot-trigger
 */

import type { AutoSnapshotManager, SaveAutoSnapshotInput } from './auto-snapshot.js';
import type { AutoSnapshot, AutoSnapshotTrigger } from './auto-snapshot-types.js';

/**
 * Integrity-check callback. Returns true when the post-edit on-disk
 * state parses cleanly, false when it does not (partial write,
 * truncated file, malformed YAML). The hook uses this to decide
 * whether to take a snapshot — unparseable states are dropped so the
 * auto-snapshot index never holds a garbage entry.
 *
 * The serve-layer watcher implements this by calling
 * {@link import('./parser.js').parseWorkspace} on the affected files
 * and translating a thrown {@link import('./types.js').WorkspaceError}
 * into `false`.
 */
export type IntegrityCheck = () => Promise<boolean>;

/**
 * Input to {@link invokeAutoSnapshotHook}.
 *
 * `previousState` is the state to save — it names the *pre-edit*
 * compiled output, which is what rollback will restore. The hook
 * never captures post-edit state; the recompile handles that
 * separately via the VersionStore.
 */
export interface AutoSnapshotHookInput {
  /** The previous compiled state to capture. */
  readonly previousState: {
    readonly version: number;
    readonly governanceIrHash: string;
    readonly fileHashes: Readonly<Record<string, string>>;
  };
  /** Which external writer fired the watcher. */
  readonly trigger: AutoSnapshotTrigger;
  /** Integrity check on the current on-disk state. */
  readonly integrityCheck: IntegrityCheck;
  /** Manager instance to record into. */
  readonly manager: AutoSnapshotManager;
  /** Clock override for tests. */
  readonly now?: () => Date;
}

/** Outcome of the hook. */
export type AutoSnapshotHookResult =
  | { readonly kind: 'saved'; readonly snapshot: AutoSnapshot }
  | { readonly kind: 'skipped'; readonly reason: 'unparseable' };

/**
 * Run the auto-snapshot hook. Returns `skipped/unparseable` when the
 * integrity check fails so callers can log the drop (and let the
 * recompile surface the same condition as an ERROR).
 *
 * This function is never expected to throw — if the manager rejects
 * an input (negative version, etc.) that bubbles up to the caller,
 * but a failed integrity check is a normal outcome, not an error.
 */
export async function invokeAutoSnapshotHook(
  input: AutoSnapshotHookInput,
): Promise<AutoSnapshotHookResult> {
  const parseable = await input.integrityCheck();
  if (!parseable) {
    return { kind: 'skipped', reason: 'unparseable' };
  }
  const saveInput: SaveAutoSnapshotInput = {
    version: input.previousState.version,
    governanceIrHash: input.previousState.governanceIrHash,
    fileHashes: input.previousState.fileHashes,
    trigger: input.trigger,
    timestamp: (input.now ?? ((): Date => new Date()))().toISOString(),
  };
  const snapshot = await input.manager.save(saveInput);
  return { kind: 'saved', snapshot };
}
