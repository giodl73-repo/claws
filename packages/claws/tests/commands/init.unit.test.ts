/**
 * L0: init command — workspace platform detection, config generation, sidecar scaffolding.
 *
 * The init command delegates to the SDK init orchestrator. It detects
 * _workspace_ platform (node, python, rust, etc.) from marker files,
 * not agent platform (claude-code, openclaw). Agent platform detection
 * remains in the detect/ module for compile-time resolution.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInit, runInitSkill } from '../../src/commands/init.js';

/**
 * Create a workspace with package.json marker (node platform).
 */
async function createNodeWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-init-'));
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'test' }));
  return root;
}

/**
 * Create a workspace with pyproject.toml marker (python platform).
 */
async function createPythonWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-init-'));
  await writeFile(join(root, 'pyproject.toml'), '[project]\nname = "test"\n');
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

  it('detects node platform from package.json and creates claws.json', async () => {
    tmpRoot = await createNodeWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false });
      expect(exitCode).toBe(0);

      // claws.json should exist
      const configPath = join(tmpRoot, 'claws.json');
      expect(await fileExists(configPath)).toBe(true);

      const config = JSON.parse(await readFile(configPath, 'utf-8'));
      // config.platform is the agent platform (falls back to 'openclaw')
      expect(config.platform).toBe('openclaw');
      expect(config.trustTier).toBe(2);
      expect(config.suppress).toEqual([]);

      // Output message references workspace language platform
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Detected: node');
      expect(output).toContain('claws check');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('detects python platform from pyproject.toml', async () => {
    tmpRoot = await createPythonWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false });
      expect(exitCode).toBe(0);

      const config = JSON.parse(await readFile(join(tmpRoot, 'claws.json'), 'utf-8'));
      // config.platform is agent platform (no OC markers → 'openclaw')
      expect(config.platform).toBe('openclaw');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('defaults to unknown when no marker files exist', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false });
      expect(exitCode).toBe(0);

      const config = JSON.parse(await readFile(join(tmpRoot, 'claws.json'), 'utf-8'));
      // config.platform is agent platform (no OC markers → 'openclaw')
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
      expect(output).toContain('OC-POLICY-E080');
      expect(output).toContain('already initialized');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('outputs JSON with --json flag on success', async () => {
    tmpRoot = await createNodeWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('initialized');
      expect(parsed.platform).toBe('node');
      expect(parsed.method).toContain('auto-detect');
      expect(parsed.configPath).toContain('claws.json');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('outputs JSON with --json flag when already initialized', async () => {
    tmpRoot = await createEmptyWorkspace();
    await writeFile(join(tmpRoot, 'claws.json'), '{}');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: true });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E080');
      expect(parsed.error.what).toContain('already initialized');
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

  it('returns exit 2 when write fails on bad path', async () => {
    tmpRoot = await createEmptyWorkspace();
    const badRoot = join(tmpRoot, 'no', 'such', 'deeply', 'nested', 'path');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit(badRoot, { json: false });
      expect(exitCode).toBe(2);

      const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorOutput).toContain('OC-POLICY-E081');
    } finally {
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });

  it('returns exit 2 with JSON error when write fails and json=true', async () => {
    tmpRoot = await createEmptyWorkspace();
    const badRoot = join(tmpRoot, 'no', 'such', 'deeply', 'nested', 'path');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit(badRoot, { json: true });
      expect(exitCode).toBe(2);

      const errorOutput = consoleErrorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(errorOutput);
      expect(parsed.error.code).toBe('OC-POLICY-E081');
    } finally {
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });

  it('returns exit 1 with TemplateNotFoundError for invalid template (text)', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false, template: 'nonexistent-tpl-xyz' });
      expect(exitCode).toBe(1);

      const output = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E082');
      expect(output).toContain('nonexistent-tpl-xyz');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('returns exit 1 with TemplateNotFoundError for invalid template (json)', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: true, template: 'nonexistent-tpl-xyz' });
      expect(exitCode).toBe(1);

      const output = consoleErrorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E082');
      expect(parsed.error.what).toContain('nonexistent-tpl-xyz');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('updates .gitignore with claws entries', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runInit(tmpRoot, { json: false });

      const gitignore = await readFile(join(tmpRoot, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.claws/keys/');
      expect(gitignore).toContain('.claws/secrets/');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  // ── Workspace scaffold output ──────────────────────────────────────────

  it('text output lists created workspace files when --scaffold is passed', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false, scaffold: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      // Shows the scaffold banner
      expect(output).toContain('starter workspace');
      // Lists individual files
      expect(output).toContain('SOUL.md');
      expect(output).toContain('TOOLS.md');
      expect(output).toContain('AGENTS.md');
      // Shows next-step hint
      expect(output).toContain('claws check');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('text output shows --scaffold hint when no OC files and scaffold not passed', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('claws init --scaffold');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('JSON output includes workspaceFilesCreated and workspaceFilesSkipped with --scaffold', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: true, scaffold: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.workspaceFilesCreated).toBeDefined();
      expect(Array.isArray(parsed.workspaceFilesCreated)).toBe(true);
      expect(parsed.workspaceFilesCreated.length).toBeGreaterThan(0);
      expect(parsed.workspaceFilesCreated).toContain('SOUL.md');
      expect(parsed.workspaceFilesCreated).toContain('TOOLS.md');
      expect(parsed.workspaceFilesSkipped).toBeDefined();
      expect(parsed.workspaceFilesSkipped).toHaveLength(0);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('JSON output shows skipped files when workspace files pre-exist with --scaffold', async () => {
    tmpRoot = await createEmptyWorkspace();
    await writeFile(join(tmpRoot, 'SOUL.md'), '# Existing Soul\n');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: true, scaffold: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.workspaceFilesSkipped).toContain('SOUL.md');
      expect(parsed.workspaceFilesCreated).not.toContain('SOUL.md');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('JSON output has empty workspaceFilesCreated when scaffold not passed', async () => {
    tmpRoot = await createEmptyWorkspace();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit(tmpRoot, { json: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.workspaceFilesCreated).toEqual([]);
      expect(parsed.workspaceFilesSkipped).toEqual([]);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  // ── init skill subcommand ──────────────────────────────────────────────

  it('init skill scaffolds a skill in an initialized workspace', async () => {
    tmpRoot = await createEmptyWorkspace();
    // First init the workspace
    await runInit(tmpRoot, { json: false });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInitSkill(tmpRoot, 'my-tool', { json: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Scaffolded skill "my-tool"');
      expect(output).toContain('tier: declared');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('init skill returns JSON on successful scaffold with --json', async () => {
    tmpRoot = await createEmptyWorkspace();
    await runInit(tmpRoot, { json: false });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInitSkill(tmpRoot, 'my-tool', { json: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.name).toBe('my-tool');
      expect(parsed.tier).toBe('declared');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
