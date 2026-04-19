/**
 * Session model types for claws workspaces.
 *
 * A workspace may have multiple concurrent sessions of different kinds
 * (interactive, scheduled, channel-bound, agent-delegated). This module
 * defines the pure type contracts consumed by `session-tool-resolver`,
 * the CAP `/api/sessions` surface, and downstream audit/approval/governance
 * consumers that need to know which session originated a tool call.
 *
 * CL-11 amendment: `ToolCall.context` carries `sessionId` and `sessionType`
 * so tool-call events can be routed per-session. Both fields are OPTIONAL in
 * the contract — external providers may omit them. The serve layer enforces
 * presence (fail-closed = R5) at the gateway; that enforcement is not
 * represented in the static type so the contract remains compatible with
 * hosts that cannot supply session context.
 *
 * Extraction seam: this file contains only types and pure-constant arrays.
 * It mirrors the `chunk-types.ts` stance — no imports from `ir/`, `emit/`,
 * or other runtime modules. Keep it that way so it can travel with
 * `@bic/oc-chunks-types` if the extraction ever happens.
 *
 * @module claws-sdk/workspace/session-types
 */

import type { RiskClassification } from '@bic/openclaw-workspace/path';

/**
 * The four session kinds a workspace can run concurrently.
 *
 * - `main`: an interactive user session (chat, IDE, CAP UI).
 * - `cron`: a scheduled session that runs without a human in the loop.
 * - `channel`: a session bound to a channel connector (Teams, Slack).
 * - `agent`: a session delegated to another agent in the fleet.
 *
 * SessionType is server-assigned at creation time and immutable. Callers
 * cannot set or change it after the session exists; attempts to do so are
 * ignored by the serve layer. Per-type policy (tool allowlists, approval
 * gating, fail modes) keys off this discriminator.
 */
export type SessionType = 'main' | 'cron' | 'channel' | 'agent';

/**
 * Lifecycle status of a session.
 *
 * - `active`: currently executing or available to execute.
 * - `idle`: created but not currently running (cron between runs, channel
 *   waiting for inbound event, agent waiting for delegator request).
 * - `terminated`: finished or shut down; kept for audit history.
 */
export type SessionStatus = 'active' | 'idle' | 'terminated';

/**
 * Outcome of the most recent run for the session-summary projection.
 */
export type SessionRunStatus = 'success' | 'error' | 'timeout';

/**
 * Full session-state record. This is the authoritative runtime object the
 * serve layer stores; `SessionSummary` is the slim projection sent over the
 * wire on list endpoints.
 */
export interface SessionState {
  readonly id: string;
  /** Immutable after creation — set by the serve layer, never by callers. */
  readonly type: SessionType;
  readonly status: SessionStatus;
  /** ISO-8601 timestamp of creation. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the most recent activity (send, run, receive). */
  readonly lastActiveAt: string;
  /** Opaque bag for per-session extensions — audit, routing, identity. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Slim projection of `SessionState` for CAP list responses. Adds per-run
 * counters that `SessionState` itself does not carry (those live in the
 * run-history sidecar) so clients can render a dashboard without fanning
 * out one request per session.
 */
export interface SessionSummary {
  readonly id: string;
  readonly type: SessionType;
  readonly status: SessionStatus;
  readonly runCount: number;
  readonly lastRunAt?: string;
  readonly lastRunStatus?: SessionRunStatus;
}

/**
 * Per-type configuration for a session. The variant on `type` matches the
 * `SessionType` union exactly — this is a discriminated union so every call
 * site narrows via exhaustive `switch` on `type` rather than runtime casts.
 *
 * Cron default tool allowlist: R1-R2 only. R3+ tools require explicit
 * session-level pre-authorization in `HEARTBEAT.md`; the resolver enforces
 * the default, and overrides come from the `toolAllowlist` field below.
 */
export type SessionConfig =
  | MainSessionConfig
  | CronSessionConfig
  | ChannelSessionConfig
  | AgentSessionConfig;

export interface MainSessionConfig {
  readonly type: 'main';
}

export interface CronSessionConfig {
  readonly type: 'cron';
  /**
   * Standard 5-field cron expression (minute hour day-of-month month
   * day-of-week). See `isValidCronSchedule` for the accepted grammar; the
   * resolver treats malformed expressions as a hard error rather than
   * silently running on an unpredictable schedule.
   */
  readonly schedule: string;
  /**
   * Tool names (matching `ToolDefinition.name`) permitted in this cron
   * session. When present, this narrows the R1-R2 default allowlist to the
   * intersection of the two sets — R3+ tools still require explicit
   * HEARTBEAT.md pre-authorization to land here.
   */
  readonly toolAllowlist?: readonly string[];
}

export interface ChannelSessionConfig {
  readonly type: 'channel';
  /** Channel connector binding, e.g. `teams:channel-id` or `slack:C01234`. */
  readonly channel: string;
}

export interface AgentSessionConfig {
  readonly type: 'agent';
  /** Session ID of the delegating session; permissions inherit from here. */
  readonly delegatorSessionId: string;
  /**
   * Tool names the delegator has explicitly revoked for this delegate. The
   * resolver applies this as a set-difference against the delegator's
   * effective permissions at tool-call time.
   */
  readonly revokedTools?: readonly string[];
}

/**
 * Workspace-level tool definition. The resolver consumes a readonly array of
 * these and returns the subset permitted for a specific session. Kept
 * deliberately slim — production tool metadata lives in
 * `ConnectionsToolEntry`; this shape captures only what session-scoped
 * filtering needs (name + risk).
 */
export interface ToolDefinition {
  readonly name: string;
  readonly risk: RiskClassification;
}

/**
 * Approval-timeout fail mode. Mirrors CL-11 §`ApprovalTimeoutPolicy`.
 * When an external-approval request exceeds its timeout, the gateway
 * either denies the call (fail-closed) or allows it (fail-open). R5 is
 * always `'deny'` per spec; per-call `'allow'` requires an explicit
 * `alwaysDenyRiskLevels` carve-out.
 */
export type ApprovalTimeoutFailMode = 'deny' | 'allow';

/**
 * A tool call entering the governance pipeline. Mirrors CL-11
 * §`ToolCall`. Declared inline (not imported from a governance package)
 * to preserve the extraction contract above: this module must remain free
 * of runtime imports from `ir/` or `governance/`.
 *
 * `context.sessionId` and `context.sessionType` are OPTIONAL at the type
 * level because external providers may supply tool calls without session
 * context. The serve layer enforces presence separately — missing
 * sessionId is treated as unclassified (R5) and denied per the fail-mode
 * table — but that enforcement is a runtime check, not a compile-time
 * invariant.
 */
export interface ToolCall {
  /** MCP server name (e.g., "outlook", "sharepoint_onedrive"). */
  readonly server: string;
  /** Tool name within the server (e.g., "send-email"). */
  readonly tool: string;
  /** Tool input arguments. Providers MAY inspect but MUST NOT modify. */
  readonly arguments: Readonly<Record<string, unknown>>;
  /** Typed context about the calling agent, session, and conversation. */
  readonly context: ToolCallContext;
  /** Host-specific context. Consumers MUST ignore unknown keys. */
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export interface ToolCallContext {
  readonly conversationId: string;
  readonly agentId?: string;
  readonly workspaceId?: string;
  /** Session ID (e.g. "main", "cron:daily-triage"). Optional per CL-11. */
  readonly sessionId?: string;
  /** Session type — providers may apply different policies per type. */
  readonly sessionType?: SessionType;
}

/**
 * Validate a 5-field cron expression.
 *
 * Accepts:
 * - `*`
 * - Any non-negative integer (range-checked per field)
 * - A `*\/N` step (N >= 1)
 * - A `LOW-HIGH` range (LOW <= HIGH)
 * - Comma-separated lists of the above
 *
 * Rejects anything that is not exactly 5 whitespace-separated fields or that
 * contains tokens outside the grammar above. This is intentionally stricter
 * than cron implementations that accept seconds or named month/day tokens —
 * the CAP surface needs a predictable round-trip, not feature parity with
 * every cron dialect.
 */
export function isValidCronSchedule(expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const limits: ReadonlyArray<readonly [number, number]> = [
    [0, 59],
    [0, 23],
    [1, 31],
    [1, 12],
    [0, 6],
  ];
  for (let i = 0; i < 5; i++) {
    // `fields.length === 5` is verified above and `limits` is a 5-tuple
    // literal, so the indexed reads are always defined — assert via `!` to
    // avoid a runtime branch noUncheckedIndexedAccess would otherwise force.
    const field = fields[i]!;
    const limit = limits[i]!;
    if (!isValidCronField(field, limit[0], limit[1])) return false;
  }
  return true;
}

function isValidCronField(field: string, min: number, max: number): boolean {
  for (const token of field.split(',')) {
    if (!isValidCronToken(token, min, max)) return false;
  }
  return true;
}

function isValidCronToken(token: string, min: number, max: number): boolean {
  if (token === '*') return true;
  const stepMatch = /^\*\/(\d+)$/.exec(token);
  if (stepMatch) {
    const step = Number(stepMatch[1]);
    return Number.isInteger(step) && step >= 1;
  }
  const rangeMatch = /^(\d+)-(\d+)$/.exec(token);
  if (rangeMatch) {
    const lo = Number(rangeMatch[1]);
    const hi = Number(rangeMatch[2]);
    return lo >= min && hi <= max && lo <= hi;
  }
  if (/^\d+$/.test(token)) {
    const v = Number(token);
    return v >= min && v <= max;
  }
  return false;
}
