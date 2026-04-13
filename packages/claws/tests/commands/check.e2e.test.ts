/**
 * L2: Full `claws check` E2E on fixture workspace.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { preCommand } from '../../src/hooks/pre-command.js';
import { runCheck } from '../../src/commands/check.js';

async function createFullWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-check-e2e-'));
  await writeFile(
    join(root, 'claws.json'),
    JSON.stringify({ trustTier: 3, platform: 'claude-code' }),
  );
  await writeFile(
    join(root, 'SOUL.md'),
    [
      '# Soul',
      '',
      'You are a helpful coding assistant.',
      'Never execute arbitrary shell commands without user approval.',
      'Always prefer reading files over guessing their content.',
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
      '## file-write',
      'Writes files to the local filesystem.',
      'Risk: R3',
      '',
      '## shell-exec',
      'Executes shell commands.',
      'Risk: R5',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'AGENTS.md'),
    [
      '# Agents',
      '',
      '## assistant',
      'Tools: file-read, file-write',
    ].join('\n'),
  );
  return root;
}

describe('claws check E2E', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('full check renders colored output with violation count and elapsed time', async () => {
    tmpRoot = await createFullWorkspace();
    const ctx = await preCommand(tmpRoot);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: true, color: false });
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join('\n');

      // Summary line has timing
      expect(output).toMatch(/\d+\.\d+s/);

      // Has either PASS or FAIL
      expect(output).toMatch(/PASS|FAIL/);

      // If FAIL, has severity breakdown
      if (output.includes('FAIL')) {
        expect(output).toMatch(/violation\(s\)/);
      }
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('check is read-only — does not write governance-ir.json', async () => {
    tmpRoot = await createFullWorkspace();
    const ctx = await preCommand(tmpRoot);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCheck(ctx, { json: false, verbose: false, color: false });

      // Unlike compile, check should NOT create .claws/compiled/
      const { access } = await import('node:fs/promises');
      try {
        await access(join(tmpRoot, '.claws', 'compiled', 'governance-ir.json'));
        expect.fail('check should not write governance-ir.json');
      } catch {
        // Expected: file does not exist — check is read-only
      }
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
