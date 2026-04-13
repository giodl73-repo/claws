import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FORBIDDEN_PACKAGES = [
  '@craftworks/craftworks-sdk',
  '@craftworks/shared-cli',
  '@craftworks/craft-cli',
  '@craftworks/guard-cli',
  '@craftworks/fleet-cli',
  '@craftworks/forge-cli',
];

const ROOT = resolve(__dirname, '../..');

function loadTsconfigPaths(tsconfigPath: string): Record<string, string[]> {
  const raw = readFileSync(tsconfigPath, 'utf-8');
  const config = JSON.parse(raw);
  return config.compilerOptions?.paths ?? {};
}

describe('tsconfig-no-forbidden-paths', () => {
  describe('claws-sdk', () => {
    const paths = loadTsconfigPaths(resolve(ROOT, 'tsconfig.json'));

    for (const pkg of FORBIDDEN_PACKAGES) {
      it(`tsconfig.json paths do not alias ${pkg}`, () => {
        const aliases = Object.keys(paths);
        const matches = aliases.filter(
          (alias) => alias === pkg || alias.startsWith(`${pkg}/`),
        );
        expect(matches).toEqual([]);
      });
    }
  });

  describe('claws-cli', () => {
    const paths = loadTsconfigPaths(resolve(ROOT, '../claws-cli/tsconfig.json'));

    for (const pkg of FORBIDDEN_PACKAGES) {
      it(`tsconfig.json paths do not alias ${pkg}`, () => {
        const aliases = Object.keys(paths);
        const matches = aliases.filter(
          (alias) => alias === pkg || alias.startsWith(`${pkg}/`),
        );
        expect(matches).toEqual([]);
      });
    }
  });
});
