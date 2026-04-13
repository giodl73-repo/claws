/**
 * L0: init command — platform detection, config generation, sidecar scaffolding.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInit } from '../../src/commands/init.js';

/**
 * Create a workspace with CLAUDE.md marker (claude-code platform).
 */
async function createClaudeWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-init-'));
  await writeFile(join(root, 'CLAUDE.md'), '# Claude Code\n\nInstructions.\n');
  return root;
}

/**
 * Create a workspace with SOUL.md marker (openclaw platform).
 * Must contain governance keywords for OpenClaw detection.
 */
async function createOCWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-init-'));
  await writeFile(
    join(root, 'SOUL.md'),
    '# Soul\n\nYou are a helpful assistant.\nAgents must never access external APIs without approval.\nGovernance enforcement is mandatory.\n',
  );
  return root;
}

/**
 * Create an empty workspace with no marker files.
 */
async function createEmptyWorkspace(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'claws-init-'));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('claws init', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('detects claude-code platform from CLAUDE.md and creates claws.json', async () => {
    tmpRoot = await createClaudeWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false });
      expect(exitCode).toBe(0);

      // claws.json should exist
      const configPath = join(tmpRoot, 'claws.json');
      expect(await fileExists(configPath)).toBe(true);

      const config = JSON.parse(await readFile(configPath, 'utf-8'));
      expect(config.platform).toBe('claude-code');
      expect(config.trustTier).toBe(2);
      expect(config.suppress).toEqual([]);

      // Output message should reference detected platform
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Detected: claude-code');
      expect(output).toContain('claws check');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('detects openclaw platform from SOUL.md', async () => {
    tmpRoot = await createOCWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false });
      expect(exitCode).toBe(0);

      const config = JSON.parse(await readFile(join(tmpRoot, 'claws.json'), 'utf-8'));
      expect(config.platform).toBe('openclaw');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('defaults to openclaw when no marker files exist', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false });
      expect(exitCode).toBe(0);

      const config = JSON.parse(await readFile(join(tmpRoot, 'claws.json'), 'utf-8'));
      expect(config.platform).toBe('openclaw');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('creates .claws/ sidecar directory structure', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runInit(tmpRoot, { json: false });

      // Verify key sidecar directories exist
      expect(await fileExists(join(tmpRoot, '.claws', 'compiled'))).toBe(true);
      expect(await fileExists(join(tmpRoot, '.claws', 'audit'))).toBe(true);
      expect(await fileExists(join(tmpRoot, '.claws', 'policies'))).toBe(true);
      expect(await fileExists(join(tmpRoot, '.claws', 'cache'))).toBe(true);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 2 when claws.json already exists', async () => {
    tmpRoot = await createEmptyWorkspace();
    await writeFile(join(tmpRoot, 'claws.json'), '{}');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('already exists');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('outputs JSON with --json flag on success', async () => {
    tmpRoot = await createClaudeWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('initialized');
      expect(parsed.platform).toBe('claude-code');
      expect(parsed.method).toBe('auto-detect');
      expect(parsed.configPath).toContain('claws.json');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('outputs JSON with --json flag when already initialized', async () => {
    tmpRoot = await createEmptyWorkspace();
    await writeFile(join(tmpRoot, 'claws.json'), '{}');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: true });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('already-initialized');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('includes template in config when --template is provided', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false, template: 'soc2' });
      expect(exitCode).toBe(0);

      const config = JSON.parse(await readFile(join(tmpRoot, 'claws.json'), 'utf-8'));
      expect(config.template).toBe('soc2');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('omits template field when --template is not provided', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runInit(tmpRoot, { json: false });

      const config = JSON.parse(await readFile(join(tmpRoot, 'claws.json'), 'utf-8'));
      expect(config).not.toHaveProperty('template');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
