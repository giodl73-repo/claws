/**
 * POST /api/batch — atomic batch-edit endpoint for the CAP settings UI.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handler deserialises an
 * array of {@link EditOperation} values, hands them to the SDK's
 * {@link BatchExecutor}, and serialises the result. All business logic
 * (validation aggregation, apply, rollback, size-cap enforcement, single
 * recompile) lives in claws-sdk.
 *
 * Request shape:
 * ```
 * POST /api/batch?dryRun=true
 * Content-Type: application/json
 * { "operations": [ { "kind": "toggle", "file": "TOOLS.md", ... }, ... ] }
 * ```
 *
 * Response shape (success):
 * ```
 * {
 *   committed: true,
 *   dryRun: boolean,
 *   results: BatchOperationResult[],
 *   summary: BatchGovernanceSummary
 * }
 * ```
 *
 * Response shape (rejected batch): same envelope with `committed: false`
 * and per-op errors in `summary.errors`. Status codes:
 *   - 200 — batch accepted and applied (or dry-run validated)
 *   - 400 — envelope-level rejection (empty, oversized, malformed)
 *   - 422 — validation rejected one or more operations
 *   - 500 — apply or rollback failure
 *   - 503 — server degraded
 *
 * @module claws-serve/routes/batch
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  BatchExecutor,
  CHUNK_EDITABLE_FILES,
  MAX_BATCH_SIZE,
  type BatchResult,
  type ChunkEditableFile,
  type EditOperation,
  type PatchError,
  type StructuredEditor,
  type ValidationPipeline,
} from '../../../claws-sdk/src/workspace-edit/index.js';
import type { GovernanceIR } from '../../../claws-sdk/src/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { degradedModeError, type DegradedReason } from '../lifecycle/health-check.js';
import { isDryRunRequest } from '../middleware/dry-run.js';
import { readActor } from '../middleware/actor.js';
import { stampPostEditHashes } from '../middleware/commit-on-success.js';
import type { RollbackAuditEvent, RollbackAuditSink } from './patch-chunks.js';

/** Factory mirrors {@link patchChunksRouter} so the route builds a fresh pipeline per request. */
export type ValidationPipelineFactory = (
  ir: GovernanceIR,
) => ValidationPipeline | Promise<ValidationPipeline>;

/** Probe returning a degraded reason when writes should be refused. */
export type DegradedModeProbe = () => DegradedReason | undefined;

export interface BatchRouterOptions {
  readonly workspaceRoot: string;
  readonly editor: StructuredEditor;
  readonly pipelineFactory: ValidationPipelineFactory;
  readonly degradedModeProbe?: DegradedModeProbe;
  /**
   * Audit sink for atomic rollback events (CP-6 R2 F1 / ciso M-new-1).
   * When a batch runs through BatchExecutor and its post-compile path
   * fires rollback, one {@link RollbackAuditEvent} is emitted per
   * touched file so the CISO's tamper-proof hash chain covers the
   * /api/batch surface the same way it already covers PATCH /api/chunks.
   * Defaults to a no-op sink so tests that do not need audit coverage
   * can omit the option without losing the "zero JSONL" assertion.
   */
  readonly auditSink?: RollbackAuditSink;
  /**
   * Extract actor identity from the request for audit records. Defaults
   * to {@link readActor}, which prefers `req.actor` (stamped by
   * actorMiddleware) and falls back to the `X-Actor-Id` header.
   */
  readonly resolveActor?: (req: Request) => string;
}

const DEFAULT_BATCH_AUDIT_SINK: RollbackAuditSink = () => {};

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

async function safeHashFile(absPath: string): Promise<string> {
  try {
    const content = await readFile(absPath, 'utf-8');
    return sha256(content);
  } catch {
    return '';
  }
}

const EDIT_KINDS = new Set(['toggle', 'set', 'append', 'remove']);

function isChunkEditableFile(value: unknown): value is ChunkEditableFile {
  return typeof value === 'string' && (CHUNK_EDITABLE_FILES as readonly string[]).includes(value);
}

function validateEditOperationShape(
  body: unknown,
): { ok: true; op: EditOperation } | { ok: false; code: string; message: string } {
  if (body === null || typeof body !== 'object') {
    return { ok: false, code: 'INVALID_BATCH_OPERATION', message: 'operation must be an object' };
  }
  const obj = body as Record<string, unknown>;
  if (typeof obj['kind'] !== 'string' || !EDIT_KINDS.has(obj['kind'])) {
    return {
      ok: false,
      code: 'INVALID_EDIT_KIND',
      message: `Field "kind" must be one of: toggle, set, append, remove`,
    };
  }
  if (!isChunkEditableFile(obj['file'])) {
    return {
      ok: false,
      code: 'INVALID_EDIT_FILE',
      message: `Field "file" must be one of: ${CHUNK_EDITABLE_FILES.join(', ')}`,
    };
  }
  if (typeof obj['section'] !== 'string') {
    return { ok: false, code: 'INVALID_EDIT_SECTION', message: 'Field "section" must be a string' };
  }
  const kind = obj['kind'];
  if (kind === 'toggle') {
    if (typeof obj['field'] !== 'string') {
      return { ok: false, code: 'INVALID_EDIT_FIELD', message: 'Field "field" must be a string' };
    }
    if (typeof obj['value'] !== 'boolean') {
      return { ok: false, code: 'INVALID_EDIT_VALUE', message: 'Field "value" must be a boolean for toggle' };
    }
  } else if (kind === 'set') {
    if (typeof obj['field'] !== 'string') {
      return { ok: false, code: 'INVALID_EDIT_FIELD', message: 'Field "field" must be a string' };
    }
    if (typeof obj['value'] !== 'string') {
      return { ok: false, code: 'INVALID_EDIT_VALUE', message: 'Field "value" must be a string for set' };
    }
  } else {
    if (typeof obj['item'] !== 'string') {
      return { ok: false, code: 'INVALID_EDIT_ITEM', message: 'Field "item" must be a string' };
    }
  }
  return { ok: true, op: body as EditOperation };
}

function sendEnvelopeError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

/** Derive the HTTP status from a {@link BatchResult}. */
export function statusForBatchResult(result: BatchResult): number {
  if (result.committed) return 200;
  if (result.envelopeError !== undefined) return 400;
  if (result.rollback?.triggered === true) return 500;
  return 422;
}

export function batchRouter(host: CompilationHost, options: BatchRouterOptions): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    handleBatch(host, options, req, res).catch(next);
  });

  return router;
}

async function handleBatch(
  host: CompilationHost,
  options: BatchRouterOptions,
  req: Request,
  res: Response,
): Promise<void> {
  // Degraded-mode guard — writes are refused while the startup health
  // check has flagged the server unhealthy.
  const degraded = options.degradedModeProbe?.();
  if (degraded !== undefined) {
    res.status(503).json(degradedModeError(degraded));
    return;
  }

  const body = req.body as { operations?: unknown } | null | undefined;
  if (body === null || body === undefined || typeof body !== 'object') {
    sendEnvelopeError(res, 400, 'INVALID_BATCH_BODY', 'Request body must be a JSON object with an "operations" array');
    return;
  }
  const rawOps = body.operations;
  if (!Array.isArray(rawOps)) {
    sendEnvelopeError(res, 400, 'INVALID_BATCH_BODY', 'Field "operations" must be an array');
    return;
  }
  if (rawOps.length === 0) {
    sendEnvelopeError(res, 400, 'BATCH_EMPTY', 'Batch must contain at least one operation');
    return;
  }
  if (rawOps.length > MAX_BATCH_SIZE) {
    sendEnvelopeError(
      res,
      400,
      'BATCH_SIZE_EXCEEDED',
      `Batch has ${String(rawOps.length)} operations; max is ${String(MAX_BATCH_SIZE)}`,
    );
    return;
  }

  // Shape-check every op before handing to the SDK so malformed entries
  // surface with an index-tagged 400 instead of a generic validator error.
  const ops: EditOperation[] = [];
  for (let i = 0; i < rawOps.length; i += 1) {
    const shape = validateEditOperationShape(rawOps[i]);
    if (!shape.ok) {
      sendEnvelopeError(
        res,
        400,
        shape.code,
        `operations[${String(i)}]: ${shape.message}`,
      );
      return;
    }
    ops.push(shape.op);
  }

  // Compile so validators bind to the current IR.
  let ir: GovernanceIR;
  try {
    const compileResult = await host.compile();
    ir = compileResult.ir;
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'COMPILATION_FAILED',
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return;
  }

  const pipeline = await options.pipelineFactory(ir);
  const dryRun = isDryRunRequest(req);

  // Capture per-file pre-edit hashes BEFORE execute() so the audit
  // event carries the same "just before the executor acquired its
  // mutex" hash the PATCH /api/chunks path records. Skipped on dry-run
  // (no mutation → nothing to attest). The hashes are advisory — the
  // executor itself holds the per-file mutex across snapshot → apply
  // → compile → rollback, so correctness of rollback does not depend
  // on these values.
  const auditSink = options.auditSink ?? DEFAULT_BATCH_AUDIT_SINK;
  const resolveActor = options.resolveActor ?? readActor;
  const uniqueFiles = Array.from(new Set(ops.map((o) => o.file)));
  const preEditHashes = new Map<ChunkEditableFile, string>();
  if (!dryRun) {
    for (const file of uniqueFiles) {
      preEditHashes.set(file, await safeHashFile(join(options.workspaceRoot, file)));
    }
  }

  const executor = new BatchExecutor({
    workspaceRoot: options.workspaceRoot,
    editor: options.editor,
    pipeline,
    recompile: async () => {
      await host.compile();
    },
  });

  const result = await executor.execute(ops, { dryRun });

  // Emit rollback audit events symmetric to patch-chunks. Fires on both
  // the apply-phase and compile-phase rollback branches so the JSONL
  // stream captures every "write attempted but reverted" event. One
  // record per unique op.file — the executor rolls back the whole
  // touched set, so the audit trail must enumerate every file that was
  // snapshotted + restored (or failed to restore). CP-6 R2 F1/F3.
  if (!dryRun && result.committed === false && result.rollback?.triggered === true) {
    emitBatchRollbackAudit({
      result,
      preEditHashes,
      uniqueFiles,
      workspaceRoot: options.workspaceRoot,
      actor: resolveActor(req),
      sink: auditSink,
    });
  }

  // Plumb post-edit hashes to the commit-on-success middleware so
  // `recordSnapshot` skips the 6-reads-per-2xx-write disk loop
  // (CP-6 R2 M8-R2 / G2). BatchExecutor already computed
  // `BatchOperationResult.after` during apply; reusing it here removes
  // a read-per-file on the hot response path without changing
  // VersionStore semantics.
  if (result.committed && !dryRun) {
    const postEditHashes: Record<string, string> = {};
    // Keep the last `after` per file — later ops on the same file
    // supersede earlier ones.
    for (const op of result.results) {
      if (typeof op.after === 'string' && op.after.length > 0) {
        postEditHashes[op.file] = op.after;
      }
    }
    stampPostEditHashes(res, postEditHashes);
  }

  res.status(statusForBatchResult(result)).json(result);
}

interface BatchAuditContext {
  readonly result: BatchResult;
  readonly preEditHashes: ReadonlyMap<ChunkEditableFile, string>;
  readonly uniqueFiles: readonly ChunkEditableFile[];
  readonly workspaceRoot: string;
  readonly actor: string;
  readonly sink: RollbackAuditSink;
}

function emitBatchRollbackAudit(ctx: BatchAuditContext): void {
  const rollback = ctx.result.rollback;
  if (rollback === undefined || rollback.triggered === false) return;

  const firstError = ctx.result.summary.errors[0];
  const compilerMessage = firstError !== undefined ? extractBatchMessage(firstError.error) : '';
  const failuresByFile = new Map<ChunkEditableFile, string>();
  for (const f of rollback.restoreFailures) failuresByFile.set(f.file, f.reason);
  const timestamp = new Date().toISOString();

  // Emit one event per unique file the executor snapshotted. Restored
  // files get rollbackOk=true; files in restoreFailures get
  // rollbackOk=false with the reason. Files not in either list were
  // never touched (e.g. first op failed before the second op's file
  // was snapshotted); we still emit so the audit trail shows which
  // files were in-scope for the attempted batch.
  const restoredSet = new Set<ChunkEditableFile>(rollback.restoredFiles);
  for (const file of ctx.uniqueFiles) {
    const absPath = join(ctx.workspaceRoot, file);
    const preEditHash = ctx.preEditHashes.get(file) ?? '';
    const failureReason = failuresByFile.get(file);
    const event: RollbackAuditEvent =
      failureReason !== undefined
        ? {
            ocPath: `oc://${file}`,
            filePath: absPath,
            preEditHash,
            postEditHash: '',
            compilerMessage,
            rollbackOk: false,
            rollbackError: failureReason,
            timestamp,
            actor: ctx.actor,
          }
        : {
            ocPath: `oc://${file}`,
            filePath: absPath,
            preEditHash,
            postEditHash: '',
            compilerMessage,
            rollbackOk: restoredSet.has(file),
            timestamp,
            actor: ctx.actor,
          };
    ctx.sink(event);
  }
}

/**
 * Extract a compiler/apply message from a batch-executor failure so the
 * audit record mirrors the patch-chunks format. BatchExecutor encodes
 * both apply failures and compile failures inside a VALIDATION_FAILED
 * subCode (or a ROLLBACK_FAILED filesystemState); we peel the prefix
 * so the JSONL line reads the same as a single-op rollback event.
 */
function extractBatchMessage(err: PatchError): string {
  if (err.code === 'ROLLBACK_FAILED') return err.filesystemState;
  if (err.code === 'VALIDATION_FAILED') {
    return err.subCode.startsWith('COMPILATION_FAILED: ')
      ? err.subCode.slice('COMPILATION_FAILED: '.length)
      : err.subCode;
  }
  return '';
}
