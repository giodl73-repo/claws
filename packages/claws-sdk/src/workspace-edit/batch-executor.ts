/**
 * BatchExecutor — atomic all-or-nothing execution of a batch of edit
 * operations against the CAP chunk write path.
 *
 * Contract:
 *   - Validate every operation through the injected {@link ValidationPipeline}
 *     BEFORE any write lands on disk. If any operation fails validation the
 *     whole batch is rejected and zero bytes are written.
 *   - Apply every operation through the injected {@link StructuredEditor}.
 *     If an apply fails mid-batch, restore every file already modified in
 *     this batch to its pre-batch snapshot so the workspace is indistinguishable
 *     from its pre-batch state.
 *   - Trigger exactly one post-batch recompile via the injected recompile
 *     function (not one per operation).
 *   - Cap the batch size at {@link MAX_BATCH_SIZE} operations; oversized or
 *     empty batches are rejected without touching disk.
 *
 * Concurrency: snapshot → apply → recompile → (commit | rollback) all run
 * inside a single exclusive hold on every touched file's mutex. This closes
 * the TOCTOU window where two concurrent batches could race snapshots
 * against each other's writes and wipe committed state on rollback.
 *
 * Rollback routes through {@link EditorTransaction.writeRaw} /
 * {@link EditorTransaction.deleteRaw} so the pre-edit restore respects the
 * editor's .tmp/.bak atomic-write chain and watcher notifier — a raw
 * `fs.writeFile` would silently stomp an interrupted write that
 * {@link recoverAtomicWrite} would later undo.
 *
 * The executor is a pure SDK primitive — no HTTP, no filesystem snapshotting
 * logic beyond the StructuredEditor contract, no direct compile-host access.
 * Callers (the claws-serve batch + patch routes) supply the editor, pipeline,
 * and recompile callback; this module owns the orchestration + rollback.
 *
 * Dry-run mode: `dryRun: true` runs validation only and returns the
 * per-operation results + aggregate summary without writing or recompiling.
 *
 * @module claws-sdk/workspace-edit/batch-executor
 */

import type { EditorTransaction, FileSnapshot, StructuredEditor } from './editor.js';
import type { ValidationPipeline } from './validation.js';
import type { PatchError } from './errors.js';
import { buildPatchError } from './error-messages.js';
import type { RollbackFailedError, ValidationFailedError } from './errors.js';
import type { EditOperation, ChunkEditableFile } from './types.js';
import type { ValidationWarning } from './validators/validator.js';

/** Hard cap on batch size. Bounds memory and latency per the plan. */
export const MAX_BATCH_SIZE = 20;

/**
 * Outcome for a single operation within a successful batch. Every result
 * carries its `index` so callers can correlate with the input array without
 * relying on ordering (the executor preserves input order, but clients that
 * reorder for display should not have to track it).
 */
export interface BatchOperationResult {
  readonly index: number;
  readonly ok: true;
  readonly file: ChunkEditableFile;
  readonly section: string;
  /** Pre-edit SHA-256 of the target file. Empty when the file did not exist. */
  readonly before: string;
  /** Post-edit SHA-256 of the target file. */
  readonly after: string;
  readonly warnings: readonly ValidationWarning[];
}

/** Outcome for a single operation that failed validation inside a rejected batch. */
export interface BatchOperationFailure {
  readonly index: number;
  readonly ok: false;
  readonly file: ChunkEditableFile;
  readonly section: string;
  readonly error: PatchError;
}

export type BatchOperationOutcome = BatchOperationResult | BatchOperationFailure;

/** Aggregate governance summary across every operation in the batch. */
export interface BatchGovernanceSummary {
  /** Union of warnings emitted by any validator during this batch. */
  readonly warnings: readonly ValidationWarning[];
  /**
   * Errors keyed by operation index. Empty when the batch is accepted;
   * populated when validation rejected the batch.
   */
  readonly errors: readonly BatchOperationFailure[];
  /** Number of operations that passed validation (regardless of batch outcome). */
  readonly validated: number;
}

/**
 * Response envelope.
 *
 * `committed === true` means every operation was validated AND applied (or,
 * for dry-run, validated without apply). `committed === false` means the
 * batch was rejected; `results` will be empty and `summary.errors` holds
 * the per-op failures.
 */
export interface BatchResult {
  readonly committed: boolean;
  readonly dryRun: boolean;
  readonly results: readonly BatchOperationResult[];
  readonly summary: BatchGovernanceSummary;
  /** When rollback fired mid-apply, the executor reports which files were restored. */
  readonly rollback?: {
    readonly triggered: boolean;
    readonly restoredFiles: readonly ChunkEditableFile[];
    readonly restoreFailures: readonly { readonly file: ChunkEditableFile; readonly reason: string }[];
  };
  /** Error describing why the batch was rejected before any operation validated (size, empty). */
  readonly envelopeError?: PatchError;
}

/** Dependencies the executor binds against. Pure injection; no global state. */
export interface BatchExecutorDeps {
  readonly workspaceRoot: string;
  readonly editor: StructuredEditor;
  readonly pipeline: ValidationPipeline;
  /**
   * Called exactly once after a successful apply phase to refresh the
   * downstream IR cache. The executor does not interpret the return value;
   * recompile failures bubble out as a thrown Error so the caller can map
   * them to COMPILATION_FAILED.
   */
  readonly recompile: () => Promise<void>;
}

export interface BatchExecuteOptions {
  readonly dryRun?: boolean;
}

/**
 * All-or-nothing batch executor for workspace edit operations.
 *
 * Usage:
 * ```ts
 * const executor = new BatchExecutor({ workspaceRoot, editor, pipeline, recompile });
 * const result = await executor.execute(ops, { dryRun: false });
 * ```
 */
export class BatchExecutor {
  private readonly deps: BatchExecutorDeps;

  constructor(deps: BatchExecutorDeps) {
    this.deps = deps;
  }

  async execute(
    ops: readonly EditOperation[],
    options: BatchExecuteOptions = {},
  ): Promise<BatchResult> {
    const dryRun = options.dryRun === true;

    const envelopeError = checkEnvelope(ops);
    if (envelopeError !== undefined) {
      return {
        committed: false,
        dryRun,
        results: [],
        summary: { warnings: [], errors: [], validated: 0 },
        envelopeError,
      };
    }

    // 1) Validate every operation. Collect warnings; short-circuit on first
    //    failure so the batch is rejected atomically before any write.
    const warnings: ValidationWarning[] = [];
    const failures: BatchOperationFailure[] = [];
    for (let i = 0; i < ops.length; i += 1) {
      const op = ops[i]!;
      const result = await this.deps.pipeline.validate(op);
      if (result.warnings.length > 0) warnings.push(...result.warnings);
      if (!result.ok) {
        failures.push({
          index: i,
          ok: false,
          file: op.file,
          section: op.section,
          error: result.error,
        });
        break;
      }
    }

    if (failures.length > 0) {
      return {
        committed: false,
        dryRun,
        results: [],
        summary: { warnings, errors: failures, validated: 0 },
      };
    }

    // Dry-run: validation passed, skip apply + recompile, surface preview.
    if (dryRun) {
      const previewResults: BatchOperationResult[] = ops.map((op, index) => ({
        index,
        ok: true,
        file: op.file,
        section: op.section,
        before: '',
        after: '',
        warnings: [],
      }));
      return {
        committed: true,
        dryRun: true,
        results: previewResults,
        summary: { warnings, errors: [], validated: ops.length },
      };
    }

    // 2-4) Apply + recompile + rollback under a single cross-file mutex hold.
    //      Every touched file's lock stays acquired through the entire
    //      snapshot → apply → compile → (commit | rollback) window so a
    //      concurrent PATCH cannot race snapshots against our writes.
    const uniqueFiles = Array.from(new Set(ops.map((o) => o.file)));
    return this.deps.editor.withFileLocks(uniqueFiles, (tx) =>
      this.executeLocked(ops, tx, uniqueFiles, warnings),
    );
  }

  private async executeLocked(
    ops: readonly EditOperation[],
    tx: EditorTransaction,
    uniqueFiles: readonly ChunkEditableFile[],
    warnings: readonly ValidationWarning[],
  ): Promise<BatchResult> {
    // Snapshot every unique file under the lock — this is the TOCTOU-safe
    // moment. No other writer can slip between snapshot and apply for any
    // of these files until withFileLocks releases.
    const snapshots = new Map<ChunkEditableFile, FileSnapshot>();
    for (const file of uniqueFiles) {
      snapshots.set(file, await tx.snapshot(file));
    }

    // Apply every operation. On first failure, roll back and bail.
    const applied: BatchOperationResult[] = [];
    const touchedFiles = new Set<ChunkEditableFile>();
    for (let i = 0; i < ops.length; i += 1) {
      const op = ops[i]!;
      const result = await tx.apply(op);
      if (!result.success) {
        const restore = await rollback(tx, snapshots, touchedFiles);
        return buildFailure(
          ops,
          i,
          warnings,
          applied.length,
          restore,
          result.error ?? 'BATCH_APPLY_FAILED',
        );
      }
      touchedFiles.add(op.file);
      applied.push({
        index: i,
        ok: true,
        file: op.file,
        section: op.section,
        before: result.before,
        after: result.after,
        warnings: [],
      });
    }

    // One recompile for the whole batch. If it fails, roll every touched
    // file back to the pre-batch snapshot and surface the error.
    try {
      await this.deps.recompile();
    } catch (err) {
      const restore = await rollback(tx, snapshots, touchedFiles);
      const compilerMessage = err instanceof Error ? err.message : String(err);
      return buildFailure(
        ops,
        ops.length - 1,
        warnings,
        applied.length,
        restore,
        `COMPILATION_FAILED: ${compilerMessage}`,
        { ocPath: 'oc://batch' },
      );
    }

    return {
      committed: true,
      dryRun: false,
      results: applied,
      summary: { warnings, errors: [], validated: applied.length },
    };
  }
}

function checkEnvelope(ops: readonly EditOperation[]): PatchError | undefined {
  if (ops.length === 0) {
    return buildPatchError<ValidationFailedError>({
      code: 'VALIDATION_FAILED',
      ocPath: 'oc://batch',
      subCode: 'BATCH_EMPTY',
    });
  }
  if (ops.length > MAX_BATCH_SIZE) {
    return buildPatchError<ValidationFailedError>({
      code: 'VALIDATION_FAILED',
      ocPath: 'oc://batch',
      subCode: `BATCH_SIZE_EXCEEDED: received ${String(ops.length)} operations, max is ${String(MAX_BATCH_SIZE)}`,
    });
  }
  return undefined;
}

interface RollbackOutcome {
  readonly restored: readonly ChunkEditableFile[];
  readonly failures: readonly { readonly file: ChunkEditableFile; readonly reason: string }[];
}

async function rollback(
  tx: EditorTransaction,
  snapshots: Map<ChunkEditableFile, FileSnapshot>,
  touched: ReadonlySet<ChunkEditableFile>,
): Promise<RollbackOutcome> {
  const restored: ChunkEditableFile[] = [];
  const failures: { readonly file: ChunkEditableFile; readonly reason: string }[] = [];
  for (const file of touched) {
    // snapshots cover every op.file (the outer execute() seeds the map
    // from the same set `touched` is built from), so `get` is never
    // undefined here.
    const snapshot = snapshots.get(file)!;
    // Idempotent rollback: whether the pre-batch state was "file present
    // with content X" or "file absent", we drive the filesystem back to
    // that exact shape. Both paths go through the editor's atomic-write /
    // watcher / mutex contract so an interrupted rollback is recoverable
    // by the normal .tmp/.bak chain.
    const result = snapshot.existed
      ? await tx.writeRaw(file, snapshot.content)
      : await tx.deleteRaw(file);
    if (result.ok) {
      restored.push(file);
    } else {
      failures.push({ file, reason: result.error });
    }
  }
  return { restored, failures };
}

/**
 * Build the failure envelope for both the apply-failure and compile-failure
 * paths. When `rollback.failures` is non-empty, promotes the operation
 * error to `ROLLBACK_FAILED` so operators immediately see the list of
 * files left in an inconsistent state.
 */
function buildFailure(
  ops: readonly EditOperation[],
  failedIndex: number,
  warnings: readonly ValidationWarning[],
  appliedCount: number,
  restore: RollbackOutcome,
  subCode: string,
  ocPathOverride?: { readonly ocPath: string },
): BatchResult {
  const op = ops[failedIndex]!;
  const baseOcPath = ocPathOverride?.ocPath ?? `oc://${op.file}/${op.section}`;

  const error: PatchError =
    restore.failures.length > 0
      ? buildPatchError<RollbackFailedError>({
          code: 'ROLLBACK_FAILED',
          ocPath: baseOcPath,
          filesystemState: `${subCode}; rollback failed for ${restore.failures
            .map((f) => `${f.file} (${f.reason})`)
            .join(', ')}`,
        })
      : buildPatchError<ValidationFailedError>({
          code: 'VALIDATION_FAILED',
          ocPath: baseOcPath,
          subCode,
        });

  const failure: BatchOperationFailure = {
    index: failedIndex,
    ok: false,
    file: op.file,
    section: op.section,
    error,
  };

  return {
    committed: false,
    dryRun: false,
    results: [],
    summary: { warnings, errors: [failure], validated: appliedCount },
    rollback: {
      triggered: true,
      restoredFiles: restore.restored,
      restoreFailures: restore.failures,
    },
  };
}
