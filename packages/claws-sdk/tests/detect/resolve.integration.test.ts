/**
 * L1: detect() -> resolve() pipeline integration tests.
 *
 * Exercises the full detect -> resolve pipeline against fixture workspaces.
 */

import { describe, it, expect } from 'vitest';
import { resolve as pathResolve } from 'node:path';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detect } from '../../src/detect/detect.js';
import { resolve as resolveFn } from '../../src/detect/resolve.js';

const FIXTURES = pathResolve(__dirname, '../fixtures');

describe('detect() -> resolve() pipeline', () => {
  it('platform-multi fixture: selects claude-code as primary (full > advisory)', async () => {
    const root = pathResolve(FIXTURES, 'platform-multi');
    const inventory = await detect(root);

    // platform-multi has CLAUDE.md (full), .cursorrules (advisory), copilot-instructions.md (advisory)
    expect(inventory.platforms.size).toBeGreaterThanOrEqual(2);

    const target = resolveFn(inventory);

    expect(target.primary.marker.platform).toBe('claude-code');
    expect(target.primary.marker.enforcement).toBe('full');
    expect(target.secondaries.length).toBeGreaterThanOrEqual(1);
    expect(target.method).toBe('auto-enforcement');
    expect(target.platformCount).toBe(inventory.platforms.size);
  });

  it('platform-multi fixture with claws.json targets override selects cursor', async () => {
    const root = pathResolve(FIXTURES, 'platform-multi');
    const inventory = await detect(root);

    const target = resolveFn(inventory, { targets: ['cursor'] });

    expect(target.primary.marker.platform).toBe('cursor');
    expect(target.method).toBe('config-override');
    // claude-code and copilot should be in secondaries
    const secondaryPlatforms = target.secondaries.map((s) => s.marker.platform);
    expect(secondaryPlatforms).toContain('claude-code');
  });
});
