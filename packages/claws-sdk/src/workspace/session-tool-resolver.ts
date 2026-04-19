/**
 * Session-scoped tool resolver.
 *
 * Given the workspace-level tool set and a specific session, returns the
 * subset of tools that session is permitted to call. Permissions are
 * computed live at every tool-call site — there is no cache — so a workspace
 * recompile (TOOLS.md or HEARTBEAT.md edit, risk reclassification) takes
 * effect on the very next call without any per-session invalidation step.
 *
 * Per-type policy:
 * - `main`: full workspace tool set. No narrowing.
 * - `channel`: full workspace tool set. Channel-specific governance lives in
 *   the provider chain, not in the tool list.
 * - `cron`: defaults to R1-R2 only. R3+ tools must be explicitly listed in
 *   the session's `toolAllowlist` — the resolver refuses to include an R3+
 *   tool for a cron session unless it appears in that allowlist.
 * - `agent`: inherits the delegator's effective permission set minus any
 *   tools the delegator revoked. Recursive: a delegate may itself delegate,
 *   in which case the resolver walks the chain.
 *
 * Unattended session approval (C-1): for cron and agent sessions, any R3+
 * gated tool (`requiresExternalApproval: true`) forces the timeout
 * `failMode` to `'deny'` regardless of the caller's configuration —
 * unattended sessions cannot silently allow a gated call to proceed past
 * its timeout. Use `resolveUnattendedFailMode` to apply this at the
 * approval-policy layer.
 *
 * @module claws-sdk/workspace/session-tool-resolver
 */

import type {
  ApprovalTimeoutFailMode,
  SessionConfig,
  SessionState,
  SessionType,
  ToolDefinition,
} from './session-types.js';

/**
 * Context the resolver needs to walk an agent-session delegation chain. The
 * caller supplies a lookup keyed by session ID; the resolver uses it to pull
 * the delegator's state+config, then calls itself recursively. A `null`
 * return from the lookup means the delegator is unknown — the resolver
 * falls back to an empty permission set so unresolvable delegations fail
 * closed rather than leaking the full workspace tool set.
 */
export interface SessionLookup {
  (sessionId: string): { state: SessionState; config: SessionConfig } | null;
}

export interface ResolveSessionToolsOptions {
  /** Only required when resolving an agent-session delegation chain. */
  readonly lookup?: SessionLookup;
  /**
   * Tracks visited sessions to break cycles in pathological delegation
   * graphs. Callers should not set this; the resolver manages it across
   * recursive calls.
   */
  readonly visited?: ReadonlySet<string>;
}

/**
 * Return the tools permitted for `session` given the workspace-level
 * tool set and the session's per-type config. The returned array is a
 * subset of `workspaceTools` with original order preserved.
 */
export function resolveSessionTools(
  workspaceTools: readonly ToolDefinition[],
  session: SessionState,
  config: SessionConfig,
  options: ResolveSessionToolsOptions = {},
): readonly ToolDefinition[] {
  if (config.type !== session.type) {
    throw new Error(
      `Session ${session.id} has type=${session.type} but config.type=${config.type}`,
    );
  }

  switch (config.type) {
    case 'main':
    case 'channel':
      return workspaceTools.slice();

    case 'cron':
      return filterCronTools(workspaceTools, config.toolAllowlist);

    case 'agent': {
      const visited = options.visited ?? new Set<string>();
      if (visited.has(session.id)) {
        // Cycle — bail to empty set to fail closed.
        return [];
      }
      const lookup = options.lookup;
      if (!lookup) {
        throw new Error(
          `Agent session ${session.id} requires a SessionLookup to resolve delegator ${config.delegatorSessionId}`,
        );
      }
      const delegator = lookup(config.delegatorSessionId);
      if (!delegator) {
        // Unknown delegator — fail closed.
        return [];
      }
      const nextVisited = new Set(visited);
      nextVisited.add(session.id);
      const delegatorTools = resolveSessionTools(
        workspaceTools,
        delegator.state,
        delegator.config,
        { lookup, visited: nextVisited },
      );
      const revoked = new Set(config.revokedTools ?? []);
      return delegatorTools.filter((t) => !revoked.has(t.name));
    }
  }
}

function filterCronTools(
  workspaceTools: readonly ToolDefinition[],
  allowlist: readonly string[] | undefined,
): readonly ToolDefinition[] {
  const explicit = allowlist ? new Set(allowlist) : null;
  return workspaceTools.filter((t) => {
    const risk = t.risk.level;
    if (risk === 1 || risk === 2) {
      // R1-R2 always permitted; explicit allowlist (when present) may still
      // narrow to an intersection.
      return explicit ? explicit.has(t.name) : true;
    }
    // R3+ requires an explicit pre-authorization entry.
    return explicit ? explicit.has(t.name) : false;
  });
}

/**
 * Session types that run without a human in the loop. Tool calls that
 * carry `requiresExternalApproval: true` in these sessions cannot sit
 * against a timeout that falls back to `'allow'` — there is nobody to
 * notice the stalled prompt — so the resolver forces `failMode: 'deny'`.
 */
export const UNATTENDED_SESSION_TYPES: ReadonlySet<SessionType> = new Set<SessionType>([
  'cron',
  'agent',
]);

/**
 * Apply the unattended-session rule to an approval timeout `failMode`.
 * Returns `'deny'` when both conditions hold:
 *   1. The session type runs unattended (`cron` or `agent`), AND
 *   2. The tool call requires external approval.
 *
 * Otherwise returns `configuredFailMode` unchanged. Call this at the
 * approval-policy composition site, NOT per tool-definition — the rule
 * keys off the per-call `requiresExternalApproval` flag, which is only
 * known after `preAuthorize()` returns.
 */
export function resolveUnattendedFailMode(
  sessionType: SessionType,
  requiresExternalApproval: boolean,
  configuredFailMode: ApprovalTimeoutFailMode,
): ApprovalTimeoutFailMode {
  if (requiresExternalApproval && UNATTENDED_SESSION_TYPES.has(sessionType)) {
    return 'deny';
  }
  return configuredFailMode;
}
