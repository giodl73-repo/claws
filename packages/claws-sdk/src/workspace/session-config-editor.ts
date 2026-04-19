/**
 * Session config editor — per-session write path (pulse 65).
 *
 * Accepts a {@link SessionConfigDelta} against an existing session record
 * and returns the updated {@link SessionConfig} together with a serialisable
 * line to append to the authoritative OC file (HEARTBEAT.md for cron,
 * AGENTS.md for agent). The route layer is responsible for the actual
 * disk write + recompile — this module is pure business logic so unit
 * tests can assert every governance branch without filesystem setup.
 *
 * Governance rules enforced here:
 *   - R5 tools (risk.level === 5) can never be added to a cron or agent
 *     session's allowlist; attempting to do so returns `R5_LOCKED`.
 *   - Fleet-locked tools (names supplied by the caller, derived from the
 *     compiled fleet policy) are rejected with `FLEET_LOCKED`.
 *   - Cron sessions default to R1-R2. R3+ tools require explicit pre-auth
 *     — an entry under the session's H3 block in HEARTBEAT.md's
 *     `Cron Pre-Auth` H2 section. Missing pre-auth returns
 *     `PRE_AUTH_REQUIRED`.
 *   - Channel sessions reject every delta with `SESSION_TYPE_UNSUPPORTED`
 *     (their config lives in the runtime, not OC files).
 *   - Main sessions reject every delta with `SESSION_TYPE_UNSUPPORTED`
 *     (main-session config is implicit — no toolAllowlist to edit).
 *   - Malformed cron expressions return `INVALID_SCHEDULE`.
 *   - Unknown tool names return `TOOL_UNKNOWN` (the route resolves the
 *     workspace tool list and passes it in).
 *
 * The editor does not mutate any input. It returns a `SessionConfigEditPlan`
 * the route can apply: the new config, the target file, and a single line
 * to append so HEARTBEAT.md / AGENTS.md edits remain append-only and
 * losslessly auditable.
 *
 * @module claws-sdk/workspace/session-config-editor
 */

import type {
  AgentSessionConfig,
  CronSessionConfig,
  SessionConfig,
  SessionState,
  ToolDefinition,
} from './session-types.js';
import { isValidCronSchedule } from './session-types.js';
import type {
  SessionConfigDelta,
  SessionConfigEditError,
  SessionConfigEditErrorCode,
} from './session-config-types.js';
import type { AuditChainSink } from '../compliance/audit-chain.js';

/** Identity of a session plus its current config. */
export interface SessionConfigEditTarget {
  readonly state: SessionState;
  readonly config: SessionConfig;
}

/** Inputs the editor needs beyond the delta itself. */
export interface SessionConfigEditContext {
  /** Workspace-level tool definitions. Used for R5 lookup + existence. */
  readonly workspaceTools: readonly ToolDefinition[];
  /** Tool names locked by the current fleet policy (no-op when empty). */
  readonly fleetLockedTools: ReadonlySet<string>;
  /**
   * Tool names pre-authorized for this cron session in HEARTBEAT.md.
   * Only consulted on cron targets; empty / missing for every other type.
   * Callers derive this by parsing HEARTBEAT.md's `Cron Pre-Auth` section.
   */
  readonly cronPreAuth?: ReadonlySet<string>;
  /**
   * Actor (X-Actor-Id, CP-6 R2 cluster J discipline) responsible for the
   * edit. Appended to the log line as `actor:<actor>` so an SRE reading
   * HEARTBEAT.md / AGENTS.md out of git blame can attribute session-config
   * edits to a human rather than only a session id (CP-7 R1 ciso W2).
   *
   * Optional on the type for backward compatibility — when absent, the
   * log line falls back to the pre-CP-7-R1 shape (no `actor:` suffix)
   * so readers of old HEARTBEAT.md lines continue to parse. Every HTTP
   * call site in `claws-serve` passes an actor string (defaulting to
   * `ANONYMOUS_ACTOR` when `X-Actor-Id` is missing), so production
   * traffic always emits the new shape.
   */
  readonly actor?: string;
  /**
   * Optional audit-chain sink (CP-7 R1 ciso M2). When supplied, every
   * {@link editSessionConfig} call that returns `ok: true` emits one
   * `SESSION_CONFIG_EDIT` entry on success. Failed edits (the caller will
   * surface the error envelope) do NOT emit — the audit chain is a trail
   * of applied mutations, not a probe log. Each entry carries:
   *
   *   - `actor` — the context's `actor` (defaults to `'anonymous'`)
   *   - `target` — `"session:<id>" ` or `"session:<id> tool:<name>"`
   *   - `action` — the delta `kind` (`tool-add`, `tool-remove`, ...)
   *   - `outcome` — the target file (`HEARTBEAT.md` / `AGENTS.md`)
   *   - `ruleId` — `SESSION_CONFIG_EDIT`
   *   - `severity` — 3 (governance-significant but recoverable)
   *
   * Omitting the sink (unit tests, purely-SDK consumers) silences audit
   * emission without changing any other behaviour.
   */
  readonly auditSink?: AuditChainSink;
  /** Policy version recorded on every emitted audit entry. */
  readonly policyVersion?: string;
}

/** OC file a successful edit will amend. */
export type SessionConfigTargetFile = 'HEARTBEAT.md' | 'AGENTS.md';

/**
 * Plan the route applies after a successful edit: the new config record,
 * the target file, and the single markdown line to append to it.
 *
 * The line format is intentionally simple so the parse path stays trivial:
 *   - `HEARTBEAT.md` allowlist add: `- session:<id> tool:<name>`
 *   - `HEARTBEAT.md` schedule set:  `- session:<id> schedule:<expr>`
 *   - `HEARTBEAT.md` allowlist remove: `- session:<id> tool:<name> removed`
 *   - `AGENTS.md` revoke set: `- session:<id> revoked:<tool,tool,...>`
 *   - `AGENTS.md` tool add: `- session:<id> tool:<name>`
 *   - `AGENTS.md` tool remove: `- session:<id> tool:<name> removed`
 *
 * The format is append-only: every edit adds one line under a
 * `## Session Config Log` H2 section, so the file remains lossless and the
 * audit chain is byte-exact. Consumers that read config state still go
 * through the SessionRecord in the session store — the log is a secondary
 * breadcrumb for operators grepping the OC file directly.
 */
export interface SessionConfigEditPlan {
  readonly nextConfig: SessionConfig;
  readonly targetFile: SessionConfigTargetFile;
  readonly logLine: string;
}

export type SessionConfigEditResult =
  | { readonly ok: true; readonly plan: SessionConfigEditPlan }
  | { readonly ok: false; readonly error: SessionConfigEditError };

/** Heading of the session config append-only log section. */
export const SESSION_CONFIG_LOG_HEADING = 'Session Config Log';

/**
 * Apply `delta` to `target` under `context`. Returns a plan or a typed
 * error; never throws for business-logic rejections.
 *
 * CP-7 R1 ciso M2 — when `context.auditSink` is supplied, every successful
 * edit fires one signed `SESSION_CONFIG_EDIT` chain entry before this
 * function returns. The emit is fire-and-forget (the sink contract
 * guarantees it never throws back), so the caller's control flow is
 * unchanged whether or not an audit sink is wired.
 */
export function editSessionConfig(
  target: SessionConfigEditTarget,
  delta: SessionConfigDelta,
  context: SessionConfigEditContext,
): SessionConfigEditResult {
  const { state, config } = target;

  let result: SessionConfigEditResult;
  if (config.type !== state.type) {
    result = fail('SESSION_TYPE_UNSUPPORTED', state.id);
  } else {
    switch (config.type) {
      case 'channel':
      case 'main':
        result = fail('SESSION_TYPE_UNSUPPORTED', state.id);
        break;
      case 'cron':
        result = editCron(state.id, config, delta, context);
        break;
      case 'agent':
        result = editAgent(state.id, config, delta, context);
        break;
    }
  }

  if (result.ok && context.auditSink !== undefined) {
    emitSessionConfigEdit(context, state.id, delta, result.plan);
  }
  return result;
}

/**
 * Emit one `SESSION_CONFIG_EDIT` audit entry for a successful edit.
 * Called only on the `ok: true` branch — failed edits surface as an error
 * envelope and don't belong in the tamper-evident chain.
 */
function emitSessionConfigEdit(
  context: SessionConfigEditContext,
  sessionId: string,
  delta: SessionConfigDelta,
  plan: SessionConfigEditPlan,
): void {
  const actor = context.actor ?? 'anonymous';
  const policyVersion = context.policyVersion ?? 'unknown';
  const toolSubject =
    delta.kind === 'tool-add' || delta.kind === 'tool-remove'
      ? delta.tool
      : delta.kind === 'revoke-set'
        ? delta.revokedTools.join(',')
        : delta.schedule;
  const target =
    delta.kind === 'schedule-set'
      ? `session:${sessionId}`
      : `session:${sessionId} ${delta.kind === 'revoke-set' ? 'revoked' : 'tool'}:${toolSubject}`;
  context.auditSink!.emit({
    eventType: 'SESSION_CONFIG_EDIT',
    actor,
    target,
    action: delta.kind,
    outcome: plan.targetFile,
    ruleId: 'SESSION_CONFIG_EDIT',
    severity: 3,
    policyVersion,
  });
}

function editCron(
  sessionId: string,
  config: CronSessionConfig,
  delta: SessionConfigDelta,
  context: SessionConfigEditContext,
): SessionConfigEditResult {
  switch (delta.kind) {
    case 'tool-add': {
      const tool = findTool(context.workspaceTools, delta.tool);
      if (tool === undefined) {
        return fail('TOOL_UNKNOWN', sessionId, { tool: delta.tool });
      }
      if (tool.risk.level === 5) {
        return fail('R5_LOCKED', sessionId, { tool: delta.tool });
      }
      if (context.fleetLockedTools.has(tool.name)) {
        return fail('FLEET_LOCKED', sessionId, { tool: delta.tool });
      }
      if (tool.risk.level >= 3) {
        const preAuth = context.cronPreAuth ?? new Set<string>();
        if (!preAuth.has(tool.name)) {
          return fail('PRE_AUTH_REQUIRED', sessionId, { tool: delta.tool });
        }
      }
      const nextAllow = appendUnique(config.toolAllowlist, tool.name);
      const next: CronSessionConfig = {
        type: 'cron',
        schedule: config.schedule,
        toolAllowlist: nextAllow,
      };
      return ok(
        next,
        'HEARTBEAT.md',
        withActor(`- session:${sessionId} tool:${tool.name}`, context.actor),
      );
    }
    case 'tool-remove': {
      const nextAllow = removeEntry(config.toolAllowlist, delta.tool);
      const next: CronSessionConfig = nextAllow === undefined
        ? { type: 'cron', schedule: config.schedule }
        : { type: 'cron', schedule: config.schedule, toolAllowlist: nextAllow };
      return ok(
        next,
        'HEARTBEAT.md',
        withActor(
          `- session:${sessionId} tool:${delta.tool} removed`,
          context.actor,
        ),
      );
    }
    case 'schedule-set': {
      if (!isValidCronSchedule(delta.schedule)) {
        return fail('INVALID_SCHEDULE', sessionId);
      }
      const next: CronSessionConfig = config.toolAllowlist !== undefined
        ? { type: 'cron', schedule: delta.schedule, toolAllowlist: config.toolAllowlist }
        : { type: 'cron', schedule: delta.schedule };
      return ok(
        next,
        'HEARTBEAT.md',
        withActor(
          `- session:${sessionId} schedule:${delta.schedule}`,
          context.actor,
        ),
      );
    }
    case 'revoke-set':
      return fail('SESSION_TYPE_UNSUPPORTED', sessionId);
  }
}

function editAgent(
  sessionId: string,
  config: AgentSessionConfig,
  delta: SessionConfigDelta,
  context: SessionConfigEditContext,
): SessionConfigEditResult {
  switch (delta.kind) {
    case 'tool-add': {
      // For agent sessions, "add" means drop from the revokedTools list so
      // the delegator's permission flows through again.
      const tool = findTool(context.workspaceTools, delta.tool);
      if (tool === undefined) {
        return fail('TOOL_UNKNOWN', sessionId, { tool: delta.tool });
      }
      if (tool.risk.level === 5) {
        return fail('R5_LOCKED', sessionId, { tool: delta.tool });
      }
      if (context.fleetLockedTools.has(tool.name)) {
        return fail('FLEET_LOCKED', sessionId, { tool: delta.tool });
      }
      const nextRevoked = removeEntry(config.revokedTools, tool.name);
      const next: AgentSessionConfig = nextRevoked === undefined
        ? { type: 'agent', delegatorSessionId: config.delegatorSessionId }
        : {
            type: 'agent',
            delegatorSessionId: config.delegatorSessionId,
            revokedTools: nextRevoked,
          };
      return ok(
        next,
        'AGENTS.md',
        withActor(`- session:${sessionId} tool:${tool.name}`, context.actor),
      );
    }
    case 'tool-remove': {
      // For agent sessions, "remove" means add to the revokedTools list.
      const nextRevoked = appendUnique(config.revokedTools, delta.tool);
      const next: AgentSessionConfig = {
        type: 'agent',
        delegatorSessionId: config.delegatorSessionId,
        revokedTools: nextRevoked,
      };
      return ok(
        next,
        'AGENTS.md',
        withActor(
          `- session:${sessionId} tool:${delta.tool} removed`,
          context.actor,
        ),
      );
    }
    case 'revoke-set': {
      // Wholesale replacement of the revoked set — validate each member.
      for (const name of delta.revokedTools) {
        if (findTool(context.workspaceTools, name) === undefined) {
          return fail('TOOL_UNKNOWN', sessionId, { tool: name });
        }
      }
      const unique = dedupe(delta.revokedTools);
      const next: AgentSessionConfig = unique.length === 0
        ? { type: 'agent', delegatorSessionId: config.delegatorSessionId }
        : {
            type: 'agent',
            delegatorSessionId: config.delegatorSessionId,
            revokedTools: unique,
          };
      return ok(
        next,
        'AGENTS.md',
        withActor(
          `- session:${sessionId} revoked:${unique.join(',')}`,
          context.actor,
        ),
      );
    }
    case 'schedule-set':
      return fail('SESSION_TYPE_UNSUPPORTED', sessionId);
  }
}

/**
 * Append ` actor:<actor>` to a log line when the caller supplied an actor.
 * Omitting the suffix when `actor === undefined` keeps the pre-CP-7-R1 log
 * line shape so readers of older lines (and any caller that does not yet
 * thread an actor through) observe the previous format. Empty-string
 * actors are treated as absent so a mis-wired caller cannot emit a
 * dangling `actor:` suffix.
 */
function withActor(line: string, actor: string | undefined): string {
  if (typeof actor !== 'string' || actor.length === 0) return line;
  return `${line} actor:${actor}`;
}

function findTool(
  tools: readonly ToolDefinition[],
  name: string,
): ToolDefinition | undefined {
  return tools.find((t) => t.name === name);
}

function appendUnique(
  list: readonly string[] | undefined,
  value: string,
): readonly string[] {
  if (list === undefined) return [value];
  if (list.includes(value)) return list;
  return [...list, value];
}

function removeEntry(
  list: readonly string[] | undefined,
  value: string,
): readonly string[] | undefined {
  if (list === undefined) return undefined;
  const filtered = list.filter((v) => v !== value);
  return filtered.length === 0 ? undefined : filtered;
}

function dedupe(list: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function ok(
  nextConfig: SessionConfig,
  targetFile: SessionConfigTargetFile,
  logLine: string,
): SessionConfigEditResult {
  return { ok: true, plan: { nextConfig, targetFile, logLine } };
}

/**
 * Error codes the editor itself raises. `SESSION_NOT_FOUND` is omitted —
 * only the HTTP adapter can observe a missing record, so the SDK path
 * never synthesises it.
 */
type EditorEmittedErrorCode = Exclude<SessionConfigEditErrorCode, 'SESSION_NOT_FOUND'>;

function fail(
  code: EditorEmittedErrorCode,
  sessionId: string,
  extra: { readonly tool?: string } = {},
): SessionConfigEditResult {
  const message = defaultMessage(code, sessionId, extra.tool);
  const error: SessionConfigEditError = extra.tool !== undefined
    ? { code, message, sessionId, tool: extra.tool }
    : { code, message, sessionId };
  return { ok: false, error };
}

function defaultMessage(
  code: EditorEmittedErrorCode,
  sessionId: string,
  tool: string | undefined,
): string {
  const suffix = tool !== undefined ? ` (tool: ${tool})` : '';
  switch (code) {
    case 'R5_LOCKED':
      return `session ${sessionId}: R5 tools cannot be added to session allowlists${suffix}`;
    case 'FLEET_LOCKED':
      return `session ${sessionId}: tool is locked by fleet policy${suffix}`;
    case 'PRE_AUTH_REQUIRED':
      return `session ${sessionId}: R3+ tool requires HEARTBEAT.md pre-authorization${suffix}`;
    case 'SESSION_TYPE_UNSUPPORTED':
      return `session ${sessionId}: delta not supported for this session type`;
    case 'INVALID_SCHEDULE':
      return `session ${sessionId}: invalid cron schedule`;
    case 'TOOL_UNKNOWN':
      return `session ${sessionId}: tool is not declared in the workspace${suffix}`;
  }
}
