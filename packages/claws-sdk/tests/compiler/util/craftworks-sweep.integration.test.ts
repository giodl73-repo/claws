/**
 * L1: P54 @craftworks-sweep regression tests.
 *
 * Locks down the claws-sdk/src post-sweep state:
 *   1. The public subpaths documented in scrubbed JSDoc headers continue
 *      to export the symbols their headers promise. Any accidental import
 *      rewrite during the sweep would surface here before CI.
 *   2. The `scripts/ci/no-craftworks-runtime-imports.sh` guard exits 1 when
 *      a test fixture re-introduces an `@craftworks/<pkg>` import. Locks
 *      the guard so regressions fail CI instead of silently passing.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
// tests/compiler/util -> tests/compiler -> tests -> claws-sdk -> packages -> repoRoot
const repoRoot = resolve(here, '..', '..', '..', '..', '..');
const guard = resolve(repoRoot, 'scripts', 'ci', 'no-craftworks-runtime-imports.sh');

describe('P54 @craftworks sweep — claws-sdk/src', () => {
  it('(a) post-sweep subpath barrels still export their advertised surface', async () => {
    const topLevel = (await import('#src/index.js')) as Record<string, unknown>;
    expect(typeof topLevel).toBe('object');

    const workspace = (await import('#src/workspace/index.js')) as Record<
      string,
      unknown
    >;
    expect(typeof workspace.parseWorkspace).toBe('function');

    const workspaceEdit = (await import('#src/workspace-edit/index.js')) as Record<
      string,
      unknown
    >;
    expect(typeof workspaceEdit).toBe('object');

    const events = (await import('#src/compiler/events/index.js')) as Record<
      string,
      unknown
    >;
    expect(typeof events).toBe('object');

    const util = (await import('#src/compiler/util/index.js')) as Record<
      string,
      unknown
    >;
    expect(typeof util.verifyNoCraftworksRefs).toBe('function');
  });

  it('(b) guard script exits 1 when a fixture reintroduces an @craftworks import', () => {
    const sandbox = mkdtempSync(resolve(tmpdir(), 'p54-guard-'));
    const pkgDir = resolve(sandbox, 'claws-sdk', 'src');
    mkdirSync(pkgDir, { recursive: true });
    const forbiddenScope = '@' + 'craftworks';
    const fixture = `import Legacy from '${forbiddenScope}/legacy-pkg';\nexport const x = Legacy;\n`;
    writeFileSync(resolve(pkgDir, 'regression.ts'), fixture);

    try {
      const result = spawnSync('bash', [guard, pkgDir], {
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('FORBIDDEN');
      expect(result.stdout).toContain('regression.ts');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
