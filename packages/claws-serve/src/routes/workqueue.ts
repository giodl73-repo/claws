/**
 * GET /api/workqueue — merged HEARTBEAT.md + runtime task list.
 *
 * Thin HTTP adapter over `buildWorkQueue` (claws-sdk) and the
 * `WorkQueueStore` (claws-serve/state). The route:
 *
 * 1. Parses the workspace (HEARTBEAT.md is the authoritative schedule).
 * 2. Loads runtime state from `.claws/workqueue.json`.
 * 3. Prunes stale runtime entries whose HEARTBEAT heading disappeared.
 * 4. Delegates the merge + sort to `buildWorkQueue`.
 * 5. Applies the `?status=` comma-separated filter.
 * 6. Stamps `blocked_by_violation` via `enforcementPlan.blockedTools` from
 *    the current CompilationHost IR.
 *
 * S13 acceptance: the work queue merges HEARTBEAT.md scheduled entries
 * with runtime state for M365 To Do / Planner integration.
 *
 * @module claws-serve/routes/workqueue
 */

import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  buildWorkQueue,
  heartbeatTaskId,
  parseWorkspace,
  type WorkQueueItem,
  type WorkQueueStatus,
} from '../../../claws-sdk/src/workspace/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { createWorkQueueStore, type WorkQueueStore } from '../state/workqueue-store.js';

/** Valid `?status=` filter values. `blocked_by_violation` included per S13-F06 semantics. */
const ALLOWED_STATUS_FILTERS: ReadonlySet<WorkQueueStatus> = new Set([
  'scheduled',
  'pending',
  'in_progress',
  'completed',
  'failed',
  'blocked_by_violation',
]);

/** Options for mounting the work-queue router. */
export interface WorkQueueRouterOptions {
  /** Absolute workspace root. */
  readonly workspaceRoot: string;
  /**
   * Optional store override for testing. Defaults to a store rooted at
   * `<workspaceRoot>/.claws/workqueue.json`.
   */
  readonly store?: WorkQueueStore;
}

/** Response body served at `GET /api/workqueue`. */
export interface WorkQueueResponse {
  readonly tasks: readonly WorkQueueItem[];
}

/**
 * Build an Express router mounted at `/api/workqueue`. The CompilationHost
 * supplies `enforcementPlan.blockedTools` for the `blocked_by_violation`
 * derivation; when the host has no cached IR, no tasks are marked blocked.
 */
export function workqueueRouter(
  host: CompilationHost,
  options: WorkQueueRouterOptions,
): Router {
  const router = Router();
  const store =
    options.store ?? createWorkQueueStore({ workspaceRoot: options.workspaceRoot });

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    handleList(host, store, options.workspaceRoot, req, res).catch(next);
  });

  return router;
}

async function handleList(
  host: CompilationHost,
  store: WorkQueueStore,
  workspaceRoot: string,
  req: Request,
  res: Response,
): Promise<void> {
  const filter = parseStatusFilter(req.query['status']);
  if (filter === 'invalid') {
    res.status(400).json({
      error: 'WORKQUEUE_INVALID_STATUS_FILTER',
      message: `?status= must be a comma-separated subset of ${[...ALLOWED_STATUS_FILTERS].join(', ')}`,
    });
    return;
  }

  const workspace = await parseWorkspace(workspaceRoot);

  // Prune runtime entries whose HEARTBEAT heading was renamed or removed —
  // keeps `.claws/workqueue.json` from accumulating orphans (S13-F03 spec
  // accepts that renaming loses completion history; the stale sweep is
  // what makes the outer list coherent).
  const validHeartbeatIds = new Set(
    (workspace.heartbeat?.sections ?? []).map((s) => heartbeatTaskId(s.heading)),
  );
  await store.cleanupStale(validHeartbeatIds);

  const runtimeState = await store.load();
  const blockedTools = host.getCachedIR()?.analysis.enforcementPlan.blockedTools ?? [];

  const tasks = buildWorkQueue({
    workspace,
    runtimeState,
    blockedTools,
  });

  const body: WorkQueueResponse = {
    tasks: filter === 'all' ? tasks : tasks.filter((t) => filter.has(t.status)),
  };
  res.status(200).json(body);
}

/**
 * Parse `?status=` query values.
 *
 * - Absent / empty ⇒ `'all'` (no filtering).
 * - Comma-separated subset of {@link ALLOWED_STATUS_FILTERS} ⇒ Set.
 * - Anything else ⇒ `'invalid'` (handler returns 400).
 *
 * Accepts string or string[] — Express surfaces repeated `?status=` params
 * as an array; we only handle single values to keep the contract tight.
 */
function parseStatusFilter(
  raw: unknown,
): 'all' | 'invalid' | ReadonlySet<WorkQueueStatus> {
  if (raw === undefined || raw === null || raw === '') return 'all';
  if (typeof raw !== 'string') return 'invalid';
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return 'all';
  const result = new Set<WorkQueueStatus>();
  for (const part of parts) {
    if (!ALLOWED_STATUS_FILTERS.has(part as WorkQueueStatus)) return 'invalid';
    result.add(part as WorkQueueStatus);
  }
  return result;
}
