/**
 * Trailing-edge debouncer for watch-mode compile scheduling (CL-01 §claws
 * watch; watch/S01-F01, watch/S02-F02).
 *
 * `createDebouncer(windowMs, fn)` returns a handle that re-arms its timer on
 * every `fire()`. `fn` runs `windowMs` after the LAST `fire()`, never after
 * the first — leading-edge and leading+trailing are prohibited.
 *
 * @module claws-sdk/compiler/watch/debouncer
 */

export interface DebouncerHandle {
  /**
   * Arm (or re-arm) the debounce timer. Safe to call repeatedly; each call
   * cancels and re-schedules so `fn` fires exactly once, `windowMs` after
   * the final `fire()`.
   */
  fire(): void;
  /** Cancel any pending invocation without firing. */
  cancel(): void;
  /**
   * Force-fire the pending invocation immediately and await its promise.
   * If no invocation is pending, resolves immediately.
   */
  flush(): Promise<void>;
}

/**
 * Create a trailing-edge debouncer. `fn` is invoked serially — a second
 * invocation cannot start while the first is still running. If `fire()` is
 * called during `fn` execution, the timer re-arms on `fn`'s resolution so
 * the next invocation still trails the final event.
 */
export function createDebouncer(
  windowMs: number,
  fn: () => void | Promise<void>,
): DebouncerHandle {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | undefined;
  let pendingWhileRunning = false;

  const runFn = async (): Promise<void> => {
    timer = undefined;
    running = Promise.resolve()
      .then(fn)
      .then(
        () => undefined,
        () => undefined,
      );
    try {
      await running;
    } finally {
      running = undefined;
      if (pendingWhileRunning) {
        pendingWhileRunning = false;
        fire();
      }
    }
  };

  function fire(): void {
    if (running !== undefined) {
      pendingWhileRunning = true;
      return;
    }
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      void runFn();
    }, windowMs);
  }

  function cancel(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    pendingWhileRunning = false;
  }

  async function flush(): Promise<void> {
    // Loop: a flush must drain any fire() that arrived while `fn` was
    // already running — those re-arm a timer in runFn's finally. Stop only
    // when both the timer slot and the running slot are clear, and no
    // re-fire is queued.
    while (timer !== undefined || running !== undefined || pendingWhileRunning) {
      if (timer !== undefined) {
        clearTimeout(timer);
        await runFn();
        continue;
      }
      /* c8 ignore next -- running must be set here: pendingWhileRunning is only flipped on while runFn holds `running`, and runFn re-arms a timer in finally if it was true; the false branch would imply both timer+running are clear yet pending is set, which runFn's finally never leaves. */
      if (running !== undefined) {
        await running;
      }
    }
  }

  return { fire, cancel, flush };
}
