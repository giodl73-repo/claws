/**
 * L0 unit test for the shared `resolveCacheDir` export.
 *
 * The CLI path and the compile path MUST import the SAME function — a
 * second resolver in either layer would let `cache stats` and `compile`
 * write to different directories (AC-1). We assert module-identity by
 * importing from both the top-level barrel and the direct module path.
 */

import { describe, it, expect } from 'vitest';
import { resolveCacheDir as fromBarrel } from '#src/compiler/cache/index.js';
import { resolveCacheDir as fromModule } from '#src/compiler/cache/resolve.js';

describe('resolveCacheDir (unit)', () => {
  it('is the same function instance when imported from the barrel or the module', () => {
    expect(fromBarrel).toBe(fromModule);
  });

  it('returns an absolute `.claws/cache/compile` path beneath the workspace root', () => {
    const resolved = fromBarrel('/abs/workspace');
    // POSIX or Windows path joining is acceptable — we assert the tail.
    expect(resolved.replaceAll('\\', '/')).toMatch(/\/abs\/workspace\/\.claws\/cache\/compile$/);
  });
});
