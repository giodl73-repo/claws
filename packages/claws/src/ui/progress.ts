/**
 * Terminal progress bar with percentage and ETA display.
 *
 * Renders `[████░░░░░░] 40% ETA 3s` style output. Updates in-place
 * on TTY via carriage return; falls back to line-per-update when
 * not a TTY. Respects NO_COLOR/FORCE_COLOR from the color system.
 *
 * @module claws-cli/ui/progress
 */

import { isColorEnabled } from '../color/index.js';

const BAR_WIDTH = 20;
const FILL_CHAR = '\u2588'; // █
const EMPTY_CHAR = '\u2591'; // ░

export interface ProgressBarOptions {
  readonly stream?: { write(s: string): void; isTTY?: boolean };
  readonly width?: number;
  readonly colorOverride?: boolean;
}

export interface ProgressBar {
  tick(n?: number): void;
  done(): void;
}

/**
 * Format a progress bar string for a given current/total.
 * Pure when opts.color and opts.isTTY are provided; otherwise reads process state.
 */
export function formatProgressBar(
  current: number,
  total: number,
  elapsedMs: number,
  opts?: { width?: number; color?: boolean; isTTY?: boolean },
): string {
  const width = opts?.width ?? BAR_WIDTH;
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const pctStr = `${Math.round(pct * 100)}%`;

  const bar = FILL_CHAR.repeat(filled) + EMPTY_CHAR.repeat(empty);

  let eta = '';
  if (current > 0 && current < total && elapsedMs > 0) {
    const rate = current / elapsedMs;
    const remainMs = (total - current) / rate;
    const remainSec = Math.ceil(remainMs / 1000);
    eta = ` ETA ${remainSec}s`;
  }

  // Precedence: NO_COLOR (always wins) → FORCE_COLOR → explicit override/TTY fallback.
  const explicitColor = opts?.color;
  const isTTY = opts?.isTTY ?? (typeof process !== 'undefined' && process.stdout?.isTTY === true);
  const useColor = isColorEnabled(explicitColor ?? isTTY);
  if (useColor) {
    return `\x1b[32m[${bar}]\x1b[0m ${pctStr}${eta}`;
  }
  return `[${bar}] ${pctStr}${eta}`;
}

/**
 * Create a progress bar that writes to a stream.
 *
 * Usage:
 * ```ts
 * const bar = startProgress(100);
 * bar.tick(10); // advance by 10
 * bar.done();   // finalize
 * ```
 */
export function startProgress(total: number, opts?: ProgressBarOptions): ProgressBar {
  const stream = opts?.stream ?? process.stderr;
  const width = opts?.width ?? BAR_WIDTH;
  const isTTY = stream.isTTY ?? false;
  const colorOvr = opts?.colorOverride;
  let current = 0;
  const startTime = Date.now();

  function render(): void {
    const elapsed = Date.now() - startTime;
    const fmtOpts = colorOvr !== undefined
      ? { width, isTTY, color: colorOvr }
      : { width, isTTY };
    const line = formatProgressBar(current, total, elapsed, fmtOpts);
    if (isTTY) {
      stream.write(`\r${line}`);
    } else {
      stream.write(`${line}\n`);
    }
  }

  return {
    tick(n = 1): void {
      current = Math.min(current + n, total);
      render();
    },
    done(): void {
      current = total;
      const elapsed = Date.now() - startTime;
      const doneOpts = colorOvr !== undefined
        ? { width, isTTY, color: colorOvr }
        : { width, isTTY };
      const line = formatProgressBar(current, total, elapsed, doneOpts);
      if (isTTY) {
        stream.write(`\r${line}\n`);
      } else {
        stream.write(`${line}\n`);
      }
    },
  };
}
