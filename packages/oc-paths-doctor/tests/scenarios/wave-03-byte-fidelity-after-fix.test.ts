/**
 * Wave 3 — byte-fidelity after fix.
 *
 * Fixed bytes must round-trip cleanly through the substrate:
 *   parse(fix(raw)) → ast → emit(ast) === fix(raw)
 *
 * This proves the fix doesn't produce parser-confusing output, and
 * confirms downstream consumers (LKG fingerprint, audit hash) get
 * stable bytes after fix.
 */
import { emit, parseWorkspaceMd } from '@bic/oc-paths-substrate';
import { describe, expect, it } from 'vitest';
import { STARTER_FIXERS_V0 } from '../../src/extensions/ocdoctor-fixers-starter/index.js';
import type { OcPathFixerSpec } from '../../src/plugin-sdk/oc-doctor/types.js';

function applyFix(spec: OcPathFixerSpec, raw: string): string {
  const { ast } = parseWorkspaceMd(raw);
  const matches = spec.detect({ fileName: spec.appliesTo, ast, raw });
  if (matches.length === 0) return raw;
  return spec.fix({
    fileName: spec.appliesTo,
    ast,
    raw,
    match: matches[0]!.match,
  });
}

const triggerInputs: Record<string, readonly string[]> = {
  'starter-v0/agents/add-boundaries-stub': [
    '## Tools\n- gh\n',
    '## Tools\n- gh\n## Other\nbody\n',
    '',
    '\n\n## Tools\n',
  ],
  'starter-v0/memory/add-scope-default': [
    '## Entry\nbody\n',
    '---\nother: value\n---\n## Entry\n',
    '',
    '## Entry\n## Another\n',
  ],
  'starter-v0/user/add-preferences-stub': [
    '## Role\n',
    '## Role\nPM\n',
    '',
    'preamble\n## Role\n',
  ],
};

describe('wave-03 byte-fidelity-after-fix', () => {
  for (const fixer of STARTER_FIXERS_V0) {
    describe(fixer.id, () => {
      const inputs = triggerInputs[fixer.id] ?? [];
      for (const raw of inputs) {
        const label = JSON.stringify(raw.slice(0, 30));
        it(`emit(parse(fix(${label}))) === fix(${label})`, () => {
          const fixed = applyFix(fixer, raw);
          const reAst = parseWorkspaceMd(fixed).ast;
          expect(emit(reAst)).toBe(fixed);
        });
      }
    });
  }

  it('fix output has no error-level diagnostics from substrate parser', () => {
    for (const fixer of STARTER_FIXERS_V0) {
      const inputs = triggerInputs[fixer.id] ?? [];
      for (const raw of inputs) {
        const fixed = applyFix(fixer, raw);
        const { diagnostics } = parseWorkspaceMd(fixed);
        const errors = diagnostics.filter((d) => d.severity === 'error');
        expect(errors, `${fixer.id} on ${JSON.stringify(raw.slice(0, 30))}`).toEqual([]);
      }
    }
  });

  it('fix output preserves user content (additive — no deletion)', () => {
    const before = '## Existing User Content\n- preserved item 1\n- preserved item 2\n';
    for (const fixer of STARTER_FIXERS_V0) {
      const after = applyFix(fixer, before);
      // Even if the fixer doesn't fire (because target section isn't
      // applicable), the original content must persist.
      expect(after).toContain('preserved item 1');
      expect(after).toContain('preserved item 2');
    }
  });
});
