/**
 * Post-command hook — timing and cleanup.
 *
 * Runs after every claws command completes. Tracks execution timing
 * and performs any cleanup needed.
 *
 * @module claws-cli/hooks/post-command
 */

/**
 * Result of a command execution with timing.
 */
export interface CommandTiming {
  /** Command name that was executed. */
  readonly command: string;
  /** Execution duration in milliseconds. */
  readonly durationMs: number;
  /** Whether the command succeeded (exit code 0). */
  readonly success: boolean;
}

/**
 * Create a timer for measuring command execution.
 */
export function createTimer(): { elapsed: () => number } {
  const start = performance.now();
  return {
    elapsed: () => Math.round(performance.now() - start),
  };
}

/**
 * Run post-command hook: record timing, perform cleanup.
 *
 * @param command - Name of the command that was executed
 * @param durationMs - Execution duration in milliseconds
 * @param success - Whether the command succeeded
 * @returns CommandTiming record
 */
export function postCommand(
  command: string,
  durationMs: number,
  success: boolean,
): CommandTiming {
  return { command, durationMs, success };
}
