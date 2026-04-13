import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
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

function createLinter(): ESLint {
  return new ESLint({
    overrideConfigFile: resolve(ROOT, 'eslint.config.cjs'),
    cwd: ROOT,
  });
}

describe('forbidden-import-canary', () => {
  for (const pkg of FORBIDDEN_PACKAGES) {
    it(`ESLint reports error on import from ${pkg}`, async () => {
      const linter = createLinter();
      const code = `import { something } from '${pkg}';\n`;

      const results = await linter.lintText(code, {
        filePath: resolve(ROOT, 'src/__canary__.ts'),
      });

      const messages = results.flatMap((r) => r.messages);
      const forbidden = messages.filter(
        (m) => m.ruleId === 'no-restricted-imports',
      );

      expect(forbidden.length).toBeGreaterThanOrEqual(1);
      expect(forbidden[0]!.severity).toBe(2); // error
    });

    it(`ESLint reports error on subpath import from ${pkg}`, async () => {
      const linter = createLinter();
      const code = `import { something } from '${pkg}/deep/path';\n`;

      const results = await linter.lintText(code, {
        filePath: resolve(ROOT, 'src/__canary__.ts'),
      });

      const messages = results.flatMap((r) => r.messages);
      const forbidden = messages.filter(
        (m) => m.ruleId === 'no-restricted-imports',
      );

      expect(forbidden.length).toBeGreaterThanOrEqual(1);
      expect(forbidden[0]!.severity).toBe(2); // error
    });
  }
});
