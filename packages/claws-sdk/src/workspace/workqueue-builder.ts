/**
 * WorkQueue builder — merges HEARTBEAT.md scheduled entries with runtime
 * task state into a unified `WorkQueueItem[]` ready for the To Do / Planner
 * surface.
 *
 * Business logic lives here (SDK-owns-logic rule); the claws-serve route at
 * `/api/workqueue` is a thin HTTP adapter that reads workspace state, pulls
 * runtime state from the persistent workqueue store, hands both to
 * `buildWorkQueue`, applies the `?status=` filter, and renders the result.
 *
 * HEARTBEAT.md is the authoritative source for *scheduled* task definitions
 * (source = `'heartbeat'`). Runtime state (in-progress, completed, blocked)
 * is tracked separately in `.claws/workqueue.json` via the store — it does
 * NOT define tasks, only layers state on top of the HEARTBEAT-derived IDs.
 * User-, agent-, and fleet-authored tasks live entirely in the runtime store
 * (they have no HEARTBEAT.md anchor) and are merged in as-is.
 *
 * Items are sorted by status rank (`in_progress` > `pending` >
 * `blocked_by_violation` > `scheduled` > `completed` > `failed`), then by
 * priority descending, then by `dueAt` ascending.
 *
 * @module claws-sdk/workspace/workqueue-builder
 */

import { createHash } from 'node:crypto';
import type { WorkspaceState } from '@bic/openclaw-workspace/path';

/** Source of a work-queue task. */
export type WorkQueueSource = 'heartbeat' | 'user' | 'agent' | 'fleet';

/**
 * Status of a work-queue task.
 *
 * `blocked_by_violation` is emitted by the builder when a task requires a
 * tool that is listed in the current `enforcementPlan.blockedTools`. The
 * builder never persists this status — it is derived on each build.
 */
export type WorkQueueStatus =
  | 'scheduled'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'blocked_by_violation';

/** One merged work-queue entry. */
export interface WorkQueueItem {
  readonly id: string;
  readonly title: string;
  readonly status: WorkQueueStatus;
  readonly source: WorkQueueSource;
  /** Priority (higher = more urgent). Defaults to 0 when unset. */
  readonly priority: number;
  /** ISO-8601 due timestamp (absent for recurring schedules without a due). */
  readonly dueAt?: string;
  /** ISO-8601 next-run timestamp for HEARTBEAT-sourced recurring tasks. */
  readonly nextRun?: string;
  /** Actor who assigned this task (user/agent/fleet sources only). */
  readonly assignedBy?: string;
  /** ISO-8601 assignment timestamp. */
  readonly assignedAt?: string;
  /** ISO-8601 completion timestamp (status = `completed` / `failed`). */
  readonly completedAt?: string;
  /** Tool names that gate this task (present only when blocked). */
  readonly blockedTools?: readonly string[];
}

/**
 * Runtime state layered on a single task ID. HEARTBEAT-anchored tasks (IDs
 * prefixed `hb-`) use the state's `status`, `completedAt`, and `priority`;
 * user/agent/fleet-anchored tasks carry the full definition.
 */
export interface WorkQueueRuntimeState {
  readonly id: string;
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'scheduled';
  readonly source: WorkQueueSource;
  /** Required for user/agent/fleet; ignored for heartbeat (HEARTBEAT owns title). */
  readonly title?: string;
  readonly priority?: number;
  readonly dueAt?: string;
  readonly assignedBy?: string;
  readonly assignedAt?: string;
  readonly completedAt?: string;
  /** Tool names this task requires. Used to derive `blocked_by_violation`. */
  readonly requiredTools?: readonly string[];
}

/** Options for {@link buildWorkQueue}. */
export interface BuildWorkQueueOptions {
  /** Parsed workspace — used only for HEARTBEAT.md sections. */
  readonly workspace: WorkspaceState;
  /** Runtime state keyed by task id; keys absent here fall through to schedule-only. */
  readonly runtimeState: ReadonlyMap<string, WorkQueueRuntimeState>;
  /** Tools currently blocked by an active governance violation. */
  readonly blockedTools?: readonly string[];
  /** Clock injection for deterministic testing; defaults to `Date.now()`. */
  readonly now?: () => number;
}

const HEARTBEAT_ID_PREFIX = 'hb-';

/**
 * Stable ID for a HEARTBEAT.md-sourced task.
 *
 * Takes the first 12 hex chars of `sha256(heading)` so heading text is the
 * only stability anchor. If the user renames the heading the ID changes —
 * the spec (S13-F03) accepts this trade-off in v1 and leaves fallback
 * ordinals to a future HEARTBEAT frontmatter extension.
 */
export function heartbeatTaskId(heading: string): string {
  const hash = createHash('sha256').update(heading).digest('hex').slice(0, 12);
  return `${HEARTBEAT_ID_PREFIX}${hash}`;
}

const STATUS_RANK: Record<WorkQueueStatus, number> = {
  in_progress: 0,
  pending: 1,
  blocked_by_violation: 2,
  scheduled: 3,
  completed: 4,
  failed: 5,
};

/**
 * Build a `WorkQueueItem[]` by merging HEARTBEAT.md scheduled tasks with
 * runtime state.
 *
 * - HEARTBEAT sections each yield one `heartbeat`-sourced item; runtime
 *   state (if any) supplies its status, priority, and completion timestamps.
 * - Runtime-only tasks (source ∈ `user | agent | fleet`) are appended
 *   verbatim. Their `title` is required — missing titles are skipped.
 * - `blocked_by_violation` is stamped on a task when any of its
 *   `requiredTools` appears in `blockedTools` AND the task would otherwise
 *   be `pending` or `scheduled`. Completed/failed tasks keep their terminal
 *   status.
 *
 * The result is sorted by (status rank, priority desc, dueAt asc, id asc)
 * for deterministic output.
 */
export function buildWorkQueue(opts: BuildWorkQueueOptions): readonly WorkQueueItem[] {
  const { workspace, runtimeState, blockedTools = [] } = opts;
  const blockedSet = new Set(blockedTools);
  const items: WorkQueueItem[] = [];
  const seenIds = new Set<string>();

  // 1) HEARTBEAT-sourced tasks — one per H2 heading in HEARTBEAT.md.
  const heartbeatSections = workspace.heartbeat?.sections ?? [];
  for (const section of heartbeatSections) {
    const id = heartbeatTaskId(section.heading);
    seenIds.add(id);
    const state = runtimeState.get(id);
    const item = buildHeartbeatItem(id, section.heading, state, blockedSet);
    items.push(item);
  }

  // 2) Runtime-only tasks — user/agent/fleet. HEARTBEAT-anchored state
  //    already consumed above is skipped here.
  for (const state of runtimeState.values()) {
    if (state.source === 'heartbeat') continue;
    if (seenIds.has(state.id)) continue;
    if (state.title === undefined || state.title.length === 0) continue;
    seenIds.add(state.id);
    items.push(buildRuntimeItem(state, blockedSet));
  }

  return sortItems(items);
}

function buildHeartbeatItem(
  id: string,
  heading: string,
  state: WorkQueueRuntimeState | undefined,
  blockedSet: ReadonlySet<string>,
): WorkQueueItem {
  const baseStatus: WorkQueueStatus = state?.status ?? 'scheduled';
  const requiredTools = state?.requiredTools ?? [];
  const blockers = requiredTools.filter((t) => blockedSet.has(t));
  const status = deriveBlockedStatus(baseStatus, blockers);
  const item: Mutable<WorkQueueItem> = {
    id,
    title: heading,
    status,
    source: 'heartbeat',
    priority: state?.priority ?? 0,
  };
  if (state?.dueAt !== undefined) item.dueAt = state.dueAt;
  if (state?.completedAt !== undefined) item.completedAt = state.completedAt;
  if (status === 'blocked_by_violation') item.blockedTools = blockers;
  return item;
}

function buildRuntimeItem(
  state: WorkQueueRuntimeState,
  blockedSet: ReadonlySet<string>,
): WorkQueueItem {
  const baseStatus: WorkQueueStatus = state.status;
  const requiredTools = state.requiredTools ?? [];
  const blockers = requiredTools.filter((t) => blockedSet.has(t));
  const status = deriveBlockedStatus(baseStatus, blockers);
  const item: Mutable<WorkQueueItem> = {
    id: state.id,
    title: state.title ?? '',
    status,
    source: state.source,
    priority: state.priority ?? 0,
  };
  if (state.dueAt !== undefined) item.dueAt = state.dueAt;
  if (state.assignedBy !== undefined) item.assignedBy = state.assignedBy;
  if (state.assignedAt !== undefined) item.assignedAt = state.assignedAt;
  if (state.completedAt !== undefined) item.completedAt = state.completedAt;
  if (status === 'blocked_by_violation') item.blockedTools = blockers;
  return item;
}

function deriveBlockedStatus(
  base: WorkQueueStatus,
  blockers: readonly string[],
): WorkQueueStatus {
  if (blockers.length === 0) return base;
  if (base === 'pending' || base === 'scheduled') return 'blocked_by_violation';
  return base;
}

function sortItems(items: readonly WorkQueueItem[]): readonly WorkQueueItem[] {
  return [...items].sort((a, b) => {
    const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rankDiff !== 0) return rankDiff;
    const prioDiff = b.priority - a.priority;
    if (prioDiff !== 0) return prioDiff;
    const dueDiff = compareOptionalIso(a.dueAt, b.dueAt);
    if (dueDiff !== 0) return dueDiff;
    return a.id.localeCompare(b.id);
  });
}

function compareOptionalIso(a: string | undefined, b: string | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a.localeCompare(b);
}

type Mutable<T> = { -readonly [P in keyof T]: T[P] };
