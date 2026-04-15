/**
 * Debounce layer — batch file change events within a configurable window.
 *
 * When files change rapidly (e.g., editor auto-save, formatter runs),
 * the debounce layer collects all changed paths within a 300ms window,
 * deduplicates them, and emits a single batch to the consumer.
 *
 * @module claws-sdk/watch/debounce
 */

/** Default debounce window in milliseconds. */
export const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Callback invoked when a debounced batch of changed files is ready.
 */
export type BatchCallback = (files: readonly string[]) => void;

/**
 * Debouncer that collects file change events and emits deduplicated batches.
 */
export class Debouncer {
  private pending = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly windowMs: number;
  private readonly onBatch: BatchCallback;

  /**
   * @param onBatch - Called with the deduplicated set of changed file paths
   * @param windowMs - Debounce window in milliseconds (default 300)
   */
  constructor(onBatch: BatchCallback, windowMs: number = DEFAULT_DEBOUNCE_MS) {
    this.onBatch = onBatch;
    this.windowMs = windowMs;
  }

  /**
   * Add a file path to the current batch. Resets the debounce timer.
   *
   * If the same file is added multiple times within the window, it
   * appears only once in the emitted batch.
   */
  add(filePath: string): void {
    this.pending.add(filePath);

    // Reset timer on each new event — the batch fires `windowMs` after
    // the LAST event, not the first.
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.flush(), this.windowMs);
  }

  /**
   * Immediately flush the pending batch (if non-empty).
   * Useful for testing or shutdown.
   */
  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending.size === 0) return;

    const files = [...this.pending];
    this.pending.clear();
    this.onBatch(files);
  }

  /**
   * Cancel any pending batch without emitting.
   */
  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending.clear();
  }

  /** Number of unique files in the current pending batch. */
  get pendingCount(): number {
    return this.pending.size;
  }
}
