/**
 * Terminal spinner with status text.
 *
 * Cycles through animation frames while a long-running operation
 * is in progress. Completes with a checkmark (succeed) or cross
 * (fail). Respects NO_COLOR/FORCE_COLOR and degrades to static
 * text when not on a TTY.
 *
 * @module claws-cli/ui/spinner
 */

import { isColorEnabled } from '../color/index.js';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const CHECK = '✔';
const CROSS = '✖';
const INTERVAL_MS = 80;

export interface SpinnerOptions {
  readonly stream?: { write(s: string): void; isTTY?: boolean };
  readonly colorOverride?: boolean;
}

export interface Spinner {
  update(message: string): void;
  succeed(message: string): void;
  fail(message: string): void;
  stop(): void;
}

/**
 * Format a spinner frame. Pure function for testing.
 */
export function formatSpinnerFrame(
  frame: string,
  message: string,
  opts?: { color?: boolean },
): string {
  const useColor = isColorEnabled(opts?.color);
  if (useColor) {
    return `\x1b[36m${frame}\x1b[0m ${message}`;
  }
  return `${frame} ${message}`;
}

/**
 * Format a succeed line. Pure function for testing.
 */
export function formatSucceed(message: string, opts?: { color?: boolean }): string {
  const useColor = isColorEnabled(opts?.color);
  if (useColor) {
    return `\x1b[32m${CHECK}\x1b[0m ${message}`;
  }
  return `${CHECK} ${message}`;
}

/**
 * Format a fail line. Pure function for testing.
 */
export function formatFail(message: string, opts?: { color?: boolean }): string {
  const useColor = isColorEnabled(opts?.color);
  if (useColor) {
    return `\x1b[31m${CROSS}\x1b[0m ${message}`;
  }
  return `${CROSS} ${message}`;
}

/**
 * Start a spinner that animates on a TTY.
 *
 * Usage:
 * ```ts
 * const spin = startSpinner('Compiling...', { stream: process.stderr });
 * // ... work ...
 * spin.succeed('Compiled in 1.2s');
 * ```
 */
export function startSpinner(message: string, opts?: SpinnerOptions): Spinner {
  const stream = opts?.stream ?? process.stderr;
  const isTTY = stream.isTTY ?? false;
  const colorOvr = opts?.colorOverride;
  let frameIdx = 0;
  let currentMessage = message;
  let timer: ReturnType<typeof setInterval> | null = null;

  function render(): void {
    const frame = FRAMES[frameIdx % FRAMES.length]!;
    const line = formatSpinnerFrame(frame, currentMessage, colorOvr !== undefined ? { color: colorOvr } : undefined);
    if (isTTY) {
      stream.write(`\r\x1b[K${line}`);
    }
    frameIdx++;
  }

  if (isTTY) {
    render();
    timer = setInterval(render, INTERVAL_MS);
  } else {
    stream.write(`${FRAMES[0]!} ${currentMessage}\n`);
  }

  function clearTimer(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    update(msg: string): void {
      currentMessage = msg;
      if (!isTTY) {
        stream.write(`${FRAMES[frameIdx % FRAMES.length]!} ${msg}\n`);
      }
    },

    succeed(msg: string): void {
      clearTimer();
      const line = formatSucceed(msg, colorOvr !== undefined ? { color: colorOvr } : undefined);
      if (isTTY) {
        stream.write(`\r\x1b[K${line}\n`);
      } else {
        stream.write(`${line}\n`);
      }
    },

    fail(msg: string): void {
      clearTimer();
      const line = formatFail(msg, colorOvr !== undefined ? { color: colorOvr } : undefined);
      if (isTTY) {
        stream.write(`\r\x1b[K${line}\n`);
      } else {
        stream.write(`${line}\n`);
      }
    },

    stop(): void {
      clearTimer();
      if (isTTY) {
        stream.write(`\r\x1b[K`);
      }
    },
  };
}
