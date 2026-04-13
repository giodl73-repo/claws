/**
 * L2: build command e2e — full `claws build openclaw` on fixture workspace.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runBuild } from '../../src/commands/build.js';

async function createProductionLikeWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-build-e2e-'));
  await writeFile(
    join(root, 'claws.json'),
    JSON.stringify({ trustTier: 2, platform: 'openclaw' }),
  );
  await writeFile(
    join(root, 'SOUL.md'),
    [
      '# Soul',
      '',
      'You are an engineering assistant for the Acme Corp platform team.',
      '',
      '## Constraints',
      '',
      '- Never access production databases directly.',
      '- Always ask for approval before running destructive commands.',
      '- Never share credentials or secrets in chat.',
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
      '## file-write',
      'Writes files to the local filesystem.',
      'Risk: R3',
      '',
      '## shell-exec',
      'Executes shell commands.',
      'Risk: R4',
      '',
    ].join('\n'),
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

describe('claws build e2e', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('full build produces governance artifacts with correct content and reports build time', async () => {
    tmpRoot = await createProductionLikeWorkspace();
    const ctx = makeCtx(tmpRoot);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(
        ctx,
        { force: true, json: true, verbose: false },
        'openclaw',
      );
      expect(exitCode).toBeLessThanOrEqual(1);

      // Parse JSON output
      const output = consoleSpy.mock.calls.flat().join('');
      const result = JSON.parse(output);
      expect(result.platform).toBe('openclaw');
      expect(result.artifactCount).toBeGreaterThan(0);
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThan(0);

      // Verify GovernanceIR was written with correct structure
      const irPath = join(tmpRoot, '.claws', 'compiled', 'governance-ir.json');
      const irContent = await readFile(irPath, 'utf-8');
      const ir = JSON.parse(irContent);
      expect(ir.compiler.compilerVersion).toBe('0.36.0');
      expect(ir.compiler.schemaVersion).toBe(1);
      expect(ir).toHaveProperty('capabilities');
      expect(ir).toHaveProperty('analysis');
      expect(ir).toHaveProperty('conflicts');

      // Verify SKILL.md artifact has governance content
      const skillPath = join(tmpRoot, '.claws', 'compiled', 'artifacts', 'openclaw', 'SKILL.md');
      const skillContent = await readFile(skillPath, 'utf-8');
      expect(skillContent).toContain('Governance');

      // Verify exec-approvals.json artifact
      const execPath = join(tmpRoot, '.claws', 'compiled', 'artifacts', 'openclaw', 'exec-approvals.json');
      const execContent = await readFile(execPath, 'utf-8');
      const execDoc = JSON.parse(execContent);
      expect(execDoc).toHaveProperty('schema_version');
      expect(execDoc).toHaveProperty('tools');
      expect(Array.isArray(execDoc.tools)).toBe(true);

      // Verify index.ts artifact (gateway plugin)
      const pluginPath = join(tmpRoot, '.claws', 'compiled', 'artifacts', 'openclaw', 'index.ts');
      const pluginContent = await readFile(pluginPath, 'utf-8');
      expect(pluginContent).toContain('claws compiler');
      expect(pluginContent).toContain('RISK_MAP');

      // Verify cache was stored
      const cachePath = join(tmpRoot, '.claws', 'cache', 'hashes.json');
      const cacheContent = await readFile(cachePath, 'utf-8');
      const cacheEntry = JSON.parse(cacheContent);
      expect(cacheEntry).toHaveProperty('compositeHash');
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
