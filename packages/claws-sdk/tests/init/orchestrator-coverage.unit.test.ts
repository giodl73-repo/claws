/**
 * L0: Init orchestrator unit tests for CI unit-project coverage.
 *
 * The orchestrator calls platform-detect, config-create, sidecar-scaffold,
 * gitignore-update, and templates. We mock filesystem I/O and test each
 * code path in isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';

import { initWorkspace } from '../../src/init/orchestrator.js';
import { buildInitConfig, writeInitConfig } from '../../src/init/config-create.js';
import { detectWorkspacePlatform } from '../../src/init/platform-detect.js';
import { COMPILER_VERSION } from '../../src/compile/version.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-orch-unit-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ── initWorkspace ─────────────────────────────────────────────────────

describe('initWorkspace', () => {
  it('returns exitCode 2 when claws.json already exists', async () => {
    await writeFile(join(tempDir, 'claws.json'), '{}', 'utf-8');
    const result = await initWorkspace(tempDir);
    expect(result.exitCode).toBe(2);
    expect(result.status).toBe('already-initialized');
    expect(result.configPath).toContain('claws.json');
    expect(result.detection).toBeUndefined();
    expect(result.config).toBeUndefined();
  });

  it('initializes a fresh workspace with no markers (no scaffold)', async () => {
    const result = await initWorkspace(tempDir);
    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('initialized');
    expect(result.detection).toBeDefined();
    expect(result.detection!.platform).toBe('unknown');
    expect(result.config).toBeDefined();
    expect(result.config!.trustTier).toBe(2);
    expect(result.sidecarDirs).toBeDefined();
    expect(result.sidecarDirs!.length).toBeGreaterThan(0);
    expect(result.gitignoreAdded).toBeDefined();
    // No workspace scaffold without --scaffold
    expect(result.workspaceScaffold).toBeUndefined();
  });

  it('initializes with --scaffold and creates starter files', async () => {
    const result = await initWorkspace(tempDir, { scaffold: true });
    expect(result.exitCode).toBe(0);
    expect(result.workspaceScaffold).toBeDefined();
    expect(result.workspaceScaffold!.created.length).toBeGreaterThan(0);
  });

  it('detects agent platform when CLAUDE.md exists (detected=true branch)', async () => {
    // CLAUDE.md triggers the agent platform detector → detected=true
    await writeFile(join(tempDir, 'CLAUDE.md'), '# Claude Code workspace\n', 'utf-8');
    const result = await initWorkspace(tempDir);
    expect(result.exitCode).toBe(0);
    expect(result.config).toBeDefined();
    // Agent detector finds claude-code platform
    expect(result.config!.platform).toBe('claude-code');
  });

  it('scaffold + template together produces both starter files and template policies', async () => {
    const result = await initWorkspace(tempDir, { scaffold: true, template: 'minimal' });
    expect(result.exitCode).toBe(0);
    expect(result.workspaceScaffold).toBeDefined();
    expect(result.workspaceScaffold!.created.length).toBeGreaterThan(0);
    expect(result.templateApplied).toBe('minimal');
  });

  it('detects node platform when package.json exists', async () => {
    await writeFile(join(tempDir, 'package.json'), '{}', 'utf-8');
    const result = await initWorkspace(tempDir);
    expect(result.exitCode).toBe(0);
    expect(result.detection!.platform).toBe('node');
  });

  it('applies template when specified', async () => {
    const result = await initWorkspace(tempDir, { template: 'minimal' });
    expect(result.exitCode).toBe(0);
    expect(result.templateApplied).toBe('minimal');
    expect(result.policyFiles).toBeDefined();
    // Minimal template has zero policies — that's by design
    expect(result.policyFiles!.length).toBe(0);
  });
});

// ── buildInitConfig ───────────────────────────────────────────────────

describe('buildInitConfig', () => {
  it('builds config without template', () => {
    const config = buildInitConfig('go');
    expect(config.platform).toBe('go');
    expect(config.trustTier).toBe(2);
    expect(config.suppress).toEqual([]);
    expect(config.compilerVersion).toBe(COMPILER_VERSION);
    expect(config).not.toHaveProperty('template');
  });

  it('builds config with template', () => {
    const config = buildInitConfig('rust', 'soc2');
    expect(config.template).toBe('soc2');
  });
});

// ── writeInitConfig ───────────────────────────────────────────────────

describe('writeInitConfig', () => {
  it('writes claws.json to disk', async () => {
    const config = buildInitConfig('python');
    const configPath = await writeInitConfig(tempDir, config);
    expect(configPath).toContain('claws.json');

    const { readFile: readFs } = await import('node:fs/promises');
    const content = await readFs(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.platform).toBe('python');
    expect(parsed.trustTier).toBe(2);
  });
});

// ── detectWorkspacePlatform ───────────────────────────────────────────

describe('detectWorkspacePlatform', () => {
  it('returns unknown when no markers exist', async () => {
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('unknown');
    expect(result.markerFile).toBeNull();
    expect(result.method).toContain('default');
  });

  it('detects go platform from go.mod', async () => {
    await writeFile(join(tempDir, 'go.mod'), 'module example.com/foo', 'utf-8');
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('go');
    expect(result.markerFile).toBe('go.mod');
  });

  it('detects dotnet platform from *.csproj glob marker', async () => {
    await writeFile(join(tempDir, 'MyProject.csproj'), '<Project/>', 'utf-8');
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('dotnet');
    expect(result.markerFile).toBe('MyProject.csproj');
    expect(result.method).toContain('auto-detect');
  });

  it('detects java platform from pom.xml', async () => {
    await writeFile(join(tempDir, 'pom.xml'), '<project/>', 'utf-8');
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('java');
    expect(result.markerFile).toBe('pom.xml');
  });

  it('detects java platform from build.gradle', async () => {
    await writeFile(join(tempDir, 'build.gradle'), 'apply plugin: "java"', 'utf-8');
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('java');
    expect(result.markerFile).toBe('build.gradle');
  });

  it('detects java platform from build.gradle.kts', async () => {
    await writeFile(join(tempDir, 'build.gradle.kts'), 'plugins { java }', 'utf-8');
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('java');
  });

  it('prioritizes node over python when both exist', async () => {
    await writeFile(join(tempDir, 'package.json'), '{}', 'utf-8');
    await writeFile(join(tempDir, 'pyproject.toml'), '[project]', 'utf-8');
    const result = await detectWorkspacePlatform(tempDir);
    expect(result.platform).toBe('node');
  });

  it('handles unreadable directory for glob marker gracefully', async () => {
    // Non-existent directory — the function should handle it gracefully
    const result = await detectWorkspacePlatform(join(tempDir, 'nonexistent'));
    expect(result.platform).toBe('unknown');
  });
});
