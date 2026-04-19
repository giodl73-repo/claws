/**
 * Serial compile queue with generation tracking (CL-01 §claws watch; watch/S02-F01).
 *
 * Edits land faster than compiles finish. Without discipline, edit #5's
 * compile could commit its emit after edit #10's — the watcher would leave
 * stale bytes on disk. The queue enforces two rules:
 *
 *   1. Compiles are serialized per-workspace — at most one in flight.
 *   2. Every enqueue bumps a monotonic generation; a compile whose
 *      generation is behind `latestGen` at completion is "stale" and its
 *      emit output is discarded by the caller.
 *
 * @module claws-sdk/compiler/watch/compile-queue
 */

export interface CompileJob<T> {
  /** The generation number captured when this job was enqueued. */
  readonly gen: number;
  /** Whether this job's result is authoritative (gen === latestGen at finish). */
  readonly stale: boolean;
  /** The job's result, when it ran. */
  readonly result: T | undefined;
}

export interface CompileQueue<T> {
  /** Monotonic generation counter; increments on every `enqueue`. */
  readonly latestGen: number;
  /**
   * Enqueue a compile. The returned promise resolves after `fn` finishes;
   * if a newer generation was enqueued before this one finished, `stale`
   * is true and the caller MUST discard any emit output.
   */
  enqueue(fn: () => Promise<T>): Promise<CompileJob<T>>;
  /** Wait for any in-flight job to finish. */
  idle(): Promise<void>;
}

/**
 * Create a per-workspace compile queue. `T` is the caller's compile-result
 * payload — the queue is payload-agnostic.
 */
export function createCompileQueue<T>(): CompileQueue<T> {
  let latestGen = 0;
  let chain: Promise<void> = Promise.resolve();

  function enqueue(fn: () => Promise<T>): Promise<CompileJob<T>> {
    latestGen += 1;
    const myGen = latestGen;
    let resolveJob!: (job: CompileJob<T>) => void;
    const jobPromise = new Promise<CompileJob<T>>((res) => {
      resolveJob = res;
    });

    chain = chain.then(async () => {
      let result: T | undefined;
      try {
        result = await fn();
      } catch {
        // Surface failure as a stale-or-fresh job with no result; the caller
        // sees `result === undefined` and the queue keeps moving. Swallowing
        // here prevents one failed compile from tearing down the chain.
      }
      const stale = myGen !== latestGen;
      resolveJob({ gen: myGen, stale, result });
    });

    return jobPromise;
  }

  async function idle(): Promise<void> {
    await chain;
  }

  return {
    get latestGen() {
      return latestGen;
    },
    enqueue,
    idle,
  };
}
