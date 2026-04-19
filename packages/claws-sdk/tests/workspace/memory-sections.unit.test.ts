/**
 * L0 unit tests for MEMORY.md section decomposition (Pulse 36).
 *
 * Covers parse, round-trip fidelity, and entry counting for the six
 * structural shapes the Loop sync endpoint must surface:
 *   1. single-section
 *   2. memory index tables (pipe-delimited `| col | col |`)
 *   3. lossless round-trip (preamble + sections reassemble byte-for-byte)
 *   4. feedback/project/reference entries parsed as sub-sections
 *   5. empty MEMORY.md returns an empty section array
 *   6. entry counts roll up top-level list items plus H3 sub-sections
 */

import { describe, expect, it } from 'vitest';
import {
  countMemoryEntries,
  memorySectionId,
  parseMemorySections,
  reassembleMemorySections,
} from '../../src/workspace/memory-sections.js';

describe('memory-sections — L0', () => {
  it('parses a single-section MEMORY.md into one MemoryLoopSection', () => {
    const input = '# Memory\n\nPreamble.\n\n## Feedback\n\n- first entry\n- second entry\n';
    const parsed = parseMemorySections(input);

    expect(parsed.sections).toHaveLength(1);
    const section = parsed.sections[0]!;
    expect(section.id).toBe('feedback');
    expect(section.heading).toBe('Feedback');
    expect(section.entryCount).toBe(2);
    expect(parsed.preamble).toBe('# Memory\n\nPreamble.\n\n');
  });

  it('preserves a memory index table inside the Memory Index section', () => {
    const input = [
      '# Memory\n',
      '\n',
      '## Memory Index\n',
      '\n',
      '| Column | Meaning |\n',
      '|--------|---------|\n',
      '| feedback | corrections |\n',
      '| project | context |\n',
      '\n',
      '## Feedback\n',
      '\n',
      '- item\n',
    ].join('');
    const parsed = parseMemorySections(input);

    expect(parsed.sections).toHaveLength(2);
    const index = parsed.sections[0]!;
    expect(index.id).toBe('memory-index');
    expect(index.content).toContain('| Column | Meaning |');
    expect(index.content).toContain('| feedback | corrections |');
    // The table row separators / pipes must not be re-wrapped or
    // re-indented by the parser — the slice is raw.
    expect(index.content.endsWith('\n\n')).toBe(true);
  });

  it('reassembles parsed sections byte-for-byte (lossless round-trip)', () => {
    const inputs = [
      // LF, trailing newline
      '# Memory\n\n## Feedback\n\n- a\n\n## Project\n\n- b\n',
      // CRLF variant — separator preservation
      '# Memory\r\n\r\n## Feedback\r\n\r\n- a\r\n\r\n## Project\r\n\r\n- b\r\n',
      // No trailing newline on last section
      '## Only\n\n- solo',
      // Preamble-only, no sections
      '# Memory\n\nJust prose, no H2.\n',
    ];
    for (const input of inputs) {
      const parsed = parseMemorySections(input);
      expect(reassembleMemorySections(parsed)).toBe(input);
    }
  });

  it('treats feedback/project/reference sub-entries (H3) as sub-sections under their parent', () => {
    const input = [
      '## Feedback\n',
      '\n',
      '### No git stash\n',
      '\n',
      '- never stash\n',
      '\n',
      '### Kill orphan processes\n',
      '\n',
      '- clean up after sessions\n',
    ].join('');
    const parsed = parseMemorySections(input);

    expect(parsed.sections).toHaveLength(1);
    const feedback = parsed.sections[0]!;
    expect(feedback.id).toBe('feedback');
    // 2 H3 sub-entries + 2 top-level list items (the `-` lines under each H3)
    expect(feedback.entryCount).toBe(4);
  });

  it('returns an empty section array for an empty MEMORY.md', () => {
    const parsed = parseMemorySections('');
    expect(parsed.sections).toEqual([]);
    expect(parsed.preamble).toBe('');
    expect(parsed.raw).toBe('');
    expect(reassembleMemorySections(parsed)).toBe('');
  });

  it('counts entries per section: top-level list items plus H3 sub-sections', () => {
    expect(countMemoryEntries('')).toBe(0);
    expect(countMemoryEntries('- one\n- two\n- three\n')).toBe(3);
    expect(countMemoryEntries('### A\n### B\n')).toBe(2);
    // Mixed — and indented children are NOT counted as top-level entries.
    expect(
      countMemoryEntries(
        ['- top1', '  - nested', '- top2', '### Sub', '* top3'].join('\n'),
      ),
    ).toBe(4);

    // Slug fallback for headings with no alphanumerics.
    expect(memorySectionId('!!!')).toBe('section');
    expect(memorySectionId('Memory Index')).toBe('memory-index');
    expect(memorySectionId('Feedback / Project')).toBe('feedback-project');
  });

  it('replaces a section by id during reassembly while preserving other sections', () => {
    const input = [
      '# Memory\n',
      '\n',
      '## Feedback\n',
      '\n',
      '- old\n',
      '\n',
      '## Project\n',
      '\n',
      '- keep\n',
    ].join('');
    const parsed = parseMemorySections(input);
    const replacement = '## Feedback\n\n- new\n\n';
    const out = reassembleMemorySections(
      parsed,
      new Map([['feedback', replacement]]),
    );
    expect(out).toBe(
      ['# Memory\n\n', '## Feedback\n\n- new\n\n', '## Project\n\n- keep\n'].join(''),
    );
  });
});
