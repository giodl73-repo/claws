/**
 * L0: extract command — preview output, JSON output, LLM flag handling.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runExtract } from '../../src/commands/extract.js';

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-extract-'));
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

describe('claws extract', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('returns exit 3 when ANTHROPIC_API_KEY is missing', async () => {
    tmpRoot = await createWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const originalKey = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E040');
      expect(output).toContain('ANTHROPIC_API_KEY');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    }
  });

  it('returns exit 3 when ANTHROPIC_API_KEY is missing with --json', async () => {
    tmpRoot = await createWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const originalKey = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: true, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E040');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    }
  });

  it('returns exit 3 when no workspace detected', async () => {
    const ctx = makeCtx({ hasConfig: false });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E010');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
