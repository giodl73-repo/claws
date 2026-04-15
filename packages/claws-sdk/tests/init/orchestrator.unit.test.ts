/**
 * L0 unit tests for the init orchestrator and sub-modules.
 *
 * 6 tests:
 *  1. Platform detect — node (package.json)
 *  2. Platform detect — python (pyproject.toml)
 *  3. Platform detect — rust (Cargo.toml)
 *  4. Config creation with defaults
 *  5. Sidecar scaffold creates 13 directories
 *  6. Gitignore append skips if already present
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { detectWorkspacePlatform } from '@bic/claws-sdk/init';
import { buildInitConfig } from '@bic/claws-sdk/init';
import { scaffoldSidecar } from '@bic/claws-sdk/init';
import { updateGitignore } from '@bic/claws-sdk/init';
import { CLAWS_SIDECAR_LAYOUT } from '@bic/claws-sdk/types';
import { COMPILER_VERSION } from '#src/compile/version.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-init-unit-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('platform-detect', () => {
  it('detects node platform from package.json', async () => {
    await writeFile(join(tempDir, 'package.json'), '{}', 'utf-8');
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('node');
    expect(result.markerFile).toBe('package.json');
    expect(result.method).toContain('auto-detect');
  });

  it('detects python platform from pyproject.toml', async () => {
    await writeFile(join(tempDir, 'pyproject.toml'), '[project]', 'utf-8');
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('python');
    expect(result.markerFile).toBe('pyproject.toml');
  });

  it('detects rust platform from Cargo.toml', async () => {
    await writeFile(join(tempDir, 'Cargo.toml'), '[package]', 'utf-8');
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('rust');
    expect(result.markerFile).toBe('Cargo.toml');
  });
});

describe('config-create', () => {
  it('builds config with T2 trust tier and compiler version', () => {
    const config = buildInitConfig('node');
    expect(config.platform).toBe('node');
    expect(config.trustTier).toBe(2);
    expect(config.suppress).toEqual([]);
    expect(config.compilerVersion).toBe(COMPILER_VERSION);
    expect(config).not.toHaveProperty('template');
  });

  it('includes template when provided', () => {
    const config = buildInitConfig('python', 'enterprise');
    expect(config.platform).toBe('python');
    expect(config.trustTier).toBe(2);
    expect(config.template).toBe('enterprise');
    expect(config.compilerVersion).toBe(COMPILER_VERSION);
  });
});

describe('sidecar-scaffold', () => {
  it('creates exactly 13 sidecar directories', async () => {
    const dirs = await scaffoldSidecar(tempDir);
    expect(dirs).toHaveLength(13);

    // Verify all 13 directories exist on disk
    const expectedDirs = Object.values(CLAWS_SIDECAR_LAYOUT);
    for (const dir of expectedDirs) {
      const fullPath = join(tempDir, dir);
      const s = await stat(fullPath);
      expect(s.isDirectory()).toBe(true);
    }
  });
});

describe('gitignore-update', () => {
  it('skips append if entries already present', async () => {
    const existingContent = '# existing\n.claws/keys/\n.claws/secrets/\n.claws/cache/\n.claws/runtime/\n';
    await writeFile(join(tempDir, '.gitignore'), existingContent, 'utf-8');

    const added = await updateGitignore(tempDir);
    expect(added).toHaveLength(0);

    // Content should be unchanged
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toBe(existingContent);
  });

  it('creates .gitignore when none exists', async () => {
    const added = await updateGitignore(tempDir);
    expect(added).toHaveLength(4);
    expect(added).toContain('.claws/keys/');
    expect(added).toContain('.claws/secrets/');
    expect(added).toContain('.claws/cache/');
    expect(added).toContain('.claws/runtime/');

    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('# claws governance (sensitive)');
    expect(content).toContain('.claws/keys/');
    expect(content).toContain('.claws/secrets/');
    expect(content).toContain('.claws/cache/');
    expect(content).toContain('.claws/runtime/');
  });

  it('appends entries to existing .gitignore without trailing newline', async () => {
    // No trailing newline — exercises the needsNewline branch
    await writeFile(join(tempDir, '.gitignore'), 'node_modules/', 'utf-8');

    const added = await updateGitignore(tempDir);
    expect(added).toHaveLength(4);

    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('.claws/keys/');
    expect(content).toContain('.claws/secrets/');
    expect(content).toContain('.claws/cache/');
    expect(content).toContain('.claws/runtime/');
    // Should have proper newline separation
    expect(content).not.toContain('node_modules/.claws');
  });

  it('appends entries to existing .gitignore with trailing newline', async () => {
    // Has trailing newline — exercises the needsSeparator but not needsNewline branch
    await writeFile(join(tempDir, '.gitignore'), 'node_modules/\n', 'utf-8');

    const added = await updateGitignore(tempDir);
    expect(added).toHaveLength(4);

    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('.claws/keys/');
    expect(content).toContain('.claws/secrets/');
    expect(content).toContain('.claws/cache/');
    expect(content).toContain('.claws/runtime/');
  });

  it('adds only missing entries when one already present', async () => {
    await writeFile(join(tempDir, '.gitignore'), '.claws/keys/\n', 'utf-8');

    const added = await updateGitignore(tempDir);
    expect(added).toHaveLength(3);
    expect(added).toContain('.claws/secrets/');
    expect(added).toContain('.claws/cache/');
    expect(added).toContain('.claws/runtime/');
    expect(added).not.toContain('.claws/keys/');
  });
});
