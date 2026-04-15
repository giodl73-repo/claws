/**
 * Severity level color mapping for claws CLI.
 *
 * Maps diagnostic severity levels to terminal colors:
 * - CRITICAL: bright-red
 * - HIGH: red
 * - MEDIUM: yellow
 * - LOW: dim
 *
 * @module claws-cli/color/severity
 */

import type { ColorPalette } from './index.js';

/**
 * Valid severity level names.
 */
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Static mapping of severity levels to color names.
 * Used for documentation and testing without a palette instance.
 */
export const SEVERITY_COLORS = {
  CRITICAL: 'brightRed',
  HIGH: 'red',
  MEDIUM: 'yellow',
  LOW: 'dim',
} as const;

/**
 * Map a severity level to a palette color function.
 */
export function severityColor(level: SeverityLevel, palette: ColorPalette): (text: string) => string {
  switch (level) {
    case 'CRITICAL': return palette.brightRed;
    case 'HIGH': return palette.red;
    case 'MEDIUM': return palette.yellow;
    case 'LOW': return palette.dim;
  }
}
