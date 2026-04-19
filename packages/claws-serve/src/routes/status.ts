import { Router, type Request, type Response } from 'express';
import type { PendingViolation as PendingViolationRecord } from '../../../claws-sdk/src/workspace/violation-types.js';
import type { ViolationStateMachine } from '../../../claws-sdk/src/workspace/violation-state.js';
import type { CompilationHost } from '../compilation-host.js';
import { CLAWS_SERVE_VERSION } from './index.js';

export interface ViolationSummary {
  error: number;
  warning: number;
  info: number;
}

export interface StatusResponse {
  fileCount: number;
  lastCompileTime: string | null;
  violations: ViolationSummary;
  /**
   * P73 degraded-state block. Populated when a ViolationStateMachine is
   * injected into the router; absent for pre-P73 routers so legacy
   * harnesses don't break. The `status` field mirrors the five-state
   * machine — `'clean'` / `'degraded_r5'` / `'degraded_warn'` /
   * `'degraded_fleet'` / `'error'`.
   */
  violationState?: {
    readonly status: string;
    readonly lastGoodVersion: number | null;
    readonly violations: readonly PendingViolationRecord[];
    readonly fixGuidance: string;
    readonly blockedTools: readonly string[];
  };
}

/**
 * Layer 3 status shape served at `/api/status`. Extends the legacy
 * `/status` body with `compilationStatus`, `errorCount`/`warningCount`,
 * `uptime`, `version`, and a `violationState` summary so partners have
 * a single endpoint for "is the agent healthy?" decisions.
 */
export interface ApiStatusResponse {
  readonly compilationStatus: 'ok' | 'stale' | 'error' | 'uncompiled';
  readonly lastCompiled: string | null;
  readonly fileCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly uptime: number;
  readonly version: string;
  readonly violationState: {
    readonly kind: 'clean' | 'stale' | 'error';
    readonly blockedTools: readonly string[];
  };
}

export interface ApiStatusRouterOptions {
  /** Epoch ms when the server started; defaults to `Date.now()`. */
  readonly startedAt?: number;
  /**
   * Violation state machine (P73). When threaded, the machine's posture
   * (CLEAN / DEGRADED_R5 / DEGRADED_WARN / DEGRADED_FLEET / ERROR) wins
   * over the IR-derived `violationKind`. Governance dashboards polling
   * `/api/status` need the write-gate posture, not only compile counts.
   */
  readonly machine?: ViolationStateMachine | undefined;
}

export function statusRouter(
  host?: CompilationHost | undefined,
  machine?: ViolationStateMachine | undefined,
): Router {
  const router = Router();

  router.get('/status', (_req: Request, res: Response) => {
    // If no CompilationHost is wired, return 501 Not Implemented
    if (host === undefined) {
      res.status(501).json({ error: 'Status not available — no compile function configured' });
      return;
    }

    const ir = host.getCachedIR();

    // No compilation has run yet — report zeros truthfully
    if (ir === undefined) {
      const body: StatusResponse = {
        fileCount: 0,
        lastCompileTime: null,
        violations: { error: 0, warning: 0, info: 0 },
      };
      if (machine !== undefined) {
        const summary = machine.summary();
        body.violationState = {
          status: summary.state,
          lastGoodVersion: summary.lastGoodVersion,
          violations: summary.violations,
          fixGuidance: summary.fixGuidance,
          blockedTools: summary.blockedTools,
        };
      }
      res.json(body);
      return;
    }

    // Derive real counts from the cached GovernanceIR
    const fileCount = ir.capabilities.tools.length
      + ir.capabilities.skills.length
      + ir.capabilities.agents.length
      + ir.capabilities.workflows.length;

    // getCompiledAt() is guaranteed to have a value when getCachedIR() does
    const lastCompileTime = host.getCompiledAt()!;

    // Violations at level >= 4 are errors, level 3 = warning, the rest are info
    let errorCount = 0;
    let warningCount = 0;
    for (const v of ir.analysis.violations) {
      if (v.level >= 4) {
        errorCount++;
      } else {
        warningCount++;
      }
    }
    const infoCount = ir.analysis.warnings.length;

    const body: StatusResponse = {
      fileCount,
      lastCompileTime,
      violations: { error: errorCount, warning: warningCount, info: infoCount },
    };
    if (machine !== undefined) {
      const summary = machine.summary();
      body.violationState = {
        status: summary.state,
        lastGoodVersion: summary.lastGoodVersion,
        violations: summary.violations,
        fixGuidance: summary.fixGuidance,
        blockedTools: summary.blockedTools,
      };
    }

    res.json(body);
  });

  return router;
}

/**
 * Attach `GET /` to the `/api/status` prefix router. Reflects live
 * CompilationHost state (never cached beyond the host's own cache).
 *
 * When a {@link ViolationStateMachine} is threaded through, the machine's
 * posture (CLEAN / DEGRADED_R5 / DEGRADED_WARN / DEGRADED_FLEET / ERROR)
 * wins over the derived `violationKind`. Dashboards polling `/api/status`
 * must see the governance posture, not just the compile-counts view.
 */
export function apiStatusRouter(
  host: CompilationHost,
  options: ApiStatusRouterOptions = {},
): Router {
  const router = Router();
  const startedAt = options.startedAt ?? Date.now();
  const machine = options.machine;

  router.get('/', (_req: Request, res: Response) => {
    const ir = host.getCachedIR();
    const uptime = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

    if (ir === undefined) {
      const body: ApiStatusResponse = {
        compilationStatus: 'uncompiled',
        lastCompiled: null,
        fileCount: 0,
        warningCount: 0,
        errorCount: 0,
        uptime,
        version: CLAWS_SERVE_VERSION,
        violationState: mergeViolationState(
          { kind: 'clean', blockedTools: [] },
          machine,
        ),
      };
      res.json(body);
      return;
    }

    let errorCount = 0;
    let warningCount = 0;
    for (const v of ir.analysis.violations) {
      if (v.level >= 4) errorCount++;
      else warningCount++;
    }

    const fileCount =
      ir.capabilities.tools.length +
      ir.capabilities.skills.length +
      ir.capabilities.agents.length +
      ir.capabilities.workflows.length;

    const compilationStatus: ApiStatusResponse['compilationStatus'] =
      ir.conflicts.haltReason !== null
        ? 'error'
        : errorCount > 0
          ? 'stale'
          : 'ok';
    const violationKind: 'clean' | 'stale' | 'error' =
      ir.conflicts.haltReason !== null
        ? 'error'
        : errorCount > 0
          ? 'stale'
          : 'clean';

    const body: ApiStatusResponse = {
      compilationStatus,
      lastCompiled: host.getCompiledAt() ?? null,
      fileCount,
      warningCount,
      errorCount,
      uptime,
      version: CLAWS_SERVE_VERSION,
      violationState: mergeViolationState(
        {
          kind: violationKind,
          blockedTools: ir.analysis.enforcementPlan.blockedTools,
        },
        machine,
      ),
    };
    res.json(body);
  });

  return router;
}

/**
 * Merge the IR-derived `violationKind` with the ViolationStateMachine's
 * posture. When the machine is not wired, the IR-derived kind is returned
 * as-is. When the machine IS wired the machine's state takes precedence —
 * `clean` maps to `clean`, `error` to `error`, every degraded flavour to
 * `stale` — because the machine reflects the write-gate posture that
 * governance dashboards care about, not the compile-count signal alone.
 *
 * Blocked tools are the union of the machine's `blockedTools` and the
 * IR's `enforcementPlan.blockedTools`; admin UIs should see both the
 * statically-derived blocks and the R5 lock live on the machine.
 */
function mergeViolationState(
  fromIR: ApiStatusResponse['violationState'],
  machine: ViolationStateMachine | undefined,
): ApiStatusResponse['violationState'] {
  if (machine === undefined) return fromIR;
  const summary = machine.summary();
  const kind: 'clean' | 'stale' | 'error' =
    summary.state === 'clean'
      ? 'clean'
      : summary.state === 'error'
        ? 'error'
        : 'stale';
  const mergedBlocked = new Set<string>([
    ...fromIR.blockedTools,
    ...summary.blockedTools,
  ]);
  return { kind, blockedTools: Array.from(mergedBlocked) };
}
