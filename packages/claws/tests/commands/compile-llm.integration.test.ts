/**
 * L1: compile command with --llm — mock provider integration.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runCompile } from '../../src/commands/compile.js';

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-compile-llm-'));
  await writeFile(join(root, 'claws.json'), JSON.stringify({ trustTier: 2 }));
  await writeFile(
    join(root, 'SOUL.md'),
    '# Soul\n\nNever access production databases.\n',
  );
  await writeFile(
    join(root, 'TOOLS.md'),
    '# Tools\n\n## file-read\nReads files.\nRisk: R2\n',
  );
  return root;
}

function makeCtx(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    workspaceRoot: '/tmp/fake',
    hasConfig: true,
    config: { trustTier: 2 },
    bypass: false,
    suppressedRules: [],
    ...overrides,
  };
}

describe('claws compile --llm', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('compiles successfully without --llm (null provider graceful)', async () => {
    tmpRoot = await createWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(
        ctx,
        { force: true, json: false, verbose: false },
        { llm: false },
      );
      expect(exitCode).toBeLessThanOrEqual(1);

      // Verify IR was written
      const irPath = join(tmpRoot, '.claws', 'compiled', 'governance-ir.json');
      const content = await readFile(irPath, 'utf-8');
      const ir = JSON.parse(content);
      expect(ir).toHaveProperty('capabilities');
      expect(ir).toHaveProperty('compiler');

      // No LLM info in output
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).not.toContain('LLM:');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 3 with CLAWS-E040 when --llm but no API key', async () => {
    tmpRoot = await createWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const originalKey = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(
        ctx,
        { force: true, json: false, verbose: false },
        { llm: true },
      );
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('CLAWS-E040');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    }
  });

  it('returns exit 3 JSON when --llm --json but no API key', async () => {
    tmpRoot = await createWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const originalKey = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(
        ctx,
        { force: true, json: true, verbose: false },
        { llm: true },
      );
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('CLAWS-E040');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    }
  });
});
