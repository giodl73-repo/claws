/**
 * ANSI color utilities for terminal output.
 *
 * Respects NO_COLOR env var (https://no-color.org/) and --no-color flag.
 * Maps governance severity levels to colors:
 *   green = PASS, red = high/critical, yellow = medium, dim = low/info.
 *
 * @module claws-cli/output/color
 */

type ColorFn = (text: string) => string;

const ESC = '\x1b[';

const CODES = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  cyan: `${ESC}36m`,
  gray: `${ESC}90m`,
} as const;

function wrap(code: string): ColorFn {
  return (text: string) => `${code}${text}${CODES.reset}`;
}

const identity: ColorFn = (text: string) => text;

/**
 * Whether color output is disabled.
 *
 * Color is disabled when:
 * - NO_COLOR env var is set (any value, per no-color.org)
 * - colorEnabled is explicitly set to false (--no-color flag)
 */
export function isColorDisabled(colorEnabled?: boolean): boolean {
  if (colorEnabled === false) return true;
  if (process.env['NO_COLOR'] !== undefined) return true;
  return false;
}

/**
 * Create a color palette that respects NO_COLOR / --no-color.
 */
export function createPalette(colorEnabled?: boolean): Palette {
  const disabled = isColorDisabled(colorEnabled);
  if (disabled) {
    return {
      pass: identity,
      fail: identity,
      warn: identity,
      info: identity,
      dim: identity,
      bold: identity,
      cyan: identity,
    };
  }
  return {
    pass: wrap(CODES.green),
    fail: wrap(CODES.red),
    warn: wrap(CODES.yellow),
    info: wrap(CODES.gray),
    dim: wrap(CODES.dim),
    bold: wrap(CODES.bold),
    cyan: wrap(CODES.cyan),
  };
}

/**
 * Color palette for terminal output.
 */
export interface Palette {
  pass: ColorFn;
  fail: ColorFn;
  warn: ColorFn;
  info: ColorFn;
  dim: ColorFn;
  bold: ColorFn;
  cyan: ColorFn;
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
export function severityColor(level: number, palette: Palette): ColorFn {
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
