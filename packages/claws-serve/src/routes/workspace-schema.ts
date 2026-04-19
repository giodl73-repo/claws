/**
 * GET /api/oc/ — Layer 1 root: workspace schema introspection.
 *
 * The first endpoint any CAP partner or the TUI calls. The response tells
 * the consumer which OC files exist in the workspace, what sections each
 * declares, where to fetch the corresponding Layer 2 chunk, which sessions
 * are live, and the compilation / violation state of the system.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handler composes
 * `parseWorkspace` with `buildWorkspaceSchema` and renders the result.
 * All business decisions live in `claws-sdk/workspace/schema-builder`.
 *
 * Missing files do not produce a 404; they produce `exists: false` in the
 * response so partners can skip the associated UI surface (acceptance
 * criterion: S16 partial-workspace case).
 *
 * @module claws-serve/routes/workspace-schema
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  buildWorkspaceSchema,
  parseWorkspace,
  type CompilationStatus,
  type ViolationState,
  type WorkspaceSchema,
  type WorkspaceSessionInfo,
} from '../../../claws-sdk/src/workspace/index.js';
import type { CompilationHost } from '../compilation-host.js';

/**
 * Runtime context supplier — injected per request so the route stays a
 * pure adapter. The TUI / partners provide sessions and violation state
 * via the runtime layer; when absent, the builder's defaults apply.
 */
export interface WorkspaceSchemaContext {
  /** Currently live sessions, or an empty list when none. */
  readonly sessions?: readonly WorkspaceSessionInfo[];
  /** Whole-system violation state. Defaults to `clean`. */
  readonly violationState?: ViolationState;
}

export interface WorkspaceSchemaRouterOptions {
  /** Absolute workspace root to introspect. */
  readonly workspaceRoot: string;
  /**
   * Optional hook that supplies live runtime context per request.
   * Invoked with the CompilationHost so the caller can correlate state.
   */
  readonly getContext?: (host: CompilationHost) => WorkspaceSchemaContext;
}

/**
 * Attach `GET /` (resolves to `GET /api/oc/`) to the `oc` prefix router
 * returned by `registerRoutes`. The caller owns mounting — this router
 * stays a plain Express Router for test-level composition.
 */
export function workspaceSchemaRouter(
  host: CompilationHost,
  options: WorkspaceSchemaRouterOptions,
): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    handleSchemaRequest(host, options, req, res, next).catch(next);
  });

  return router;
}

async function handleSchemaRequest(
  host: CompilationHost,
  options: WorkspaceSchemaRouterOptions,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const workspace = await parseWorkspace(options.workspaceRoot);
  const context = options.getContext?.(host) ?? {};
  const compilation = buildCompilationStatus(host);
  const schema: WorkspaceSchema = buildWorkspaceSchema(workspace, {
    ...(context.sessions !== undefined ? { sessions: context.sessions } : {}),
    ...(context.violationState !== undefined ? { violationState: context.violationState } : {}),
    compilation,
  });
  res.status(200).json(schema);
}

function buildCompilationStatus(host: CompilationHost): CompilationStatus {
  const ir = host.getCachedIR();
  if (ir === undefined) {
    return { kind: 'uncompiled', compiledAt: null, hash: null };
  }
  /* c8 ignore next 2 — when getCachedIR() is defined, getCompiledAt() /
     getHash() are guaranteed non-undefined (CacheEntry invariant). The
     `?? null` fallbacks exist only to satisfy exactOptionalPropertyTypes. */
  const compiledAt = host.getCompiledAt() ?? null;
  const hash = host.getHash() ?? null;
  const kind = ir.analysis.violations.length > 0 ? 'stale' : 'clean';
  return { kind, compiledAt, hash };
}
