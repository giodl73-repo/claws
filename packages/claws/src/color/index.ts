/**
 * Color system entry point for claws CLI.
 *
 * Supports:
 * - NO_COLOR env var (https://no-color.org/) — disables all color
 * - FORCE_COLOR env var — enables color even when not a TTY
 * - Programmatic override via `isColorEnabled()`
 *
 * @module claws-cli/color
 */

export { riskColor, RISK_TIER_COLORS } from './risk.js';
export type { RiskTier } from './risk.js';
export { severityColor as diagnosticSeverityColor, SEVERITY_COLORS } from './severity.js';
export type { SeverityLevel } from './severity.js';

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
  brightRed: `${ESC}91m`,
  gray: `${ESC}90m`,
} as const;

function wrap(code: string): ColorFn {
  return (text: string) => `${code}${text}${CODES.reset}`;
}

const identity: ColorFn = (text: string) => text;

/**
 * Determine whether color output is enabled.
 *
 * Priority:
 * 1. NO_COLOR env var set (any value) -> disabled
 * 2. FORCE_COLOR env var set (any value) -> enabled
 * 3. Explicit `override` parameter
 * 4. Default: enabled when stdout is a TTY, disabled otherwise
 */
export function isColorEnabled(override?: boolean): boolean {
  if (process.env['NO_COLOR'] !== undefined) return false;
  if (process.env['FORCE_COLOR'] !== undefined) return true;
  if (override !== undefined) return override;
  return process.stdout.isTTY === true;
}

/**
 * Color palette for terminal output.
 */
export interface ColorPalette {
  readonly green: ColorFn;
  readonly cyan: ColorFn;
  readonly yellow: ColorFn;
  readonly red: ColorFn;
  readonly brightRed: ColorFn;
  readonly dim: ColorFn;
  readonly bold: ColorFn;
  readonly gray: ColorFn;
}

/**
 * Create a color palette respecting NO_COLOR / FORCE_COLOR.
 */
export function createColorPalette(override?: boolean): ColorPalette {
  const enabled = isColorEnabled(override);
  if (!enabled) {
    return {
      green: identity,
      cyan: identity,
      yellow: identity,
      red: identity,
      brightRed: identity,
      dim: identity,
      bold: identity,
      gray: identity,
    };
  }
  return {
    green: wrap(CODES.green),
    cyan: wrap(CODES.cyan),
    yellow: wrap(CODES.yellow),
    red: wrap(CODES.red),
    brightRed: wrap(CODES.brightRed),
    dim: wrap(CODES.dim),
    bold: wrap(CODES.bold),
    gray: wrap(CODES.gray),
  };
}

/**
 * Apply a color function to text, respecting the global color state.
 */
export function applyColor(text: string, colorFn: ColorFn, override?: boolean): string {
  if (!isColorEnabled(override)) return text;
  return colorFn(text);
}
