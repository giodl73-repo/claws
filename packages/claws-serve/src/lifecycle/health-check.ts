/**
 * Startup health check — runs a full compile on server start and verifies
 * the fleet policy is loadable, then sets the server mode accordingly.
 *
 * When everything checks out the server enters `healthy` mode and all
 * endpoints (reads + writes) operate normally. When the initial compile
 * fails or the fleet policy is missing/corrupt, the server enters
 * `degraded` mode — reads continue to work so operators can diagnose the
 * failure, but all write endpoints (PATCH) return 503 Service Unavailable
 * with the diagnostic context attached.
 *
 * The intent (S33): prevent writes to an already-broken workspace.
 * Accepting a PATCH that is destined to fail recompilation is worse than
 * rejecting the request up front — the former mutates the workspace and
 * requires rollback, the latter lets the operator fix the root cause
 * before resuming.
 *
 * The CISO stance (cluster A, Security assurance > Agent capability):
 * fail-closed on initial compile means a workspace whose governance IR
 * cannot be produced receives zero write traffic. Drift is the enemy —
 * when the compiler can't see the state, writes must not proceed.
 *
 * @module claws-serve/lifecycle/health-check
 */

import {
  loadFleetPolicy,
  type FleetPolicyLoadResult,
} from '../../../claws-sdk/src/workspace-edit/index.js';
import type { CompilationHost } from '../compilation-host.js';

/**
 * Server operational mode.
 *
 * `healthy` — initial compile succeeded and required dependencies
 * (fleet policy) loaded. All endpoints operational.
 *
 * `degraded` — initial compile failed or fleet policy unavailable.
 * Read endpoints continue; write endpoints return 503 with diagnostic.
 */
export type ServerMode = 'healthy' | 'degraded';

/** Reason for a degraded startup, attached to the 503 body. */
export type DegradedReason =
  | { readonly kind: 'compile-failed'; readonly compilerMessage: string }
  | { readonly kind: 'fleet-policy-missing'; readonly policyFile: string }
  | { readonly kind: 'fleet-policy-corrupt'; readonly policyFile: string; readonly cause: string };

/**
 * Public-facing degraded reason code. Stable string enum with no filesystem
 * paths, raw compiler output, or parser detail — safe to emit on anonymous
 * read endpoints (e.g. /health) without leaking workspace layout or internal
 * failure strings to unauthenticated callers.
 *
 * Operators read the full {@link DegradedReason} from server logs; partners
 * only need the code to decide "is the server up for writes?"
 */
export type DegradedReasonCode =
  | 'COMPILATION_FAILED_AT_STARTUP'
  | 'FLEET_POLICY_MISSING'
  | 'FLEET_POLICY_CORRUPT';

/** Map an internal {@link DegradedReason} to its public-facing code. */
export function degradedReasonCode(reason: DegradedReason): DegradedReasonCode {
  switch (reason.kind) {
    case 'compile-failed':
      return 'COMPILATION_FAILED_AT_STARTUP';
    case 'fleet-policy-missing':
      return 'FLEET_POLICY_MISSING';
    case 'fleet-policy-corrupt':
      return 'FLEET_POLICY_CORRUPT';
  }
}

/** Outcome of the startup health check. */
export interface HealthCheckResult {
  readonly mode: ServerMode;
  readonly reason?: DegradedReason;
}

export interface HealthCheckOptions {
  /** CompilationHost to drive the initial full compile. */
  readonly host: CompilationHost;
  /**
   * Absolute path of the fleet policy file. When omitted, the fleet
   * policy check is skipped and the server relies solely on the compile
   * result — used in unit tests that don't care about fleet plumbing.
   */
  readonly fleetPolicyFile?: string;
  /**
   * Loader override for the fleet policy. Defaults to the SDK loader.
   * Tests inject a canned result to exercise each degraded branch.
   */
  readonly fleetPolicyLoader?: () => Promise<FleetPolicyLoadResult>;
}

/**
 * Perform the startup health check.
 *
 * 1) Trigger a full compile through `host.compile()`. Any thrown error
 *    puts the server in degraded mode with the compiler message.
 * 2) If a fleet policy file is configured, load it. Missing or corrupt
 *    policy also degrades the server — fleet-lockable fields stay locked
 *    until the policy resolves, matching the P-272 fail-closed stance.
 */
export async function runStartupHealthCheck(
  options: HealthCheckOptions,
): Promise<HealthCheckResult> {
  try {
    await options.host.compile();
  } catch (err) {
    return {
      mode: 'degraded',
      reason: {
        kind: 'compile-failed',
        compilerMessage: err instanceof Error ? err.message : String(err),
      },
    };
  }

  if (options.fleetPolicyFile !== undefined) {
    const loader = options.fleetPolicyLoader ?? (() => loadFleetPolicy(options.fleetPolicyFile!));
    const loaded = await loader();
    if (loaded.state === 'missing') {
      return {
        mode: 'degraded',
        reason: { kind: 'fleet-policy-missing', policyFile: options.fleetPolicyFile },
      };
    }
    if (loaded.state === 'corrupt') {
      return {
        mode: 'degraded',
        reason: {
          kind: 'fleet-policy-corrupt',
          policyFile: options.fleetPolicyFile,
          cause: loaded.cause,
        },
      };
    }
  }

  return { mode: 'healthy' };
}

/**
 * Stable payload shape exposed on the 503 body for degraded writes. Keeps
 * the error envelope consistent with the rest of the PATCH surface so
 * partners can branch on `error.code` without a special case.
 *
 * CP-6 R2 K2: the public body carries only the `DegradedReasonCode`
 * enum — never `policyFile`, `cause`, or `compilerMessage`. Operators
 * read the full {@link DegradedReason} from server logs (emitted by
 * {@link degradedModeError} at call time); unauthenticated write
 * callers should not learn workspace layout or parser detail from a
 * 503 body. This mirrors the /health sanitization from commit d050ad3.
 */
export interface DegradedModeErrorBody {
  readonly error: {
    readonly code: 'SERVICE_UNAVAILABLE';
    readonly message: string;
    readonly reasonCode: DegradedReasonCode;
  };
}

/**
 * Human-readable 503 message for each degraded reason code. Stable
 * across releases and free of workspace paths, parser strings, or
 * compiler output — safe to emit to unauthenticated write callers.
 */
function safeMessageFor(code: DegradedReasonCode): string {
  switch (code) {
    case 'COMPILATION_FAILED_AT_STARTUP':
      return 'Server is in degraded mode: initial compile failed';
    case 'FLEET_POLICY_MISSING':
      return 'Server is in degraded mode: fleet policy is missing';
    case 'FLEET_POLICY_CORRUPT':
      return 'Server is in degraded mode: fleet policy is corrupt';
  }
}

/**
 * Side effect sink for the rich server-side log line. Extracted as a
 * function reference so tests can swap it out when asserting that the
 * 503 body stays sanitized even while the log captures the full
 * reason. Defaults to `console.error` to match every other
 * health-path log site in the module.
 */
export type DegradedReasonLogger = (reason: DegradedReason) => void;

let degradedReasonLogger: DegradedReasonLogger = (reason) => {
  console.error('[degraded-mode] write rejected:', reason);
};

/**
 * Override the server-side logger used by {@link degradedModeError}.
 * Returns a disposer that restores the previous logger — use in tests
 * only, never in production code paths.
 */
export function setDegradedReasonLogger(logger: DegradedReasonLogger): () => void {
  const previous = degradedReasonLogger;
  degradedReasonLogger = logger;
  return () => {
    degradedReasonLogger = previous;
  };
}

/**
 * Build the 503 body for a write attempt against a degraded server.
 *
 * Emits a structured log line carrying the FULL {@link DegradedReason}
 * (including `policyFile`, `cause`, `compilerMessage`) so operators
 * retain triage detail, then returns a sanitized body containing only
 * the {@link DegradedReasonCode}. The code is stable across releases
 * and safe for anonymous/unauthenticated callers to branch on.
 *
 * Callers MUST NOT re-attach the raw {@link DegradedReason} to the
 * response — the sanitization contract is that the 503 body never
 * leaks workspace paths or parser strings.
 */
export function degradedModeError(reason: DegradedReason): DegradedModeErrorBody {
  degradedReasonLogger(reason);
  const code = degradedReasonCode(reason);
  return {
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: safeMessageFor(code),
      reasonCode: code,
    },
  };
}
