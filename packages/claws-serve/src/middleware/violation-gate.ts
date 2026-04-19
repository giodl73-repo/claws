/**
 * violation-gate — PATCH middleware that enforces the violation state.
 *
 * The gate is the fail-closed seam between the request path and the
 * violation state machine. It reads the machine's state on every request
 * (never caches it on the closure) so ERROR→DEGRADED and DEGRADED→CLEAN
 * transitions take effect atomically for any in-flight PATCH (P5).
 *
 * State-dependent behaviour:
 *
 *   CLEAN           → pass through.
 *   DEGRADED_FLEET  → pass through; the fleet validator in the write
 *                     pipeline handles the drift itself.
 *   DEGRADED_WARN   → pass through, but stamp `res.locals.governanceWarnings`
 *                     so the route handler can echo the warnings in the
 *                     response envelope.
 *   DEGRADED_R5     → pass through unless the PATCH targets the tool
 *                     whose R5 lock is live, in which case respond 503
 *                     with a GOVERNANCE_DEGRADED envelope.
 *   ERROR           → 503 GOVERNANCE_DEGRADED, unless the PATCH targets
 *                     one of the repair paths (per-violation `path`).
 *
 * The middleware extracts the target tool/path from three sources:
 *
 *   1. `req.params.tab` + `req.params.server` (connections chunk) — the
 *      tool name is the JSON body's `tool` field on bulk operations.
 *   2. `req.body.path` — batch ops name the target directly.
 *   3. `req.path` — the raw route tail is used as a fallback so repair
 *      PATCHes can be matched even when no body is present.
 *
 * @module claws-serve/middleware/violation-gate
 */

import type { RequestHandler } from 'express';
import { ViolationState as GovernanceState } from '../../../claws-sdk/src/workspace/violation-types.js';
import type { ViolationStateMachine } from '../../../claws-sdk/src/workspace/violation-state.js';

/**
 * Probe returning the live state machine. Re-reading on every request
 * (instead of binding the state at mount time) is required for P5 — the
 * gate must never serve stale ERROR rules to a now-DEGRADED request.
 */
export type ViolationMachineProbe = () => ViolationStateMachine | undefined;

export interface ViolationGateOptions {
  readonly machine: ViolationMachineProbe | ViolationStateMachine;
  /**
   * Optional custom extractor — overrides the default body/path heuristics
   * for callers whose routes don't follow the chunks-PATCH convention
   * (e.g. `/api/batch` supplies a list of ops and needs a merged target).
   */
  readonly extractTarget?: (req: import('express').Request) => {
    readonly tool?: string;
    readonly path?: string;
  };
}

/**
 * Wire envelope returned when the gate closes the request.
 *
 * `violations` is the abbreviated list — just path + severity + rule so
 * partners can render a banner without re-hitting `/api/status`.
 */
export interface GovernanceDegradedBody {
  readonly error: {
    readonly code: 'GOVERNANCE_DEGRADED';
    readonly message: string;
    readonly state: GovernanceState;
    readonly violations: ReadonlyArray<{
      readonly path: string;
      readonly severity: string;
      readonly rule: string;
      readonly message: string;
      readonly fixGuidance: string;
    }>;
    readonly lastGoodVersion: number | null;
  };
}

function resolveMachine(
  probe: ViolationMachineProbe | ViolationStateMachine,
): ViolationStateMachine | undefined {
  return typeof probe === 'function' ? probe() : probe;
}

function defaultExtract(req: import('express').Request): {
  readonly tool?: string;
  readonly path?: string;
} {
  const body = req.body as unknown;
  let tool: string | undefined;
  let path: string | undefined;
  if (body !== null && typeof body === 'object') {
    const rec = body as Record<string, unknown>;
    if (typeof rec['tool'] === 'string') tool = rec['tool'];
    if (typeof rec['path'] === 'string') path = rec['path'];
  }
  // CP-7 R1 dragon M-4: some chunks PATCH routes (connections/:server,
  // session-config/:id, trust/escalate) carry the tool identifier in the
  // URL rather than the body. Pull `:tool`, `:server`, or the raw URL
  // tail so the gate has a chance to match against blocked tools even
  // when the body omits `tool`.
  if (tool === undefined) {
    const params = req.params as Record<string, unknown> | undefined;
    if (params !== undefined) {
      for (const key of ['tool', 'server', 'name'] as const) {
        const val = params[key];
        if (typeof val === 'string' && val.length > 0) {
          tool = val;
          break;
        }
      }
    }
  }
  // Fall back to the request path as the target — `/api/oc/SOUL.md/...`
  // yields `oc://SOUL.md` as the repair-path identifier, matching the
  // canonical form the state machine stores.
  if (path === undefined) {
    const ocMatch = /\/api\/oc\/([^/?]+)/.exec(req.path);
    if (ocMatch !== null) {
      path = `oc://${ocMatch[1]!}`;
    }
  }
  const out: { tool?: string; path?: string } = {};
  if (tool !== undefined) out.tool = tool;
  if (path !== undefined) out.path = path;
  return out;
}

/**
 * Build the PATCH gate. The returned handler is safe to mount broadly
 * (e.g. on `/api/chunks/*`) because it only rejects when the machine is
 * in a non-CLEAN state AND the target matches a blocked tool / non-repair
 * path.
 */
export function violationGate(options: ViolationGateOptions): RequestHandler {
  const extract = options.extractTarget ?? defaultExtract;

  return (req, res, next): void => {
    const machine = resolveMachine(options.machine);
    if (machine === undefined) {
      next();
      return;
    }

    // Sample the state ONCE per request so the decision is atomic relative
    // to any concurrent compile tick (P1). All subsequent checks read from
    // `state` / `violations` local copies.
    const state = machine.getState();
    const violations = machine.getViolations();

    if (state === GovernanceState.CLEAN) {
      next();
      return;
    }

    if (state === GovernanceState.DEGRADED_FLEET) {
      next();
      return;
    }

    if (state === GovernanceState.DEGRADED_WARN) {
      res.locals['governanceWarnings'] = violations.map((v) => ({
        rule: v.rule,
        path: v.path,
        message: v.message,
      }));
      next();
      return;
    }

    const target = extract(req);

    if (state === GovernanceState.DEGRADED_R5) {
      const blocked = machine.getBlockedTools();
      if (target.tool !== undefined) {
        if (blocked.includes(target.tool)) {
          sendDegraded(res, state, violations, machine.getLastGoodVersion());
          return;
        }
        next();
        return;
      }
      // CP-7 R1 dragon M-4: tool cannot be identified. Fail-closed unless
      // the PATCH carries an explicit repair-path target (the R5 file is
      // being fixed) — otherwise a body-less PATCH to the locked tool's
      // URL would slip through.
      const repairPaths = machine.getRepairPaths();
      if (target.path !== undefined && repairPaths.includes(target.path)) {
        next();
        return;
      }
      sendDegraded(res, state, violations, machine.getLastGoodVersion());
      return;
    }

    // ERROR — fail-closed unless the PATCH targets one of the repair paths.
    const repairPaths = machine.getRepairPaths();
    if (target.path !== undefined && repairPaths.includes(target.path)) {
      next();
      return;
    }
    sendDegraded(res, state, violations, machine.getLastGoodVersion());
  };
}

function sendDegraded(
  res: import('express').Response,
  state: GovernanceState,
  violations: ReadonlyArray<{
    readonly path: string;
    readonly severity: string;
    readonly rule: string;
    readonly message: string;
    readonly fixGuidance: string;
  }>,
  lastGoodVersion: number | null,
): void {
  const body: GovernanceDegradedBody = {
    error: {
      code: 'GOVERNANCE_DEGRADED',
      message: `Workspace is in ${state} state — write gated until violations are resolved`,
      state,
      violations: violations.map((v) => ({
        path: v.path,
        severity: v.severity,
        rule: v.rule,
        message: v.message,
        fixGuidance: v.fixGuidance,
      })),
      lastGoodVersion,
    },
  };
  res.status(503).json(body);
}
