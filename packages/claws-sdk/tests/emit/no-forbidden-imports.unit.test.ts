/**
 * L0: Forbidden import verification — generated output must have
 * zero @craftworks/ or @claws/ imports (OC developer test).
 *
 * 1 unit test:
 * 1. Generated output has zero @craftworks/ or @claws/ imports
 */

import { describe, it, expect } from 'vitest';
import {
  emitPlugin,
  verifyNoForbiddenImports,
} from '../../src/emit/emit-plugin.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

describe('no-forbidden-imports', () => {
  it('generated plugin source has zero @craftworks/ or @claws/ imports', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    // Check main plugin source
    const pluginForbidden = verifyNoForbiddenImports(result.pluginSource);
    expect(pluginForbidden).toEqual([]);

    // Check package.json
    const pkgForbidden = verifyNoForbiddenImports(result.packageJson);
    expect(pkgForbidden).toEqual([]);

    // Check all hook files
    for (const [filename, source] of result.hookFiles) {
      const hookForbidden = verifyNoForbiddenImports(source);
      expect(hookForbidden, `Forbidden imports in ${filename}`).toEqual([]);
    }
  });

  it('verifyNoForbiddenImports catches @craftworks/ references', () => {
    const source = `import { foo } from '@craftworks/compiler-sdk';`;
    const forbidden = verifyNoForbiddenImports(source);
    expect(forbidden).toContain('@craftworks/');
  });

  it('verifyNoForbiddenImports catches @claws/ references', () => {
    const source = `import { bar } from '@claws/core';`;
    const forbidden = verifyNoForbiddenImports(source);
    expect(forbidden).toContain('@claws/');
  });

  it('verifyNoForbiddenImports allows @openclaw/ references', () => {
    const source = `import type { GovernanceHost } from '@openclaw/governance';`;
    const forbidden = verifyNoForbiddenImports(source);
    expect(forbidden).toEqual([]);
  });
});
