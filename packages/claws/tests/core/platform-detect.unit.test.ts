/**
 * L0: platform-detect — marker file detection, fallback behavior.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectPlatform } from '../../src/core/platform-detect.js';

describe('platform-detect', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('auto-detects openclaw from SOUL.md marker file with governance keywords', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-detect-'));
    // SOUL.md needs at least 2 governance keyword matches to trigger openclaw detection
    await writeFile(
      join(tmpRoot, 'SOUL.md'),
      '# Soul\n\nYou are a helpful assistant.\n\n## Constraints\n\n- Never access production databases.\n- Always ask before running commands.\n',
    );

    const result = await detectPlatform(tmpRoot, null);
    expect(result.platform).toBe('openclaw');
    expect(result.method).toBe('auto-detect');
    expect(result.inventory.detected).toBe(true);
  });

  it('auto-detects claude-code from CLAUDE.md marker file', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-detect-'));
    await writeFile(
      join(tmpRoot, 'CLAUDE.md'),
      '# Project\n\nThis is a Claude Code workspace.\n',
    );

    const result = await detectPlatform(tmpRoot, null);
    expect(result.platform).toBe('claude-code');
    expect(result.method).toBe('auto-detect');
  });

  it('uses config platform when specified in claws.json', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-detect-'));
    // Create markers for both openclaw and claude-code
    // SOUL.md needs governance keywords to trigger openclaw detection
    await writeFile(
      join(tmpRoot, 'SOUL.md'),
      '# Soul\n\n- Never access production.\n- Always ask for approval.\n',
    );
    await writeFile(join(tmpRoot, 'CLAUDE.md'), '# Project\n');

    const result = await detectPlatform(tmpRoot, { platform: 'openclaw' });
    expect(result.platform).toBe('openclaw');
    expect(result.method).toBe('config');
  });

  it('throws when no platform markers are detected', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-detect-'));
    // Empty workspace — no marker files

    await expect(
      detectPlatform(tmpRoot, null),
    ).rejects.toThrow(/no platforms detected/i);
  });

  it('detects cursor from .cursorrules marker file', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-detect-'));
    await writeFile(
      join(tmpRoot, '.cursorrules'),
      'You are a code assistant.\n',
    );

    const result = await detectPlatform(tmpRoot, null);
    expect(result.platform).toBe('cursor');
    expect(result.method).toBe('auto-detect');
  });

  it('throws when config specifies an invalid platform name', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-detect-'));
    await writeFile(join(tmpRoot, 'CLAUDE.md'), '# Project\n');

    await expect(
      detectPlatform(tmpRoot, { platform: 'not-a-real-platform' }),
    ).rejects.toThrow(/Invalid platform "not-a-real-platform"/);
  });

  it('throws when config platform is valid but not among detected platforms', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-detect-'));
    // Create claude-code markers only
    await writeFile(join(tmpRoot, 'CLAUDE.md'), '# Project\nClaude Code workspace.\n');

    // Config says cursor but only claude-code is detected
    await expect(
      detectPlatform(tmpRoot, { platform: 'cursor' }),
    ).rejects.toThrow(/Platform "cursor" specified in claws\.json but could not be resolved/);
  });

  it('throws when config platform is valid but no platforms are detected at all', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-detect-'));
    // Empty workspace — no marker files

    await expect(
      detectPlatform(tmpRoot, { platform: 'openclaw' }),
    ).rejects.toThrow(/no platforms were detected/);
  });
});
