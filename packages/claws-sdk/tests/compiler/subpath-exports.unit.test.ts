/**
 * CM-5 acceptance — verifies the CP-2 module barrels are wired as
 * package.json subpath exports and that the tsup config emits the
 * matching dist artifacts. Consumers must be able to import each module
 * via `@bic/claws-sdk/compiler/<name>`.
 *
 * Note: `compiler/codegen` was removed in CM-9 as orphan code with no src
 * consumer; paid-tier emitters can cherry-pick 92f3d47ba to reintroduce it.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..', '..');

describe('CM-5: CP-2 module subpath exports', () => {
  const pkg = JSON.parse(
    readFileSync(resolve(pkgRoot, 'package.json'), 'utf8'),
  ) as {
    exports: Record<string, { import: string; types: string }>;
  };

  const compilerModules = ['emit', 'cache', 'host', 'events'] as const;

  for (const mod of compilerModules) {
    it(`./compiler/${mod} is declared in package.json#exports`, () => {
      const entry = pkg.exports[`./compiler/${mod}`];
      expect(entry, `missing exports entry ./compiler/${mod}`).toBeDefined();
      expect(entry.import).toBe(`./dist/compiler/${mod}/index.js`);
      expect(entry.types).toBe(`./dist/compiler/${mod}/index.d.ts`);
    });
  }

  it('./workspace is declared in package.json#exports', () => {
    const entry = pkg.exports['./workspace'];
    expect(entry, 'missing exports entry ./workspace').toBeDefined();
    expect(entry.import).toBe('./dist/workspace/index.js');
    expect(entry.types).toBe('./dist/workspace/index.d.ts');
  });

  it('root exports re-export compile() from compiler/host', async () => {
    const rootBarrel = readFileSync(
      resolve(pkgRoot, 'src', 'index.ts'),
      'utf8',
    );
    expect(rootBarrel).toMatch(/from '\.\/compiler\/host\/index\.js'/);
    expect(rootBarrel).toMatch(/\bcompile\b/);
  });

  it('tsup config has entries for all CP-2 module barrels', () => {
    const tsupSrc = readFileSync(resolve(pkgRoot, 'tsup.config.ts'), 'utf8');
    for (const mod of compilerModules) {
      expect(
        tsupSrc,
        `tsup entry missing for compiler/${mod}/index`,
      ).toMatch(
        new RegExp(
          `'compiler/${mod}/index':\\s*'src/compiler/${mod}/index\\.ts'`,
        ),
      );
    }
  });

  it('tsup config has entry for workspace module barrel', () => {
    const tsupSrc = readFileSync(resolve(pkgRoot, 'tsup.config.ts'), 'utf8');
    expect(
      tsupSrc,
      'tsup entry missing for workspace/index',
    ).toMatch(/'workspace\/index':\s*'src\/workspace\/index\.ts'/);
  });
});
