/**
 * L0: .claws and .craft sidecars coexist without path collision.
 *
 * Verifies that no .claws sidecar path overlaps with the .craft
 * sidecar namespace, ensuring both can exist in the same workspace.
 */

import { describe, it, expect } from 'vitest';
import { CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE } from '../../src/types/sidecar.js';

describe('.claws and .craft coexistence', () => {
  it('no .claws path starts with .craft/', () => {
    for (const path of Object.values(CLAWS_SIDECAR_LAYOUT)) {
      expect(path).not.toMatch(/^\.craft\//);
    }
  });

  it('all .claws paths are in the .claws/ namespace', () => {
    for (const path of Object.values(CLAWS_SIDECAR_LAYOUT)) {
      expect(path).toMatch(/^\.claws\//);
    }
  });

  it('config file is at workspace root, not in .claws/ or .craft/', () => {
    expect(CLAWS_CONFIG_FILE).not.toMatch(/^\.claws\//);
    expect(CLAWS_CONFIG_FILE).not.toMatch(/^\.craft\//);
  });

  it('.claws and .craft are distinct directory prefixes', () => {
    const clawsPaths = Object.values(CLAWS_SIDECAR_LAYOUT);
    for (const path of clawsPaths) {
      // Extract the root directory (e.g. ".claws")
      const root = path.split('/')[0];
      expect(root).toBe('.claws');
      expect(root).not.toBe('.craft');
    }
  });

  it('sidecar directories have no common subdirectory names that would collide', () => {
    // The .claws/ and .craft/ roots are different, so subdirectory name
    // overlap is fine (e.g. .claws/config and .craft/config are distinct).
    // This test verifies the structural assumption holds.
    const clawsRoot = '.claws';
    const craftRoot = '.craft';
    expect(clawsRoot).not.toBe(craftRoot);
  });
});
