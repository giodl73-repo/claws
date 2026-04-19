import { describe, expect, it } from 'vitest';

import { applyLossless, previewLossless } from '../../src/workspace-edit/lossless.js';
import { EditTargetError } from '../../src/workspace-edit/types.js';

const FILE_WITH_FRONTMATTER = [
  '---',
  'owner: platform',
  'version: 2',
  '---',
  '',
  '# Top Heading',
  '',
  '<!-- editor: keep me untouched -->',
  '',
  '## alpha',
  '',
  '- Risk: R1',
  '- enabled: true',
  '',
  '## bravo',
  '',
  '- Risk: R2',
  '- enabled: true',
  '',
].join('\n');

describe('applyLossless (unit)', () => {
  it('toggling a tool preserves surrounding content byte-for-byte', () => {
    const raw = FILE_WITH_FRONTMATTER;
    const next = applyLossless(raw, {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'alpha',
      field: 'enabled',
      value: false,
    });

    // Single line flipped inside alpha.
    expect(next).toContain('## alpha\n\n- Risk: R1\n- enabled: false');
    // bravo region is unchanged.
    expect(next).toContain('## bravo\n\n- Risk: R2\n- enabled: true');
    // Preamble + frontmatter untouched.
    const preambleBefore = raw.split('## alpha')[0];
    const preambleAfter = next.split('## alpha')[0];
    expect(preambleAfter).toBe(preambleBefore);
    // Trailing newline preserved.
    expect(next.endsWith('\n')).toBe(true);
  });

  it('append inserts after the last list item in the region', () => {
    const raw = FILE_WITH_FRONTMATTER;
    const next = applyLossless(raw, {
      kind: 'append',
      file: 'TOOLS.md',
      section: 'alpha',
      item: 'extra: true',
    });
    expect(next).toContain('- Risk: R1\n- enabled: true\n- extra: true');
    // bravo untouched
    expect(next).toContain('## bravo\n\n- Risk: R2\n- enabled: true');
  });

  it('append into a region with no list items inserts after the last content line', () => {
    const raw = [
      '# Title',
      '',
      '## empty-section',
      '',
      'Narrative paragraph.',
      '',
      '## next',
      '',
      '- Risk: R1',
      '',
    ].join('\n');
    const next = applyLossless(raw, {
      kind: 'append',
      file: 'TOOLS.md',
      section: 'empty-section',
      item: 'new-item',
    });
    expect(next).toContain('Narrative paragraph.\n- new-item');
    expect(next).toContain('## next\n\n- Risk: R1');
  });

  it('remove deletes exactly the matched list item', () => {
    const raw = [
      '## list',
      '- alpha',
      '- beta',
      '- gamma',
      '',
    ].join('\n');
    const next = applyLossless(raw, {
      kind: 'remove',
      file: 'CONNECTIONS.md',
      section: 'list',
      item: 'beta',
    });
    expect(next).not.toMatch(/- beta/);
    expect(next).toContain('- alpha');
    expect(next).toContain('- gamma');
  });

  it('throws EditTargetError when the section is not present', () => {
    expect(() =>
      applyLossless(FILE_WITH_FRONTMATTER, {
        kind: 'toggle',
        file: 'TOOLS.md',
        section: 'does-not-exist',
        field: 'enabled',
        value: false,
      }),
    ).toThrow(EditTargetError);
  });

  it('throws EditTargetError when the field is not present in the section', () => {
    try {
      applyLossless(FILE_WITH_FRONTMATTER, {
        kind: 'set',
        file: 'TOOLS.md',
        section: 'alpha',
        field: 'missing',
        value: 'x',
      });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(EditTargetError);
      expect((err as EditTargetError).code).toBe('EDIT_FIELD_NOT_FOUND');
    }
  });

  it('throws EditTargetError when removing a missing list item', () => {
    try {
      applyLossless(FILE_WITH_FRONTMATTER, {
        kind: 'remove',
        file: 'CONNECTIONS.md',
        section: 'alpha',
        item: 'not-there',
      });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(EditTargetError);
      expect((err as EditTargetError).code).toBe('EDIT_ITEM_NOT_FOUND');
    }
  });

  it('preserves CRLF line endings', () => {
    const raw = '## alpha\r\n\r\n- enabled: true\r\n\r\n## beta\r\n\r\n- enabled: false\r\n';
    const next = applyLossless(raw, {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'alpha',
      field: 'enabled',
      value: false,
    });
    expect(next).toContain('\r\n');
    expect(next).toContain('- enabled: false\r\n\r\n## beta');
  });

  it('preserves BOM on the output', () => {
    const raw = '\uFEFF## alpha\n\n- enabled: true\n';
    const next = applyLossless(raw, {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'alpha',
      field: 'enabled',
      value: false,
    });
    expect(next.startsWith('\uFEFF')).toBe(true);
  });

  it('toggle(true) writes "true" into the flag', () => {
    const raw = '## alpha\n\n- enabled: false\n';
    const next = applyLossless(raw, {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'alpha',
      field: 'enabled',
      value: true,
    });
    expect(next).toContain('- enabled: true');
  });

  it('toggling a missing field throws EditTargetError', () => {
    try {
      applyLossless('## alpha\n\n- other: x\n', {
        kind: 'toggle',
        file: 'TOOLS.md',
        section: 'alpha',
        field: 'enabled',
        value: false,
      });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(EditTargetError);
      expect((err as EditTargetError).code).toBe('EDIT_FIELD_NOT_FOUND');
    }
  });

  it('preserves file without a trailing newline', () => {
    const raw = '## alpha\n\n- enabled: true';
    const next = applyLossless(raw, {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'alpha',
      field: 'enabled',
      value: false,
    });
    expect(next.endsWith('\n')).toBe(false);
    expect(next).toContain('- enabled: false');
  });

  it('appends to a fully empty region (no content lines, no list items)', () => {
    const raw = '# Title\n\n## empty\n\n## next\n\n- x\n';
    const next = applyLossless(raw, {
      kind: 'append',
      file: 'TOOLS.md',
      section: 'empty',
      item: 'fresh-item',
    });
    expect(next).toContain('## empty');
    expect(next).toContain('- fresh-item');
    expect(next).toContain('## next');
  });

  it('skips list lines missing a colon when searching for a field', () => {
    // The `- bare` line has no colon and must not be matched. The field
    // search has to fall through to the `- enabled: true` line.
    const raw = '## alpha\n\n- bare\n- enabled: true\n';
    const next = applyLossless(raw, {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'alpha',
      field: 'enabled',
      value: false,
    });
    expect(next).toContain('- bare\n- enabled: false');
  });

  it('handles an empty file without crashing', () => {
    // Empty file → no regions except the empty preamble. Any edit fails as
    // section-not-found, exercising the empty-lines path during parse.
    expect(() =>
      applyLossless('', {
        kind: 'toggle',
        file: 'TOOLS.md',
        section: 'any',
        field: 'x',
        value: false,
      }),
    ).toThrow(EditTargetError);
  });

  it('previewLossless reports changed line numbers and preserves before', () => {
    const result = previewLossless(FILE_WITH_FRONTMATTER, {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'alpha',
      field: 'enabled',
      value: false,
    });
    expect(result.before).toBe(FILE_WITH_FRONTMATTER);
    expect(result.after).not.toBe(result.before);
    expect(result.changedLines.length).toBeGreaterThan(0);
    for (const cl of result.changedLines) {
      expect(cl.line).toBeGreaterThan(0);
    }
  });

  it('frontmatter and comments survive a round-trip through toggle + set', () => {
    let next = applyLossless(FILE_WITH_FRONTMATTER, {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'alpha',
      field: 'enabled',
      value: false,
    });
    next = applyLossless(next, {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'bravo',
      field: 'Risk',
      value: 'R3',
    });

    expect(next.startsWith('---\nowner: platform\nversion: 2\n---')).toBe(true);
    expect(next).toContain('<!-- editor: keep me untouched -->');
    expect(next).toContain('- Risk: R3');
    expect(next).toContain('- enabled: false');
    // Non-targeted fields keep their original values.
    expect(next).toContain('## bravo\n\n- Risk: R3\n- enabled: true');
  });
});
