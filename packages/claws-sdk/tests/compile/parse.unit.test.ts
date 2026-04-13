/**
 * L0: Parse phase unit tests — workspace file reading via InputResolver.
 *
 * 8 unit tests covering:
 * 1. parse() on minimal fixture (SOUL.md + TOOLS.md) returns 2 present + 7 absent
 * 2. parse() on full fixture (all 9 files) returns 9 present entries
 * 3. Missing HEARTBEAT.md produces absent entry, not error
 * 4. Malformed TOOLS.md produces ParseDiagnostic with file:line location
 * 5. InputResolver resolves default file source (filesystem path)
 * 6. InputResolver records CGR provenance with content hash for each file
 * 7. Collect-all-errors: 2 malformed files produce 2 diagnostics (not halt on first)
 * 8. Per-file parser isolation: failure in AGENTS.md does not affect SOUL.md parsing
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parse } from '../../src/compile/parse.js';
import { resolveDefaultSources } from '../../src/compile/input-resolver.js';
import type { FileEntryPresent, FileEntryAbsent, ParseDiagnostic } from '../../src/compile/types.js';

// R1 Amendment: Canary import — if compiler-sdk changes the reader interface, this breaks
import { readOCWorkspaceViaFORMA } from '@craftworks/compiler-sdk/astro/readers/openclaw-reader.js';
import type { OCWorkspaceFiles } from '@craftworks/compiler-sdk/astro/readers/openclaw-reader.js';

const FIXTURES = resolve(__dirname, '../fixtures');
const MINIMAL = resolve(FIXTURES, 'minimal');
const FULL = resolve(FIXTURES, 'full-workspace');

describe('parse()', () => {
  it('on minimal fixture returns 3 present + 6 absent entries', async () => {
    const result = await parse(MINIMAL);

    expect(result.presentCount).toBe(3);
    expect(result.absentCount).toBe(6);
    expect(result.entries).toHaveLength(9);
    expect(result.shouldHalt).toBe(false);

    // SOUL.md and TOOLS.md are present
    const present = result.entries.filter(e => e.status === 'present');
    const sources = present.map(e => e.source);
    expect(sources).toContain('SOUL.md');
    expect(sources).toContain('TOOLS.md');
  });

  it('on full fixture returns 9 present entries', async () => {
    const result = await parse(FULL);

    expect(result.presentCount).toBe(9);
    expect(result.absentCount).toBe(0);
    expect(result.entries).toHaveLength(9);
    expect(result.shouldHalt).toBe(false);

    // All 9 sources are present
    const sources = result.entries.map(e => e.source);
    expect(sources).toContain('SOUL.md');
    expect(sources).toContain('TOOLS.md');
    expect(sources).toContain('AGENTS.md');
    expect(sources).toContain('IDENTITY.md');
    expect(sources).toContain('USER.md');
    expect(sources).toContain('MEMORY.md');
    expect(sources).toContain('HEARTBEAT.md');
    expect(sources).toContain('skills/');
    expect(sources).toContain('lobster.yaml');
  });

  it('missing HEARTBEAT.md produces absent entry, not error', async () => {
    const result = await parse(MINIMAL);

    const heartbeat = result.entries.find(e => e.source === 'HEARTBEAT.md');
    expect(heartbeat).toBeDefined();
    expect(heartbeat!.status).toBe('absent');
    expect((heartbeat as FileEntryAbsent).defaultDescription).toContain('HEARTBEAT.md not found');

    // No error diagnostics for absent files
    const heartbeatErrors = result.diagnostics.filter(
      d => d.file === 'HEARTBEAT.md' && d.severity === 'error',
    );
    expect(heartbeatErrors).toHaveLength(0);
  });

  it('malformed TOOLS.md produces ParseDiagnostic with file:line location', async () => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    // Create a temp workspace with malformed TOOLS.md (unclosed frontmatter)
    const tmpDir = join(tmpdir(), `claws-test-malformed-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'SOUL.md'), '# Soul\nA valid soul file.\n');
    await writeFile(join(tmpDir, 'TOOLS.md'), '---\nname: broken\nThis frontmatter is never closed\n');

    try {
      const result = await parse(tmpDir);

      const toolsDiags = result.diagnostics.filter(d => d.file === 'TOOLS.md');
      expect(toolsDiags.length).toBeGreaterThanOrEqual(1);

      const fmDiag = toolsDiags.find(d => d.code === 'CLAWS-P003');
      expect(fmDiag).toBeDefined();
      expect(fmDiag!.severity).toBe('error');
      expect(fmDiag!.line).toBe(1);
      expect(fmDiag!.file).toBe('TOOLS.md');
    } finally {
      const { rm } = await import('node:fs/promises');
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('InputResolver', () => {
  it('resolves default file source (filesystem path)', async () => {
    const entries = await resolveDefaultSources(MINIMAL);

    expect(entries).toHaveLength(9);

    const soul = entries.find(e => e.source === 'SOUL.md');
    expect(soul).toBeDefined();
    expect(soul!.status).toBe('present');
    expect((soul as FileEntryPresent).content).toContain('Agent Soul');
  });

  it('records CGR provenance with content hash for each file', async () => {
    const entries = await resolveDefaultSources(MINIMAL);

    const soul = entries.find(e => e.source === 'SOUL.md') as FileEntryPresent;
    expect(soul.status).toBe('present');

    const prov = soul.provenance;
    expect(prov.source).toBe('SOUL.md');
    expect(prov.sourceType).toBe('filesystem');
    expect(prov.contentHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    expect(prov.readAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    expect(prov.rawSize).toBeGreaterThan(0);
  });
});

describe('Collect-all-errors (P-060)', () => {
  it('2 malformed files produce 2 diagnostics (not halt on first)', async () => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    // Create a temp workspace with 2 malformed files
    const tmpDir = join(tmpdir(), `claws-test-collect-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'SOUL.md'), '---\nunclosed frontmatter in soul\n');
    await writeFile(join(tmpDir, 'TOOLS.md'), '---\nunclosed frontmatter in tools\n');

    try {
      const result = await parse(tmpDir);

      // Both files should be present (they were read successfully)
      expect(result.presentCount).toBe(2);

      // Both should produce CLAWS-P003 diagnostics
      const fmDiags = result.diagnostics.filter(d => d.code === 'CLAWS-P003');
      expect(fmDiags).toHaveLength(2);

      const files = fmDiags.map(d => d.file);
      expect(files).toContain('SOUL.md');
      expect(files).toContain('TOOLS.md');
    } finally {
      const { rm } = await import('node:fs/promises');
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('Per-file parser isolation (P-108)', () => {
  it('failure in AGENTS.md does not affect SOUL.md parsing', async () => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    // Create a temp workspace with valid SOUL.md and malformed AGENTS.md
    const tmpDir = join(tmpdir(), `claws-test-isolation-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'SOUL.md'), '# Soul\nA valid soul file.\n');
    await writeFile(join(tmpDir, 'AGENTS.md'), '---\nunclosed frontmatter in agents\n');

    try {
      const result = await parse(tmpDir);

      // SOUL.md should be present and parsed without issues
      const soul = result.entries.find(e => e.source === 'SOUL.md') as FileEntryPresent;
      expect(soul.status).toBe('present');
      expect(soul.content).toContain('# Soul');

      // AGENTS.md should also be present (it was read) but with a diagnostic
      const agents = result.entries.find(e => e.source === 'AGENTS.md') as FileEntryPresent;
      expect(agents.status).toBe('present');

      const agentDiags = result.diagnostics.filter(d => d.file === 'AGENTS.md');
      expect(agentDiags.length).toBeGreaterThanOrEqual(1);

      // No SOUL.md diagnostics
      const soulDiags = result.diagnostics.filter(d => d.file === 'SOUL.md');
      expect(soulDiags).toHaveLength(0);
    } finally {
      const { rm } = await import('node:fs/promises');
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('R1 Amendment: Compiler-SDK Reader Canary', () => {
  it('readOCWorkspaceViaFORMA is importable from compiler-sdk', () => {
    // Canary: if compiler-sdk renames or moves this function, this test breaks
    expect(typeof readOCWorkspaceViaFORMA).toBe('function');
  });

  it('OCWorkspaceFiles type accepts the 9 default sources', () => {
    // Type-level canary: OCWorkspaceFiles must accept these keys
    const files: OCWorkspaceFiles = {
      'SOUL.md': '# Soul',
      'TOOLS.md': '# Tools',
      'AGENTS.md': '# Agents',
      'IDENTITY.md': '# Identity',
      'USER.md': '# User',
      'MEMORY.md': '# Memory',
      'HEARTBEAT.md': '# Heartbeat',
      skills: { 'skills/build-run/SKILL.md': '# Build' },
      'lobster.yaml': 'name: test',
    };
    expect(Object.keys(files).length).toBe(9);
  });
});
