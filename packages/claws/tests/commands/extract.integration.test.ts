/**
 * L1: extract --preview — workspace integration with error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PlatformContext } from '../../src/hooks/pre-command.js';

// Mock the optional provider SDK so the probe in createLLMProvider succeeds
vi.mock('@anthropic-ai/sdk', () => ({ default: {} }));

import { runExtract } from '../../src/commands/extract.js';

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-extract-int-'));
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

describe('claws extract --preview integration', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
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
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 3 with JSON when no workspace detected', async () => {
    const ctx = makeCtx({ hasConfig: false });

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
      expect(parsed.error.code).toBe('OC-POLICY-E010');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 3 when ANTHROPIC_API_KEY is not set', async () => {
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
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    }
  });

  it('returns exit 3 with parse halt (no source files)', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-extract-empty-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const originalKey = process.env['ANTHROPIC_API_KEY'];
    // Set a fake key so we get past the key check
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-fake-key';

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E021');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      } else {
        delete process.env['ANTHROPIC_API_KEY'];
      }
    }
  });
});
