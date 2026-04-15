/**
 * L0 unit tests for workspace file scaffolding.
 *
 * Verifies:
 *  1. Creates all 9 starter files on empty workspace
 *  2. Skips existing files, creates only missing ones
 *  3. Skips all files when all exist
 *  4. Markdown starter files have headings
 *  5. skills/example/SKILL.md has YAML frontmatter
 *  6. lobster.yaml is valid YAML structure
 *  7. getStarterFileDescription returns correct descriptions
 *  8. getStarterFileDescription returns undefined for unknown files
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  scaffoldWorkspaceFiles,
  getStarterFileDescription,
} from '@bic/claws-sdk/init';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-ws-scaffold-'));
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

const MARKDOWN_FILES = [
  'SOUL.md', 'TOOLS.md', 'AGENTS.md', 'IDENTITY.md', 'USER.md',
  'MEMORY.md', 'HEARTBEAT.md',
];

describe('scaffoldWorkspaceFiles', () => {
  it('creates all 9 starter files on empty workspace', async () => {
    const result = await scaffoldWorkspaceFiles(tempDir);

    expect(result.created).toHaveLength(9);
    expect(result.skipped).toHaveLength(0);
    expect(result.created).toEqual(ALL_STARTER_FILES);

    for (const name of ALL_STARTER_FILES) {
      expect(await fileExists(join(tempDir, name))).toBe(true);
    }
  });

  it('skips existing files and creates only missing ones', async () => {
    // Pre-create SOUL.md and TOOLS.md with custom content
    await writeFile(join(tempDir, 'SOUL.md'), '# My Custom Soul\n', 'utf-8');
    await writeFile(join(tempDir, 'TOOLS.md'), '# My Custom Tools\n', 'utf-8');

    const result = await scaffoldWorkspaceFiles(tempDir);

    expect(result.created).toEqual([
      'AGENTS.md', 'IDENTITY.md', 'USER.md',
      'MEMORY.md', 'HEARTBEAT.md', 'skills/example/SKILL.md', 'lobster.yaml',
    ]);
    expect(result.skipped).toEqual(['SOUL.md', 'TOOLS.md']);

    // Existing files should not be modified
    const soulContent = await readFile(join(tempDir, 'SOUL.md'), 'utf-8');
    expect(soulContent).toBe('# My Custom Soul\n');

    const toolsContent = await readFile(join(tempDir, 'TOOLS.md'), 'utf-8');
    expect(toolsContent).toBe('# My Custom Tools\n');

    // New files should exist
    for (const name of result.created) {
      expect(await fileExists(join(tempDir, name))).toBe(true);
    }
  });

  it('skips all files when all already exist', async () => {
    // Create all 9 files (including nested skills dir)
    for (const name of ALL_STARTER_FILES) {
      const filePath = join(tempDir, name);
      await mkdir(join(tempDir, 'skills', 'example'), { recursive: true });
      await writeFile(filePath, `# Existing ${name}\n`, 'utf-8');
    }

    const result = await scaffoldWorkspaceFiles(tempDir);

    expect(result.created).toHaveLength(0);
    expect(result.skipped).toEqual(ALL_STARTER_FILES);
  });

  it('markdown starter files have headings (pass CLAWS-P002 parse validation)', async () => {
    await scaffoldWorkspaceFiles(tempDir);

    for (const name of MARKDOWN_FILES) {
      const content = await readFile(join(tempDir, name), 'utf-8');
      const firstNonEmpty = content.split('\n').find((line) => line.trim().length > 0);
      expect(firstNonEmpty).toBeDefined();
      expect(firstNonEmpty!.startsWith('#'), `${name} should start with heading`).toBe(true);
    }
  });

  it('SOUL.md contains governance keywords for OpenClaw detection', async () => {
    await scaffoldWorkspaceFiles(tempDir);

    const content = await readFile(join(tempDir, 'SOUL.md'), 'utf-8');
    expect(content).toMatch(/\bnever\b/i);
    expect(content).toContain('Deny Constraints');
  });

  it('TOOLS.md contains risk annotations', async () => {
    await scaffoldWorkspaceFiles(tempDir);

    const content = await readFile(join(tempDir, 'TOOLS.md'), 'utf-8');
    expect(content).toContain('Risk: R1');
    expect(content).toContain('Risk: R5');
  });

  it('skills/example/SKILL.md has YAML frontmatter', async () => {
    await scaffoldWorkspaceFiles(tempDir);

    const content = await readFile(join(tempDir, 'skills', 'example', 'SKILL.md'), 'utf-8');
    expect(content).toMatch(/^---\n/);
    expect(content).toContain('name: example-skill');
    expect(content).toContain('tools:');
  });

  it('lobster.yaml has workflow structure', async () => {
    await scaffoldWorkspaceFiles(tempDir);

    const content = await readFile(join(tempDir, 'lobster.yaml'), 'utf-8');
    expect(content).toContain('name: example-workflow');
    expect(content).toContain('steps:');
  });

  it('creates skills/ parent directories for nested paths', async () => {
    await scaffoldWorkspaceFiles(tempDir);

    expect(await fileExists(join(tempDir, 'skills'))).toBe(true);
    expect(await fileExists(join(tempDir, 'skills', 'example'))).toBe(true);
    expect(await fileExists(join(tempDir, 'skills', 'example', 'SKILL.md'))).toBe(true);
  });
});

describe('getStarterFileDescription', () => {
  it('returns description for known starter files', () => {
    expect(getStarterFileDescription('SOUL.md')).toContain('persona');
    expect(getStarterFileDescription('TOOLS.md')).toContain('tools');
    expect(getStarterFileDescription('AGENTS.md')).toContain('agent');
    expect(getStarterFileDescription('IDENTITY.md')).toContain('identity');
    expect(getStarterFileDescription('USER.md')).toContain('user');
    expect(getStarterFileDescription('MEMORY.md')).toContain('data');
    expect(getStarterFileDescription('HEARTBEAT.md')).toContain('lifecycle');
    expect(getStarterFileDescription('skills/example/SKILL.md')).toContain('skill');
    expect(getStarterFileDescription('lobster.yaml')).toContain('workflow');
  });

  it('returns undefined for unknown files', () => {
    expect(getStarterFileDescription('UNKNOWN.md')).toBeUndefined();
    expect(getStarterFileDescription('random.txt')).toBeUndefined();
  });
});
