/**
 * L0: InputResolver branch coverage — skills directory edge cases.
 *
 * Covers the skills/ directory enumeration branch: line 129 (empty skills
 * subdirectory without SKILL.md).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { resolveDefaultSources, normalizeContent } from '../../src/compile/input-resolver.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-input-resolver-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('normalizeContent', () => {
  it('strips BOM and normalizes CRLF', () => {
    const bomCrlf = '\uFEFFline1\r\nline2\r\n';
    const result = normalizeContent(bomCrlf);
    expect(result).toBe('line1\nline2\n');
    expect(result).not.toContain('\uFEFF');
    expect(result).not.toContain('\r');
  });
});

describe('resolveDefaultSources', () => {
  it('returns absent entries for empty workspace', async () => {
    const entries = await resolveDefaultSources(tempDir);
    expect(entries.length).toBeGreaterThan(0);
    // All should be absent since no OC files exist
    for (const entry of entries) {
      expect(entry.status).toBe('absent');
    }
  });

  it('returns present entry for SOUL.md', async () => {
    await writeFile(join(tempDir, 'SOUL.md'), 'Never do bad things', 'utf-8');
    const entries = await resolveDefaultSources(tempDir);
    const soul = entries.find(e => e.source.includes('SOUL'));
    expect(soul).toBeDefined();
    expect(soul!.status).toBe('present');
    if (soul!.status === 'present') {
      expect(soul!.content).toBe('Never do bad things');
      expect(soul!.provenance.sourceType).toBe('filesystem');
    }
  });

  it('handles skills/ directory with SKILL.md in subdirs', async () => {
    const skillDir = join(tempDir, 'skills', 'my-tool');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), '# My Tool Skill', 'utf-8');

    const entries = await resolveDefaultSources(tempDir);
    const skills = entries.find(e => e.source === 'skills/');
    expect(skills).toBeDefined();
    expect(skills!.status).toBe('present');
    if (skills!.status === 'present') {
      expect(skills!.content).toContain('My Tool Skill');
    }
  });

  it('returns absent for skills/ when subdirs lack SKILL.md', async () => {
    const skillDir = join(tempDir, 'skills', 'empty-tool');
    await mkdir(skillDir, { recursive: true });
    // No SKILL.md inside

    const entries = await resolveDefaultSources(tempDir);
    const skills = entries.find(e => e.source === 'skills/');
    expect(skills).toBeDefined();
    expect(skills!.status).toBe('absent');
  });

  it('returns absent for skills/ when path is a file not a directory', async () => {
    await writeFile(join(tempDir, 'skills'), 'not a directory', 'utf-8');
    const entries = await resolveDefaultSources(tempDir);
    const skills = entries.find(e => e.source === 'skills/');
    expect(skills).toBeDefined();
    expect(skills!.status).toBe('absent');
  });
});
