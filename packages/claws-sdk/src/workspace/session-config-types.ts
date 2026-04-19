/**
 * SessionConfigDelta — per-session config edit shapes.
 *
 * Consumed by {@link SessionConfigEditor} (pulse 65). Distinct from
 * `EditOperation` (workspace-edit/types.ts) because the chunk-edit path
 * targets TOOLS/SETTINGS/CONNECTIONS and is keyed by section+field;
 * session-config edits target HEARTBEAT.md (cron) or AGENTS.md (agent)
 * and are keyed by session id + delta kind.
 *
 * Four delta kinds cover the S11/S13 acceptance scope:
 *   - `tool-add`      — append a tool name to `toolAllowlist` / agent tools.
 *   - `tool-remove`   — drop a tool name from the allowlist.
 *   - `schedule-set`  — rewrite a cron session's schedule expression.
 *   - `revoke-set`    — rewrite an agent session's `revokedTools` list.
 *
 * No `delegator-change` kind: swapping an agent session's delegator is a
 * re-creation, not an edit — partners delete and create rather than mutate.
 *
 * Pure-type module — no runtime imports from `ir/`, `emit/`, or other
 * runtime modules. Mirrors `session-types.ts` so extraction to
 * `@bic/oc-sessions-types` remains trivial.
 *
 * @module claws-sdk/workspace/session-config-types
 */

/** Add a tool to the session's allowlist (cron) or tool set (agent). */
export interface ToolAddDelta {
  readonly kind: 'tool-add';
  readonly tool: string;
}

/** Remove a tool from the session's allowlist (cron) or revoke set (agent). */
export interface ToolRemoveDelta {
  readonly kind: 'tool-remove';
  readonly tool: string;
}

/** Replace the cron session's 5-field schedule. Cron only. */
export interface ScheduleSetDelta {
  readonly kind: 'schedule-set';
  readonly schedule: string;
}

/** Replace an agent session's entire `revokedTools` list. Agent only. */
export interface RevokeSetDelta {
  readonly kind: 'revoke-set';
  readonly revokedTools: readonly string[];
}

/** Discriminated union of every accepted delta shape. */
export type SessionConfigDelta =
  | ToolAddDelta
  | ToolRemoveDelta
  | ScheduleSetDelta
  | RevokeSetDelta;

/**
 * Typed error envelope the editor returns for rejected edits. Mirrors the
 * `PatchError` vocabulary so the HTTP adapter can map straight onto the
 * existing chunk PATCH status table without a translation layer:
 *
 *   - `R5_LOCKED`           → 403 (R5 tool added to a cron/agent session)
 *   - `FLEET_LOCKED`        → 403 (fleet policy locks the tool)
 *   - `PRE_AUTH_REQUIRED`   → 403 (cron session R3+ without HEARTBEAT.md entry)
 *   - `SESSION_TYPE_UNSUPPORTED` → 400 (delta kind not valid for this type,
 *                                 or channel config edit)
 *   - `INVALID_SCHEDULE`    → 400 (malformed cron expression)
 *   - `TOOL_UNKNOWN`        → 404 (tool not in workspace tools)
 *   - `SESSION_NOT_FOUND`   → 404 (no record for the id)
 */
export type SessionConfigEditErrorCode =
  | 'R5_LOCKED'
  | 'FLEET_LOCKED'
  | 'PRE_AUTH_REQUIRED'
  | 'SESSION_TYPE_UNSUPPORTED'
  | 'INVALID_SCHEDULE'
  | 'TOOL_UNKNOWN'
  | 'SESSION_NOT_FOUND';

export interface SessionConfigEditError {
  readonly code: SessionConfigEditErrorCode;
  readonly message: string;
  /** Tool name (when the error is tool-scoped). */
  readonly tool?: string;
  /** Session id (always present when a session was resolved). */
  readonly sessionId?: string;
}
