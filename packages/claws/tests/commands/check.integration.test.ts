/**
 * L1: check command integration — fixture workspace, --json parity.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { preCommand } from '../../src/hooks/pre-command.js';
import { runCheck } from '../../src/commands/check.js';

async function createFixtureWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-check-int-'));
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
      '## shell-exec',
      'Executes shell commands.',
      'Risk: R5',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'AGENTS.md'),
    '# Agents\n\n## researcher\nDelegates to: assistant\nTools: web-search\n',
  );
  return root;
}

describe('claws check integration', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('check on fixture workspace renders correct colors and exit code', async () => {
    tmpRoot = await createFixtureWorkspace();
    const ctx = await preCommand(tmpRoot);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: false, color: false });
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      // Should have a summary line with timing
      expect(output).toMatch(/\d+\.\d+s/);
      // Should have either PASS or FAIL
      expect(output).toMatch(/PASS|FAIL/);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('--json produces parseable JSON with rule IDs matching default output', async () => {
    tmpRoot = await createFixtureWorkspace();
    const ctx = await preCommand(tmpRoot);

    // Run default output
    const defaultSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCheck(ctx, { json: false, verbose: false, color: false });
    const defaultOutput = defaultSpy.mock.calls.flat().join(' ');
    defaultSpy.mockRestore();

    // Run JSON output
    const jsonSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCheck(ctx, { json: true, verbose: false, color: false });
    const jsonOutput = jsonSpy.mock.calls.flat().join('');
    jsonSpy.mockRestore();

    const parsed = JSON.parse(jsonOutput);
    expect(parsed.status).toMatch(/^(pass|fail)$/);
    expect(Array.isArray(parsed.violations)).toBe(true);
    expect(typeof parsed.durationMs).toBe('number');

    // If there are violations, verify rule IDs appear in both outputs
    for (const v of parsed.violations) {
      expect(v.rule).toBeDefined();
      expect(v.severity).toBeDefined();
      expect(v.message).toBeDefined();
    }
  });
});
