/**
 * GET /api/chunks/connections — Layer 2 chunk route for the Connections tab.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handler composes
 * `parseWorkspace` + `assembleChunks`, then projects the resulting
 * `connections[]` into either all servers or a single server.
 *
 * Two endpoints:
 * - GET /api/chunks/connections            → every server's chunk
 * - GET /api/chunks/connections/:server    → one named server's chunk
 *
 * Fail-closed defaults: tools without an explicit risk classification from
 * the compiled GovernanceIR are treated as R5 by the assembler (P-270) and
 * arrive here already locked with `lock.source: 'r5'` or
 * `lock.source: 'unclassified'`. This route does not re-derive risk.
 *
 * IR-resolution contract: this endpoint triggers a just-in-time compile
 * when no cached IR exists (see gate W-5 — flagged for CP-6 follow-up).
 * After the compile attempt it consumes the shared {@link resolveIR}
 * helper so the 409/503 error shape matches every other chunk route.
 *
 * WorkspaceError / OcPathError propagation: thrown errors bubble via
 * `next(err)` to the centralized {@link errorHandler} middleware, which
 * maps them to the uniform `{ error: { code, message, details? } }`
 * response body. No per-route error translation.
 *
 * @module claws-serve/routes/chunks-connections
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  assembleChunks,
  parseWorkspace,
  type Chunk,
  type FleetPolicy,
} from '../../../claws-sdk/src/workspace/index.js';
import type { GovernanceIR } from '../../../claws-sdk/src/index.js';
import type { CompilationHost } from '../compilation-host.js';
import {
  applyTimeTravelCache,
  resolveReadIR,
  respondCompilationRequired,
  respondIrErrored,
} from './ir-resolution.js';
import { getTimeTravelState } from '../middleware/time-travel.js';

/**
 * Runtime context supplier — injected per request so the route stays a
 * pure adapter. The caller provides the fleet policy bundle at mount time.
 */
export interface ChunksConnectionsRouterOptions {
  /** Absolute workspace root to introspect. */
  readonly workspaceRoot: string;
  /** Optional fleet policy feeding per-tool lock derivation. */
  readonly getFleetPolicy?: (host: CompilationHost) => FleetPolicy | undefined;
}

/**
 * Response wrapper for the all-servers endpoint. Keeps the array under a
 * single `chunks` key so future top-level fields (pagination, warnings)
 * can be added without breaking partners.
 */
export interface ChunksConnectionsResponse {
  readonly chunks: readonly Chunk<'connections'>[];
}

/**
 * Attach the connections routes. Mount on the `chunks` prefix router from
 * `registerRoutes` so the resulting paths are:
 * - `/api/chunks/connections`
 * - `/api/chunks/connections/:server`
 */
export function chunksConnectionsRouter(
  host: CompilationHost,
  options: ChunksConnectionsRouterOptions,
): Router {
  const router = Router();

  router.get('/connections', (req: Request, res: Response, next: NextFunction) => {
    handleAllServers(host, options, req, res, next).catch(next);
  });

  router.get('/connections/:server', (req: Request, res: Response, next: NextFunction) => {
    handleSingleServer(host, options, req, res, next).catch(next);
  });

  return router;
}

async function assembleConnectionsChunks(
  host: CompilationHost,
  options: ChunksConnectionsRouterOptions,
  ir: GovernanceIR,
): Promise<readonly Chunk<'connections'>[]> {
  const workspace = await parseWorkspace(options.workspaceRoot);
  const fleetPolicy = options.getFleetPolicy?.(host);
  const result = await assembleChunks(
    workspace,
    ir,
    fleetPolicy !== undefined ? { fleetPolicy } : {},
  );
  return result.connections;
}

/**
 * Result of {@link ensureIRForRead} — IR plus a historical marker so the
 * caller can stamp the immutable cache header before writing a 200 body.
 */
interface ReadIr {
  readonly ir: GovernanceIR;
  readonly historical: boolean;
}

async function ensureIRForRead(
  req: Request,
  host: CompilationHost,
  res: Response,
): Promise<ReadIr | undefined> {
  // Time-travel short-circuit — when `?at=` resolved, use the historical
  // IR directly. Skips the just-in-time compile below because the
  // middleware already produced a fully-formed IR from the VersionStore
  // or snapshot directory.
  const timeTravel = getTimeTravelState(req);
  if (timeTravel !== undefined) {
    return { ir: timeTravel.governanceIR, historical: true };
  }

  let resolution = resolveReadIR(req, host);
  if (resolution.status === 'missing') {
    // Gate W-5 known: synchronous compile from GET handler. Scheduled for
    // CP-6 — do not paper over until the CompilerEventBus bridge lands.
    await host.compile();
    resolution = resolveReadIR(req, host);
    /* c8 ignore next 4 — compile() always populates the cache; this is
       a belt-and-suspenders guard for the (currently impossible)
       compile-succeeds-but-cache-is-empty race. */
    if (resolution.status === 'missing') {
      respondCompilationRequired(res);
      return undefined;
    }
  }
  if (resolution.status === 'errored') {
    respondIrErrored(res, resolution.haltReason);
    return undefined;
  }
  return { ir: resolution.ir, historical: false };
}

async function handleAllServers(
  host: CompilationHost,
  options: ChunksConnectionsRouterOptions,
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const read = await ensureIRForRead(req, host, res);
  if (read === undefined) return;
  const chunks = await assembleConnectionsChunks(host, options, read.ir);
  if (read.historical) applyTimeTravelCache(res);
  const body: ChunksConnectionsResponse = { chunks };
  res.status(200).json(body);
}

async function handleSingleServer(
  host: CompilationHost,
  options: ChunksConnectionsRouterOptions,
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const read = await ensureIRForRead(req, host, res);
  if (read === undefined) return;
  const chunks = await assembleConnectionsChunks(host, options, read.ir);
  const requested = req.params['server'] ?? '';
  const match = chunks.find((c) => c.data.server === requested);
  if (match === undefined) {
    res.status(404).json({
      error: {
        code: 'CONNECTIONS_SERVER_NOT_FOUND',
        message: `No connections chunk for server '${requested}'`,
      },
    });
    return;
  }
  if (read.historical) applyTimeTravelCache(res);
  res.status(200).json(match);
}
