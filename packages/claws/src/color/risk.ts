/**
 * Risk tier color mapping for claws CLI.
 *
 * Maps governance risk tiers R1-R5 to terminal colors:
 * - R1 (minimal risk): green
 * - R2 (low risk): cyan
 * - R3 (moderate risk): yellow
 * - R4 (high risk): red
 * - R5 (critical risk): bright-red
 *
 * @module claws-cli/color/risk
 */

import type { ColorPalette } from './index.js';

/**
 * Valid risk tier values.
 */
export type RiskTier = 1 | 2 | 3 | 4 | 5;

/**
 * Static mapping of risk tiers to color names.
 * Used for documentation and testing without a palette instance.
 */
export const RISK_TIER_COLORS = {
  1: 'green',
  2: 'cyan',
  3: 'yellow',
  4: 'red',
  5: 'brightRed',
} as const;

/**
 * Map a risk tier (1-5) to a palette color function.
 */
export function riskColor(tier: RiskTier, palette: ColorPalette): (text: string) => string {
  switch (tier) {
    case 1: return palette.green;
    case 2: return palette.cyan;
    case 3: return palette.yellow;
    case 4: return palette.red;
    case 5: return palette.brightRed;
    default: {
      const _exhaustive: never = tier;
      throw new Error(`Invalid risk tier: ${_exhaustive}`);
    }
  }
}
