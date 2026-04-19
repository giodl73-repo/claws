/**
 * Trust-tier routes (Pulse 39 / S12 / S26) — the CP-7 security gate.
 *
 * Two endpoints:
 *
 *   - `GET  /api/trust`          → current tier, full history, pending escalations.
 *   - `PATCH /api/trust/escalate` → request a tier promotion (JWT for T1+).
 *
 * Thin HTTP adapter over {@link TrustManager} (claws-sdk): the router
 * deserialises the request body, delegates every decision to the SDK, and
 * projects `TrustError` codes onto stable HTTP statuses so CAP clients can
 * branch on status without parsing the body.
 *
 * Error mapping (all fail-closed):
 *   - JWT_MISSING, JWT_BAD_AUDIENCE, JWT_BAD_SUBJECT   → 403 (insufficient approval)
 *   - JWT_MALFORMED, JWT_BAD_SIGNATURE, JWT_EXPIRED    → 401 (authentication failed)
 *   - JWT_REPLAYED                                      → 409 (nonce already consumed)
 *   - TIER_INVALID, TIER_NOT_PROMOTION                  → 400 (bad request)
 *
 * The manager is mounted as a singleton per serve process. The signing key
 * is sourced once at mount time — if the key file is unreadable, mount
 * throws rather than serving an endpoint that silently accepts any token.
 *
 * @module claws-serve/routes/trust
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import type { TrustManager, TrustError } from '../../../claws-sdk/src/workspace/index.js';
import type { TrustTier } from '../../../claws-sdk/src/workspace/index.js';
import { readActor } from '../middleware/actor.js';

/** Router options — the manager is injected so tests can swap clock/key. */
export interface TrustRouterOptions {
  readonly manager: TrustManager;
}

/** Request body for PATCH /api/trust/escalate. */
interface EscalateBody {
  readonly targetTier?: unknown;
  readonly justification?: unknown;
  readonly approvalJwt?: unknown;
}

const VALID_TIERS: ReadonlySet<TrustTier> = new Set<TrustTier>([
  'T0',
  'T1',
  'T2',
  'T3',
  'T4',
]);

/** Map a trust-layer error to the HTTP status the pulse spec mandates. */
export function statusForTrustError(code: TrustError['code']): number {
  switch (code) {
    case 'JWT_MISSING':
    case 'JWT_BAD_AUDIENCE':
    case 'JWT_BAD_SUBJECT':
      return 403;
    case 'JWT_MALFORMED':
    case 'JWT_BAD_SIGNATURE':
    case 'JWT_EXPIRED':
      return 401;
    case 'JWT_REPLAYED':
      return 409;
    case 'TIER_INVALID':
    case 'TIER_NOT_PROMOTION':
      return 400;
  }
}

/** Mount GET + PATCH handlers on a fresh router. */
export function trustRouter(options: TrustRouterOptions): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    handleGet(options.manager, res).catch(next);
  });

  router.patch('/escalate', (req: Request, res: Response, next: NextFunction) => {
    handleEscalate(options.manager, req, res).catch(next);
  });

  return router;
}

async function handleGet(manager: TrustManager, res: Response): Promise<void> {
  await manager.hydrate();
  const state = manager.getState();
  res.status(200).json({
    currentTier: state.currentTier,
    history: state.history,
    pendingEscalations: state.pendingEscalations,
  });
}

async function handleEscalate(
  manager: TrustManager,
  req: Request,
  res: Response,
): Promise<void> {
  const body = (req.body ?? {}) as EscalateBody;
  if (
    typeof body.targetTier !== 'string' ||
    !VALID_TIERS.has(body.targetTier as TrustTier)
  ) {
    res.status(400).json({
      error: {
        code: 'TIER_INVALID',
        message: 'targetTier must be one of T0, T1, T2, T3, T4',
      },
    });
    return;
  }
  if (typeof body.justification !== 'string' || body.justification.length === 0) {
    res.status(400).json({
      error: {
        code: 'JUSTIFICATION_REQUIRED',
        message: 'justification must be a non-empty string',
      },
    });
    return;
  }

  const jwt =
    typeof body.approvalJwt === 'string' && body.approvalJwt.length > 0
      ? body.approvalJwt
      : undefined;

  const requester = readActor(req);
  const result = await manager.escalate({
    targetTier: body.targetTier as TrustTier,
    justification: body.justification,
    requester,
    ...(jwt !== undefined ? { jwt } : {}),
  });

  if (!result.ok) {
    const status = statusForTrustError(result.error.code);
    res.status(status).json({ error: result.error });
    return;
  }

  res.status(200).json({
    currentTier: manager.getState().currentTier,
    transition: result.record,
  });
}
