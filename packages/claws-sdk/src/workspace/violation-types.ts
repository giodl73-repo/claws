/**
 * Violation state types — fail-closed governance state model.
 *
 * When an external write (OC runtime, VS Code, OneDrive sync) produces a
 * governance violation, claws never accepts the violation into the serving
 * GovernanceIR. The last good IR continues to serve while the system enters
 * a severity-based degraded state. These types define the wire contract;
 * the state machine lives in `violation-state.ts`.
 *
 * Pure types + one enum-like const object. No runtime behaviour beyond the
 * constant declarations themselves — the file is excluded from coverage via
 * the `*-types.ts` pattern in vitest.config.
 *
 * @module claws-sdk/workspace/violation-types
 */

import type { OcParsedFile } from '@bic/openclaw-workspace/path';

/**
 * Five-state governance posture.
 *
 * - `CLEAN`          — last compile produced no violations.
 * - `DEGRADED_R5`    — a specific tool violates an R5 (transact) rule; only
 *                      that tool is blocked, all other writes continue.
 * - `DEGRADED_WARN`  — advisory-level violations; all PATCHes permitted with
 *                      warnings attached to the response.
 * - `DEGRADED_FLEET` — fleet policy drift detected; writes continue but the
 *                      admin surface shows the drift banner.
 * - `ERROR`          — structural failure (corrupt SOUL.md, unparseable
 *                      OC file) — last good IR continues to serve reads,
 *                      PATCHes blocked except those repairing the violation
 *                      files themselves.
 */
export const ViolationState = {
  CLEAN: 'clean',
  DEGRADED_R5: 'degraded_r5',
  DEGRADED_WARN: 'degraded_warn',
  DEGRADED_FLEET: 'degraded_fleet',
  ERROR: 'error',
} as const;

export type ViolationState = (typeof ViolationState)[keyof typeof ViolationState];

/**
 * Severity ordering — monotonic from benign (CLEAN) to fatal (ERROR).
 *
 * Used by the state machine to compute the "next worst" state after a
 * partial fix (P4): when one violation is resolved but others remain the
 * machine drops to the worst severity still present, never straight to
 * CLEAN.
 */
export const VIOLATION_STATE_RANK: Readonly<Record<ViolationState, number>> = {
  [ViolationState.CLEAN]: 0,
  [ViolationState.DEGRADED_WARN]: 1,
  [ViolationState.DEGRADED_FLEET]: 2,
  [ViolationState.DEGRADED_R5]: 3,
  [ViolationState.ERROR]: 4,
};

/**
 * Where the violation originated — informs auto-remediation suggestions.
 *
 * - `oc_runtime`    — the OpenClaw runtime installed or edited files during
 *                     a live session.
 * - `external_edit` — a human (VS Code, shell) wrote the file directly.
 * - `onedrive_sync` — OneDrive resynced a corrupted remote copy.
 * - `unknown`       — source could not be attributed.
 */
export type ViolationSource =
  | 'oc_runtime'
  | 'external_edit'
  | 'onedrive_sync'
  | 'unknown';

/**
 * Scope of the violation's blast radius.
 *
 * - `isolated`   — affects a single tool; only that tool is blocked.
 * - `structural` — affects the dependency chain (e.g., SOUL.md is corrupt,
 *                  breaking every downstream file). The whole chain must
 *                  stop accepting writes.
 */
export type ViolationScope = 'isolated' | 'structural';

/**
 * A single pending violation the system is holding against the serving IR.
 *
 * `path` is an oc:// path when the violation targets a specific file or
 * tool; for structural failures the path still names the corrupt file so
 * repair PATCHes can target it.
 */
export interface PendingViolation {
  readonly path: string;
  readonly severity: 'info' | 'warning' | 'error' | 'fatal';
  readonly rule: string;
  readonly message: string;
  readonly fixGuidance: string;
  readonly source: ViolationSource;
  readonly scope: ViolationScope;
  /**
   * OC file basename the violation lives in — used by `status.ts` and the
   * workspace schema to light up `hasViolation` flags on a per-file basis.
   */
  readonly file?: OcParsedFile;
  /**
   * Tool name when the violation targets a specific capability (R5 lock).
   * `undefined` for structural failures where no individual tool is the
   * offender.
   */
  readonly tool?: string;
  /**
   * ISO-8601 timestamp when the violation was first observed. Set by the
   * state machine; callers should not construct this by hand.
   */
  readonly firstSeenAt: string;
}

/**
 * Summary surfaced on `/api/status` — counts by severity plus the current
 * state discriminator. Partners that render a banner just need this shape;
 * the full `PendingViolation[]` is available via the same endpoint.
 */
export interface ViolationSummary {
  readonly state: ViolationState;
  readonly lastGoodVersion: number | null;
  readonly violations: readonly PendingViolation[];
  readonly fixGuidance: string;
  readonly blockedTools: readonly string[];
}

/**
 * Persisted form of the violation state — what lands in
 * `.claws/cache/violation-state.json` so the state survives a restart.
 *
 * The persisted JSON is re-hydrated BEFORE any request is served (P6);
 * without that guarantee the first request after a crash would see a
 * default-CLEAN state and let a PATCH slip through on a degraded workspace.
 */
export interface PersistedViolationState {
  readonly state: ViolationState;
  readonly lastGoodVersion: number | null;
  readonly violations: readonly PendingViolation[];
  readonly updatedAt: string;
}
