/**
 * L1: compile command integration — fixture workspace, pre-command hook integration.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { preCommand } from '../../src/hooks/pre-command.js';
import { runCompile } from '../../src/commands/compile.js';

/**
 * Create a fixture workspace with multiple OC files.
 */
async function createFixtureWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-int-'));
  await writeFile(
    join(root, 'claws.json'),
    JSON.stringify({ trustTier: 2, platform: 'claude-code' }),
  );
  await writeFile(
    join(root, 'SOUL.md'),
    '# Soul\n\nNever access production databases directly.\nAlways log tool invocations.\n',
  );
  await writeFile(
    join(root, 'TOOLS.md'),
    '# Tools\n\n## file-read\nReads files from the local filesystem.\nRisk: R2\n\n## web-search\nSearches the web for information.\nRisk: R3\n',
  );
  await writeFile(
    join(root, 'AGENTS.md'),
    '# Agents\n\n## researcher\nDelegates to: assistant\nTools: web-search\n',
  );
  return root;
}

describe('claws compile integration', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('compile on fixture workspace produces valid governance-ir.json', async () => {
    tmpRoot = await createFixtureWorkspace();

    const ctx = await preCommand(tmpRoot);
    expect(ctx.hasConfig).toBe(true);
    expect(ctx.workspaceRoot).toBe(tmpRoot);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: false, verbose: true });
      expect(exitCode).toBeLessThanOrEqual(1);

      const irPath = join(tmpRoot, '.claws', 'compiled', 'governance-ir.json');
      const irContent = await readFile(irPath, 'utf-8');
      const ir = JSON.parse(irContent);

      // Verify GovernanceIR structure
      expect(ir.capabilities).toBeDefined();
      expect(ir.analysis).toBeDefined();
      expect(ir.intents).toBeDefined();
      expect(ir.delegationMap).toBeDefined();
      expect(ir.conflicts).toBeDefined();
      expect(ir.compiler).toBeDefined();
      expect(ir.compiler.compilerVersion).toBe('0.36.0');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('pre-command hook loads claws.json and propagates platform context', async () => {
    tmpRoot = await createFixtureWorkspace();

    const ctx = await preCommand(tmpRoot);
    expect(ctx.hasConfig).toBe(true);
    expect(ctx.config).toEqual({
      trustTier: 2,
      platform: 'claude-code',
    });
    expect(ctx.bypass).toBe(false);
    expect(ctx.suppressedRules).toEqual([]);
  });
});
