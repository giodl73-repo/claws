/**
 * L1: build command integration — full pipeline on fixture workspaces.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runBuild } from '../../src/commands/build.js';

async function createFullOCWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-build-int-'));
  await writeFile(
    join(root, 'claws.json'),
    JSON.stringify({ trustTier: 2, platform: 'openclaw' }),
  );
  await writeFile(
    join(root, 'SOUL.md'),
    '# Soul\n\nYou are a helpful engineering assistant.\n\n## Constraints\n\n- Never access production databases.\n',
  );
  await writeFile(
    join(root, 'TOOLS.md'),
    '# Tools\n\n## file-read\nReads files from the local filesystem.\nRisk: R2\n\n## shell-exec\nExecutes shell commands.\nRisk: R4\n',
  );
  return root;
}

function makeCtx(root: string): PlatformContext {
  return {
    workspaceRoot: root,
    hasConfig: true,
    config: { trustTier: 2, platform: 'openclaw' },
    bypass: false,
    suppressedRules: [],
  };
}

describe('claws build integration', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('produces artifacts in the openclaw artifacts directory', async () => {
    tmpRoot = await createFullOCWorkspace();
    const ctx = makeCtx(tmpRoot);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: false }, 'openclaw');
      expect(exitCode).toBeLessThanOrEqual(1);

      // Verify artifact files exist
      const artifactsDir = join(tmpRoot, '.claws', 'compiled', 'artifacts', 'openclaw');
      const files = await readdir(artifactsDir, { recursive: true });

      // OpenClaw adapter produces: index.ts, package.json, SKILL.md, exec-approvals.json,
      // and handler files under handlers/
      expect(files.some((f) => f === 'SKILL.md' || f.toString().includes('SKILL.md'))).toBe(true);
      expect(files.some((f) => f === 'index.ts' || f.toString().includes('index.ts'))).toBe(true);
      expect(files.some((f) => f === 'exec-approvals.json' || f.toString().includes('exec-approvals.json'))).toBe(true);
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('second build with unchanged files reports up-to-date', async () => {
    tmpRoot = await createFullOCWorkspace();
    const ctx = makeCtx(tmpRoot);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // First build
      await runBuild(ctx, { force: true, json: false, verbose: false }, 'openclaw');
      consoleSpy.mockClear();

      // Second build — should hit cache
      const exitCode = await runBuild(ctx, { force: false, json: false, verbose: false }, 'openclaw');
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Up to date');
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
