/**
 * L0 unit tests for annotate orchestrator — parseSkillFrontmatter,
 * injectAnnotations, and annotateDirectory.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseSkillFrontmatter,
  injectAnnotations,
  annotateDirectory,
} from '../../src/annotate/orchestrator.js';
import type { HeuristicAnnotation } from '../../src/annotate/heuristics.js';

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('../../src/annotate/heuristics.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/annotate/heuristics.js')>();
  return {
    ...actual,
    analyzeHeuristics: vi.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let mockReaddir: ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let mockReadFile: ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let mockWriteFile: ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let mockAnalyzeHeuristics: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.clearAllMocks();
  const fs = await import('node:fs/promises');
  mockReaddir = fs.readdir as unknown as ReturnType<typeof vi.fn>;
  mockReadFile = fs.readFile as unknown as ReturnType<typeof vi.fn>;
  mockWriteFile = fs.writeFile as unknown as ReturnType<typeof vi.fn>;
  const heuristics = await import('../../src/annotate/heuristics.js');
  mockAnalyzeHeuristics = heuristics.analyzeHeuristics as unknown as ReturnType<typeof vi.fn>;
});

describe('parseSkillFrontmatter', () => {
  it('extracts name, description, and tools from valid frontmatter', () => {
    const content = [
      '---',
      'name: email-drafter',
      'description: Draft and send emails on behalf of the user',
      'tools:',
      '  - send-email',
      '  - read-inbox',
      '---',
      '',
      'Some body content.',
    ].join('\n');

    const result = parseSkillFrontmatter(content);

    expect(result.name).toBe('email-drafter');
    expect(result.description).toBe('Draft and send emails on behalf of the user');
    expect(result.tools).toEqual(['send-email', 'read-inbox']);
  });

  it('returns undefined fields for content without frontmatter', () => {
    const result = parseSkillFrontmatter('Just plain text.');

    expect(result.name).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.tools).toBeUndefined();
  });

  it('returns undefined fields for empty frontmatter', () => {
    const result = parseSkillFrontmatter('---\n---\n');

    expect(result.name).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.tools).toBeUndefined();
  });

  it('returns undefined for empty name/description values', () => {
    const content = '---\nname:\ndescription:   \n---\n';
    const result = parseSkillFrontmatter(content);
    expect(result.name).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  it('skips whitespace-only tool list items', () => {
    const content = [
      '---',
      'tools:',
      '  -   ',
      '  - valid-tool',
      '---',
    ].join('\n');
    const result = parseSkillFrontmatter(content);
    expect(result.tools).toEqual(['valid-tool']);
  });

  it('returns undefined tools when tools section has no valid items', () => {
    const content = [
      '---',
      'tools:',
      '  -   ',
      '---',
    ].join('\n');
    const result = parseSkillFrontmatter(content);
    expect(result.tools).toBeUndefined();
  });

  it('stops tool list collection when a non-indented line follows', () => {
    const content = [
      '---',
      'tools:',
      '  - web-search',
      'name: my-skill',
      'description: does things',
      '---',
      '',
    ].join('\n');

    const result = parseSkillFrontmatter(content);
    expect(result.tools).toEqual(['web-search']);
    expect(result.name).toBe('my-skill');
    expect(result.description).toBe('does things');
  });

  it('handles frontmatter with only name', () => {
    const content = '---\nname: my-skill\n---\n';
    const result = parseSkillFrontmatter(content);

    expect(result.name).toBe('my-skill');
    expect(result.description).toBeUndefined();
    expect(result.tools).toBeUndefined();
  });
});

describe('injectAnnotations', () => {
  const baseAnnotation: HeuristicAnnotation = {
    name: 'test-skill',
    riskClass: 3,
    riskConfidence: 0.75,
    obo: { detected: false, matchedPatterns: [], confidence: 0 },
    dataClassification: 'internal',
    evidence: [],
  };

  it('appends heuristic fields to existing frontmatter', () => {
    const content = '---\nname: test-skill\n---\nBody.';
    const result = injectAnnotations(content, baseAnnotation);

    expect(result).toContain('name: test-skill');
    expect(result).toContain('heuristic-');
    expect(result).toContain('Body.');
  });

  it('returns unchanged content when no frontmatter present', () => {
    const content = 'No frontmatter here.';
    const result = injectAnnotations(content, baseAnnotation);

    expect(result).toBe(content);
  });

  it('replaces existing heuristic fields', () => {
    const content = '---\nname: test-skill\nheuristic-risk: R1\n---\nBody.';
    const result = injectAnnotations(content, baseAnnotation);

    // Should not have the old R1
    const heuristicLines = result.split('\n').filter(l => l.startsWith('heuristic-risk:'));
    expect(heuristicLines).toHaveLength(1);
    expect(heuristicLines[0]).not.toContain('R1');
  });

  it('injects array annotations when OBO is detected', () => {
    const oboAnnotation: HeuristicAnnotation = {
      name: 'send-email',
      riskClass: 4,
      riskConfidence: 0.85,
      obo: { detected: true, matchedPatterns: ['on behalf', 'delegate'], confidence: 0.9 },
      dataClassification: 'internal',
      evidence: [],
    };
    const content = '---\nname: send-email\n---\nBody.';
    const result = injectAnnotations(content, oboAnnotation);

    // Array fields should produce YAML list format
    expect(result).toContain('heuristic-obo-patterns:');
    expect(result).toContain('  - on behalf');
    expect(result).toContain('  - delegate');
    expect(result).toContain('heuristic-obo: true');
  });

  it('preserves non-heuristic list items in frontmatter', () => {
    const content = [
      '---',
      'name: test-skill',
      'tools:',
      '  - read-inbox',
      '  - send-email',
      'heuristic-risk: R1',
      '---',
      'Body.',
    ].join('\n');
    const result = injectAnnotations(content, baseAnnotation);

    // Non-heuristic list items should be kept
    expect(result).toContain('  - read-inbox');
    expect(result).toContain('  - send-email');
  });
});

// ── annotateDirectory ────────────────────────────────────────────────

describe('annotateDirectory', () => {
  const skillContent = [
    '---',
    'name: email-drafter',
    'description: Draft and send emails',
    '---',
    '',
    'Body content.',
  ].join('\n');

  const fakeAnnotation: HeuristicAnnotation = {
    name: 'email-drafter',
    riskClass: 4,
    riskConfidence: 0.85,
    obo: { detected: false, matchedPatterns: [], confidence: 0 },
    dataClassification: 'internal',
    evidence: [{ source: 'name:send', weight: 0.7 }],
  };

  it('dry-run returns annotations without writing files', async () => {
    mockReaddir.mockResolvedValue(['email-drafter']);
    mockReadFile.mockResolvedValue(skillContent);
    mockAnalyzeHeuristics.mockReturnValue(fakeAnnotation);

    const result = await annotateDirectory('/skills', { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0]).toBe(fakeAnnotation);
    expect(result.modifiedFiles).toHaveLength(0);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('write mode injects annotations and records modified files', async () => {
    mockReaddir.mockResolvedValue(['email-drafter']);
    mockReadFile.mockResolvedValue(skillContent);
    mockAnalyzeHeuristics.mockReturnValue(fakeAnnotation);
    mockWriteFile.mockResolvedValue(undefined);

    const result = await annotateDirectory('/skills', { dryRun: false });

    expect(result.dryRun).toBe(false);
    expect(result.annotations).toHaveLength(1);
    expect(result.modifiedFiles).toHaveLength(1);
    expect(result.modifiedFiles[0]).toContain('email-drafter');
    expect(result.modifiedFiles[0]).toContain('SKILL.md');
    expect(mockWriteFile).toHaveBeenCalledOnce();
    // The written content should contain heuristic annotations
    const writtenContent = mockWriteFile.mock.calls[0][1] as string;
    expect(writtenContent).toContain('heuristic-');
  });

  it('empty directory returns empty annotations', async () => {
    mockReaddir.mockResolvedValue([]);

    const result = await annotateDirectory('/skills', { dryRun: true });

    expect(result.annotations).toHaveLength(0);
    expect(result.modifiedFiles).toHaveLength(0);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it('skips entries where SKILL.md does not exist', async () => {
    mockReaddir.mockResolvedValue(['not-a-skill', 'email-drafter']);
    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))
      .mockResolvedValueOnce(skillContent);
    mockAnalyzeHeuristics.mockReturnValue(fakeAnnotation);

    const result = await annotateDirectory('/skills', { dryRun: true });

    // Only the second entry should produce an annotation
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0]).toBe(fakeAnnotation);
  });

  it('propagates readdir error with original message', async () => {
    mockReaddir.mockRejectedValue(new Error('EACCES: permission denied'));

    await expect(annotateDirectory('/no-access', { dryRun: true }))
      .rejects.toThrow('EACCES');
  });

  it('passes correct arguments to analyzeHeuristics', async () => {
    mockReaddir.mockResolvedValue(['email-drafter']);
    mockReadFile.mockResolvedValue(skillContent);
    mockAnalyzeHeuristics.mockReturnValue(fakeAnnotation);

    await annotateDirectory('/skills', { dryRun: true });

    expect(mockAnalyzeHeuristics).toHaveBeenCalledWith(
      'email-drafter',         // name from frontmatter
      'Draft and send emails', // description from frontmatter
      skillContent,            // full content
    );
  });

  it('uses entry name when frontmatter has no name field', async () => {
    const noNameContent = '---\ndescription: A simple tool\n---\nBody.';
    mockReaddir.mockResolvedValue(['my-tool']);
    mockReadFile.mockResolvedValue(noNameContent);
    mockAnalyzeHeuristics.mockReturnValue(fakeAnnotation);

    await annotateDirectory('/skills', { dryRun: true });

    // Should fall back to entry name 'my-tool'
    expect(mockAnalyzeHeuristics).toHaveBeenCalledWith(
      'my-tool',
      'A simple tool',
      noNameContent,
    );
  });

  it('uses empty description when frontmatter has no description', async () => {
    const noDescContent = '---\nname: bare-skill\n---\nBody.';
    mockReaddir.mockResolvedValue(['bare-skill']);
    mockReadFile.mockResolvedValue(noDescContent);
    mockAnalyzeHeuristics.mockReturnValue(fakeAnnotation);

    await annotateDirectory('/skills', { dryRun: true });

    expect(mockAnalyzeHeuristics).toHaveBeenCalledWith(
      'bare-skill',
      '',             // fallback for missing description
      noDescContent,
    );
  });

  it('does not write when inject produces no change', async () => {
    // Content without frontmatter — injectAnnotations returns it unchanged
    const plainContent = 'No frontmatter here.';
    mockReaddir.mockResolvedValue(['plain']);
    mockReadFile.mockResolvedValue(plainContent);
    mockAnalyzeHeuristics.mockReturnValue(fakeAnnotation);

    const result = await annotateDirectory('/skills', { dryRun: false });

    // injectAnnotations returns unchanged for content without frontmatter
    expect(result.modifiedFiles).toHaveLength(0);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('processes multiple skills in a single directory', async () => {
    const secondAnnotation: HeuristicAnnotation = {
      name: 'search-docs',
      riskClass: 1,
      riskConfidence: 0.60,
      obo: { detected: false, matchedPatterns: [], confidence: 0 },
      dataClassification: 'public',
      evidence: [],
    };
    const secondContent = '---\nname: search-docs\ndescription: Search documents\n---\nBody.';

    mockReaddir.mockResolvedValue(['email-drafter', 'search-docs']);
    mockReadFile
      .mockResolvedValueOnce(skillContent)
      .mockResolvedValueOnce(secondContent);
    mockAnalyzeHeuristics
      .mockReturnValueOnce(fakeAnnotation)
      .mockReturnValueOnce(secondAnnotation);
    mockWriteFile.mockResolvedValue(undefined);

    const result = await annotateDirectory('/skills', { dryRun: false });

    expect(result.annotations).toHaveLength(2);
    expect(result.annotations[0]).toBe(fakeAnnotation);
    expect(result.annotations[1]).toBe(secondAnnotation);
    // Both have frontmatter, both should be modified
    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    expect(result.modifiedFiles).toHaveLength(2);
  });
});
