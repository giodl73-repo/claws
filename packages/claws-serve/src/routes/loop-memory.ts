/**
 * GET/PATCH /api/oc/MEMORY.md — Loop sync formatter (Pulse 36).
 *
 * Section-level response formatter for MEMORY.md that decomposes the
 * file into independently-addressable {@link MemoryLoopSection}s for
 * M365 Loop rendering. The "loop" concept is how the RESPONSE is
 * formatted — one object per H2 section with a stable slug id — not a
 * separate endpoint. The generic Layer 1 router (pulse 27) still owns
 * the whole-file read at `/api/oc/MEMORY.md`; this router sits in front
 * of it and only fires on the memory-specific shape clients request via
 * `?loop=true` (GET) or the section PATCH surface.
 *
 * Writes: MEMORY.md is NOT part of {@link CHUNK_EDITABLE_FILES}, so the
 * structured editor + BatchExecutor path used by `/api/chunks/:tab` does
 * not apply. Instead the PATCH handler runs a minimal write-time
 * validation pipeline locally — the section must exist in the current
 * parse, and the replacement body must begin with the same `## heading`
 * so the section identity cannot be rewritten out from under the id. On
 * success the file is rewritten via {@link atomicWriteFile} (tmp+rename)
 * with the original preamble and sibling sections preserved byte-for-byte;
 * a crash mid-PATCH never truncates the on-disk file.
 *
 * CP-7 R2 FIX-H RC2 — When a {@link CompilationHost} is supplied and its
 * compile result is `undefined` (compile broken: missing file, corrupt
 * frontmatter, etc.) the PATCH path fails closed with 503
 * `GOVERNANCE_DEGRADED` before any disk write. A compile-degraded window
 * is a governance-lock bypass oracle on any OC file edit and must never
 * be served from the write path. GET responses stay best-effort so the
 * Loop UI can still render with a degraded-banner.
 *
 * Graph API sync is intentionally a no-op today — when an M365 auth
 * context is bound on the request (Pulse 42+), the handler will fan the
 * same section payload out to the Loop page. Without it, the endpoints
 * operate in local-only mode and return success once the disk write
 * completes. The response shape is identical either way so partners can
 * opt into Graph sync without a contract change.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): all parsing and reassembly
 * lives in {@link parseMemorySections} / {@link reassembleMemorySections}.
 * The handler composes them and adds HTTP error translation.
 *
 * @module claws-serve/routes/loop-memory
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  atomicWriteFile,
  parseMemorySections,
  reassembleMemorySections,
  type MemoryLoopSection,
  type ParsedMemorySections,
} from '../../../claws-sdk/src/workspace/index.js';
import type { AuditChainSink } from '../../../claws-sdk/src/compliance/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { readActor } from '../middleware/actor.js';

export interface LoopMemoryRouterOptions {
  /** Absolute workspace root to read MEMORY.md from. */
  readonly workspaceRoot: string;
  /**
   * Compilation host (CP-7 R2 FIX-H RC2). When supplied the PATCH path
   * probes the compile state before writing; a broken compile returns
   * 503 `GOVERNANCE_DEGRADED` instead of silently edits a file whose
   * lock state cannot be evaluated. Optional on the type so test
   * harnesses that only exercise the formatter can skip it; production
   * `createApp` always threads the host.
   */
  readonly host?: CompilationHost;
  /**
   * Audit-chain sink (CP-7 R2 FIX-H RC1). When supplied, every successful
   * MEMORY.md PATCH emits one `OC_FILE_EDIT` entry carrying the resolved
   * actor, section id, and workspace target. Omitted in tests that do not
   * exercise audit emission; production `createApp` always threads the
   * filesystem-backed sink so the HMAC chain covers every OC file write.
   */
  readonly auditSink?: AuditChainSink;
  /** Policy version recorded on emitted audit entries. */
  readonly policyVersion?: string;
  /**
   * Optional M365 Graph API sync hook. Invoked on successful PATCH when
   * an authenticated Graph context is present on the request. Failures
   * are reported back to the caller as `graphSync: { ok: false }` in the
   * response body so the Loop UI can decide whether to retry.
   *
   * When omitted (the default) the endpoints operate in local-only mode.
   */
  readonly graphSync?: GraphSyncHook;
}

/**
 * Graph sync hook contract. Returns `{ ok: true }` on success or
 * `{ ok: false, reason }` on failure. The hook MUST NOT throw —
 * local-only PATCH semantics require that a failed Graph push does not
 * roll back the disk write that has already succeeded.
 */
export type GraphSyncHook = (
  section: MemoryLoopSection,
  context: GraphSyncContext,
) => Promise<GraphSyncResult>;

export interface GraphSyncContext {
  readonly workspaceRoot: string;
  readonly authToken: string;
}

export type GraphSyncResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Shape returned by `GET /api/oc/MEMORY.md?loop=true`.
 *
 * `sections` is the section slug + heading + entry count rolled up — the
 * raw body content is intentionally included per section so partners can
 * render without a second round-trip. `preamble` is the untouched
 * content before the first H2 (file-level H1 + intro prose).
 */
export interface LoopMemoryResponse {
  readonly file: 'MEMORY.md';
  readonly preamble: string;
  readonly sections: readonly MemoryLoopSection[];
}

export interface LoopMemoryPatchBody {
  readonly sectionId: string;
  readonly content: string;
}

export interface LoopMemoryPatchResponse {
  readonly file: 'MEMORY.md';
  readonly section: MemoryLoopSection;
  readonly graphSync?: GraphSyncResult;
}

/**
 * Mount GET + PATCH handlers on the `oc` prefix router. The routes
 * intentionally live at `/MEMORY.md` (and `/MEMORY.md/section/:id` for
 * PATCH) so the URL shape matches the generic Layer 1 router.
 */
export function loopMemoryRouter(options: LoopMemoryRouterOptions): Router {
  const router = Router();

  router.get('/MEMORY.md', (req, res, next) => {
    handleGet(options, req, res, next).catch(next);
  });

  router.patch('/MEMORY.md', (req, res, next) => {
    handlePatch(options, req, res).catch(next);
  });

  return router;
}

async function handleGet(
  options: LoopMemoryRouterOptions,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Only intercept when the client explicitly asks for the loop-shaped
  // response; otherwise fall through to the generic Layer 1 router.
  if (req.query['loop'] !== 'true') {
    next();
    return;
  }

  const parsed = await readMemory(options.workspaceRoot);
  if (parsed === null) {
    res.status(404).json({
      error: {
        code: 'OC_FILE_MISSING',
        message: 'OC file not found in workspace: MEMORY.md',
      },
    });
    return;
  }

  const body: LoopMemoryResponse = {
    file: 'MEMORY.md',
    preamble: parsed.preamble,
    sections: parsed.sections,
  };
  res.status(200).json(body);
}

async function handlePatch(
  options: LoopMemoryRouterOptions,
  req: Request,
  res: Response,
): Promise<void> {
  // CP-7 R2 FIX-H RC1 — resolve the actor eagerly so audit emission sees
  // the same identity every downstream branch does.
  const actor = readActor(req);

  const body = req.body as Partial<LoopMemoryPatchBody> | undefined;
  if (body === undefined || typeof body.sectionId !== 'string' || typeof body.content !== 'string') {
    res.status(400).json({
      error: {
        code: 'LOOP_MEMORY_BAD_BODY',
        message: 'PATCH body must be { sectionId: string, content: string }',
      },
    });
    return;
  }

  // CP-7 R2 FIX-H RC2 — a broken compile cannot evaluate governance locks
  // on OC files. MEMORY.md itself is not lock-targeted today, but the
  // violation-state machine gates OC PATCHes generally: if we serve a
  // write during a compile-degraded window, an operator editing MEMORY.md
  // while SOUL.md is corrupt gets no feedback that the governance invariant
  // is undefined. Fail closed with the same envelope the violation-gate
  // uses so partners can handle both surfaces uniformly.
  if (options.host !== undefined) {
    const ir = await tryCompile(options.host);
    if (ir === undefined) {
      res.status(503).json({
        error: {
          code: 'GOVERNANCE_DEGRADED',
          message:
            'MEMORY.md PATCH rejected: governance compile is unavailable. Fix the workspace and retry.',
        },
      });
      return;
    }
  }

  const parsed = await readMemory(options.workspaceRoot);
  if (parsed === null) {
    res.status(404).json({
      error: {
        code: 'OC_FILE_MISSING',
        message: 'OC file not found in workspace: MEMORY.md',
      },
    });
    return;
  }

  const existing = parsed.sections.find((s) => s.id === body.sectionId);
  if (existing === undefined) {
    res.status(404).json({
      error: {
        code: 'LOOP_MEMORY_SECTION_MISSING',
        message: `Section not found in MEMORY.md: ${body.sectionId}`,
      },
    });
    return;
  }

  const validation = validateSectionReplacement(existing, body.content);
  if (!validation.ok) {
    res.status(422).json({
      error: {
        code: 'LOOP_MEMORY_VALIDATION_FAILED',
        message: validation.reason,
      },
    });
    return;
  }

  const replacements = new Map([[existing.id, body.content]]);
  const nextRaw = reassembleMemorySections(parsed, replacements);
  const absPath = join(options.workspaceRoot, 'MEMORY.md');
  await atomicWriteFile(absPath, nextRaw);

  // Re-parse so the response carries the exact MemoryLoopSection that is
  // now on disk (entryCount etc. reflect the replacement, not the prior
  // version).
  const reparsed = parseMemorySections(nextRaw);
  const updatedSection =
    reparsed.sections.find((s) => s.id === body.sectionId) ?? existing;

  // CP-7 R2 FIX-H RC1 — emit one `OC_FILE_EDIT` audit entry per successful
  // PATCH. The sink is fire-and-forget so a persistence failure cannot
  // fail the user-visible request. Mirrors the SOUL.md PATCH event shape
  // so SOC tooling can aggregate across OC files uniformly.
  if (options.auditSink !== undefined) {
    options.auditSink.emit({
      eventType: 'OC_FILE_EDIT',
      actor,
      target: 'MEMORY.md',
      action: 'section-replace',
      outcome: `section:${existing.id}`,
      ruleId: 'OC_FILE_EDIT',
      severity: 3,
      policyVersion: options.policyVersion ?? 'unknown',
    });
  }

  const graphContext = extractGraphContext(req);
  let graphSync: GraphSyncResult | undefined;
  if (options.graphSync !== undefined && graphContext !== null) {
    graphSync = await options.graphSync(updatedSection, {
      workspaceRoot: options.workspaceRoot,
      authToken: graphContext.authToken,
    });
  }

  const responseBody: LoopMemoryPatchResponse = {
    file: 'MEMORY.md',
    section: updatedSection,
    ...(graphSync !== undefined ? { graphSync } : {}),
  };
  res.status(200).json(responseBody);
}

async function readMemory(
  workspaceRoot: string,
): Promise<ParsedMemorySections | null> {
  try {
    const raw = await readFile(join(workspaceRoot, 'MEMORY.md'), 'utf-8');
    return parseMemorySections(raw);
  } catch {
    return null;
  }
}

async function tryCompile(
  host: CompilationHost,
): Promise<Awaited<ReturnType<typeof host.compile>>['ir'] | undefined> {
  try {
    const result = await host.compile();
    return result.ir;
  } catch {
    return undefined;
  }
}

/**
 * Write-time validation: a replacement MUST begin with the same
 * `## heading` line as the section it replaces. This keeps the section
 * id stable across a PATCH (the Loop UI addresses sections by slug, and
 * re-running the parse after a heading-change PATCH would silently
 * rename the section — an S09 finding).
 */
function validateSectionReplacement(
  section: MemoryLoopSection,
  replacement: string,
): { ok: true } | { ok: false; reason: string } {
  const firstLine = replacement.split(/\r?\n/, 1)[0] ?? '';
  if (!firstLine.startsWith('## ')) {
    return {
      ok: false,
      reason: 'Replacement content must begin with a `## Heading` line.',
    };
  }
  const newHeading = firstLine.slice(3).trim();
  if (newHeading !== section.heading) {
    return {
      ok: false,
      reason: `Heading mismatch: expected "## ${section.heading}", got "## ${newHeading}". Section ids are stable across edits; create a new section instead of renaming.`,
    };
  }
  return { ok: true };
}

interface GraphContext {
  readonly authToken: string;
}

/**
 * Look for an M365 Graph auth context on the request. When absent the
 * endpoints operate in local-only mode; when present the handler fans
 * the section out to Loop via the configured {@link GraphSyncHook}.
 *
 * The authorisation header lookup is permissive — Pulse 42 will replace
 * this with the real M365 token extractor once the auth middleware
 * lands. Until then any `Authorization: Bearer <token>` carries through.
 */
function extractGraphContext(req: Request): GraphContext | null {
  const header = req.header('authorization');
  if (header === undefined || !header.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = header.slice('bearer '.length).trim();
  if (token.length === 0) return null;
  return { authToken: token };
}
