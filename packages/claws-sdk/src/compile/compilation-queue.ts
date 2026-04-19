/**
 * FIFO compilation queue with same-file coalescing (pitfall P-273).
 *
 * Rapid sequential edits to the same OC file would otherwise trigger a
 * compile storm — one queued job per keystroke. The queue collapses
 * back-to-back triggers for the same file into a single compile that
 * runs after the in-flight job completes, so callers always observe
 * the latest content without blocking the editor.
 *
 * Every caller receives a promise that resolves with the result of
 * *their* compile (either their own run, or the coalesced replacement
 * that subsumes it).
 *
 * @module claws-sdk/compile/compilation-queue
 */

/**
 * Identifies a single edit that should trigger a recompile. The
 * `filePath` is the unit of coalescing — two triggers arriving for the
 * same path while nothing has run yet collapse into one.
 */
export interface CompileTrigger {
  readonly filePath: string;
  readonly reason?: string;
}

/**
 * Shape of a compile result. Opaque to the queue; callers serialize
 * whatever they need from their {@link CompilationQueueOptions.compile}
 * function.
 */
export type CompileResult = unknown;

/**
 * Configuration for {@link CompilationQueue}. The sole required field
 * is the compile function the queue will call for each drained trigger.
 */
export interface CompilationQueueOptions {
  /**
   * Runs the actual compile for a given trigger. Errors propagate to
   * every awaiter of the coalesced job.
   */
  readonly compile: (trigger: CompileTrigger) => Promise<CompileResult>;
}

interface PendingEntry {
  trigger: CompileTrigger;
  awaiters: Array<{
    resolve: (value: CompileResult) => void;
    reject: (reason: unknown) => void;
  }>;
}

/**
 * FIFO queue with same-file coalescing.
 *
 * Runs at most one compile at a time. If a new trigger arrives for the
 * same file as a pending (not-yet-running) trigger, the pending entry
 * is replaced in-place — no new queue slot is created — and all prior
 * awaiters resolve with the result of the coalesced compile.
 */
export class CompilationQueue {
  private readonly compile: (trigger: CompileTrigger) => Promise<CompileResult>;
  private readonly pending: PendingEntry[] = [];
  private running = false;

  constructor(options: CompilationQueueOptions) {
    this.compile = options.compile;
  }

  /**
   * Enqueue a compile trigger. Returns a promise that resolves with
   * the compile output once the job (or its coalesced replacement) has
   * run. Coalescing applies only to pending triggers — a trigger that
   * is already in-flight does not absorb newcomers.
   */
  enqueue(trigger: CompileTrigger): Promise<CompileResult> {
    return new Promise<CompileResult>((resolve, reject) => {
      const existing = this.pending.find((e) => e.trigger.filePath === trigger.filePath);
      if (existing !== undefined) {
        existing.trigger = trigger;
        existing.awaiters.push({ resolve, reject });
      } else {
        this.pending.push({ trigger, awaiters: [{ resolve, reject }] });
      }
      void this.pump();
    });
  }

  /**
   * Drop every pending entry without running it. Awaiters are rejected
   * with a sentinel error so callers can distinguish drain-cancellation
   * from compile failure.
   */
  drain(): void {
    while (this.pending.length > 0) {
      const entry = this.pending.shift()!;
      const err = new Error('compilation queue drained');
      for (const awaiter of entry.awaiters) awaiter.reject(err);
    }
  }

  /** Current depth of the pending queue. For tests and telemetry. */
  get depth(): number {
    return this.pending.length;
  }

  /** Whether a compile is currently running. */
  get isRunning(): boolean {
    return this.running;
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending.length > 0) {
        const entry = this.pending.shift()!;
        let result: CompileResult;
        try {
          result = await this.compile(entry.trigger);
        } catch (err) {
          for (const awaiter of entry.awaiters) awaiter.reject(err);
          continue;
        }
        for (const awaiter of entry.awaiters) awaiter.resolve(result);
      }
    } finally {
      this.running = false;
    }
  }
}
