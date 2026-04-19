/**
 * L3 acceptance tests for the CP-2 graduation gate.
 *
 * These two scans are the non-negotiable invariant for graduation:
 *   - cross-package/S03: zero `@craftworks/compiler-sdk` or
 *     `@craftworks/agent-sdk` imports anywhere under
 *     `claws-sdk/src/compiler/`.
 *   - cross-package/S01: the published dependency surface (package.json
 *     `dependencies`) does not pull in `@craftworks/compiler-sdk` or
 *     `@craftworks/agent-sdk`.
 *
 * If either fails, the pipeline is not standalone and graduation has
 * regressed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const COMPILER_SRC = resolve(__dirname, '../../../src/compiler');
const PACKAGE_JSON = resolve(__dirname, '../../../package.json');

const BANNED_SPECIFIERS = ['@craftworks/compiler-sdk', '@craftworks/agent-sdk'] as const;

/**
 * Walk a directory recursively and return every .ts file path.
 */
function collectTsFiles(root: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Detect an ES import or `export ... from` referencing any of the banned
 * specifiers. Uses a single line-anchored regex so dynamic imports and
 * subpath exports both match.
 */
function escapeForRegex(s: string): string {
  return s.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&');
}

function scanForBannedImports(source: string): string[] {
  const hits: string[] = [];
  for (const specifier of BANNED_SPECIFIERS) {
    // Matches: `import ... from '@craftworks/…'`, `export ... from '@craftworks/…'`,
    // and bare `import('@craftworks/…')` dynamic imports.
    const escaped = escapeForRegex(specifier);
    const re = new RegExp(
      `(?:^\\s*(?:import|export)[^;]*from\\s+['"]${escaped}(?:['"/])|import\\(\\s*['"]${escaped}(?:['"/]))`,
      'm',
    );
    if (re.test(source)) hits.push(specifier);
  }
  return hits;
}

describe('claws-sdk graduation acceptance', () => {
  it('cross-package/S03: zero @craftworks/ imports in the compiler source tree', () => {
    const tsFiles = collectTsFiles(COMPILER_SRC);
    expect(tsFiles.length).toBeGreaterThan(0);

    const offenders: Array<{ file: string; specifiers: readonly string[] }> = [];
    for (const file of tsFiles) {
      const source = readFileSync(file, 'utf-8');
      const hits = scanForBannedImports(source);
      if (hits.length > 0) {
        offenders.push({ file, specifiers: hits });
      }
    }

    expect(offenders).toEqual([]);
  });

  it('cross-package/S01: package dependencies do not pull in @craftworks/compiler-sdk or @craftworks/agent-sdk', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8')) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    // `dependencies` and `peerDependencies` are the installed-at-consumer
    // surfaces. `devDependencies` are excluded — the graduation ban applies
    // only to the runtime surface an installed consumer pulls in.
    const runtimeDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
    };
    for (const banned of BANNED_SPECIFIERS) {
      expect(runtimeDeps[banned]).toBeUndefined();
    }
  });
});
