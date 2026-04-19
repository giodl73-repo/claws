/**
 * GET /api/sessions — session model HTTP surface (P61).
 *
 * Four endpoints expose the session runtime state over HTTP:
 *
 * - `GET /api/sessions`              list summaries; `?type=` narrows.
 * - `GET /api/sessions/:id`          single-session detail (404 fail-closed).
 * - `GET /api/sessions/:id/runs`     bounded run history, most-recent-first.
 * - `GET /api/sessions/:id/tools`    session-scoped tool set, derived via
 *                                    `resolveSessionTools` (claws-sdk) from
 *                                    the workspace TOOLS.md entries.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): tool-permission derivation lives
 * in {@link resolveSessionTools}; route handlers shape the request + response.
 * The tools endpoint surfaces `violationImpact` when the current compiled IR
 * blocks a tool the session would otherwise have (P61 acceptance: violation
 * state must reflect in the session tools list).
 *
 * Fail-closed on missing sessionId: consumers that hit
 * `GET /api/sessions/:id` with an unknown id receive a structured 404
 * (`SESSION_NOT_FOUND`) rather than a silently-empty body. This matches the
 * R5 posture flagged in P60's delta — missing session context is denied, not
 * allowed.
 *
 * @module claws-serve/routes/sessions
 */

import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  assembleChunks,
  parseWorkspace,
  resolveSessionTools,
  type SessionLookup,
  type SessionRunStatus,
  type SessionState,
  type SessionSummary,
  type SessionType,
  type ToolDefinition,
} from '../../../claws-sdk/src/workspace/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { createSessionStore, type SessionRecord, type SessionStore } from '../state/session-store.js';

const VALID_TYPES: ReadonlySet<SessionType> = new Set<SessionType>([
  'main',
  'cron',
  'channel',
  'agent',
]);

/** Options for mounting the sessions router. */
export interface SessionsRouterOptions {
  /** Absolute workspace root to introspect. */
  readonly workspaceRoot: string;
  /** Optional store override for testing. */
  readonly store?: SessionStore;
  /** Optional `?limit=` cap for the runs endpoint. Defaults to 200. */
  readonly maxRunsPerResponse?: number;
}

/** Response body for `GET /api/sessions`. */
export interface SessionsListResponse {
  readonly sessions: readonly SessionSummary[];
}

/** Response body for `GET /api/sessions/:id`. */
export interface SessionDetailResponse {
  readonly session: SessionState;
}

/** Response body for `GET /api/sessions/:id/runs`. */
export interface SessionRunsResponse {
  readonly runs: readonly {
    readonly id: string;
    readonly status: SessionRunStatus;
    readonly startedAt: string;
    readonly durationMs?: number;
    readonly toolCalls?: number;
    readonly auditEvents?: number;
    readonly error?: string;
  }[];
}

/** Tool entry carried in the session-tools response. */
export interface SessionToolResponse {
  readonly name: string;
  readonly risk: ToolDefinition['risk'];
  /** Present when the compiled IR's enforcement plan blocks this tool. */
  readonly violationImpact?: { readonly blocked: true; readonly reason: string };
}

/** Response body for `GET /api/sessions/:id/tools`. */
export interface SessionToolsResponse {
  readonly tools: readonly SessionToolResponse[];
}

const DEFAULT_MAX_RUNS = 200;

/**
 * Build an Express router mounted at `/api/sessions`. When the host has no
 * cached IR, `violationImpact` is omitted — the unblocked snapshot is the
 * safe default for a read endpoint.
 */
export function sessionsRouter(
  host: CompilationHost,
  options: SessionsRouterOptions,
): Router {
  const router = Router();
  const store =
    options.store ?? createSessionStore({ workspaceRoot: options.workspaceRoot });
  const maxRuns = options.maxRunsPerResponse ?? DEFAULT_MAX_RUNS;

  router.get('/', (req, res, next) => {
    handleList(store, req, res).catch(next);
  });
  router.get('/:id', (req, res, next) => {
    handleDetail(store, req, res).catch(next);
  });
  router.get('/:id/runs', (req, res, next) => {
    handleRuns(store, maxRuns, req, res).catch(next);
  });
  router.get('/:id/tools', (req, res, next) => {
    handleTools(host, store, options.workspaceRoot, req, res).catch(next);
  });

  return router;
}

async function handleList(
  store: SessionStore,
  req: Request,
  res: Response,
): Promise<void> {
  const typeFilter = parseTypeFilter(req.query['type']);
  if (typeFilter === 'invalid') {
    res.status(400).json({
      error: {
        code: 'SESSION_INVALID_TYPE_FILTER',
        message: `?type= must be one of ${[...VALID_TYPES].join(', ')}`,
      },
    });
    return;
  }

  const records = await store.load();
  const summaryRecords: { summary: SessionSummary; lastActiveAt: string }[] = [];
  for (const rec of records.values()) {
    if (typeFilter !== 'all' && rec.state.type !== typeFilter) continue;
    summaryRecords.push({ summary: toSummary(rec), lastActiveAt: rec.state.lastActiveAt });
  }
  // Stable ordering: most-recently-active first so dashboards render the
  // live sessions at the top. Falls back to id for deterministic sort when
  // two sessions share `lastActiveAt`.
  summaryRecords.sort((a, b) => {
    if (a.lastActiveAt !== b.lastActiveAt) return a.lastActiveAt < b.lastActiveAt ? 1 : -1;
    return a.summary.id < b.summary.id ? -1 : 1;
  });
  const summaries = summaryRecords.map((r) => r.summary);

  const body: SessionsListResponse = { sessions: summaries };
  res.status(200).json(body);
}

async function handleDetail(
  store: SessionStore,
  req: Request,
  res: Response,
): Promise<void> {
  const id = readId(req);
  /* c8 ignore start -- Express `:id` will not match an empty segment; defence-in-depth */
  if (id === null) {
    respondMissingId(res);
    return;
  }
  /* c8 ignore stop */
  const records = await store.load();
  const rec = records.get(id);
  if (rec === undefined) {
    respondNotFound(res, id);
    return;
  }
  const body: SessionDetailResponse = { session: rec.state };
  res.status(200).json(body);
}

async function handleRuns(
  store: SessionStore,
  maxRuns: number,
  req: Request,
  res: Response,
): Promise<void> {
  const id = readId(req);
  /* c8 ignore start -- Express `:id` will not match an empty segment; defence-in-depth */
  if (id === null) {
    respondMissingId(res);
    return;
  }
  /* c8 ignore stop */
  const limitResult = parseLimit(req.query['limit'], maxRuns);
  if (limitResult === 'invalid') {
    res.status(400).json({
      error: {
        code: 'SESSION_INVALID_LIMIT',
        message: '?limit= must be a positive integer',
      },
    });
    return;
  }
  const records = await store.load();
  const rec = records.get(id);
  if (rec === undefined) {
    respondNotFound(res, id);
    return;
  }
  // Order by startedAt descending — the store preserves insertion order, so
  // we sort here rather than assuming the caller seeded runs in order.
  const ordered = [...rec.runs].sort((a, b) =>
    a.startedAt === b.startedAt ? 0 : a.startedAt < b.startedAt ? 1 : -1,
  );
  const limited = limitResult === 'none' ? ordered : ordered.slice(0, limitResult);
  const body: SessionRunsResponse = { runs: limited };
  res.status(200).json(body);
}

async function handleTools(
  host: CompilationHost,
  store: SessionStore,
  workspaceRoot: string,
  req: Request,
  res: Response,
): Promise<void> {
  const id = readId(req);
  /* c8 ignore start -- Express `:id` will not match an empty segment; defence-in-depth */
  if (id === null) {
    respondMissingId(res);
    return;
  }
  /* c8 ignore stop */
  const records = await store.load();
  const rec = records.get(id);
  if (rec === undefined) {
    respondNotFound(res, id);
    return;
  }

  const workspaceTools = await loadWorkspaceTools(host, workspaceRoot);
  const lookup: SessionLookup = (sid) => records.get(sid) ?? null;
  const permitted = resolveSessionTools(workspaceTools, rec.state, rec.config, { lookup });

  const blocked = new Set(
    host.getCachedIR()?.analysis.enforcementPlan.blockedTools ?? [],
  );

  const body: SessionToolsResponse = {
    tools: permitted.map((t): SessionToolResponse => {
      const entry: { name: string; risk: ToolDefinition['risk']; violationImpact?: { blocked: true; reason: string } } = {
        name: t.name,
        risk: t.risk,
      };
      if (blocked.has(t.name)) {
        entry.violationImpact = { blocked: true, reason: 'compiled_governance_block' };
      }
      return entry;
    }),
  };
  res.status(200).json(body);
}

/**
 * Derive the workspace-level `ToolDefinition[]` from the assembled
 * `connections` chunks. The assembler already stamps each tool with its
 * effective risk classification (fleet overrides + R5 fail-closed defaults),
 * so the resolver receives the post-compile view. Returns `[]` when no
 * cached IR exists — the session-tools endpoint is read-only and fails
 * safe with an empty list rather than forcing a compile from a read path.
 */
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

function toSummary(rec: SessionRecord): SessionSummary {
  const summary: Mutable<SessionSummary> = {
    id: rec.state.id,
    type: rec.state.type,
    status: rec.state.status,
    runCount: rec.runCount,
  };
  if (rec.lastRunAt !== undefined) summary.lastRunAt = rec.lastRunAt;
  if (rec.lastRunStatus !== undefined) summary.lastRunStatus = rec.lastRunStatus;
  return summary;
}

function readId(req: Request): string | null {
  const raw = req.params['id'];
  /* c8 ignore start -- Express populates `:id` as a non-empty string for matched routes; defence-in-depth */
  if (typeof raw !== 'string' || raw.length === 0) return null;
  /* c8 ignore stop */
  return raw;
}

function respondMissingId(res: Response): void {
  // Defence-in-depth: Express `:id` routes will not match an empty segment
  // so this is unreachable in practice. We keep the branch so unit tests
  // that bypass the router (call the handler directly) still see a
  // structured error rather than a 500.
  /* c8 ignore start */
  res.status(400).json({
    error: { code: 'SESSION_MISSING_ID', message: 'session id path parameter is required' },
  });
  /* c8 ignore stop */
}

function respondNotFound(res: Response, id: string): void {
  res.status(404).json({
    error: {
      code: 'SESSION_NOT_FOUND',
      message: `session ${id} does not exist`,
    },
  });
}

function parseTypeFilter(raw: unknown): 'all' | 'invalid' | SessionType {
  if (raw === undefined || raw === null || raw === '') return 'all';
  if (typeof raw !== 'string') return 'invalid';
  if (!VALID_TYPES.has(raw as SessionType)) return 'invalid';
  return raw as SessionType;
}

function parseLimit(raw: unknown, maxRuns: number): 'invalid' | 'none' | number {
  if (raw === undefined || raw === null || raw === '') return 'none';
  if (typeof raw !== 'string') return 'invalid';
  if (!/^\d+$/.test(raw)) return 'invalid';
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return 'invalid';
  return Math.min(n, maxRuns);
}

type Mutable<T> = { -readonly [P in keyof T]: T[P] };
