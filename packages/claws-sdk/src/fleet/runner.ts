/**
 * Fleet parallel execution engine.
 *
 * Processes workspace operations with configurable concurrency,
 * progress callbacks, and partial failure handling. Errors are
 * collected and reported without aborting the entire scan.
 *
 * @module claws-sdk/fleet/runner
 */

/**
 * Result of a parallel execution run.
 */
export interface ParallelResult<T> {
  /** Successfully processed results. */
  readonly results: readonly T[];
  /** Errors collected during processing. */
  readonly errors: readonly { path: string; error: string }[];
}

/**
 * Run operations in parallel with a concurrency limit.
 *
 * Uses a semaphore pattern: at most `concurrency` operations
 * run simultaneously. Partial failures are collected, not thrown.
 *
 * @param items - Items to process
 * @param fn - Async function to apply to each item
 * @param concurrency - Maximum concurrent operations
 * @param onError - Optional error callback (item, error message)
 */
export async function runParallel<TIn extends { path: string }, TOut>(
  items: readonly TIn[],
  fn: (item: TIn) => Promise<TOut>,
  concurrency: number,
  onError?: (item: TIn, error: string) => void,
): Promise<ParallelResult<TOut>> {
  const results: TOut[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  // Process items using a concurrency-limited pool
  let active = 0;
  let index = 0;
  const total = items.length;

  if (total === 0) {
    return { results: [], errors: [] };
  }

  await new Promise<void>((resolve) => {
    function next(): void {
      // Check if all work is done
      if (results.length + errors.length >= total) {
        resolve();
        return;
      }

      // Launch as many tasks as concurrency allows
      while (active < concurrency && index < total) {
        const item = items[index]!;
        index++;
        active++;

        fn(item)
          .then((result) => {
            results.push(result);
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({ path: item.path, error: msg });
            onError?.(item, msg);
          })
          .finally(() => {
            active--;
            next();
          });
      }
    }

    next();
  });

  return { results, errors };
}
