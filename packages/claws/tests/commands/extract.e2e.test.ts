/**
 * L2: extract + compile --llm e2e — full pipeline with mock provider.
 *
 * Verifies that the --llm flag wiring works end-to-end by testing
 * error paths that exercise the entire command → core/llm → SDK chain.
 * Live LLM calls are not made (no API key in CI).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runCompile } from '../../src/commands/compile.js';
import { runExtract } from '../../src/commands/extract.js';

async function createFullWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-llm-e2e-'));
  await writeFile(
    join(root, 'claws.json'),
    JSON.stringify({ trustTier: 2, platform: 'openclaw' }),
  );
  await writeFile(
    join(root, 'SOUL.md'),
    [
      '# Soul',
      '',
      'You are a governance-aware assistant.',
      'Never access production databases.',
      'Always validate user input before processing.',
      '',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'TOOLS.md'),
    [
      '# Tools',
      '',
      '## file-read',
      'Reads files from the local filesystem.',
      'Risk: R2',
      '',
      '## web-search',
      'Searches the web for information.',
      'Risk: R3',
      '',
    ].join('\n'),
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

describe('claws --llm e2e', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('compile without --llm produces IR without LLM section', async () => {
    tmpRoot = await createFullWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(
        ctx,
        { force: true, json: true, verbose: false },
        { llm: false },
      );
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toMatch(/^(ok|violations)$/);
      expect(parsed).not.toHaveProperty('llm');
      expect(parsed.path).toContain('governance-ir.json');

      // Verify IR file
      const irPath = join(tmpRoot, '.claws', 'compiled', 'governance-ir.json');
      const irContent = await readFile(irPath, 'utf-8');
      const ir = JSON.parse(irContent);
      expect(ir.compiler.compilerVersion).toBeDefined();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('compile --llm errors cleanly when API key is missing', async () => {
    tmpRoot = await createFullWorkspace();
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
      expect(parsed.error.what).toContain('ANTHROPIC_API_KEY');
      expect(parsed.error.howToFix).toContain('ANTHROPIC_API_KEY');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    }
  });

  it('extract --preview errors cleanly when API key is missing (JSON)', async () => {
    tmpRoot = await createFullWorkspace();
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
      expect(parsed.error.code).toBe('CLAWS-E040');
      expect(parsed.error.docsRef).toContain('llm-extraction');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    }
  });
});
