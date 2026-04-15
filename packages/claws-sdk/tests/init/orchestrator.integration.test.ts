/**
 * L1 integration tests for the init orchestrator.
 *
 * 2 tests:
 *  1. Init on a reference Node.js workspace produces valid state
 *  2. Init on an empty directory scaffolds complete environment
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, readdir, stat, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { initWorkspace } from '@bic/claws-sdk/init';
import { CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE } from '@bic/claws-sdk/types';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-init-int-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('init orchestrator integration', () => {
  it('init on a Node.js workspace produces valid state', async () => {
    // Set up a Node.js workspace with package.json
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' }),
      'utf-8',
    );

    const result = await initWorkspace(tempDir);

    // Exit code 0
    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('initialized');

    // Platform detected as node
    expect(result.detection?.platform).toBe('node');

    // claws.json exists — config.platform is agent platform (fallback 'openclaw')
    const configRaw = await readFile(join(tempDir, CLAWS_CONFIG_FILE), 'utf-8');
    const config = JSON.parse(configRaw);
    expect(config.platform).toBe('openclaw');
    expect(config.trustTier).toBe(2);
    expect(config.suppress).toEqual([]);

    // All 13 sidecar dirs exist
    const expectedDirs = Object.values(CLAWS_SIDECAR_LAYOUT);
    for (const dir of expectedDirs) {
      const s = await stat(join(tempDir, dir));
      expect(s.isDirectory()).toBe(true);
    }

    // .gitignore contains the required entries
    const gitignore = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claws/keys/');
    expect(gitignore).toContain('.claws/secrets/');

    // Idempotency: second run returns exit code 2
    const second = await initWorkspace(tempDir);
    expect(second.exitCode).toBe(2);
    expect(second.status).toBe('already-initialized');
  });

  it('init on an empty directory without --scaffold creates sidecar only', async () => {
    const result = await initWorkspace(tempDir);

    // Exit code 0, workspace language platform unknown
    expect(result.exitCode).toBe(0);
    expect(result.detection?.platform).toBe('unknown');

    // claws.json exists — config.platform is agent platform (fallback 'openclaw')
    const configRaw = await readFile(join(tempDir, CLAWS_CONFIG_FILE), 'utf-8');
    const config = JSON.parse(configRaw);
    expect(config.platform).toBe('openclaw');
    expect(config.trustTier).toBe(2);

    // All 13 sidecar dirs exist
    expect(result.sidecarDirs).toHaveLength(13);
    for (const dir of result.sidecarDirs!) {
      const s = await stat(join(tempDir, dir));
      expect(s.isDirectory()).toBe(true);
    }

    // .gitignore created with entries
    const gitignore = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claws/keys/');
    expect(gitignore).toContain('.claws/secrets/');

    // No workspace scaffold without --scaffold
    expect(result.workspaceScaffold).toBeUndefined();
  });

  it('init --scaffold on empty directory creates starter files', async () => {
    const result = await initWorkspace(tempDir, { scaffold: true });

    expect(result.exitCode).toBe(0);
    expect(result.detection?.platform).toBe('unknown');

    // Workspace starter files were scaffolded (all 9 OC sources)
    expect(result.workspaceScaffold).toBeDefined();
    expect(result.workspaceScaffold!.created).toEqual([
      'SOUL.md', 'TOOLS.md', 'AGENTS.md', 'IDENTITY.md', 'USER.md',
      'MEMORY.md', 'HEARTBEAT.md', 'skills/example/SKILL.md', 'lobster.yaml',
    ]);
    expect(result.workspaceScaffold!.skipped).toHaveLength(0);

    // Starter files exist on disk
    for (const name of result.workspaceScaffold!.created) {
      const s = await stat(join(tempDir, name));
      expect(s.isFile()).toBe(true);
    }
  });

  it('init --scaffold preserves existing workspace files and only creates missing ones', async () => {
    // Pre-create SOUL.md
    await writeFile(join(tempDir, 'SOUL.md'), '# My Custom Soul\n', 'utf-8');

    const result = await initWorkspace(tempDir, { scaffold: true });

    expect(result.exitCode).toBe(0);
    expect(result.workspaceScaffold).toBeDefined();
    expect(result.workspaceScaffold!.skipped).toEqual(['SOUL.md']);
    expect(result.workspaceScaffold!.created).toEqual([
      'TOOLS.md', 'AGENTS.md', 'IDENTITY.md', 'USER.md',
      'MEMORY.md', 'HEARTBEAT.md', 'skills/example/SKILL.md', 'lobster.yaml',
    ]);

    // Original SOUL.md is untouched
    const soulContent = await readFile(join(tempDir, 'SOUL.md'), 'utf-8');
    expect(soulContent).toBe('# My Custom Soul\n');
  });
});
