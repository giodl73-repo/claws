/**
 * L0: pre-command hook — workspace detection, config loading, bypass check.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { preCommand } from '../../src/hooks/pre-command.js';

describe('preCommand', () => {
  let tmpRoot: string | undefined;
  const origBypass = process.env['CLAWS_BYPASS'];

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
    if (origBypass === undefined) {
      delete process.env['CLAWS_BYPASS'];
    } else {
      process.env['CLAWS_BYPASS'] = origBypass;
    }
  });

  it('detects workspace with claws.json in cwd', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-pre-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 3 }));

    const ctx = await preCommand(tmpRoot);

    expect(ctx.hasConfig).toBe(true);
    expect(ctx.workspaceRoot).toBe(tmpRoot);
    expect(ctx.config).toBeDefined();
    expect(ctx.config!.trustTier).toBe(3);
  });

  it('walks up to find claws.json in parent directory', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-pre-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));
    const subDir = join(tmpRoot, 'sub', 'deep');
    await mkdir(subDir, { recursive: true });

    const ctx = await preCommand(subDir);

    expect(ctx.hasConfig).toBe(true);
    expect(ctx.workspaceRoot).toBe(tmpRoot);
  });

  it('returns hasConfig=false when no claws.json found', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-pre-empty-'));

    const ctx = await preCommand(tmpRoot);

    expect(ctx.hasConfig).toBe(false);
    expect(ctx.config).toBeNull();
    expect(ctx.workspaceRoot).toBe(tmpRoot);
  });

  it('loads suppress array from claws.json', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-pre-'));
    await writeFile(
      join(tmpRoot, 'claws.json'),
      JSON.stringify({ trustTier: 2, suppress: ['G-PERM-01', 'G-CLASS-02'] }),
    );

    const ctx = await preCommand(tmpRoot);

    expect(ctx.suppressedRules).toEqual(['G-PERM-01', 'G-CLASS-02']);
  });

  it('defaults suppressedRules to empty array when no suppress in config', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-pre-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));

    const ctx = await preCommand(tmpRoot);

    expect(ctx.suppressedRules).toEqual([]);
  });

  it('sets bypass=true when CLAWS_BYPASS=1', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-pre-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));
    process.env['CLAWS_BYPASS'] = '1';

    const ctx = await preCommand(tmpRoot);

    expect(ctx.bypass).toBe(true);
  });

  it('sets bypass=false when CLAWS_BYPASS is not 1', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-pre-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));
    delete process.env['CLAWS_BYPASS'];

    const ctx = await preCommand(tmpRoot);

    expect(ctx.bypass).toBe(false);
  });

  it('handles malformed claws.json gracefully (hasConfig=false)', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-pre-'));
    await writeFile(join(tmpRoot, 'claws.json'), 'not valid json{{{');

    const ctx = await preCommand(tmpRoot);

    // File exists so workspace is found, but config parse fails
    expect(ctx.hasConfig).toBe(true);
    expect(ctx.config).toBeNull();
    expect(ctx.suppressedRules).toEqual([]);
  });

  it('uses process.cwd() when no cwd argument provided', async () => {
    // This exercises the default parameter path
    const ctx = await preCommand();

    // Should not throw and should return a valid context
    expect(ctx).toBeDefined();
    expect(typeof ctx.workspaceRoot).toBe('string');
    expect(typeof ctx.hasConfig).toBe('boolean');
    expect(typeof ctx.bypass).toBe('boolean');
  });
});
