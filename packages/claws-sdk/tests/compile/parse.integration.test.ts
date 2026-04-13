/**
 * L1: Parse phase integration tests — full parse pipeline through InputResolver.
 *
 * 3 integration tests covering:
 * 1. Full parse() on minimal fixture through InputResolver → compiler-sdk → ParseResult
 * 2. Full parse() on full-workspace fixture with all 9 files
 * 3. Full parse() on missing-files fixture (graceful degradation)
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parse } from '../../src/compile/parse.js';
import type { FileEntryPresent, FileEntryAbsent } from '../../src/compile/types.js';
import { DEFAULT_FILE_SOURCES } from '../../src/compile/types.js';

const FIXTURES = resolve(__dirname, '../fixtures');
const MINIMAL = resolve(FIXTURES, 'minimal');
const FULL = resolve(FIXTURES, 'full-workspace');
const MISSING = resolve(FIXTURES, 'missing-files');

describe('parse() integration — minimal fixture', () => {
  it('resolves sources, reads files, and produces complete ParseResult', async () => {
    const result = await parse(MINIMAL);

    // Structure validation
    expect(result.entries).toHaveLength(9);
    expect(result.presentCount).toBe(3);
    expect(result.absentCount).toBe(6);
    expect(result.shouldHalt).toBe(false);

    // All 9 default sources are represented
    const sources = result.entries.map(e => e.source);
    for (const src of DEFAULT_FILE_SOURCES) {
      expect(sources).toContain(src);
    }

    // Present files have content and provenance
    const soul = result.entries.find(e => e.source === 'SOUL.md') as FileEntryPresent;
    expect(soul.content).toContain('Agent Soul');
    expect(soul.provenance.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(soul.provenance.sourceType).toBe('filesystem');

    const tools = result.entries.find(e => e.source === 'TOOLS.md') as FileEntryPresent;
    expect(tools.content).toContain('Tool Guidance');
    expect(tools.provenance.contentHash).toMatch(/^[a-f0-9]{64}$/);

    // Absent files have default descriptions
    const agents = result.entries.find(e => e.source === 'AGENTS.md') as FileEntryAbsent;
    expect(agents.defaultDescription).toContain('AGENTS.md not found');

    const identity = result.entries.find(e => e.source === 'IDENTITY.md') as FileEntryAbsent;
    expect(identity.defaultDescription).toContain('IDENTITY.md not found');
  });
});

describe('parse() integration — full-workspace fixture', () => {
  it('reads all 9 files with content and provenance', async () => {
    const result = await parse(FULL);

    expect(result.entries).toHaveLength(9);
    expect(result.presentCount).toBe(9);
    expect(result.absentCount).toBe(0);
    expect(result.shouldHalt).toBe(false);

    // Every entry is present with provenance
    for (const entry of result.entries) {
      expect(entry.status).toBe('present');
      const present = entry as FileEntryPresent;
      expect(present.content.length).toBeGreaterThan(0);
      expect(present.provenance.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(present.provenance.sourceType).toBe('filesystem');
      expect(present.provenance.rawSize).toBeGreaterThan(0);
    }

    // Spot-check specific files
    const soul = result.entries.find(e => e.source === 'SOUL.md') as FileEntryPresent;
    expect(soul.content).toContain('enterprise governance agent');

    const lobster = result.entries.find(e => e.source === 'lobster.yaml') as FileEntryPresent;
    expect(lobster.content).toContain('security-check');

    const skills = result.entries.find(e => e.source === 'skills/') as FileEntryPresent;
    expect(skills.content).toContain('build-run');

    // Minimal diagnostics (no malformed files in this fixture)
    const errors = result.diagnostics.filter(d => d.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});

describe('parse() integration — missing-files fixture (graceful degradation)', () => {
  it('reads 2 present files and marks 7 as absent with defaults', async () => {
    const result = await parse(MISSING);

    expect(result.entries).toHaveLength(9);
    expect(result.presentCount).toBe(2);
    expect(result.absentCount).toBe(7);
    expect(result.shouldHalt).toBe(false);

    // SOUL.md and TOOLS.md are present
    const soul = result.entries.find(e => e.source === 'SOUL.md') as FileEntryPresent;
    expect(soul.status).toBe('present');
    expect(soul.content).toContain('minimal agent');

    const tools = result.entries.find(e => e.source === 'TOOLS.md') as FileEntryPresent;
    expect(tools.status).toBe('present');
    expect(tools.content).toContain('Tool Guidance');

    // 7 absent files each have specific default descriptions
    const absent = result.entries.filter(e => e.status === 'absent') as FileEntryAbsent[];
    expect(absent).toHaveLength(7);

    for (const entry of absent) {
      expect(entry.defaultDescription.length).toBeGreaterThan(0);
      expect(entry.defaultDescription).toContain('not found');
    }

    // Absent sources should include all 7 missing ones
    const absentSources = absent.map(e => e.source);
    expect(absentSources).toContain('AGENTS.md');
    expect(absentSources).toContain('IDENTITY.md');
    expect(absentSources).toContain('USER.md');
    expect(absentSources).toContain('MEMORY.md');
    expect(absentSources).toContain('HEARTBEAT.md');
    expect(absentSources).toContain('skills/');
    expect(absentSources).toContain('lobster.yaml');
  });
});
