/**
 * Smoke tests for the doctor test harness.
 */
import { parseOcPath } from '@bic/oc-paths-substrate';
import { describe, expect, it } from 'vitest';
import {
  assertDetects,
  assertIdempotent,
  assertNoDetects,
  runDetect,
  runFixer,
  runFixerAll,
} from '../../src/test-harness/index.js';
import type { OcPathFixerSpec } from '../../src/plugin-sdk/oc-doctor/types.js';

/**
 * Append `\n## Done\n` to AGENTS.md if absent. Idempotent and
 * single-match, so once-fix and all-fix produce the same result.
 */
const appendDone: OcPathFixerSpec = {
  id: 'demo/append-done',
  description: 'append `## Done` to AGENTS.md',
  severity: 'info',
  appliesTo: 'AGENTS.md',
  detect({ ast }) {
    if (ast.kind !== 'md') return [];
    if (ast.blocks.some((b) => b.slug === 'done')) return [];
    return [
      {
        match: {
          path: parseOcPath('oc://AGENTS.md/+'),
          match: { kind: 'insertion-point', container: 'md-file', line: 1 },
        },
        message: 'no done section',
      },
    ];
  },
  fix({ raw, ast }) {
    if (ast.kind !== 'md') return raw;
    if (ast.blocks.some((b) => b.slug === 'done')) return raw;
    const sep = raw.endsWith('\n') ? '' : '\n';
    return raw + sep + '\n## Done\n';
  },
};

describe('doctor test-harness', () => {
  it('runDetect returns findings on a malformed input', () => {
    const findings = runDetect(appendDone, 'AGENTS.md', '## H\n');
    expect(findings).toHaveLength(1);
  });

  it('runDetect returns empty on a clean input', () => {
    expect(runDetect(appendDone, 'AGENTS.md', '## H\n## Done\n')).toEqual([]);
  });

  it('runFixer applies the first match', () => {
    const after = runFixer(appendDone, 'AGENTS.md', '## H\n');
    expect(after).toContain('## Done');
  });

  it('runFixer no-ops on already-fixed input', () => {
    const before = '## H\n## Done\n';
    expect(runFixer(appendDone, 'AGENTS.md', before)).toBe(before);
  });

  it('runFixerAll converges to a stable result', () => {
    const after = runFixerAll(appendDone, 'AGENTS.md', '## H\n');
    expect(after).toContain('## Done');
    // Re-running should be a no-op.
    expect(runFixerAll(appendDone, 'AGENTS.md', after)).toBe(after);
  });

  it('assertDetects passes when fixer flags', () => {
    expect(() => assertDetects(appendDone, 'AGENTS.md', '## H\n')).not.toThrow();
  });

  it('assertDetects throws when fixer is silent', () => {
    expect(() => assertDetects(appendDone, 'AGENTS.md', '## H\n## Done\n')).toThrow(
      /detect/,
    );
  });

  it('assertNoDetects passes on a clean input', () => {
    expect(() => assertNoDetects(appendDone, 'AGENTS.md', '## H\n## Done\n')).not.toThrow();
  });

  it('assertNoDetects throws with a useful summary on a flagged input', () => {
    expect(() => assertNoDetects(appendDone, 'AGENTS.md', '## H\n')).toThrow(
      /no done section/,
    );
  });

  it('assertIdempotent passes for an idempotent fixer', () => {
    expect(() => assertIdempotent(appendDone, 'AGENTS.md', '## H\n')).not.toThrow();
  });

  it('assertIdempotent surfaces non-idempotent fixers', () => {
    let counter = 0;
    const broken: OcPathFixerSpec = {
      id: 'demo/broken',
      description: 'non-idempotent — appends a counter every call',
      severity: 'info',
      appliesTo: 'AGENTS.md',
      detect: () => [
        {
          match: {
            path: parseOcPath('oc://AGENTS.md/+'),
            match: { kind: 'insertion-point', container: 'md-file', line: 1 },
          },
          message: 'always',
        },
      ],
      fix: ({ raw }) => {
        counter += 1;
        return raw + `\nCOUNTER=${counter}\n`;
      },
    };
    expect(() => assertIdempotent(broken, 'AGENTS.md', '## H\n')).toThrow();
  });
});
