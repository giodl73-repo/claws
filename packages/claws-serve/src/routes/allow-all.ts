/**
 * PATCH /api/chunks/connections/allow-all — bulk "enable every non-R5 tool"
 * action for the CAP Connections tab.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handler resolves the cached
 * GovernanceIR, asks the SDK to {@link planAllowAll | plan the batch}, runs
 * each edit through the same {@link ValidationPipeline} the per-tool PATCH
 * route uses, applies each via {@link StructuredEditor}, triggers a single
 * recompile at the end, and returns a summary response.
 *
 * R5 exclusion (P-282) is enforced twice — once by `planAllowAll` (skip
 * upfront) and once by the pipeline itself (defense-in-depth). The planner
 * also skips fleet-locked tools and, when the system is DEGRADED, tools
 * gated by pending violations.
 *
 * Audit trail integration: every allow-all request emits one audit entry
 * via the injected {@link AllowAllAuditSink}, capturing the actor, the full
 * list of enabled tools, the full skipped list (with reasons), and the
 * aggregate before/after outcome. The sink is responsible for chain + WAL
 * persistence — this route only hands off the structured entry.
 *
 * State handling:
 *   - compilationStatus `'error'` / haltReason set → 503 COMPILATION_ERRORED
 *   - no cached IR → 409 COMPILATION_REQUIRED
 *   - otherwise the planner runs; 'stale' IR narrows the batch further
 *
 * Response shape on success (200):
 * ```
 * {
 *   summary: {
 *     enabled: number,            // newly enabled this call
 *     alreadyEnabled: number,     // were already enabled, no write attempted
 *     skipped: { tool, reason }[] // r5 / fleet-locked / violation / unclassified
 *   },
 *   chunks: Chunk<'connections'>[] // refreshed after recompile
 * }
 * ```
 *
 * @module claws-serve/routes/allow-all
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  assembleChunks,
  parseWorkspace,
  type Chunk,
  type FleetPolicy,
} from '../../../claws-sdk/src/workspace/index.js';
import {
  planAllowAll,
  type AllowAllCompileState,
  type AllowAllPlan,
  type AllowAllSkippedTool,
  type EditorTransaction,
  type StructuredEditor,
  type ValidationPipeline,
  type ToggleEdit,
} from '../../../claws-sdk/src/workspace-edit/index.js';
import type { FleetOverride } from '../../../claws-sdk/src/emit/host-approval-policy-types.js';
import type { GovernanceIR } from '../../../claws-sdk/src/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { resolveIR, respondCompilationRequired, respondIrErrored } from './ir-resolution.js';
import { stampPostEditHashes } from '../middleware/commit-on-success.js';
import { createHash } from 'node:crypto';

/**
 * Summary piece of the allow-all response body. Kept flat so the CAP UI
 * can render counts without walking nested objects.
 */
export interface AllowAllSummary {
  readonly enabled: number;
  readonly alreadyEnabled: number;
  readonly skipped: readonly AllowAllSkippedTool[];
}

/** Success response. */
export interface AllowAllResponse {
  readonly summary: AllowAllSummary;
  readonly chunks: readonly Chunk<'connections'>[];
}

/** Structured audit record emitted per allow-all call. */
export interface AllowAllAuditRecord {
  readonly timestamp: string;
  readonly actor: string;
  readonly enabled: readonly string[];
  readonly alreadyEnabled: readonly string[];
  readonly skipped: readonly AllowAllSkippedTool[];
  readonly outcome: 'ok' | 'partial-failure';
}

/**
 * Injected audit sink. Implementations can push to {@link AuditChain} +
 * WAL, forward to a SIEM, or no-op (tests). The route never instantiates
 * an AuditChain itself — chain ownership lives further up the stack.
 */
export type AllowAllAuditSink = (record: AllowAllAuditRecord) => void | Promise<void>;

/** Factory pattern mirrors {@link patchChunksRouter} so callers can swap validators per test. */
export type ValidationPipelineFactory = (
  ir: GovernanceIR,
) => ValidationPipeline | Promise<ValidationPipeline>;

export interface AllowAllRouterOptions {
  readonly workspaceRoot: string;
  readonly editor: StructuredEditor;
  readonly pipelineFactory: ValidationPipelineFactory;
  readonly getFleetPolicy?: (host: CompilationHost) => FleetPolicy | undefined;
  /**
   * Called once per allow-all request with the full structured record.
   * The route awaits the return so sinks that persist to disk can report
   * failures (logged, but do not fail the request).
   */
  readonly audit?: AllowAllAuditSink;
  /** Clock override for deterministic audit timestamps. Defaults to `Date.now()`. */
  readonly now?: () => Date;
  /**
   * Extract actor identity from the request. The default reads
   * `X-Actor-Id` (CAP UI convention); sites with stronger auth supply
   * their own extractor. Defaults to `'anonymous'` when absent.
   */
  readonly resolveActor?: (req: Request) => string;
}

function defaultResolveActor(req: Request): string {
  const header = req.headers['x-actor-id'];
  if (typeof header === 'string' && header.length > 0) return header;
  return 'anonymous';
}

/** Collect tools referenced by pending violations so the planner can skip them. */
function violationTools(ir: GovernanceIR): ReadonlySet<string> {
  const set = new Set<string>();
  for (const v of ir.analysis.violations) {
    const target = v.target;
    if (typeof target !== 'string' || target.length === 0) continue;
    // Violation targets are OC paths or dotted refs; extract the tool name.
    // Format: `oc://TOOLS.md/<tool>` or `TOOLS.<tool>` or bare `<tool>`.
    const ocMatch = /^oc:\/\/TOOLS\.md\/([^/]+)/.exec(target);
    if (ocMatch !== null) {
      set.add(ocMatch[1]!);
      continue;
    }
    const dotMatch = /^TOOLS\.([^.]+)/.exec(target);
    if (dotMatch !== null) {
      set.add(dotMatch[1]!);
      continue;
    }
    // Bare tool names are accepted so callers can flag violations without
    // a path prefix — the chunk-assembler mirrors this convention.
    if (!target.includes('/') && !target.includes('.')) {
      set.add(target);
    }
  }
  return set;
}

/**
 * Derive the current enabled-flag for a tool from the raw TOOLS.md.
 *
 * Cannot be derived from the ConnectionsChunk `enabled` field — that one
 * reflects governance state (`lock.source !== 'unclassified'`), not the
 * persisted `- enabled: true|false` list item that the edit flips. The
 * parse is line-level: find the `## <tool>` H2, walk forward until the
 * next `## ` heading, look for `- enabled: true|false`.
 */
function currentlyEnabled(toolsMd: string, toolName: string): boolean | undefined {
  const lines = toolsMd.split(/\r?\n/);
  let inSection = false;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim();
      inSection = heading === toolName;
      continue;
    }
    if (!inSection) continue;
    const match = /^-\s*enabled:\s*(true|false)\b/.exec(line);
    if (match !== null) {
      return match[1] === 'true';
    }
  }
  return undefined;
}

async function readConnectionsChunks(
  workspaceRoot: string,
  host: CompilationHost,
  ir: GovernanceIR,
  getFleetPolicy: AllowAllRouterOptions['getFleetPolicy'],
): Promise<readonly Chunk<'connections'>[]> {
  const workspace = await parseWorkspace(workspaceRoot);
  const fleetPolicy = getFleetPolicy?.(host);
  const assembly = await assembleChunks(
    workspace,
    ir,
    fleetPolicy !== undefined ? { fleetPolicy } : {},
  );
  return assembly.connections;
}

/** Result of applying one edit in the batch. */
interface ApplyOutcome {
  readonly enabled: string[];
  readonly alreadyEnabled: string[];
  readonly pipelineSkipped: AllowAllSkippedTool[];
}

/**
 * Apply the planner's edits through a held-lock transaction.
 *
 * Every edit targets TOOLS.md (the only file `planAllowAll` emits into),
 * so the caller holds the TOOLS.md mutex for the full apply → compile →
 * commit-or-rollback window. `tx.apply` skips the per-op lock acquisition
 * the public {@link StructuredEditor.apply} would take — the surrounding
 * {@link StructuredEditor.withFileLocks} callback already holds it.
 */
async function applyPlan(
  plan: AllowAllPlan,
  pipeline: ValidationPipeline,
  tx: EditorTransaction,
  preEnabled: (toolName: string) => boolean | undefined,
): Promise<ApplyOutcome> {
  const enabled: string[] = [];
  const alreadyEnabled: string[] = [];
  const pipelineSkipped: AllowAllSkippedTool[] = [];

  for (const edit of plan.edits) {
    const toolName = edit.section;
    if (preEnabled(toolName) === true) {
      alreadyEnabled.push(toolName);
      continue;
    }
    const validation = await pipeline.validate(edit);
    if (!validation.ok) {
      // Pipeline rejected an edit the planner considered eligible.
      // Map known PatchError codes to skip reasons so the response still
      // carries a structured reason; unknown codes bucket as 'violation'.
      const reason = mapPatchReason(validation.error.code);
      pipelineSkipped.push({ tool: toolName, reason });
      continue;
    }
    const result = await tx.apply(edit);
    if (!result.success) {
      pipelineSkipped.push({ tool: toolName, reason: 'violation' });
      continue;
    }
    enabled.push(toolName);
  }
  return { enabled, alreadyEnabled, pipelineSkipped };
}

function mapPatchReason(
  code: string,
): AllowAllSkippedTool['reason'] {
  switch (code) {
    case 'R5_LOCKED':
      return 'r5';
    case 'FLEET_LOCKED':
      return 'fleet-locked';
    case 'FILE_NOT_EDITABLE':
      return 'unclassified';
    default:
      return 'violation';
  }
}

function mergeSkipped(
  planner: readonly AllowAllSkippedTool[],
  pipeline: readonly AllowAllSkippedTool[],
): readonly AllowAllSkippedTool[] {
  const seen = new Map<string, AllowAllSkippedTool>();
  for (const s of planner) seen.set(s.tool, s);
  // Pipeline-discovered skips take precedence — they are based on a full
  // validator pass and carry the most specific reason.
  for (const s of pipeline) seen.set(s.tool, s);
  return Array.from(seen.values());
}

/** Build the router. Mount on the `chunks` prefix so the full path is `/api/chunks/connections/allow-all`. */
export function allowAllRouter(
  host: CompilationHost,
  options: AllowAllRouterOptions,
): Router {
  const router = Router();

  router.patch(
    '/connections/allow-all',
    (req: Request, res: Response, next: NextFunction) => {
      handleAllowAll(host, options, req, res).catch(next);
    },
  );

  return router;
}

async function handleAllowAll(
  host: CompilationHost,
  options: AllowAllRouterOptions,
  req: Request,
  res: Response,
): Promise<void> {
  // 1) Resolve IR. ERROR → 503, MISSING → 409. STALE proceeds but narrows
  //    the batch via violationTools.
  let resolution = resolveIR(host);
  if (resolution.status === 'missing') {
    try {
      await host.compile();
    } catch {
      // Swallow: empty cache plus compile failure is the canonical
      // "no IR yet" state — fall through to the 409 below rather than 500.
    }
    resolution = resolveIR(host);
    if (resolution.status === 'missing') {
      respondCompilationRequired(res);
      return;
    }
  }
  if (resolution.status === 'errored') {
    respondIrErrored(res, resolution.haltReason);
    return;
  }
  const ir = resolution.ir;
  const compileState = resolution.status;

  // 2) Plan the batch. The SDK filters R5, fleet-locked, unclassified,
  //    and (when stale) violation-gated tools.
  const fleetPolicy = options.getFleetPolicy?.(host);
  const planOptions: {
    compileState: AllowAllCompileState;
    fleetOverrides?: readonly FleetOverride[];
    violationTools?: ReadonlySet<string>;
  } = { compileState };
  if (fleetPolicy?.overrides !== undefined) {
    planOptions.fleetOverrides = fleetPolicy.overrides;
  }
  if (compileState === 'stale') {
    planOptions.violationTools = violationTools(ir);
  }
  const plan = planAllowAll(ir, planOptions);

  // 3) Capture the raw TOOLS.md so the "already enabled" count reflects
  //    what's actually persisted (the ConnectionsChunk `enabled` flag
  //    tracks governance state, not the on-disk list item we're flipping).
  //    Read is advisory — the authoritative snapshot is taken inside the
  //    mutex below so rollback is TOCTOU-safe (matches the patch-chunks
  //    pattern established in bca97594b).
  let toolsMd: string;
  try {
    toolsMd = await readFile(join(options.workspaceRoot, 'TOOLS.md'), 'utf-8');
  } catch {
    toolsMd = '';
  }
  const preEnabled = (tool: string): boolean | undefined =>
    currentlyEnabled(toolsMd, tool);

  // 4) Apply + compile + rollback under a single held-lock window so a
  //    post-write compile failure rolls the file back to its pre-edit
  //    bytes (CP-6 R2 J1). Every allow-all edit targets TOOLS.md, so the
  //    held-lock set is {'TOOLS.md'}; `tx.apply` and `tx.writeRaw` skip
  //    the per-op mutex re-acquisition and stay inside this window.
  const pipeline = await options.pipelineFactory(ir);
  const locked = await options.editor.withFileLocks(
    ['TOOLS.md'],
    async (tx) => {
      const snapshot = await tx.snapshot('TOOLS.md');
      const outcome = await applyPlan(plan, pipeline, tx, preEnabled);

      // Recompile so subsequent GETs reflect the writes AND so a broken
      // IR is caught before partners observe a 200 paired with stale
      // cache state. On failure: restore TOOLS.md to the pre-edit bytes
      // via tx.writeRaw (same mutex window, editor's atomic-write +
      // watcher contract preserved) and surface 422 COMPILATION_FAILED.
      try {
        await host.compile();
        return { kind: 'committed' as const, outcome };
      } catch (err) {
        const compilerMessage =
          err instanceof Error ? err.message : String(err);
        // Only roll back when edits actually hit disk. Zero applied
        // writes means nothing to undo and the workspace already matches
        // the snapshot.
        if (outcome.enabled.length === 0) {
          return {
            kind: 'compile-failed' as const,
            outcome,
            compilerMessage,
            rolledBack: true,
          };
        }
        const restore = snapshot.existed
          ? await tx.writeRaw('TOOLS.md', snapshot.content)
          : await tx.deleteRaw('TOOLS.md');
        return {
          kind: 'compile-failed' as const,
          outcome,
          compilerMessage,
          rolledBack: restore.ok,
          rollbackError: restore.ok ? undefined : restore.error,
        };
      }
    },
  );

  // 5) Build the skipped union (planner + pipeline) so both the success
  //    response and any rollback diagnostic carry every excluded tool.
  const skipped = mergeSkipped(plan.skipped, locked.outcome.pipelineSkipped);

  // 6) Compile-failure path — writes rolled back, audit not emitted
  //    (nothing happened on disk from the partner's perspective), 422 so
  //    commit-on-success middleware sees non-2xx and does NOT advance
  //    the version counter or record a VersionStore snapshot. This
  //    closes the W8 carry-over called out in CP-6 R2 M3r.
  if (locked.kind === 'compile-failed') {
    respondCompileFailed(
      res,
      locked.compilerMessage,
      locked.rolledBack,
      locked.rollbackError,
      skipped,
    );
    return;
  }

  const outcome = locked.outcome;

  // 7) Success — read back the refreshed chunks for the response body.
  //    The recompile inside the locked window refreshed the cached IR;
  //    `resolveIR` returns it here.
  const refreshed = resolveIR(host);
  const afterIR = refreshed.status === 'missing' ? ir : refreshed.ir;
  const afterChunks = await readConnectionsChunks(
    options.workspaceRoot,
    host,
    afterIR,
    options.getFleetPolicy,
  );

  // 8) Emit the audit record. Audit is a required invariant (CISO E2):
  //    if the sink throws, the write already committed on disk but the
  //    audit trail is broken, so the request MUST NOT succeed. Returning
  //    500 AUDIT_FAILED signals the operator to investigate; the write
  //    itself is not undone because rolling back a multi-file batch from
  //    here is not reliable and would compound the damage. The structured
  //    list of enabled tools is included so the operator can reconstruct
  //    the missing audit record by hand.
  const clock = options.now ?? ((): Date => new Date());
  const record: AllowAllAuditRecord = {
    timestamp: clock().toISOString(),
    actor: (options.resolveActor ?? defaultResolveActor)(req),
    enabled: outcome.enabled,
    alreadyEnabled: outcome.alreadyEnabled,
    skipped,
    outcome: outcome.pipelineSkipped.length === 0 ? 'ok' : 'partial-failure',
  };
  if (options.audit !== undefined) {
    try {
      await options.audit(record);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('allow-all audit sink failed:', err);
      res.status(500).json({
        error: {
          code: 'AUDIT_FAILED',
          message:
            'Allow-all writes committed but the audit sink failed; operator must reconcile the audit trail before accepting further writes',
          enabled: outcome.enabled,
          alreadyEnabled: outcome.alreadyEnabled,
          skipped,
        },
      });
      return;
    }
  }

  const body: AllowAllResponse = {
    summary: {
      enabled: outcome.enabled.length,
      alreadyEnabled: outcome.alreadyEnabled.length,
      skipped,
    },
    chunks: afterChunks,
  };

  // Plumb the post-edit TOOLS.md hash to the commit-on-success middleware
  // (CP-6 R2 M8-R2 / G2). Allow-all only mutates TOOLS.md — one read
  // here replaces the 6-file loop the middleware would otherwise run
  // for every 2xx response. Untouched OC files are inherited from the
  // previous snapshot inside the middleware.
  if (outcome.enabled.length > 0) {
    try {
      const toolsContent = await readFile(join(options.workspaceRoot, 'TOOLS.md'), 'utf-8');
      stampPostEditHashes(res, {
        'TOOLS.md': createHash('sha256').update(toolsContent, 'utf-8').digest('hex'),
      });
    } catch {
      // Best effort — if the post-write read fails, the middleware will
      // fall back to its own disk read for TOOLS.md. No correctness
      // impact, only a performance regression on this edge case.
    }
  }

  res.status(200).json(body);
}

/**
 * Emit the 422 COMPILATION_FAILED envelope for the allow-all rollback
 * path (CP-6 R2 J1). Mirrors the single-op PATCH route's error shape
 * (`{ error: { code, ... } }`) so partners branch on the same code
 * regardless of the write surface they used.
 *
 * `rolledBack === false` means the snapshot restore itself also failed
 * — the file is in an undefined state and an operator must reconcile.
 * We surface that as `ROLLBACK_FAILED` so the operator triage signal
 * cannot be mistaken for the healthier compile-only failure.
 */
function respondCompileFailed(
  res: Response,
  compilerMessage: string,
  rolledBack: boolean,
  rollbackError: string | undefined,
  skipped: readonly AllowAllSkippedTool[],
): void {
  if (!rolledBack) {
    // eslint-disable-next-line no-console
    console.error(
      '[allow-all] compile failed AND rollback failed:',
      compilerMessage,
      rollbackError,
    );
    res.status(500).json({
      error: {
        code: 'ROLLBACK_FAILED',
        message:
          'Allow-all writes were applied but the post-compile rollback failed; TOOLS.md may be in an inconsistent state and requires manual reconciliation',
        skipped,
      },
    });
    return;
  }
  res.status(422).json({
    error: {
      code: 'COMPILATION_FAILED',
      message:
        'Allow-all writes were rolled back after the post-edit compile failed; workspace is at its pre-request state',
      compilerMessage,
      skipped,
    },
  });
}

export type { ToggleEdit };
