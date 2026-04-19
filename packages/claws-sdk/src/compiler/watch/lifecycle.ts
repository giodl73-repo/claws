/**
 * SIGINT / SIGBREAK lifecycle management for `claws watch` (CL-01 §claws
 * watch MUST, 5-step cleanup; watch/S03-F01, F05, F08).
 *
 * The 5 steps on Ctrl-C:
 *   1. Stop accepting new fs events (handle.close() first step).
 *   2. Drain or discard in-flight compile — atomic rename guarantees partial
 *      emits are never visible, so discard is safe when the compile already
 *      committed its tempfile or before write.
 *   3. Atomic rename guarantee (owned by `atomic-write`).
 *   4. Tempfile sweep (owned by the watcher via `sweepStaleTempfiles`).
 *   5. Exit 0 within 2000ms.
 *
 * A double-SIGINT (or a 1000ms timeout on `handle.close()`) triggers
 * force-exit with code 1. Windows cmd.exe and PowerShell forward SIGBREAK
 * where Git Bash forwards SIGINT — both are clean-exit triggers.
 *
 * @module claws-sdk/compiler/watch/lifecycle
 */

/** Budget for the full cleanup sequence. Exceeding it force-exits with 1. */
export const CLEANUP_BUDGET_MS = 2000;

/** Budget for `handle.close()` alone. Exceeding it triggers force-exit. */
export const CLOSE_TIMEOUT_MS = 1000;

export interface LifecycleHandle {
  /** Stop accepting fs events and drain in-flight work. */
  close(): Promise<void>;
}

export interface LifecycleOptions {
  /**
   * Function invoked on force-exit. Defaults to `process.exit`. Tests
   * override it to observe the exit code without terminating the runner.
   */
  readonly exit?: (code: number) => void;
  /**
   * Optional logger for warning messages on force-exit. Defaults to
   * `console.warn`.
   */
  readonly warn?: (message: string) => void;
}

/**
 * Install SIGINT + SIGBREAK handlers that await `handle.close()` before
 * exiting. Returns an uninstall function that removes the listeners (used
 * by tests and by callers that shut down cleanly on their own).
 *
 * First signal: triggers graceful close with a 1000ms timeout.
 * Second signal or timeout: force-exit with code 1 and a logged warning.
 */
export function installSignalHandlers(
  handle: LifecycleHandle,
  options: LifecycleOptions = {},
): () => void {
  const exit = options.exit ?? ((code) => process.exit(code));
  const warn = options.warn ?? ((message) => console.warn(message));

  let signalCount = 0;
  let closing: Promise<void> | undefined;

  const onSignal = (): void => {
    signalCount += 1;
    if (signalCount >= 2) {
      warn('claws watch: received second signal, force-exiting');
      exit(1);
      return;
    }

    // First signal — run the full cleanup sequence under CLOSE_TIMEOUT_MS.
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      warn('claws watch: cleanup exceeded timeout, force-exiting');
      exit(1);
    }, CLOSE_TIMEOUT_MS);
    /* c8 ignore next -- unref is a no-op on platforms without keep-alive semantics; covered by integration. */
    if (typeof timer.unref === 'function') timer.unref();

    closing = handle.close().then(
      () => {
        clearTimeout(timer);
        if (!timedOut) {
          exit(0);
        }
      },
      /* c8 ignore start -- handle.close() is designed to swallow its own errors so the reject arm is defensive. */
      () => {
        clearTimeout(timer);
        if (!timedOut) {
          warn('claws watch: close() failed, force-exiting');
          exit(1);
        }
      },
      /* c8 ignore stop */
    );
  };

  process.on('SIGINT', onSignal);
  process.on('SIGBREAK', onSignal);

  return () => {
    process.off('SIGINT', onSignal);
    process.off('SIGBREAK', onSignal);
    // The returned promise is observable via `closing` for tests that want
    // to await the graceful path after emitting SIGINT.
    void closing;
  };
}
