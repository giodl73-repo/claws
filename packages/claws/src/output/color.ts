/**
 * ANSI color utilities for terminal output.
 *
 * Consolidated: delegates to the canonical color/ module. This file
 * re-exports with the Palette interface expected by output/ consumers.
 *
 * @module claws-cli/output/color
 */

import { isColorEnabled, createColorPalette } from '../color/index.js';
export type { ColorPalette } from '../color/index.js';

/**
 * Color palette for terminal output.
 *
 * Aliases ColorPalette fields to the semantic names used by output/ modules.
 */
export interface Palette {
  pass: (text: string) => string;
  fail: (text: string) => string;
  warn: (text: string) => string;
  info: (text: string) => string;
  dim: (text: string) => string;
  bold: (text: string) => string;
  cyan: (text: string) => string;
}

/**
 * Whether color output is disabled.
 *
 * Delegates to `isColorEnabled()`, which checks (in order):
 *   1. `NO_COLOR` env var → disabled
 *   2. `FORCE_COLOR` env var → enabled
 *   3. Explicit `colorEnabled` parameter
 *   4. Default: disabled when stdout is not a TTY
 */
export function isColorDisabled(colorEnabled?: boolean): boolean {
  return !isColorEnabled(colorEnabled);
}

/**
 * Create a color palette that respects NO_COLOR / --no-color.
 *
 * Maps ColorPalette fields to the semantic Palette interface.
 */
export function createPalette(colorEnabled?: boolean): Palette {
  const cp = createColorPalette(colorEnabled);
  return {
    pass: cp.green,
    fail: cp.red,
    warn: cp.yellow,
    info: cp.gray,
    dim: cp.dim,
    bold: cp.bold,
    cyan: cp.cyan,
  };
}

/**
 * Map a governance rule level (1-5) to a palette color function.
 *
 * - 5 (critical): red
 * - 4 (high): red
 * - 3 (medium): yellow
 * - 2 (low): dim
 * - 1 (info): dim
 */
export function severityColor(level: number, palette: Palette): (text: string) => string {
  if (level >= 4) return palette.fail;
  if (level === 3) return palette.warn;
  return palette.dim;
}

/**
 * Map a severity level number to a human-readable label.
 */
export function severityLabel(level: number): string {
  switch (level) {
    case 5: return 'critical';
    case 4: return 'high';
    case 3: return 'medium';
    case 2: return 'low';
    default: return 'info';
  }
}
