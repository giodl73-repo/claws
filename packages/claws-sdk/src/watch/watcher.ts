/**
 * File watcher — fs.watch() on OC workspace files, claws.json, and .claws/policies/.
 *
 * Monitors all 9 OC files (SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md,
 * MEMORY.md, HEARTBEAT.md, skills/, lobster.yaml) plus claws.json and .claws/policies/
 * for file creation, modification, and deletion events.
 *
 * Events are normalized through EventNormalizer (NTFS dedup), then fed into the
 * Debouncer for batching, and finally through ContentHashStore to skip unchanged files.
 * Changed files are passed to the IncrementalParser for re-parse.
 *
 * @module claws-sdk/watch/watcher
 */

import { watch, type FSWatcher } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { stat } from 'node:fs/promises';
import { DEFAULT_FILE_SOURCES } from '../compile/types.js';
import { EventNormalizer, type RawWatchEvent } from './event-normalizer.js';
import { Debouncer, DEFAULT_DEBOUNCE_MS } from './debounce.js';
import { ContentHashStore } from './content-hash.js';

/**
 * Paths watched by the watcher beyond the 9 default OC files.
 */
const EXTRA_WATCHED = ['claws.json'] as const;

/**
 * Directory paths that are watched recursively.
 */
const WATCHED_DIRS = ['skills', '.claws/policies'] as const;

/**
 * All individual file paths to watch (non-directory).
 */
const WATCHED_FILES: readonly string[] = [
  ...DEFAULT_FILE_SOURCES.filter(s => !s.endsWith('/')),
  ...EXTRA_WATCHED,
];

/** Event emitted when a batch of files changes. */
export interface WatchBatchEvent {
  /** Relative file paths that changed (post dedup + content hash filter). */
  readonly changedFiles: readonly string[];
  /** Timestamp when the batch was emitted. */
  readonly timestamp: number;
}

/** Callback for watch batch events. */
export type WatchBatchCallback = (event: WatchBatchEvent) => void;

/** Options for creating a watcher. */
export interface WatcherOptions {
  /** Debounce window in ms (default 300). */
  readonly debounceMs?: number;
  /** Callback invoked with each batch of changed files. */
  readonly onBatch: WatchBatchCallback;
  /** Optional callback for errors. */
  readonly onError?: (error: Error) => void;
}

/**
 * OC workspace file watcher.
 *
 * Watches all governance-relevant files and directories. Normalizes
 * platform events, debounces rapid changes, filters through content
 * hashing, and emits batched change events.
 */
export class Watcher {
  private readonly workspaceRoot: string;
  private readonly normalizer = new EventNormalizer();
  private readonly hashStore = new ContentHashStore();
  private readonly debouncer: Debouncer;
  private readonly onBatch: WatchBatchCallback;
  private readonly onError: ((error: Error) => void) | undefined;
  private readonly watchers: FSWatcher[] = [];
  private running = false;

  constructor(workspaceRoot: string, options: WatcherOptions) {
    this.workspaceRoot = workspaceRoot;
    this.onBatch = options.onBatch;
    this.onError = options.onError;

    this.debouncer = new Debouncer(
      (files) => this.processBatch(files),
      options.debounceMs ?? DEFAULT_DEBOUNCE_MS,
    );
  }

  /**
   * Start watching files. Attaches fs.watch listeners on all monitored paths.
   *
   * Silently skips files or directories that don't exist yet — they'll be
   * picked up when created if a parent directory is being watched.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Watch individual files
    for (const filePath of WATCHED_FILES) {
      this.watchFile(filePath);
    }

    // Watch directories (recursive for skills/ and .claws/policies/)
    for (const dir of WATCHED_DIRS) {
      await this.watchDirectory(dir);
    }
  }

  /**
   * Stop watching and clean up all watchers.
   */
  stop(): void {
    this.running = false;
    this.debouncer.cancel();
    for (const w of this.watchers) {
      w.close();
    }
    this.watchers.length = 0;
    this.normalizer.clear();
  }

  /** Whether the watcher is currently running. */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Watch a single file for changes.
   */
  private watchFile(relativePath: string): void {
    const fullPath = join(this.workspaceRoot, relativePath);
    try {
      const w = watch(fullPath, (eventType) => {
        this.handleRawEvent({
          eventType: eventType as 'rename' | 'change',
          filename: relativePath,
          timestamp: Date.now(),
        });
      });
      w.on('error', (err) => {
        this.onError?.(err);
      });
      this.watchers.push(w);
    } catch {
      // File doesn't exist yet — skip silently
    }
  }

  /**
   * Watch a directory for changes (non-recursive, since Node's recursive
   * option is not reliable on all platforms).
   */
  private async watchDirectory(relativeDir: string): Promise<void> {
    const fullDir = join(this.workspaceRoot, relativeDir);
    try {
      const dirStat = await stat(fullDir);
      if (!dirStat.isDirectory()) return;

      const w = watch(fullDir, (eventType, filename) => {
        if (!filename) return;
        const relativePath = join(relativeDir, filename).replace(/\\/g, '/');
        this.handleRawEvent({
          eventType: eventType as 'rename' | 'change',
          filename: relativePath,
          timestamp: Date.now(),
        });
      });
      w.on('error', (err) => {
        this.onError?.(err);
      });
      this.watchers.push(w);
    } catch {
      // Directory doesn't exist yet — skip
    }
  }

  /**
   * Handle a raw fs.watch event: normalize, then feed to debouncer.
   */
  private handleRawEvent(event: RawWatchEvent): void {
    if (!this.running) return;

    const normalized = this.normalizer.normalize(event);
    if (normalized === null) return; // Duplicate suppressed

    this.debouncer.add(normalized);
  }

  /**
   * Process a debounced batch: filter through content hash, emit remaining.
   */
  private async processBatch(files: readonly string[]): Promise<void> {
    const changed: string[] = [];

    for (const file of files) {
      const fullPath = join(this.workspaceRoot, file);
      const didChange = await this.hashStore.updateFromDisk(fullPath);
      if (didChange) {
        changed.push(file);
      }
    }

    if (changed.length === 0) return;

    this.onBatch({
      changedFiles: changed,
      timestamp: Date.now(),
    });
  }
}
