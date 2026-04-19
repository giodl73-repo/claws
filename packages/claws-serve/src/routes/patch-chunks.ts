/**
 * PATCH /api/chunks/:tab — write path for CAP settings.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handler deserialises a
 * validated {@link EditOperation} from the request, delegates mutation +
 * rollback orchestration to the SDK's {@link BatchExecutor} (as a batch
 * of one), and projects the updated chunk back to the caller. Business
 * logic (R5 enforcement, fleet locks, governance denies, lossless write,
 * chunk assembly, atomic rollback under per-file mutex) lives in claws-sdk.
 *
 * Before the D2 dedup this handler maintained its own snapshot + rollback
 * code path parallel to {@link BatchExecutor}; the two diverged on D1
 * (raw writeFile bypassing editor mutex + watcher) and D3 (TOCTOU between
 * preEditContent read and rollback). Routing a single-op batch through
 * the executor collapses both surfaces into one.
 *
 * Six routes are exposed — one per CAP tab — so the URL space mirrors
 * the GET chunk routes. Each tab constrains which {@link ChunkEditableFile}
 * the body may target: partners sending a mismatched `file` receive a
 * 400 `TAB_FILE_MISMATCH` long before the ValidationPipeline sees the op.
 * `general`, `memory`, `groups`, and `entitlements` have no chunk-editable
 * backing file today — PATCH to those tabs is accepted at the router
 * level but always resolves to `FILE_NOT_EDITABLE` from the SDK preflight.
 *
 * Response mapping — success serialises the updated chunk; failure maps
 * each {@link PatchError} variant to a stable HTTP status so partners
 * can branch on status without parsing the body:
 *   - R5_LOCKED          → 403
 *   - FLEET_LOCKED       → 403
 *   - GOVERNANCE_DENIED  → 403
 *   - FILE_NOT_EDITABLE  → 403
 *   - VALIDATION_FAILED  → 422
 *   - COMPILATION_FAILED → 500
 *   - ROLLBACK_FAILED    → 500
 *   - UNKNOWN_ERROR      → 500
 *
 * @module claws-serve/routes/patch-chunks
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  assembleChunks,
  parseWorkspace,
  type Chunk,
  type ChunkAssemblyResult,
  type FleetPolicy,
} from '../../../claws-sdk/src/workspace/index.js';
import {
  BatchExecutor,
  buildPatchError,
  StructuredEditor,
  ValidationPipeline,
  type BatchResult,
  type ChunkEditableFile,
  type EditOperation,
  type PatchError,
  type UnknownError,
  type CompilationFailedError,
  type RollbackFailedError,
  type ValidationFailedError,
} from '../../../claws-sdk/src/workspace-edit/index.js';
import type { GovernanceIR } from '../../../claws-sdk/src/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { isDryRunRequest } from '../middleware/dry-run.js';
import {
  buildDryRunAuditRecord,
  emitDryRunAudit,
  sanitizeDryRunPatchError,
  sanitizeDryRunWarning,
  type DryRunAuditSink,
} from '../middleware/dry-run-sanitize.js';
import { sanitizePatchErrorForResponse } from './error-sanitize.js';
import { degradedModeError, type DegradedReason } from '../lifecycle/health-check.js';
import { stampPostEditHashes } from '../middleware/commit-on-success.js';
import { readActor } from '../middleware/actor.js';

/**
 * Tabs the CAP UI exposes as PATCH endpoints. The four tabs whose data
 * lives outside {@link CHUNK_EDITABLE_FILES} (general, memory, groups,
 * entitlements) resolve to `FILE_NOT_EDITABLE` at the SDK preflight.
 */
export type PatchTab =
  | 'general'
  | 'preferences'
  | 'connections'
  | 'memory'
  | 'groups'
  | 'entitlements';

const PATCH_TABS: readonly PatchTab[] = [
  'general',
  'preferences',
  'connections',
  'memory',
  'groups',
  'entitlements',
];

/**
 * Each tab constrains which chunk-editable file the body is allowed to
 * target. A `null` value means the tab has no chunk-editable backing
 * file — any PATCH to that tab is preflight-rejected by the SDK, but
 * the router still answers so partners receive a structured error.
 */
const TAB_TO_FILE: Readonly<Record<PatchTab, ChunkEditableFile | null>> = {
  general: null,
  preferences: 'SETTINGS.md',
  connections: 'TOOLS.md',
  memory: null,
  groups: null,
  entitlements: null,
};

/**
 * Factory the router invokes per-request to obtain a fresh
 * {@link ValidationPipeline}. The factory receives the current compiled
 * {@link GovernanceIR} so validators (R5, governance) bind to the latest
 * capability manifest. Callers decide which validators participate
 * (allow-all mode in pulse 33 skips everything).
 */
export type ValidationPipelineFactory = (
  ir: GovernanceIR,
) => ValidationPipeline | Promise<ValidationPipeline>;

/**
 * Optional function returning the current degraded reason, or `undefined`
 * when the server is healthy. The router invokes this on every PATCH so
 * changes to server mode (e.g. operator-triggered drain) take effect
 * without re-binding the handler.
 */
export type DegradedModeProbe = () => DegradedReason | undefined;

/**
 * Audit sink for atomic rollback events (P-274). Called whenever a
 * post-write compile fails and the OC file is restored. Emits
 * pre-edit/post-edit SHA-256 hashes plus the rollback outcome so the
 * CISO's tamper-proof hash chain can include the event.
 *
 * `actor` identifies the human behind the write (CP-6 R2 F3 / ciso
 * M-new-2). It is populated from `req.actor` (stamped by
 * {@link actorMiddleware}); handlers that emit outside the middleware
 * chain fall back to the {@link ANONYMOUS_ACTOR} sentinel via
 * {@link readActor}. Legal discovery requires attribution — the field
 * is required, not optional, so every JSONL line carries an identity
 * (even if it is literally `"anonymous"`).
 */
export interface RollbackAuditEvent {
  readonly ocPath: string;
  readonly filePath: string;
  readonly preEditHash: string;
  readonly postEditHash: string;
  readonly compilerMessage: string;
  readonly rollbackOk: boolean;
  readonly rollbackError?: string;
  readonly timestamp: string;
  /** Actor identity captured from `req.actor` (or `anonymous`). CP-6 R2 F3. */
  readonly actor: string;
}

export type RollbackAuditSink = (event: RollbackAuditEvent) => void;

const DEFAULT_AUDIT_SINK: RollbackAuditSink = () => {};

export interface PatchChunksRouterOptions {
  readonly workspaceRoot: string;
  readonly editor: StructuredEditor;
  readonly pipelineFactory: ValidationPipelineFactory;
  readonly getFleetPolicy?: (host: CompilationHost) => FleetPolicy | undefined;
  /** Probe for degraded mode. When it returns a reason, PATCH returns 503. */
  readonly degradedModeProbe?: DegradedModeProbe;
  /** Audit sink for atomic rollback events (P-274). */
  readonly auditSink?: RollbackAuditSink;
  /**
   * Audit sink for dry-run probes (CISO E3). Dry-run is a governance-
   * policy oracle — without auditing, attackers can enumerate policy
   * rules via probes without leaving a trail. The sink records every
   * probe (outcome + code + target) so SOC tooling can flag patterns.
   * Sink failures are logged, never propagated.
   */
  readonly dryRunAuditSink?: DryRunAuditSink;
  /**
   * Extract actor identity from the request for dry-run audit records.
   * Defaults to reading `X-Actor-Id` (CAP UI convention) or `anonymous`.
   */
  readonly resolveActor?: (req: Request) => string;
  /** Clock override for deterministic audit timestamps. Defaults to `Date.now()`. */
  readonly now?: () => Date;
}

function defaultResolveActor(req: Request): string {
  // Prefer the stamp applied by actorMiddleware (so custom extractors
  // upstream win), fall back to the header parsing in actor.ts's
  // readActor, and finally to the ANONYMOUS_ACTOR sentinel.
  return readActor(req);
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/** Map a PatchError code to its HTTP status. */
export function statusForPatchError(code: PatchError['code']): number {
  switch (code) {
    case 'R5_LOCKED':
    case 'FLEET_LOCKED':
    case 'GOVERNANCE_DENIED':
    case 'FILE_NOT_EDITABLE':
      return 403;
    case 'VALIDATION_FAILED':
      return 422;
    case 'COMPILATION_FAILED':
    case 'ROLLBACK_FAILED':
    case 'UNKNOWN_ERROR':
      return 500;
  }
}

function respondPatchError(res: Response, err: PatchError): void {
  const status = statusForPatchError(err.code);
  res.status(status).json({ error: err });
}

/**
 * Response-time sanitizer wrapper. Strips workspace-absolute paths and
 * clears `cause` / `compilerMessage` / `filesystemState` so the HTTP
 * response cannot be used as a filesystem oracle. Operators still see
 * the full detail via server logs (and via the rollback audit sink for
 * the post-compile path).
 *
 * CISO W05 + gateway N-1: UNKNOWN_ERROR.cause and
 * COMPILATION_FAILED.compilerMessage leak filesystem paths. This wrapper
 * is the single seam — never call `respondPatchError` directly on the
 * error envelope that hits the wire; call this instead.
 */
function respondSanitizedPatchError(
  res: Response,
  err: PatchError,
  workspaceRoot: string,
): void {
  // Server-side detail log before scrubbing — preserves the operator's
  // ability to debug without exposing anything to the caller.
  if (err.code === 'UNKNOWN_ERROR' || err.code === 'COMPILATION_FAILED' || err.code === 'ROLLBACK_FAILED') {
    // eslint-disable-next-line no-console
    console.error('[patch-chunks] internal error:', err);
  }
  respondPatchError(res, sanitizePatchErrorForResponse(err, workspaceRoot));
}

/**
 * Dry-run variant — mirrors `respondPatchError` but tags the body with
 * `dryRun: true` so clients can distinguish previewed rejections from
 * committed ones without parsing headers.
 *
 * CISO E3: dry-run is a governance oracle. The response MUST NOT leak
 * ruleIds, policy sources, governance file paths, policyFile paths,
 * compiler messages, or cause strings — an attacker probing with
 * `?dryRun=true` may be unauthenticated. The sanitizer preserves only the
 * stable `code` + oc:// path so legitimate clients still learn whether a
 * pending edit would be accepted.
 */
function respondDryRunError(res: Response, err: PatchError): void {
  const sanitized = sanitizeDryRunPatchError(err);
  const status = statusForPatchError(sanitized.code);
  res.status(status).json({ dryRun: true, error: sanitized });
}

/**
 * Select the chunk(s) that correspond to the tab the partner just edited.
 *
 * For `connections` the assembler returns an array; the response includes
 * every server's chunk (matching the GET route shape) so callers can pick
 * the server they care about. Every other tab is a singleton.
 */
function projectTabChunk(
  tab: PatchTab,
  result: ChunkAssemblyResult,
): Chunk | readonly Chunk[] | null {
  switch (tab) {
    case 'general':
      return result.general;
    case 'preferences':
      return result.preferences;
    case 'connections':
      return result.connections;
    case 'memory':
      return result.memory;
    case 'groups':
      return result.groups;
    case 'entitlements':
      return result.entitlements;
  }
}

/**
 * Attach the six PATCH /chunks/:tab routes. Mount on the `chunks` prefix
 * router from `registerRoutes` so the resulting paths are
 * `/api/chunks/{general,preferences,connections,memory,groups,entitlements}`.
 */
export function patchChunksRouter(
  host: CompilationHost,
  options: PatchChunksRouterOptions,
): Router {
  const router = Router();

  for (const tab of PATCH_TABS) {
    router.patch(`/${tab}`, (req: Request, res: Response, next: NextFunction) => {
      handlePatch(host, options, tab, req, res).catch(next);
    });
  }

  return router;
}

async function handlePatch(
  host: CompilationHost,
  options: PatchChunksRouterOptions,
  tab: PatchTab,
  req: Request,
  res: Response,
): Promise<void> {
  // Middleware has validated the envelope and stashed the operation.
  // The router contract requires patchShapeMiddleware to run ahead of
  // this handler, so `editOperation` is always present here.
  const op = (req as Request & { editOperation: EditOperation }).editOperation;

  // Tab/file must match so the URL namespace stays a trustworthy hint.
  const expected = TAB_TO_FILE[tab];
  if (expected !== null && op.file !== expected) {
    res.status(400).json({
      error: {
        code: 'TAB_FILE_MISMATCH',
        message: `PATCH /api/chunks/${tab} only accepts edits to ${expected}; body targets ${op.file}`,
      },
    });
    return;
  }

  // Degraded-mode guard (S33): writes are rejected while the server is
  // degraded so the operator can fix the root cause (bad compile or
  // missing fleet policy) before fresh edits land on a broken workspace.
  const degraded = options.degradedModeProbe?.();
  if (degraded !== undefined) {
    res.status(503).json(degradedModeError(degraded));
    return;
  }

  const dryRun = isDryRunRequest(req);
  // Shared clock + actor for any dry-run audit emission below.
  const nowFn = options.now ?? ((): Date => new Date());
  const resolveActor = options.resolveActor ?? defaultResolveActor;

  // 0) Ensure a fresh IR exists so validators (R5, governance) bind to
  //    the current capability manifest. If compilation fails here, the
  //    pipeline can't be built — fail fast with COMPILATION_FAILED.
  let ir: GovernanceIR;
  let compileDurationMs: number;
  try {
    const compileResult = await host.compile();
    ir = compileResult.ir;
    compileDurationMs = compileResult.durationMs;
  } catch (err) {
    const error = buildPatchError<CompilationFailedError>({
      code: 'COMPILATION_FAILED',
      ocPath: `oc://${op.file}/${op.section}`,
      compilerMessage: err instanceof Error ? err.message : String(err),
    });
    if (dryRun) {
      await emitDryRunAudit(
        options.dryRunAuditSink,
        buildDryRunAuditRecord({
          actor: resolveActor(req),
          timestamp: nowFn().toISOString(),
          editKind: op.kind,
          file: op.file,
          section: op.section,
          denialCode: 'COMPILATION_FAILED',
        }),
      );
      respondDryRunError(res, error);
    } else respondSanitizedPatchError(res, error, options.workspaceRoot);
    return;
  }

  // Build the pipeline once so dry-run and commit paths share it. The
  // BatchExecutor re-runs pipeline.validate inside its own orchestration;
  // by sharing the same instance we guarantee identical validator behaviour
  // across the two paths (no drift between "previewed" and "committed").
  const pipeline = await options.pipelineFactory(ir);

  // Dry-run short-circuit — validate only, never mutate disk, never compile.
  // Mirrors the post-refactor executor's dryRun=true branch but preserves
  // the pre-existing HTTP envelope shape expected by CAP clients.
  if (dryRun) {
    const pipelineResult = await pipeline.validate(op);
    if (!pipelineResult.ok) {
      await emitDryRunAudit(
        options.dryRunAuditSink,
        buildDryRunAuditRecord({
          actor: resolveActor(req),
          timestamp: nowFn().toISOString(),
          editKind: op.kind,
          file: op.file,
          section: op.section,
          denialCode: pipelineResult.error.code,
        }),
      );
      respondDryRunError(res, pipelineResult.error);
      return;
    }
    await emitDryRunAudit(
      options.dryRunAuditSink,
      buildDryRunAuditRecord({
        actor: resolveActor(req),
        timestamp: nowFn().toISOString(),
        editKind: op.kind,
        file: op.file,
        section: op.section,
      }),
    );
    const safeWarnings = pipelineResult.warnings.map((w) =>
      sanitizeDryRunWarning(w as unknown as Record<string, unknown>),
    );
    res.status(200).json({
      dryRun: true,
      valid: true,
      governance: {
        warnings: safeWarnings,
        errors: [],
        estimatedRecompileMs: compileDurationMs,
      },
    });
    return;
  }

  // Capture pre-edit hash for the audit sink (P-274 contract). The hash
  // is advisory — it tags the audit event so the CISO's tamper chain
  // reflects what was on disk just before the executor acquired its
  // mutex. Rollback correctness itself is covered by the executor's
  // in-mutex snapshot (D3 TOCTOU fix).
  const absPath = join(options.workspaceRoot, op.file);
  const preEditHash = await safeHashFile(absPath, options.workspaceRoot);
  const ocPath = `oc://${op.file}/${op.section}`;
  const auditSink = options.auditSink ?? DEFAULT_AUDIT_SINK;

  // Delegate snapshot → apply → recompile → rollback to BatchExecutor.
  // The executor holds the per-file mutex across the entire window so
  // a concurrent PATCH on the same file serialises behind ours — closes
  // D1 (rollback through editor mutex + watcher + atomic chain) and
  // D3 (snapshot inside the same mutex as the write + rollback).
  const executor = new BatchExecutor({
    workspaceRoot: options.workspaceRoot,
    editor: options.editor,
    pipeline,
    recompile: async () => {
      const result = await host.compile();
      ir = result.ir;
    },
  });

  let batch: BatchResult;
  try {
    batch = await executor.execute([op]);
  } catch (err) {
    // BatchExecutor's contract does not throw on validation or apply
    // failures — it returns a structured BatchResult. A thrown error
    // here is unexpected (e.g. editor's resolveTarget throwing because
    // the file is outside CHUNK_EDITABLE_FILES). Surface as UNKNOWN_ERROR.
    const error = buildPatchError<UnknownError>({
      code: 'UNKNOWN_ERROR',
      ocPath,
      cause: err instanceof Error ? err.message : String(err),
    });
    respondSanitizedPatchError(res, error, options.workspaceRoot);
    return;
  }

  if (batch.committed) {
    const workspace = await parseWorkspace(options.workspaceRoot);
    const fleetPolicy = options.getFleetPolicy?.(host);
    const assembly = await assembleChunks(
      workspace,
      ir,
      fleetPolicy !== undefined ? { fleetPolicy } : {},
    );
    const chunk = projectTabChunk(tab, assembly);
    // Plumb the executor's post-edit hashes to the commit-on-success
    // middleware so `recordSnapshot` doesn't need to re-read this file
    // from disk (CP-6 R2 M8-R2 / G2). One file per single-op batch.
    const postEditHashes: Record<string, string> = {};
    for (const result of batch.results) {
      if (typeof result.after === 'string' && result.after.length > 0) {
        postEditHashes[result.file] = result.after;
      }
    }
    stampPostEditHashes(res, postEditHashes);
    res.status(200).json({ chunk, warnings: batch.summary.warnings });
    return;
  }

  // Rejected. Translate the executor's envelope back into the route-level
  // PatchError shapes partners already depend on, and emit the rollback
  // audit event when the post-compile path fired.
  respondBatchFailure(res, batch, {
    ocPath,
    absPath,
    preEditHash,
    auditSink,
    workspaceRoot: options.workspaceRoot,
    actor: resolveActor(req),
  });
}

async function safeHashFile(absPath: string, workspaceRoot: string): Promise<string> {
  // Defense-in-depth boundary check. `op.file` is already constrained by
  // CHUNK_EDITABLE_FILES (a closed set of literal filenames), but CodeQL
  // cannot see through the validator. Using path.relative + startsWith('..')
  // / isAbsolute is a CodeQL-recognised sanitiser for js/path-injection.
  const resolvedRoot = resolve(workspaceRoot);
  const resolvedPath = resolve(absPath);
  const rel = relative(resolvedRoot, resolvedPath);
  /* c8 ignore next 3 — unreachable: `op.file` is validated against
     CHUNK_EDITABLE_FILES (closed set of 3 filenames) before reaching this
     branch; the check is defense-in-depth for CodeQL. */
  if (rel.startsWith('..') || isAbsolute(rel)) {
    return '';
  }
  const safePath = resolve(resolvedRoot, rel);
  try {
    const content = await readFile(safePath, 'utf-8');
    return sha256(content);
  } catch {
    return '';
  }
}

interface BatchFailureContext {
  readonly ocPath: string;
  readonly absPath: string;
  readonly preEditHash: string;
  readonly auditSink: RollbackAuditSink;
  /** Workspace root — used to strip absolute paths from response bodies. */
  readonly workspaceRoot: string;
  /** Actor identity for the rollback audit event (CP-6 R2 F3). */
  readonly actor: string;
}

/**
 * Map a BatchExecutor failure envelope onto the single-op PATCH contract.
 *
 * The executor emits three failure shapes for the single-op path:
 *   1. Pipeline rejection (pre-write) — surfaces the SDK error as-is.
 *   2. Apply failure (editor returned !success) — partner contract for
 *      this route is UNKNOWN_ERROR, not VALIDATION_FAILED. Translated.
 *   3. Post-compile failure (rollback fired) — emits the audit event and
 *      maps to COMPILATION_FAILED (rollback succeeded) or ROLLBACK_FAILED
 *      (rollback failed). Both carry the pre-edit SHA-256 for audit.
 */
function respondBatchFailure(
  res: Response,
  batch: BatchResult,
  ctx: BatchFailureContext,
): void {
  // BatchExecutor guarantees committed=false always carries at least one
  // per-op error (validation rejection, apply failure, or compile rollback).
  const firstError = batch.summary.errors[0]!;
  const rollbackTriggered = batch.rollback?.triggered === true;
  const rollbackFailures = batch.rollback?.restoreFailures ?? [];
  const perOp = firstError.error;

  // Post-compile rollback path. The executor already promotes the op error
  // to ROLLBACK_FAILED when rollback itself failed — either way we emit
  // the audit event and translate to the partner-facing code.
  if (rollbackTriggered && isPostCompileFailure(perOp)) {
    const compilerMessage = extractCompilerMessage(perOp);
    emitRollbackAudit(ctx, compilerMessage, rollbackFailures);

    if (rollbackFailures.length > 0 || perOp.code === 'ROLLBACK_FAILED') {
      const failureList = rollbackFailures
        .map((f) => `${f.file}: ${f.reason}`)
        .join('; ');
      const rollbackError = buildPatchError<RollbackFailedError>({
        code: 'ROLLBACK_FAILED',
        ocPath: ctx.ocPath,
        filesystemState: failureList.length > 0
          ? `file at ${ctx.absPath} may have post-edit content; restore failed for [${failureList}]`
          : `post-compile failure at ${ctx.absPath} — manual recovery required`,
      });
      respondSanitizedPatchError(res, rollbackError, ctx.workspaceRoot);
      return;
    }

    const error = buildPatchError<CompilationFailedError>({
      code: 'COMPILATION_FAILED',
      ocPath: ctx.ocPath,
      compilerMessage: `${compilerMessage} — edit rolled back, OC file restored (pre-edit sha256: ${ctx.preEditHash})`,
    });
    respondSanitizedPatchError(res, error, ctx.workspaceRoot);
    return;
  }

  // Apply-phase failure — executor returned rollback.triggered without a
  // compile-failure subCode. The single-op /api/chunks contract expects
  // UNKNOWN_ERROR here (not VALIDATION_FAILED), so we translate; the
  // /api/batch route preserves the raw BATCH_APPLY_FAILED code via its
  // own adapter.
  if (rollbackTriggered) {
    const error = buildPatchError<UnknownError>({
      code: 'UNKNOWN_ERROR',
      ocPath: ctx.ocPath,
      cause: (perOp as ValidationFailedError).subCode,
    });
    respondSanitizedPatchError(res, error, ctx.workspaceRoot);
    return;
  }

  // Pipeline rejection path (R5 / FLEET / GOVERNANCE / VALIDATION /
  // FILE_NOT_EDITABLE) — pass the SDK error through so HTTP status and
  // body shape stay byte-identical to the pre-refactor contract. These
  // never carry absolute workspace paths, so no sanitization needed.
  respondPatchError(res, perOp);
}

/**
 * When BatchExecutor fires rollback, the per-op error is always one of:
 *   - `ROLLBACK_FAILED` — the executor already surfaced a rollback failure
 *   - `VALIDATION_FAILED` with subCode `COMPILATION_FAILED: <msg>` — compile fail
 *   - `VALIDATION_FAILED` with any other subCode — apply-phase failure
 * `isPostCompileFailure` distinguishes the first two from the third.
 */
function isPostCompileFailure(err: PatchError): boolean {
  if (err.code === 'ROLLBACK_FAILED') return true;
  return err.code === 'VALIDATION_FAILED' && err.subCode.startsWith('COMPILATION_FAILED');
}

function extractCompilerMessage(err: PatchError): string {
  if (err.code === 'ROLLBACK_FAILED') return err.filesystemState;
  // err.code is VALIDATION_FAILED per isPostCompileFailure narrowing.
  const subCode = (err as ValidationFailedError).subCode;
  return subCode.startsWith('COMPILATION_FAILED: ')
    ? subCode.slice('COMPILATION_FAILED: '.length)
    : subCode;
}

function emitRollbackAudit(
  ctx: BatchFailureContext,
  compilerMessage: string,
  rollbackFailures: readonly { readonly file: ChunkEditableFile; readonly reason: string }[],
): void {
  const rollbackOk = rollbackFailures.length === 0;
  const event: RollbackAuditEvent = rollbackOk
    ? {
        ocPath: ctx.ocPath,
        filePath: ctx.absPath,
        preEditHash: ctx.preEditHash,
        postEditHash: '',
        compilerMessage,
        rollbackOk: true,
        timestamp: new Date().toISOString(),
        actor: ctx.actor,
      }
    : {
        ocPath: ctx.ocPath,
        filePath: ctx.absPath,
        preEditHash: ctx.preEditHash,
        postEditHash: '',
        compilerMessage,
        rollbackOk: false,
        rollbackError: rollbackFailures.map((f) => `${f.file}: ${f.reason}`).join('; '),
        timestamp: new Date().toISOString(),
        actor: ctx.actor,
      };
  ctx.auditSink(event);
}
