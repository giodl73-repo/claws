/**
 * PATCH /api/sessions/:id/config — per-session configuration edits (P65).
 *
 * Thin HTTP adapter: the handler shapes the request + response and delegates
 * all governance decisions to {@link editSessionConfig} (claws-sdk). The
 * editor returns either a typed `SessionConfigEditPlan` or a typed error;
 * this route maps both onto the stable HTTP envelope partners already use
 * for the chunk PATCH surface.
 *
 * On success:
 *   1. The new {@link SessionConfig} is persisted via the
 *      {@link SessionStore} under the same record id.
 *   2. One line is appended to the `## Session Config Log` H2 section of
 *      the target OC file (HEARTBEAT.md for cron sessions, AGENTS.md for
 *      agents). The append path is lossless — the file is never rewritten
 *      in place and existing content is preserved byte-for-byte.
 *   3. `host.compile()` is invoked so the governance IR reflects the edit
 *      before the response goes out.
 *
 * On failure — the editor's `SessionConfigEditErrorCode` maps onto HTTP:
 *   - `R5_LOCKED`, `FLEET_LOCKED`, `PRE_AUTH_REQUIRED`       → 403
 *   - `SESSION_TYPE_UNSUPPORTED`, `INVALID_SCHEDULE`         → 400
 *   - `TOOL_UNKNOWN`, `SESSION_NOT_FOUND`                    → 404
 *
 * Channel sessions are rejected at the editor (`SESSION_TYPE_UNSUPPORTED`)
 * because their config lives in the OC runtime, not the OC files (AC-7).
 *
 * @module claws-serve/routes/session-config
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Router, type Request, type Response } from 'express';
import {
  assembleChunks,
  parseWorkspace,
  type ToolDefinition,
  type TrustManager,
  type TrustTier,
} from '../../../claws-sdk/src/workspace/index.js';
import { atomicWriteFile } from '../../../claws-sdk/src/workspace/fs-atomic.js';
import {
  editSessionConfig,
  SESSION_CONFIG_LOG_HEADING,
  type SessionConfigEditContext,
  type SessionConfigTargetFile,
} from '../../../claws-sdk/src/workspace/session-config-editor.js';
import type {
  SessionConfigDelta,
  SessionConfigEditError,
} from '../../../claws-sdk/src/workspace/session-config-types.js';
import type { AuditChainSink } from '../../../claws-sdk/src/compliance/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { readActor } from '../middleware/actor.js';
import {
  createSessionStore,
  type SessionRecord,
  type SessionStore,
} from '../state/session-store.js';

export interface SessionConfigRouterOptions {
  /** Absolute workspace root. */
  readonly workspaceRoot: string;
  /** Override store for tests. */
  readonly store?: SessionStore;
  /**
   * Trust-tier authority used to gate governance-affecting edits
   * (CP-7 R1 C5 / dragon M-3 / ciso W2).
   *
   * When provided the handler resolves the current tier from `manager.getState()`
   * and enforces a per-delta minimum: `tool-add` on a cron session requires
   * at least T1 (cron is the auto-invocation surface; anonymous T0 callers
   * MUST NOT extend the allowlist); `schedule-set` and agent `revoke-set`
   * each require T2 (both change how often/with what scope the session
   * runs, i.e. a privilege shape). Unknown / below-minimum tiers return
   * 403 `TRUST_TIER_INSUFFICIENT`.
   *
   * Optional on the type so test harnesses that do not exercise the trust
   * gate can keep constructing the router without a manager. Production
   * `createApp` always passes the mounted singleton.
   */
  readonly trustManager?: TrustManager;
  /**
   * Audit-chain sink (CP-7 R1 ciso M2). When supplied, every successful
   * session-config edit emits one `SESSION_CONFIG_EDIT` entry. Tests
   * omit this to skip audit emission; production `createApp` always
   * threads the filesystem-backed sink.
   */
  readonly auditSink?: AuditChainSink;
  /** Policy version recorded on emitted audit entries. */
  readonly policyVersion?: string;
}

/** Error envelope returned on every non-2xx PATCH. */
export interface SessionConfigErrorBody {
  readonly error: {
    readonly code: SessionConfigEditError['code'] | 'SESSION_CONFIG_BAD_BODY' | 'TRUST_TIER_INSUFFICIENT';
    readonly message: string;
    readonly tool?: string;
    readonly sessionId?: string;
    readonly requiredTier?: TrustTier;
    readonly currentTier?: TrustTier;
  };
}

/** Success envelope — includes the updated session detail for the caller. */
export interface SessionConfigSuccessBody {
  readonly session: {
    readonly id: string;
    readonly type: SessionRecord['state']['type'];
    readonly status: SessionRecord['state']['status'];
  };
  readonly config: SessionRecord['config'];
  readonly targetFile: SessionConfigTargetFile;
}

/**
 * Build an Express router mounted at `/api/sessions/:id/config`. Not
 * suitable to share with the read-only sessions router — that one owns
 * the GET surface and a second store instance here is safe because the
 * store is stateless (it rehydrates from disk on every load).
 */
export function sessionConfigRouter(
  host: CompilationHost,
  options: SessionConfigRouterOptions,
): Router {
  const router = Router();
  const store =
    options.store ?? createSessionStore({ workspaceRoot: options.workspaceRoot });
  const trustManager = options.trustManager;
  const auditSink = options.auditSink;
  const policyVersion = options.policyVersion;

  router.patch('/:id/config', (req, res, next) => {
    handlePatch(host, store, options.workspaceRoot, trustManager, auditSink, policyVersion, req, res).catch(next);
  });

  return router;
}

async function handlePatch(
  host: CompilationHost,
  store: SessionStore,
  workspaceRoot: string,
  trustManager: TrustManager | undefined,
  auditSink: AuditChainSink | undefined,
  policyVersion: string | undefined,
  req: Request,
  res: Response,
): Promise<void> {
  // CP-7 R1 ciso W2: resolve the actor eagerly so every downstream branch
  // (audit emission, log line, tier-gate error body) sees the same value.
  // `readActor` returns `ANONYMOUS_ACTOR` when the header is missing and
  // defers to the sanitized `req.actor` stamped by `actorMiddleware` when
  // the header is present. Validation of malformed headers has already
  // happened upstream (400 `BAD_ACTOR`) so this call cannot fail.
  const actor = readActor(req);

  const id = req.params['id'];
  /* c8 ignore start -- Express `:id` will not match an empty segment; defence-in-depth */
  if (typeof id !== 'string' || id.length === 0) {
    respondBadBody(res, 'session id path parameter is required');
    return;
  }
  /* c8 ignore stop */

  const delta = parseDelta(req.body);
  if (delta === null) {
    respondBadBody(
      res,
      'PATCH /api/sessions/:id/config requires a valid SessionConfigDelta body',
    );
    return;
  }

  const records = await store.load();
  const rec = records.get(id);
  if (rec === undefined) {
    res.status(404).json(errorBody('SESSION_NOT_FOUND', `session ${id} does not exist`, { sessionId: id }));
    return;
  }

  // CP-7 R1 C5 / dragon M-3 / ciso W2 — trust-tier gate.
  //
  // Enforced here (not at a middleware) because the minimum tier depends
  // on BOTH the delta kind AND the target session's type (tool-add is T1
  // for cron; agent tool-add is the delegator flow and rides the existing
  // R5/FLEET_LOCKED gates). Doing the check after we've loaded the record
  // lets us reject body-valid-but-privilege-insufficient requests with
  // the real session context in the error body.
  if (trustManager !== undefined) {
    const required = requiredTierFor(delta, rec.state.type);
    if (required !== null) {
      const current = trustManager.getState().currentTier;
      if (tierBelow(current, required)) {
        respondTierInsufficient(res, id, required, current);
        return;
      }
    }
  }

  const context = await buildContext(host, workspaceRoot, actor, auditSink, policyVersion);
  const result = editSessionConfig({ state: rec.state, config: rec.config }, delta, context);
  if (!result.ok) {
    respondEditError(res, result.error);
    return;
  }

  // Persist the updated record before touching disk so a failed compile
  // below leaves the store + OC file both reflecting the edit. The log
  // append is append-only and losslessly audited; re-compile is the
  // downstream signal that picks up the change.
  const now = new Date().toISOString();
  const updatedRecord: SessionRecord = {
    ...rec,
    state: { ...rec.state, lastActiveAt: now },
    config: result.plan.nextConfig,
  };
  await store.upsert(updatedRecord);

  await appendConfigLogLine(
    workspaceRoot,
    result.plan.targetFile,
    result.plan.logLine,
  );

  // Recompile so the governance IR reflects the new session config. A
  // failing compile propagates to the express error handler — the edit is
  // on disk and in the store at this point; operators can replay.
  await host.compile();

  const body: SessionConfigSuccessBody = {
    session: {
      id: updatedRecord.state.id,
      type: updatedRecord.state.type,
      status: updatedRecord.state.status,
    },
    config: updatedRecord.config,
    targetFile: result.plan.targetFile,
  };
  res.status(200).json(body);
}

function parseDelta(raw: unknown): SessionConfigDelta | null {
  /* c8 ignore next -- patchEnvelopeMiddleware rejects non-object bodies before we get here */
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const kind = obj['kind'];
  switch (kind) {
    case 'tool-add':
    case 'tool-remove': {
      const name = obj['tool'];
      if (typeof name !== 'string' || name.length === 0) return null;
      return kind === 'tool-add'
        ? { kind: 'tool-add', tool: name }
        : { kind: 'tool-remove', tool: name };
    }
    case 'schedule-set': {
      const schedule = obj['schedule'];
      if (typeof schedule !== 'string' || schedule.length === 0) return null;
      return { kind: 'schedule-set', schedule };
    }
    case 'revoke-set': {
      const list = obj['revokedTools'];
      if (!Array.isArray(list)) return null;
      const out: string[] = [];
      for (const entry of list) {
        if (typeof entry !== 'string' || entry.length === 0) return null;
        out.push(entry);
      }
      return { kind: 'revoke-set', revokedTools: out };
    }
    default:
      return null;
  }
}

async function buildContext(
  host: CompilationHost,
  workspaceRoot: string,
  actor: string,
  auditSink: AuditChainSink | undefined,
  policyVersion: string | undefined,
): Promise<SessionConfigEditContext> {
  const workspaceTools = await loadWorkspaceTools(host, workspaceRoot);
  const fleetLockedTools = loadFleetLockedTools(host);
  const cronPreAuth = await loadCronPreAuth(workspaceRoot);
  const context: SessionConfigEditContext = {
    workspaceTools,
    fleetLockedTools,
    cronPreAuth,
    actor,
    ...(auditSink !== undefined ? { auditSink } : {}),
    ...(policyVersion !== undefined ? { policyVersion } : {}),
  };
  return context;
}

/**
 * Per-delta minimum trust tier. `null` means "no gate" — the edit may
 * proceed regardless of tier (R5/FLEET_LOCKED continue to guard the
 * content, just not the actor's tier).
 *
 * Gate matrix (CP-7 R1 C5):
 *   - `tool-add` on a cron session    → T1 (auto-invocation allowlist extension)
 *   - `schedule-set` (cron-only)      → T2 (changes when the cron runs)
 *   - `revoke-set` on an agent        → T2 (modifies delegator permission shape)
 *
 * Agent `tool-add` / `tool-remove` are deliberately ungated at the tier
 * layer — they modify the `revokedTools` list and the delegator flow,
 * which are already bounded by the delegator's tools and the SDK R5
 * gate. `tool-remove` on a cron narrows the allowlist and therefore
 * cannot escalate privilege.
 */
function requiredTierFor(
  delta: SessionConfigDelta,
  sessionType: SessionRecord['state']['type'],
): TrustTier | null {
  switch (delta.kind) {
    case 'tool-add':
      return sessionType === 'cron' ? 'T1' : null;
    case 'schedule-set':
      return 'T2';
    case 'revoke-set':
      return sessionType === 'agent' ? 'T2' : null;
    case 'tool-remove':
      return null;
  }
}

const TIER_ORDER_LOCAL: readonly TrustTier[] = ['T0', 'T1', 'T2', 'T3', 'T4'];

function tierBelow(current: TrustTier, required: TrustTier): boolean {
  return TIER_ORDER_LOCAL.indexOf(current) < TIER_ORDER_LOCAL.indexOf(required);
}

function respondTierInsufficient(
  res: Response,
  sessionId: string,
  required: TrustTier,
  current: TrustTier,
): void {
  res.status(403).json(errorBody(
    'TRUST_TIER_INSUFFICIENT',
    `session ${sessionId}: edit requires trust tier ${required}; current tier is ${current}`,
    { sessionId, requiredTier: required, currentTier: current },
  ));
}

async function loadWorkspaceTools(
  host: CompilationHost,
  workspaceRoot: string,
): Promise<readonly ToolDefinition[]> {
  const ir = host.getCachedIR();
  if (ir === undefined) return [];
  const workspace = await parseWorkspace(workspaceRoot);
  const assembly = await assembleChunks(workspace, ir);
  const tools: ToolDefinition[] = [];
  const seen = new Set<string>();
  for (const chunk of assembly.connections) {
    for (const entry of chunk.data.tools) {
      if (seen.has(entry.tool)) continue;
      seen.add(entry.tool);
      tools.push({ name: entry.tool, risk: entry.risk });
    }
  }
  return tools;
}

function loadFleetLockedTools(host: CompilationHost): ReadonlySet<string> {
  const ir = host.getCachedIR();
  if (ir === undefined) return new Set<string>();
  return new Set<string>(ir.analysis.enforcementPlan.blockedTools);
}

/**
 * Parse HEARTBEAT.md for the `## Cron Pre-Auth` section and return the
 * union of tool names pre-authorized across every session. The section
 * grammar is intentionally minimal so operators can edit the file by hand:
 *
 * ```markdown
 * ## Cron Pre-Auth
 *
 * - tool:<name>
 * - tool:<name>
 * ```
 *
 * Each bullet that starts with `- tool:` contributes its suffix. Anything
 * else is ignored so operator comments in the section do not break parsing.
 * Missing HEARTBEAT.md / missing section → empty set (fail-closed against
 * R3+ adds).
 */
async function loadCronPreAuth(workspaceRoot: string): Promise<ReadonlySet<string>> {
  const heartbeatPath = join(workspaceRoot, 'HEARTBEAT.md');
  let contents: string;
  try {
    contents = await readFile(heartbeatPath, 'utf-8');
  } catch {
    return new Set<string>();
  }
  const lines = contents.split(/\r?\n/);
  const out = new Set<string>();
  let inSection = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      inSection = /^##\s+Cron Pre-Auth\s*$/.test(line);
      continue;
    }
    if (!inSection) continue;
    const match = /^-\s+tool:(\S+)/.exec(line);
    if (match !== null) out.add(match[1]!);
  }
  return out;
}

/**
 * Append one log line to the `## Session Config Log` section of the
 * target OC file. If the file or section is missing, both are created
 * so the log is losslessly extended. The file is always written via
 * `atomicWriteFile` (tmp + rename), so a crash mid-write cannot leave
 * HEARTBEAT.md / AGENTS.md truncated — observers see either the old
 * bytes or the complete new bytes (CP-7 R1 C4 lossless-OC invariant).
 */
async function appendConfigLogLine(
  workspaceRoot: string,
  targetFile: SessionConfigTargetFile,
  logLine: string,
): Promise<void> {
  const filePath = join(workspaceRoot, targetFile);
  let existing: string;
  try {
    existing = await readFile(filePath, 'utf-8');
  } catch {
    existing = '';
  }

  const headingPattern = new RegExp(`^##\\s+${SESSION_CONFIG_LOG_HEADING}\\s*$`, 'm');
  let nextContents: string;
  if (headingPattern.test(existing)) {
    // Section already exists — find the first line after the heading that
    // either starts another H2 or is EOF, and insert the new line just
    // before it so the section stays grouped at the bottom.
    const lines = existing.split(/\r?\n/);
    let insertAt = lines.length;
    let headingIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (headingPattern.test(lines[i]!)) {
        headingIdx = i;
        break;
      }
    }
    // headingIdx is valid because headingPattern.test(existing) is true.
    for (let i = headingIdx + 1; i < lines.length; i++) {
      if (/^##\s/.test(lines[i]!)) {
        insertAt = i;
        break;
      }
    }
    const before = lines.slice(0, insertAt);
    const after = lines.slice(insertAt);
    // Ensure a blank line between the last existing line in the section
    // and the new line when the heading has nothing beneath it yet.
    if (before[before.length - 1]?.trim().length !== 0) {
      before.push('');
    }
    before.push(logLine);
    if (after.length > 0) before.push('');
    nextContents = [...before, ...after].join('\n');
  } else {
    const prefix = existing.length === 0 || existing.endsWith('\n') ? existing : `${existing}\n`;
    const separator = prefix.length === 0 ? '' : '\n';
    nextContents = `${prefix}${separator}## ${SESSION_CONFIG_LOG_HEADING}\n\n${logLine}\n`;
  }
  await atomicWriteFile(filePath, nextContents, 'utf-8');
}

function respondEditError(res: Response, err: SessionConfigEditError): void {
  const status = statusForEditError(err.code);
  // Omit undefined keys so the call conforms to `exactOptionalPropertyTypes`.
  const extra: { sessionId?: string; tool?: string } = {};
  if (err.sessionId !== undefined) extra.sessionId = err.sessionId;
  if (err.tool !== undefined) extra.tool = err.tool;
  res.status(status).json(errorBody(err.code, err.message, extra));
}

function statusForEditError(code: SessionConfigEditError['code']): number {
  switch (code) {
    case 'R5_LOCKED':
    case 'FLEET_LOCKED':
    case 'PRE_AUTH_REQUIRED':
      return 403;
    case 'SESSION_TYPE_UNSUPPORTED':
    case 'INVALID_SCHEDULE':
      return 400;
    case 'TOOL_UNKNOWN':
      return 404;
    /* c8 ignore next 2 -- SESSION_NOT_FOUND is raised directly by the route (not via editor); switch-exhaustiveness only */
    case 'SESSION_NOT_FOUND':
      return 404;
  }
}

function respondBadBody(res: Response, message: string): void {
  res.status(400).json(errorBody('SESSION_CONFIG_BAD_BODY', message));
}

function errorBody(
  code: SessionConfigErrorBody['error']['code'],
  message: string,
  extra: {
    readonly sessionId?: string;
    readonly tool?: string;
    readonly requiredTier?: TrustTier;
    readonly currentTier?: TrustTier;
  } = {},
): SessionConfigErrorBody {
  const error: {
    code: SessionConfigErrorBody['error']['code'];
    message: string;
    sessionId?: string;
    tool?: string;
    requiredTier?: TrustTier;
    currentTier?: TrustTier;
  } = { code, message };
  if (extra.sessionId !== undefined) error.sessionId = extra.sessionId;
  if (extra.tool !== undefined) error.tool = extra.tool;
  if (extra.requiredTier !== undefined) error.requiredTier = extra.requiredTier;
  if (extra.currentTier !== undefined) error.currentTier = extra.currentTier;
  return { error };
}
