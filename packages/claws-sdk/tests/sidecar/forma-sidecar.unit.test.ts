/**
 * L0: .claws FORMA sidecar resolves expected layout paths.
 *
 * Verifies that the CLAWS_SIDECAR_LAYOUT constant maps all 13
 * subdirectories to the correct .claws/ relative paths, and that
 * claws.json is the config file (not craft.json).
 */

import { describe, it, expect } from 'vitest';
import { CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE, type ClawsSidecarDir } from '../../src/types/sidecar.js';

describe('CLAWS_SIDECAR_LAYOUT', () => {
  const EXPECTED_DIRS: ClawsSidecarDir[] = [
    'compiled',
    'staging',
    'keys',
    'audit',
    'cache',
    'policies',
    'secrets',
    'config',
    'snapshots',
    'runtime',
    'fleet',
    'compliance',
    'supply',
  ];

  it('contains exactly 13 subdirectories', () => {
    const keys = Object.keys(CLAWS_SIDECAR_LAYOUT);
    expect(keys).toHaveLength(13);
  });

  it.each(EXPECTED_DIRS)('maps "%s" to .claws/%s', (dir) => {
    expect(CLAWS_SIDECAR_LAYOUT[dir]).toBe(`.claws/${dir}`);
  });

  it('all paths start with .claws/', () => {
    for (const path of Object.values(CLAWS_SIDECAR_LAYOUT)) {
      expect(path).toMatch(/^\.claws\//);
    }
  });

  it('all paths use forward slashes (no backslashes)', () => {
    for (const path of Object.values(CLAWS_SIDECAR_LAYOUT)) {
      expect(path).not.toContain('\\');
    }
  });
});

describe('CLAWS_CONFIG_FILE', () => {
  it('is claws.json at workspace root (NOT inside .claws/)', () => {
    expect(CLAWS_CONFIG_FILE).toBe('claws.json');
  });

  it('does not reference craft.json', () => {
    expect(CLAWS_CONFIG_FILE).not.toContain('craft.json');
  });

  it('does not live inside .claws/ directory', () => {
    expect(CLAWS_CONFIG_FILE).not.toMatch(/^\.claws\//);
  });
});
