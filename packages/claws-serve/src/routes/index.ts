/**
 * Route registration scaffold for claws-serve.
 *
 * Mounts the CP-5 `/api/*` prefix tree and the `/api/health` endpoint
 * onto an Express app. Later pulses (22-28) populate each prefix with
 * their read API handlers; this scaffold reserves the namespace and
 * exposes the CompilationHost to downstream route modules via the
 * returned prefix routers.
 *
 * Prefix layout:
 * - /api/oc/*         Layer 1 — generic OC read routes
 * - /api/chunks/*     Layer 2 — chunk assembly read routes
 * - /api/governance   Layer 3 — governance read routes
 * - /api/status       Layer 3 — status read routes
 * - /api/events       Layer 3 — SSE event stream
 * - /api/health       Liveness probe (always available)
 *
 * @module claws-serve/routes/index
 */

import { Router, type Express, type Request, type Response } from 'express';
import type { CompilationHost } from '../compilation-host.js';
import { EventStream } from '../sse/event-stream.js';
import { eventsRouter } from './events.js';

/** claws-serve version, reported in the health probe. */
export const CLAWS_SERVE_VERSION = '0.36.0';

/**
 * A lazily-populated prefix router. CP-5 follow-up pulses import the
 * corresponding entry from `registerRoutes`' return value and attach
 * handlers for the specific endpoints they own.
 */
export interface PrefixRouters {
  readonly oc: Router;
  readonly chunks: Router;
  readonly governance: Router;
  readonly status: Router;
  readonly events: Router;
}

/**
 * Health-check response body.
 *
 * `status` is `'ok'` when all required runtime dependencies are
 * available, `'degraded'` when a non-fatal dependency (e.g. the fleet
 * policy) is missing. `reason` is only set when degraded.
 */
export interface ApiHealthResponse {
  readonly status: 'ok' | 'degraded';
  readonly version: string;
  readonly uptime: number;
  readonly reason?: string;
}

/**
 * Options controlling which runtime integrations participate in the
 * health probe.
 */
export interface RegisterRoutesOptions {
  /**
   * Indicates whether the fleet policy has been loaded into the
   * CompilationHost context. When `false`, `/api/health` reports
   * `status: 'degraded'` with `reason: 'fleet_policy_missing'`.
   */
  readonly fleetPolicyAvailable?: boolean;
  /** Epoch ms when the server started. Defaults to `Date.now()`. */
  readonly startedAt?: number;
  /**
   * Optional SSE broadcaster. When supplied, `/api/events` streams the
   * broadcaster's events. When omitted, a fresh EventStream is created so
   * the endpoint is always reachable (useful in tests + single-process
   * deployments).
   */
  readonly eventStream?: EventStream;
}

/** Prefix routers plus the live EventStream. */
export interface RegisterRoutesResult extends PrefixRouters {
  readonly eventStream: EventStream;
}

function uptimeSeconds(startedAt: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

/**
 * Register the `/api/*` prefix tree and `/api/health` endpoint on the
 * supplied Express app. Returns the prefix routers so later pulses can
 * mount handlers without re-touching the scaffold.
 *
 * @param app   Express app (or any Router-compatible mount point)
 * @param host  CompilationHost for route handlers to access governance
 *              IR, workspace roots, and related SDK state.
 * @param opts  Optional health-probe configuration.
 */
export function registerRoutes(
  app: Express,
  host: CompilationHost,
  opts: RegisterRoutesOptions = {},
): RegisterRoutesResult {
  const startedAt = opts.startedAt ?? Date.now();
  const fleetPolicyAvailable = opts.fleetPolicyAvailable ?? true;
  const eventStream = opts.eventStream ?? new EventStream();

  // Attach the CompilationHost to the app so route modules (and tests)
  // can retrieve it via `app.get('compilationHost')`. Fastify calls
  // this "decoration"; Express uses app-level settings.
  app.set('compilationHost', host);
  app.set('eventStream', eventStream);

  const oc = Router();
  const chunks = Router();
  const governance = Router();
  const status = Router();
  const events = eventsRouter(eventStream);

  app.use('/api/oc', oc);
  app.use('/api/chunks', chunks);
  app.use('/api/governance', governance);
  app.use('/api/status', status);
  app.use('/api/events', events);

  app.get('/api/health', (_req: Request, res: Response) => {
    const body: ApiHealthResponse = fleetPolicyAvailable
      ? {
          status: 'ok',
          version: CLAWS_SERVE_VERSION,
          uptime: uptimeSeconds(startedAt),
        }
      : {
          status: 'degraded',
          version: CLAWS_SERVE_VERSION,
          uptime: uptimeSeconds(startedAt),
          reason: 'fleet_policy_missing',
        };
    res.status(200).json(body);
  });

  return { oc, chunks, governance, status, events, eventStream };
}
