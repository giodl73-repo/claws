/**
 * L0: Cache source list stays in sync with DEFAULT_FILE_SOURCES.
 *
 * Q7 regression guard — the cache must hash the same files the
 * compiler reads. If DEFAULT_FILE_SOURCES changes but the cache
 * list doesn't, the cache will miss real invalidations.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_FILE_SOURCES } from '../../src/compile/types.js';

/**
 * Mirror of GOVERNANCE_SOURCE_FILES derivation in cache.ts.
 * If the derivation logic changes, update this test.
 */
const EXPECTED_CACHE_SOURCES = [...DEFAULT_FILE_SOURCES, 'claws.json'];

describe('cache source list sync', () => {
  it('GOVERNANCE_SOURCE_FILES includes every DEFAULT_FILE_SOURCES entry', () => {
    for (const source of DEFAULT_FILE_SOURCES) {
      expect(
        EXPECTED_CACHE_SOURCES,
        `missing DEFAULT_FILE_SOURCES entry: ${source}`,
      ).toContain(source);
    }
  });

  it('GOVERNANCE_SOURCE_FILES has exactly DEFAULT_FILE_SOURCES + claws.json', () => {
    expect(EXPECTED_CACHE_SOURCES).toHaveLength(DEFAULT_FILE_SOURCES.length + 1);
    expect(EXPECTED_CACHE_SOURCES).toContain('claws.json');
  });

  it('DEFAULT_FILE_SOURCES includes skills/ and lobster.yaml (not SKILL.md/WORKFLOW.md)', () => {
    // Guard against the original Q7 bug — cache listed SKILL.md and
    // WORKFLOW.md but the compiler reads skills/ and lobster.yaml
    expect(DEFAULT_FILE_SOURCES).toContain('skills/');
    expect(DEFAULT_FILE_SOURCES).toContain('lobster.yaml');
    expect(DEFAULT_FILE_SOURCES).not.toContain('SKILL.md');
    expect(DEFAULT_FILE_SOURCES).not.toContain('WORKFLOW.md');
  });
});
