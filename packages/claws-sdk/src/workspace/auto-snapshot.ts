/**
 * AutoSnapshotManager — the safety net for external writes.
 *
 * When the file watcher sees an OC file change that originated outside
 * the PATCH pipeline (OC runtime installing a skill, VS Code saving
 * SOUL.md, OneDrive reconciling a conflict), the manager saves a
 * compact metadata record BEFORE the recompile runs. The record
 * names the previous version's compiled state, so if the post-edit
 * compile surfaces a violation the admin can diff and rollback.
 *
 * Auto-snapshots are bounded (default 20) with LRU eviction — the
 * oldest entry is dropped when a 21st is recorded. Metadata-only:
 * the {@link import('./version-store.js').VersionStore} already holds
 * the full GovernanceIR, so this manager stores hashes only.
 *
 * Time-travel resolution: `?at=auto:{timestamp}` maps via
 * {@link AutoSnapshotManager.findNearestByTimestamp} to the nearest
 * auto-snapshot at-or-before that instant.
 *
 * Business logic lives in this class. The file watcher hook in
 * {@link import('./auto-snapshot-trigger.js').AutoSnapshotTriggerHook}
 * is the SDK-side interceptor that the serve-layer watcher calls into;
 * no HTTP adapter is needed because the resolver treats auto-snapshot
 * reads the same as versioned reads (they share the same forest cache
 * entries).
 *
 * @module claws-sdk/workspace/auto-snapshot
 */

import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { atomicWriteFile } from './fs-atomic.js';
import {
  AUTO_SNAPSHOT_DIR,
  DEFAULT_MAX_AUTO_SNAPSHOTS,
  type AutoSnapshot,
  type AutoSnapshotTrigger,
} from './auto-snapshot-types.js';
import type { AuditChainSink } from '../compliance/audit-chain.js';

/** Options for {@link AutoSnapshotManager}. */
export interface AutoSnapshotManagerOptions {
  /**
   * Cap on retained auto-snapshots. When a save would exceed this, the
   * oldest entry (by timestamp, then version) is dropped. Defaults to
   * {@link DEFAULT_MAX_AUTO_SNAPSHOTS}.
   */
  readonly maxEntries?: number;
  /**
   * Workspace root. When supplied, {@link AutoSnapshotManager.save} persists
   * each snapshot to `.claws/snapshots/auto/{version}.json` via tmp+rename
   * and {@link AutoSnapshotManager.load} rehydrates the in-memory index
   * from that directory. Omit for purely in-memory use (tests).
   */
  readonly workspaceRoot?: string;
  /**
   * Optional audit-chain sink (CP-7 R1 ciso M2). When supplied, every
   * successful {@link AutoSnapshotManager.save} call emits one
   * `AUTO_SNAPSHOT_CAPTURED` chain entry. The docstring on the
   * module-level class previously promised "callers can emit it on an
   * audit trail" — wiring this sink makes that promise actual rather than
   * aspirational. Emit carries `actor: 'system'` (auto-snapshots are
   * watcher-driven, not user-driven), `target: workspaceRoot` (or
   * `'workspace'` when no root is configured), and severity 2 (informational).
   */
  readonly auditSink?: AuditChainSink;
  /** Policy version recorded on every emitted audit entry. */
  readonly policyVersion?: string;
}

/** Input to {@link AutoSnapshotManager.save}. */
export interface SaveAutoSnapshotInput {
  /** Workspace version at capture time (must come from VersionManager). */
  readonly version: number;
  /** SHA-256 of the GovernanceIR JSON at capture time. */
  readonly governanceIrHash: string;
  /** Per-OC-file SHA-256 hashes at capture time. */
  readonly fileHashes: Readonly<Record<string, string>>;
  /** Which external writer fired the watcher event. */
  readonly trigger: AutoSnapshotTrigger;
  /** Override the captured timestamp — tests inject a fixed clock. */
  readonly timestamp?: string;
}

/**
 * Bounded in-memory index of auto-snapshots.
 *
 * Thread-safety: not thread-safe. The compilation queue already
 * serialises writes; auto-snapshots piggyback on that serialisation.
 *
 * Eviction: LRU by timestamp (oldest first). When two entries share a
 * timestamp (rapid successive writes with a coarse clock), the one
 * with the lower version wins the "oldest" tiebreak — this keeps the
 * retained window a contiguous suffix of the version counter just
 * like {@link import('./version-store.js').VersionStore}.
 *
 * Capture invariant: the integrity check (is the file parseable after
 * the stability window?) lives in the trigger hook, not here. The
 * manager trusts that every input it receives represents a known-good
 * parseable state. Partially-written files are skipped at the hook.
 */
export class AutoSnapshotManager {
  private readonly maxEntries: number;
  private readonly entries: AutoSnapshot[] = [];
  private readonly workspaceRoot: string | undefined;
  private readonly auditSink: AuditChainSink | undefined;
  private readonly policyVersion: string;

  constructor(options: AutoSnapshotManagerOptions = {}) {
    const cap = options.maxEntries ?? DEFAULT_MAX_AUTO_SNAPSHOTS;
    if (!Number.isInteger(cap) || cap <= 0) {
      throw new Error(
        `AutoSnapshotManager maxEntries must be a positive integer; got ${String(cap)}`,
      );
    }
    this.maxEntries = cap;
    this.workspaceRoot = options.workspaceRoot;
    this.auditSink = options.auditSink;
    this.policyVersion = options.policyVersion ?? 'unknown';
  }

  /**
   * Record an auto-snapshot. Evicts the oldest retained entry when the
   * retained count would exceed {@link AutoSnapshotManagerOptions.maxEntries}.
   * Returns the stored {@link AutoSnapshot} so callers can emit it on
   * an audit trail without re-reading the index.
   *
   * Persistence: when the manager was constructed with `workspaceRoot`,
   * each saved snapshot is also persisted to
   * `<workspaceRoot>/.claws/snapshots/auto/<version>.json` via tmp+rename
   * (see {@link atomicWriteFile}). Eviction also removes the on-disk
   * file so the retained window is a contiguous suffix of what the caller
   * rehydrates through {@link AutoSnapshotManager.load}.
   */
  async save(input: SaveAutoSnapshotInput): Promise<AutoSnapshot> {
    if (!Number.isInteger(input.version) || input.version < 0) {
      throw new Error(
        `AutoSnapshotManager.save: version must be a non-negative integer; got ${String(input.version)}`,
      );
    }
    const timestamp = input.timestamp ?? new Date().toISOString();
    const entry: AutoSnapshot = {
      version: input.version,
      timestamp,
      fileHashes: input.fileHashes,
      governanceIrHash: input.governanceIrHash,
      trigger: input.trigger,
    };
    this.entries.push(entry);
    if (this.workspaceRoot !== undefined) {
      await this.writeEntry(this.workspaceRoot, entry);
    }
    await this.evictIfNeeded();
    if (this.auditSink !== undefined) {
      this.auditSink.emit({
        eventType: 'AUTO_SNAPSHOT_CAPTURED',
        actor: 'system',
        target: this.workspaceRoot ?? 'workspace',
        action: 'capture',
        outcome: entry.trigger,
        ruleId: 'AUTO_SNAPSHOT',
        severity: 2,
        policyVersion: this.policyVersion,
      });
    }
    return entry;
  }

  /**
   * Rehydrate the in-memory index from `<workspaceRoot>/.claws/snapshots/auto`.
   *
   * Reads every `*.json` entry in the directory, parses it, and populates
   * {@link AutoSnapshotManager.entries} up to `maxEntries`. Entries beyond
   * the cap are evicted (both in-memory and on disk) so the post-load
   * state matches what a fresh `save()` would have left behind.
   *
   * A missing directory is treated as "no prior snapshots" — not an error.
   * Parse failures on individual files are skipped with no throw so a
   * corrupted entry never takes down the watcher.
   *
   * Call once after construction; subsequent saves extend the rehydrated
   * index. Safe to call when no workspace root was configured — the call
   * is a no-op.
   */
  async load(): Promise<void> {
    if (this.workspaceRoot === undefined) return;
    const dir = AutoSnapshotManager.dir(this.workspaceRoot);
    let filenames: string[];
    try {
      filenames = await readdir(dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw err;
    }
    const collected: AutoSnapshot[] = [];
    for (const name of filenames) {
      if (!name.endsWith('.json')) continue;
      const path = join(dir, name);
      let raw: string;
      try {
        raw = await readFile(path, 'utf-8');
      } catch {
        /* c8 ignore next 3 -- defensive: a file disappearing between
           readdir and readFile is benign and not reliably simulatable
           cross-platform; the manager must simply skip it. */
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        // Malformed entry — skip. The recompile will fall back to no
        // snapshot for this version, which is the fail-soft posture the
        // module docstring calls out.
        continue;
      }
      const entry = toAutoSnapshot(parsed);
      if (entry === null) continue;
      collected.push(entry);
    }
    // Deterministic load order: oldest first by timestamp, then by
    // version as tiebreak. This matches the insertion order the index
    // would have in a crash-free session and makes the LRU scan below
    // a no-op for the common case (already <= cap).
    collected.sort((a, b) => {
      const ta = Date.parse(a.timestamp);
      const tb = Date.parse(b.timestamp);
      if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
      return a.version - b.version;
    });
    for (const entry of collected) {
      this.entries.push(entry);
    }
    await this.evictIfNeeded();
  }

  /**
   * Find the auto-snapshot nearest to (and not after) the given ISO
   * timestamp. Returns `null` when every retained entry is newer than
   * the target or the index is empty.
   */
  findNearestByTimestamp(isoTimestamp: string): AutoSnapshot | null {
    const target = Date.parse(isoTimestamp);
    if (Number.isNaN(target)) return null;
    let best: AutoSnapshot | null = null;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const entry of this.entries) {
      const when = Date.parse(entry.timestamp);
      if (Number.isNaN(when)) continue;
      if (when > target) continue;
      const delta = target - when;
      if (delta < bestDelta) {
        bestDelta = delta;
        best = entry;
      }
    }
    return best;
  }

  /** Retained snapshots in insertion (save) order. */
  list(): readonly AutoSnapshot[] {
    return [...this.entries];
  }

  /** Retained snapshot count. */
  size(): number {
    return this.entries.length;
  }

  /** Drop every retained snapshot. */
  clear(): void {
    this.entries.length = 0;
  }

  /** Resolve the on-disk directory for auto-snapshot metadata. */
  static dir(workspaceRoot: string): string {
    return `${workspaceRoot}/${AUTO_SNAPSHOT_DIR}`;
  }

  private async evictIfNeeded(): Promise<void> {
    while (this.entries.length > this.maxEntries) {
      // Drop the oldest (by timestamp, then by lowest version as
      // tiebreak). Linear scan is fine at bound=20 — we're trading
      // a few comparisons for a predictable eviction policy.
      let oldestIdx = 0;
      for (let i = 1; i < this.entries.length; i += 1) {
        const candidate = this.entries[i]!;
        const oldest = this.entries[oldestIdx]!;
        const candWhen = Date.parse(candidate.timestamp);
        const oldestWhen = Date.parse(oldest.timestamp);
        if (candWhen < oldestWhen) {
          oldestIdx = i;
          continue;
        }
        if (candWhen === oldestWhen && candidate.version < oldest.version) {
          oldestIdx = i;
        }
      }
      const [evicted] = this.entries.splice(oldestIdx, 1);
      if (this.workspaceRoot !== undefined && evicted !== undefined) {
        await this.removeEntry(this.workspaceRoot, evicted.version);
      }
    }
  }

  private async writeEntry(
    workspaceRoot: string,
    entry: AutoSnapshot,
  ): Promise<void> {
    const path = join(
      AutoSnapshotManager.dir(workspaceRoot),
      `${String(entry.version)}.json`,
    );
    await atomicWriteFile(path, JSON.stringify(entry, null, 2));
  }

  private async removeEntry(
    workspaceRoot: string,
    version: number,
  ): Promise<void> {
    const path = join(
      AutoSnapshotManager.dir(workspaceRoot),
      `${String(version)}.json`,
    );
    // `force: true` swallows ENOENT so removing an entry that was never
    // persisted (workspaceRoot provided after a session without it) is a
    // no-op; any other failure propagates so the caller sees the real
    // reason the eviction didn't land on disk.
    await rm(path, { force: true });
  }
}

/**
 * Narrow an unknown JSON value into an {@link AutoSnapshot}. Returns null
 * when any required field is missing or mis-typed so callers can skip a
 * corrupted entry without throwing.
 */
function toAutoSnapshot(raw: unknown): AutoSnapshot | null {
  if (raw === null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj['version'] !== 'number') return null;
  if (!Number.isInteger(obj['version']) || obj['version'] < 0) return null;
  if (typeof obj['timestamp'] !== 'string') return null;
  if (typeof obj['governanceIrHash'] !== 'string') return null;
  if (typeof obj['trigger'] !== 'string') return null;
  const trigger = obj['trigger'];
  if (
    trigger !== 'oc_runtime' &&
    trigger !== 'external_edit' &&
    trigger !== 'onedrive_sync'
  ) {
    return null;
  }
  const fileHashes = obj['fileHashes'];
  if (fileHashes === null || typeof fileHashes !== 'object') return null;
  for (const [, v] of Object.entries(fileHashes)) {
    if (typeof v !== 'string') return null;
  }
  return {
    version: obj['version'],
    timestamp: obj['timestamp'],
    governanceIrHash: obj['governanceIrHash'],
    fileHashes: fileHashes as Record<string, string>,
    trigger: trigger as AutoSnapshotTrigger,
  };
}
