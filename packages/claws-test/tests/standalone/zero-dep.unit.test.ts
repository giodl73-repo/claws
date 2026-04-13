/**
 * L0: Verify @bic/claws-test has zero forbidden dependencies.
 *
 * Package boundary: claws-test has no compiler-sdk coupling.
 * Only runtime dep is typescript (used by SecurityScanner AST rules).
 * Must NOT depend on compiler-sdk, claws-cli, craftworks-sdk, claws-sdk, or shared-cli.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkgPath = join(__dirname, '..', '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

const FORBIDDEN_DEPS = [
  '@craftworks/compiler-sdk',
  '@craftworks/craftworks-sdk',
  '@bic/claws-cli',
  '@bic/claws-sdk',
  '@craftworks/shared-cli',
];

describe('zero-dep boundary', () => {
  it('package.json dependencies do not include forbidden packages', () => {
    const deps = Object.keys(pkg.dependencies ?? {});

    for (const forbidden of FORBIDDEN_DEPS) {
      expect(deps).not.toContain(forbidden);
    }
  });

  it('package.json devDependencies do not include forbidden packages (except skill-kit)', () => {
    const devDeps = Object.keys(pkg.devDependencies ?? {});

    for (const forbidden of FORBIDDEN_DEPS) {
      expect(devDeps).not.toContain(forbidden);
    }
  });

  it('package.json peerDependencies only include skill-kit and vitest', () => {
    const peerDeps = Object.keys(pkg.peerDependencies ?? {});

    for (const dep of peerDeps) {
      expect(['@bic/claws-skill-kit', 'vitest']).toContain(dep);
    }
  });

  it('only allowed production dependency is typescript (used by SecurityScanner)', () => {
    const deps = Object.keys(pkg.dependencies ?? {});
    for (const dep of deps) {
      expect(dep).toBe('typescript');
    }
  });
});
