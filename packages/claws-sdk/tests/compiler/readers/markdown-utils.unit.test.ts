/**
 * L0 unit tests for markdown-utils.ts — shared markdown parsing utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  extractH2Sections,
  extractPreamble,
  extractListItems,
  findListValue,
} from '#src/compiler/readers/markdown-utils.js';

describe('extractH2Sections', () => {
  it('extracts multiple H2 sections', () => {
    const content = `# Title\n\nPreamble text.\n\n## Section A\n\nBody A.\n\n## Section B\n\nBody B.\n`;
    const sections = extractH2Sections(content);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.heading).toBe('Section A');
    expect(sections[0]!.body).toBe('Body A.');
    expect(sections[0]!.line).toBe(5);
    expect(sections[1]!.heading).toBe('Section B');
    expect(sections[1]!.body).toBe('Body B.');
  });

  it('returns empty array for content with no H2 sections', () => {
    const sections = extractH2Sections('# Just a title\n\nSome text.\n');
    expect(sections).toHaveLength(0);
  });

  it('handles sections with list items in body', () => {
    const content = '## Items\n\n- Item 1\n- Item 2\n';
    const sections = extractH2Sections(content);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.body).toContain('- Item 1');
  });
});

describe('extractPreamble', () => {
  it('extracts text before first H2, skipping H1', () => {
    const content = '# Title\n\nPreamble text here.\n\n## Section\n\nBody.\n';
    expect(extractPreamble(content)).toBe('Preamble text here.');
  });

  it('returns empty string when content starts with H2', () => {
    expect(extractPreamble('## Section\n\nBody.\n')).toBe('');
  });

  it('returns all content when there are no H2 sections', () => {
    expect(extractPreamble('# Title\n\nAll text.\n')).toBe('All text.');
  });
});

describe('extractListItems', () => {
  it('extracts items starting with "- "', () => {
    const items = extractListItems('- Item 1\n- Item 2\nNot an item\n- Item 3');
    expect(items).toEqual(['Item 1', 'Item 2', 'Item 3']);
  });

  it('returns empty array for non-list body', () => {
    expect(extractListItems('Just a paragraph.')).toEqual([]);
  });
});

describe('findListValue', () => {
  it('finds a key-value pair in a list', () => {
    const body = '- Name: Alice\n- Role: Engineer\n- Level: Senior';
    expect(findListValue(body, 'Role')).toBe('Engineer');
    expect(findListValue(body, 'Name')).toBe('Alice');
  });

  it('is case-insensitive for key matching', () => {
    const body = '- Description: A tool\n- Tools: Read, Write';
    expect(findListValue(body, 'description')).toBe('A tool');
    expect(findListValue(body, 'TOOLS')).toBe('Read, Write');
  });

  it('returns undefined for missing key', () => {
    expect(findListValue('- Name: Alice', 'Missing')).toBeUndefined();
  });
});
