/**
 * L1 integration tests for workspace file scaffolding.
 *
 * Verifies end-to-end scaffold behavior through the init orchestrator:
 *  1. Full init on empty dir creates all 9 starter files
 *  2. Init with partial files preserves existing, creates missing
 *  3. Init skill subcommand scaffolds a skill into the workspace
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, stat, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { initWorkspace } from '@bic/claws-sdk/init';
import { scaffoldSkill } from '@bic/claws-sdk/scaffold';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-ws-int-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const ALL_STARTER_FILES = [
  'SOUL.md', 'TOOLS.md', 'AGENTS.md', 'IDENTITY.md', 'USER.md',
  'MEMORY.md', 'HEARTBEAT.md', 'skills/example/SKILL.md', 'lobster.yaml',
];

describe('workspace scaffold integration', () => {
  it('full init --scaffold on empty dir creates all 9 starter files + sidecar + config', async () => {
    const result = await initWorkspace(tempDir, { scaffold: true });

    // Orchestrator succeeds
    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('initialized');

    // All 9 OC workspace files created
    expect(result.workspaceScaffold).toBeDefined();
    expect(result.workspaceScaffold!.created).toEqual(ALL_STARTER_FILES);
    expect(result.workspaceScaffold!.skipped).toHaveLength(0);

    // Files actually exist on disk with non-empty content
    for (const name of ALL_STARTER_FILES) {
      const filePath = join(tempDir, name);
      const s = await stat(filePath);
      expect(s.isFile(), `${name} should be a file`).toBe(true);
      const content = await readFile(filePath, 'utf-8');
      expect(content.length, `${name} should have content`).toBeGreaterThan(0);
    }

    // claws.json and .claws/ sidecar also exist
    expect(await fileExists(join(tempDir, 'claws.json'))).toBe(true);
    expect(await fileExists(join(tempDir, '.claws'))).toBe(true);

    // SOUL.md has governance keywords parseable by claws check
    const soul = await readFile(join(tempDir, 'SOUL.md'), 'utf-8');
    expect(soul).toMatch(/\bnever\b/i);

    // TOOLS.md has risk annotations
    const tools = await readFile(join(tempDir, 'TOOLS.md'), 'utf-8');
    expect(tools).toContain('Risk: R1');
    expect(tools).toContain('Risk: R5');
  });

  it('init --scaffold with partial files preserves existing and creates only missing ones', async () => {
    // Pre-create SOUL.md, TOOLS.md, and AGENTS.md with custom content
    const customSoul = '# My Custom Soul\n\nNever do bad things.\n';
    const customTools = '# My Custom Tools\n\n## my-tool\n- Risk: R2\n';
    const customAgents = '# My Custom Agents\n\n## agent-one\n';

    await writeFile(join(tempDir, 'SOUL.md'), customSoul, 'utf-8');
    await writeFile(join(tempDir, 'TOOLS.md'), customTools, 'utf-8');
    await writeFile(join(tempDir, 'AGENTS.md'), customAgents, 'utf-8');

    const result = await initWorkspace(tempDir, { scaffold: true });

    expect(result.exitCode).toBe(0);
    expect(result.workspaceScaffold).toBeDefined();

    // 3 files skipped (the pre-existing ones)
    expect(result.workspaceScaffold!.skipped).toEqual([
      'SOUL.md', 'TOOLS.md', 'AGENTS.md',
    ]);

    // 6 files created (the rest)
    expect(result.workspaceScaffold!.created).toEqual([
      'IDENTITY.md', 'USER.md',
      'MEMORY.md', 'HEARTBEAT.md', 'skills/example/SKILL.md', 'lobster.yaml',
    ]);

    // Pre-existing files are byte-for-byte unchanged
    expect(await readFile(join(tempDir, 'SOUL.md'), 'utf-8')).toBe(customSoul);
    expect(await readFile(join(tempDir, 'TOOLS.md'), 'utf-8')).toBe(customTools);
    expect(await readFile(join(tempDir, 'AGENTS.md'), 'utf-8')).toBe(customAgents);

    // Created files exist and have content
    for (const name of result.workspaceScaffold!.created) {
      const filePath = join(tempDir, name);
      expect(await fileExists(filePath), `${name} should exist`).toBe(true);
      const content = await readFile(filePath, 'utf-8');
      expect(content.length, `${name} should have content`).toBeGreaterThan(0);
    }
  });

  it('init skill scaffolds a skill into an initialized workspace', async () => {
    // First: init the workspace so claws.json exists
    const initResult = await initWorkspace(tempDir);
    expect(initResult.exitCode).toBe(0);

    // Scaffold a new skill via the SDK
    const skillResult = await scaffoldSkill(tempDir, 'my-tool', { tier: 'declared' });

    expect(skillResult.name).toBe('my-tool');
    expect(skillResult.tier).toBe('declared');
    expect(skillResult.files.length).toBeGreaterThan(0);

    // Skill directory exists
    const skillDir = join(tempDir, 'skills', 'my-tool');
    expect(await fileExists(skillDir)).toBe(true);

    // At least one file was created inside the skill directory
    const skillFiles = await readdir(skillDir);
    expect(skillFiles.length).toBeGreaterThan(0);
  });
});
