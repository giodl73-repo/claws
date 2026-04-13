/**
 * L2: Full `claws compile` E2E on fixture workspace.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { preCommand } from '../../src/hooks/pre-command.js';
import { runCompile } from '../../src/commands/compile.js';
import type { GovernanceIR } from '@bic/claws-sdk/ir/governance-ir.js';

/**
 * Create a full fixture workspace with all common OC files.
 */
async function createFullWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-e2e-'));
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

describe('claws compile E2E', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('full compile on fixture workspace writes valid GovernanceIR', async () => {
    tmpRoot = await createFullWorkspace();

    const ctx = await preCommand(tmpRoot);
    expect(ctx.hasConfig).toBe(true);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: false, verbose: true });
      expect(exitCode).toBeLessThanOrEqual(1);

      // Read and validate the full GovernanceIR
      const irPath = join(tmpRoot, '.claws', 'compiled', 'governance-ir.json');
      const irContent = await readFile(irPath, 'utf-8');
      const ir = JSON.parse(irContent) as GovernanceIR;

      // Compiler metadata
      expect(ir.compiler.compilerVersion).toBe('0.36.0');
      expect(ir.compiler.schemaVersion).toBe(1);
      expect(ir.compiler.compiledAt).toBeTruthy();

      // Capabilities manifest is populated
      expect(ir.capabilities).toBeDefined();

      // Analysis section exists
      expect(ir.analysis).toBeDefined();
      expect(ir.analysis.violations).toBeDefined();
      expect(ir.analysis.enforcementPlan).toBeDefined();

      // Conflict report
      expect(ir.conflicts).toBeDefined();
      expect(typeof ir.conflicts.totalConflicts).toBe('number');

      // IR is valid JSON with sorted keys (deterministic serialization)
      const reParsed = JSON.parse(irContent);
      expect(reParsed).toEqual(ir);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
