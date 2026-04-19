/**
 * L0 unit tests for skills-reader.ts
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { skillsReader } from '#src/compiler/readers/skills-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('skillsReader', () => {
  it('reads skills from a workspace with SKILL.md files', async () => {
    const result = await skillsReader.read(resolve(FIXTURES, 'full-workspace'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills.length).toBe(1);
    expect(result.data.skills[0]!.name).toBe('build-run');
    expect(result.data.skills[0]!.description).toContain('build and test');
    expect(result.data.skills[0]!.tools).toContain('Bash');
    expect(result.data.skills[0]!.path).toBe('skills/build-run/SKILL.md');
  });

  it('reads skills from conflict-workspace with scan-code skill', async () => {
    const result = await skillsReader.read(resolve(FIXTURES, 'conflict-workspace'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills.length).toBe(1);
    expect(result.data.skills[0]!.path).toBe('skills/scan-code/SKILL.md');
  });

  it('reads skill with no frontmatter (fallback parsing)', async () => {
    const result = await skillsReader.read(resolve(FIXTURES, 'reader-test-skill-no-fm'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills.length).toBe(1);
    expect(result.data.skills[0]!.name).toBe('basic-skill'); // Falls back to dir name
    expect(result.data.skills[0]!.description).toContain('Execute basic commands');
    expect(result.data.skills[0]!.tools).toEqual([]);
  });

  it('produces warning when skills/ exists but has no SKILL.md files', async () => {
    const result = await skillsReader.read(resolve(FIXTURES, 'reader-test-empty-content'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills).toHaveLength(0);
    const warning = result.diagnostics.find(d => d.code === 'SKILLS-EMPTY');
    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
  });

  it('reads skill with unclosed frontmatter (fallback to dir name)', async () => {
    const result = await skillsReader.read(resolve(FIXTURES, 'reader-test-skill-bad-fm'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills.length).toBe(1);
    // Unclosed frontmatter: endIdx === -1, so frontmatter is not parsed
    // Falls back to dir name and first paragraph
    expect(result.data.skills[0]!.name).toBe('broken-skill');
  });

  it('returns failure when skills is a file, not a directory', async () => {
    const result = await skillsReader.read(resolve(FIXTURES, 'reader-test-skills-not-dir'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.message).toContain('not a directory');
    }
  });

  it('returns warning for missing optional skills/ directory', async () => {
    const result = await skillsReader.read('/nonexistent/path');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.severity).toBe('warning');
    }
  });
});
