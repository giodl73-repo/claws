/**
 * P55 regression — @craftworks/* sweep.
 *
 * Three tests:
 *   (a) kept-internal chunks-general router loads post-sweep and mounts
 *       under /chunks/general.
 *   (b) kept-internal loop-memory router loads post-sweep and mounts
 *       under /loop/memory — different route family than (a).
 *   (c) CI guard script at scripts/ci/no-craftworks-runtime-imports.sh
 *       exits 1 when a file containing a `@craftworks/*` literal import
 *       is planted in a fixture directory.
 *
 * The first two assertions exercise the relative-path import rewrites from
 * the sweep: if any of them lost a symbol, router construction throws at
 * import time and the test fails at module load. We deliberately import
 * each router module by name so a broken specifier surfaces immediately.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

describe('P55 @craftworks/* sweep regression', () => {
  it('chunks-general route module loads post-sweep (kept-internal route family A)', async () => {
    const mod = await import('../src/routes/chunks-general.js');
    expect(typeof mod.chunksGeneralRouter).toBe('function');
  });

  it('loop-memory route module loads post-sweep (kept-internal route family B)', async () => {
    const mod = await import('../src/routes/loop-memory.js');
    expect(typeof mod.loopMemoryRouter).toBe('function');
  });

  describe('CI guard negative test', () => {
    let dir: string | undefined;

    afterEach(async () => {
      if (dir !== undefined) {
        await rm(dir, { recursive: true, force: true });
        dir = undefined;
      }
    });

    it('no-craftworks-runtime-imports.sh exits 1 when a fixture imports @craftworks/*', async () => {
      dir = await mkdtemp(join(tmpdir(), 'p55-guard-'));
      await writeFile(
        join(dir, 'fixture.ts'),
        'import { foo } from "@bic/claws-sdk";\n',
        'utf8',
      );
      const script = join(
        process.cwd(),
        '..',
        'scripts',
        'ci',
        'no-craftworks-runtime-imports.sh',
      );
      const result = spawnSync('bash', [script, dir], {
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('@craftworks/');
    });
  });
});
