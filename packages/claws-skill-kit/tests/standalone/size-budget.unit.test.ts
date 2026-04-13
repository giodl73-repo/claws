/**
 * L0 Unit: Verify built package size is under 35KB budget (CL-06).
 *
 * Measures total size of dist/ output after tsup build.
 * The budget ensures skill-kit stays lightweight for skill authors.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DIST_DIR = resolve(__dirname, '../../dist');
const SIZE_BUDGET_KB = 35;
const SIZE_BUDGET_BYTES = SIZE_BUDGET_KB * 1024;

/**
 * Recursively sum file sizes under a directory.
 * Excludes .map files (sourcemaps are not shipped in the npm package).
 */
function totalSize(dir: string, excludeSourcemaps = true): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      total += totalSize(full, excludeSourcemaps);
    } else if (excludeSourcemaps && full.endsWith('.map')) {
      // skip sourcemaps
    } else {
      total += stat.size;
    }
  }
  return total;
}

describe('package size budget', () => {
  it('dist/ directory exists', () => {
    expect(existsSync(DIST_DIR), 'dist/ must exist — run `tsup` first').toBe(true);
  });

  it(`total dist/ size is under ${SIZE_BUDGET_KB}KB`, () => {
    const bytes = totalSize(DIST_DIR);
    const kb = bytes / 1024;
    expect(
      bytes,
      `dist/ is ${kb.toFixed(1)}KB — exceeds ${SIZE_BUDGET_KB}KB budget`,
    ).toBeLessThanOrEqual(SIZE_BUDGET_BYTES);
  });

  it('dist/ contains expected entry files', () => {
    expect(existsSync(join(DIST_DIR, 'index.js')), 'missing dist/index.js').toBe(true);
    expect(existsSync(join(DIST_DIR, 'index.d.ts')), 'missing dist/index.d.ts').toBe(true);
  });
});
