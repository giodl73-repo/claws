/**
 * GET/PATCH /api/oc/SOUL.md — Loop-oriented section view + section PATCH.
 *
 * The M365 Loop integration needs each SOUL.md H2 section as an
 * independently addressable card with governance context (deny rule count,
 * compiler-injected marking, lock source). This route is the Loop-facing
 * formatter over the generic Layer 1 router (pulse 27); it shares the
 * `/api/oc` prefix and the same `parseWorkspace` entry point.
 *
 * Thin HTTP adapter (SDK-owns-logic): parsing, section id stability, and
 * lossless reassembly live in `claws-sdk/workspace/soul-sections`. The
 * route registers `GET /SOUL.md` and `PATCH /SOUL.md` on the `oc` prefix
 * router and MUST mount BEFORE the generic router so its Loop-shaped
 * response wins the `/SOUL.md` path.
 *
 * Write path — `PATCH /api/oc/SOUL.md` accepts a `{ sectionId, content }`
 * body. A locked section (`lockSource !== 'none'`) is rejected at the
 * router with a 403 PatchError envelope that mirrors the `/api/chunks`
 * shape so partners can reuse the same error handling. Successful writes
 * rewrite the full file atomically via tmp+rename and trigger the same
 * `host.compile()` recompile the chunk write path uses.
 *
 * CP-7 R2 FIX-H RC2 — When `tryCompile(host)` returns `undefined` (compile
 * broken: missing file, corrupt frontmatter, etc.) the PATCH path fails
 * closed with 503 `GOVERNANCE_DEGRADED`. Without this, an attacker could
 * corrupt the compile pipeline, collapse every section's `lockSource` to
 * `'none'`, and then PATCH an R5-denied section through the lock-check.
 * GET in `?view=loop` mode intentionally keeps serving a best-effort view
 * so the UI can render a degraded-banner — only the write path is gated.
 *
 * @module claws-serve/routes/loop-soul
 */

import { join } from 'node:path';
import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  atomicWriteFile,
  parseSoulSections,
  reassembleSoulSections,
  replaceSectionContent,
  parseWorkspace,
  type SoulSectionView,
} from '../../../claws-sdk/src/workspace/index.js';
import type { AuditChainSink } from '../../../claws-sdk/src/compliance/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { readActor } from '../middleware/actor.js';

export interface LoopSoulRouterOptions {
  readonly workspaceRoot: string;
  /**
   * Audit-chain sink (CP-7 R2 FIX-H RC1). When supplied, every successful
   * SOUL.md PATCH emits one `OC_FILE_EDIT` entry carrying the resolved
   * actor, section id, and workspace target. Omitted in tests that do not
   * exercise audit emission; production `createApp` always threads the
   * filesystem-backed sink so the HMAC chain covers every OC file write.
   */
  readonly auditSink?: AuditChainSink;
  /** Policy version recorded on emitted audit entries. */
  readonly policyVersion?: string;
}

/**
 * Wire shape of `GET /api/oc/SOUL.md` when the Loop formatter wins the
 * path. Mirrors the generic router's envelope (`file`, `sections`) but
 * swaps the `ParsedSection` shape for `SoulSectionView` so the governance
 * context is surfaced directly to the client.
 */
export interface LoopSoulResponse {
  readonly file: 'SOUL.md';
  readonly sections: readonly SoulSectionView[];
}

/** PATCH body — `sectionId` selects the section, `content` replaces the body. */
export interface LoopSoulPatchBody {
  readonly sectionId: string;
  readonly content: string;
}

/** PatchError-shaped envelope returned on PATCH failure. */
export interface LoopPatchErrorBody {
  readonly code:
    | 'SOUL_SECTION_LOCKED'
    | 'SOUL_SECTION_NOT_FOUND'
    | 'SOUL_PATCH_BAD_BODY'
    | 'GOVERNANCE_DEGRADED';
  readonly message: string;
  readonly sectionId?: string;
  readonly lockSource?: string;
}

/**
 * Attach `GET /SOUL.md` and `PATCH /SOUL.md` to the `oc` prefix router.
 * MUST mount BEFORE the generic Layer 1 router so the Loop response shape
 * wins the path.
 */
export function loopSoulRouter(
  host: CompilationHost,
  options: LoopSoulRouterOptions,
): Router {
  const router = Router();

  router.get('/SOUL.md', (req, res, next) => {
    handleGet(host, options, req, res, next).catch(next);
  });

  router.patch('/SOUL.md', (req, res, next) => {
    handlePatch(host, options, req, res, next).catch(next);
  });

  return router;
}

async function handleGet(
  host: CompilationHost,
  options: LoopSoulRouterOptions,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Partners reach this route via the generic `/api/oc/SOUL.md` path; the
  // Loop-specific view is opt-in via `?view=loop`. Any other shape falls
  // through so the generic router's raw `ParsedSection[]` response still
  // serves non-Loop clients (schema introspection, curl debug, etc.).
  if (req.query['view'] !== 'loop') {
    next();
    return;
  }

  const state = await parseWorkspace(options.workspaceRoot);
  // parseWorkspace throws on missing SOUL.md, so reaching this line means
  // `state.soul` is non-null.
  const ir = await tryCompile(host);
  const parse = parseSoulSections(state.soul, ir);
  const body: LoopSoulResponse = {
    file: 'SOUL.md',
    sections: parse.sections,
  };
  res.status(200).json(body);
}

async function handlePatch(
  host: CompilationHost,
  options: LoopSoulRouterOptions,
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  // CP-7 R2 FIX-H RC1 — resolve the actor eagerly so every downstream
  // branch (audit emission, error bodies) reads the same identity.
  // `readActor` returns `ANONYMOUS_ACTOR` when the header is missing and
  // defers to the sanitized `req.actor` stamped by `actorMiddleware` when
  // the header is present.
  const actor = readActor(req);

  const body = req.body as Partial<LoopSoulPatchBody> | undefined;
  if (
    body === undefined ||
    typeof body.sectionId !== 'string' ||
    body.sectionId.length === 0 ||
    typeof body.content !== 'string'
  ) {
    const err: LoopPatchErrorBody = {
      code: 'SOUL_PATCH_BAD_BODY',
      message: 'PATCH /api/oc/SOUL.md requires { sectionId: string, content: string }',
    };
    res.status(400).json({ error: err });
    return;
  }

  const state = await parseWorkspace(options.workspaceRoot);
  const ir = await tryCompile(host);

  // CP-7 R2 FIX-H RC2 — compile-undefined is a lock-bypass oracle on the
  // PATCH path. `parseSoulSections(state.soul, undefined)` collapses every
  // section's `lockSource` to `'none'`, so an R5 section that should be
  // read-only becomes writable in any compile-degraded window. Fail closed
  // here BEFORE evaluating locks; only return 503 after the body check so
  // malformed requests still surface the canonical 400.
  if (ir === undefined) {
    const err: LoopPatchErrorBody = {
      code: 'GOVERNANCE_DEGRADED',
      message:
        'SOUL.md PATCH rejected: governance compile is unavailable. Fix the workspace and retry.',
    };
    res.status(503).json({ error: err });
    return;
  }

  const parse = parseSoulSections(state.soul, ir);

  const target = parse.sections.find((s) => s.id === body.sectionId);
  if (target === undefined) {
    const err: LoopPatchErrorBody = {
      code: 'SOUL_SECTION_NOT_FOUND',
      message: `SOUL.md has no section with id: ${body.sectionId}`,
      sectionId: body.sectionId,
    };
    res.status(404).json({ error: err });
    return;
  }

  // Write-time validation — any section carrying a governance lock is
  // read-only from the Loop surface. The error envelope mirrors the
  // `/api/chunks` shape so partners can reuse existing handling.
  if (target.governanceContext.lockSource !== 'none') {
    const err: LoopPatchErrorBody = {
      code: 'SOUL_SECTION_LOCKED',
      message: `SOUL.md section "${target.heading}" is locked by ${target.governanceContext.lockSource}`,
      sectionId: target.id,
      lockSource: target.governanceContext.lockSource,
    };
    res.status(403).json({ error: err });
    return;
  }

  // `replaceSectionContent` throws only when the section id is absent;
  // we just verified it exists above, so the call is total for this path.
  const updated = replaceSectionContent(parse, target.id, body.content);
  const nextRaw = reassembleSoulSections(updated);
  const soulPath = join(options.workspaceRoot, 'SOUL.md');
  await atomicWriteFile(soulPath, nextRaw);

  // Trigger recompile so the governance IR reflects the new SOUL text.
  // Failures propagate to the error handler — the file is already on disk
  // at this point; rollback is handled by the chunk-write path's own
  // executor, not here (SOUL.md edits are additive enough that a failing
  // compile still leaves the workspace coherent with its own bytes).
  await host.compile();

  // CP-7 R2 FIX-H RC1 — emit one `OC_FILE_EDIT` audit entry per successful
  // PATCH. The sink is fire-and-forget so a persistence failure cannot
  // fail the user-visible request. Actor + section id + target-file land
  // on the same HMAC chain as session-config / trust / violation-state
  // events for downstream SOC correlation.
  if (options.auditSink !== undefined) {
    options.auditSink.emit({
      eventType: 'OC_FILE_EDIT',
      actor,
      target: 'SOUL.md',
      action: 'section-replace',
      outcome: `section:${target.id}`,
      ruleId: 'OC_FILE_EDIT',
      severity: 3,
      policyVersion: options.policyVersion ?? 'unknown',
    });
  }

  // Re-parse so the response carries the freshly-written sections with
  // up-to-date governance context (the recompile may have altered the IR
  // and therefore the per-section deny rule counts).
  const postState = await parseWorkspace(options.workspaceRoot);
  const postIr = await tryCompile(host);
  const postParse = parseSoulSections(postState.soul, postIr);

  const response: LoopSoulResponse = {
    file: 'SOUL.md',
    sections: postParse.sections,
  };
  res.status(200).json(response);
}

async function tryCompile(host: CompilationHost): Promise<Awaited<ReturnType<typeof host.compile>>['ir'] | undefined> {
  try {
    const result = await host.compile();
    return result.ir;
  } catch {
    // Serve the file even when compile is broken — Loop views must stay
    // available in degraded mode. Without an IR the parser returns
    // `lockSource: 'none'` for every section; the UI can surface a banner.
    // The PATCH path checks the returned value separately and fails
    // closed with 503 (CP-7 R2 FIX-H RC2) so the compile-degraded window
    // cannot be used as a lock-bypass oracle.
    return undefined;
  }
}
