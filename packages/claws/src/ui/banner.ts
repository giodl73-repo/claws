/**
 * claws startup banner.
 *
 * Displays the claws name and version number on CLI startup.
 * Respects NO_COLOR/FORCE_COLOR — renders styled text when color
 * is enabled, plain text otherwise.
 *
 * @module claws-cli/ui/banner
 */

import { isColorEnabled } from '../color/index.js';

const BANNER_LINES = [
  '      _                    ',
  '  ___| | __ ___      ___  ',
  ' / __| |/ _` \\ \\ /\\ / / __|',
  '| (__| | (_| |\\ V  V / (__ ',
  ' \\___|_|\\__,_| \\_/\\_/ \\___|',
];

/**
 * Format the claws banner with version string.
 * Pure function — deterministic output for testing.
 */
export function formatBanner(version: string, opts?: { color?: boolean }): string {
  const useColor = isColorEnabled(opts?.color);
  const lines: string[] = [];

  if (useColor) {
    for (const line of BANNER_LINES) {
      lines.push(`\x1b[36m${line}\x1b[0m`);
    }
    lines.push(`  \x1b[2mclaws v${version}\x1b[0m`);
  } else {
    for (const line of BANNER_LINES) {
      lines.push(line);
    }
    lines.push(`  claws v${version}`);
  }

  return lines.join('\n');
}

/**
 * Print the claws banner to a stream.
 */
export function printBanner(
  version: string,
  opts?: {
    stream?: { write(s: string): void };
    colorOverride?: boolean;
  },
): void {
  const stream = opts?.stream ?? process.stderr;
  const colorOvr = opts?.colorOverride;
  const streamIsTTY = 'isTTY' in stream && (stream as { isTTY?: boolean }).isTTY === true;
  const banner = formatBanner(version, { color: colorOvr ?? streamIsTTY });
  stream.write(`${banner}\n\n`);
}
