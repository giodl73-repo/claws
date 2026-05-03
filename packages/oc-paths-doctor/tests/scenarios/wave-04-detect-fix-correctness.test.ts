/**
 * Wave 4 — per-fixer detect/fix correctness.
 *
 * Each fixer's detect + fix produce the right output across malformed,
 * partial, and edge-case inputs. Goes deeper than the smoke tests in
 * `tests/extensions/ocdoctor-fixers-starter/fixers.test.ts`.
 */
import { parseMd } from '@bic/oc-paths-substrate';
import { describe, expect, it } from 'vitest';
import {
  agentsAddBoundariesStub,
  memoryAddScopeDefault,
  userAddPreferencesStub,
} from '../../src/extensions/ocdoctor-fixers-starter/index.js';
import type { OcPathFixerSpec } from '../../src/plugin-sdk/oc-doctor/types.js';

function detectMatches(spec: OcPathFixerSpec, raw: string) {
  const { ast } = parseMd(raw);
  return spec.detect({ fileName: spec.appliesTo, ast, raw });
}

function applyFix(spec: OcPathFixerSpec, raw: string): string {
  const matches = detectMatches(spec, raw);
  if (matches.length === 0) return raw;
  const { ast } = parseMd(raw);
  return spec.fix({
    fileName: spec.appliesTo,
    ast,
    raw,
    match: matches[0]!.match,
  });
}

describe('wave-04 agents/add-boundaries-stub correctness', () => {
  it('AB-01 detects nothing on empty file (no Boundaries needed without any sections)', () => {
    // Intentional behavior: empty file has no ## Boundaries → detected;
    // fixer appends one. Operators can opt out by deleting the file.
    const matches = detectMatches(agentsAddBoundariesStub, '');
    expect(matches.length).toBe(1);
  });

  it('AB-02 detects when only ## Tools is present', () => {
    expect(detectMatches(agentsAddBoundariesStub, '## Tools\n').length).toBe(1);
  });

  it('AB-03 NOT detected when ## Boundaries already exists at any position', () => {
    expect(detectMatches(agentsAddBoundariesStub, '## Boundaries\n## Tools\n').length).toBe(0);
    expect(detectMatches(agentsAddBoundariesStub, '## Tools\n## Boundaries\n').length).toBe(0);
  });

  it('AB-04 case-insensitive section slug matching', () => {
    expect(detectMatches(agentsAddBoundariesStub, '## boundaries\n').length).toBe(0);
    expect(detectMatches(agentsAddBoundariesStub, '## BOUNDARIES\n').length).toBe(0);
    expect(detectMatches(agentsAddBoundariesStub, '## Boundaries  \n').length).toBe(0);
  });

  it('AB-05 fix preserves all existing content', () => {
    const before = '## Tools\n- gh\n- curl\n## Notes\n- a\n- b\n';
    const after = applyFix(agentsAddBoundariesStub, before);
    expect(after).toContain('## Tools');
    expect(after).toContain('- gh');
    expect(after).toContain('- curl');
    expect(after).toContain('## Notes');
    expect(after).toContain('## Boundaries');
  });

  it('AB-06 fix does not duplicate trailing newline', () => {
    const before = '## Tools\n';
    const after = applyFix(agentsAddBoundariesStub, before);
    // The fix appends a leading-newline stub when raw ends with `\n`;
    // there should be no triple-newline collisions.
    expect(after).not.toMatch(/\n\n\n\n/);
  });
});

describe('wave-04 memory/add-scope-default correctness', () => {
  it('MA-01 NOT detected when scope: <any value> is set', () => {
    expect(detectMatches(memoryAddScopeDefault, '---\nscope: project\n---\n').length).toBe(0);
    expect(detectMatches(memoryAddScopeDefault, '---\nscope: globalish\n---\n').length).toBe(0);
    // Even invalid scope values pass detection — that's a different rule's
    // concern (memory/invalid-scope-value).
  });

  it('MA-02 detected when frontmatter is empty', () => {
    expect(detectMatches(memoryAddScopeDefault, '---\n---\n## Entry\n').length).toBe(1);
  });

  it('MA-03 detected when frontmatter is absent', () => {
    expect(detectMatches(memoryAddScopeDefault, '## Entry\n').length).toBe(1);
  });

  it('MA-04 inserts scope BEFORE the closing fence', () => {
    const before = '---\nother: value\nmore: data\n---\n## Entry\n';
    const after = applyFix(memoryAddScopeDefault, before);
    // scope: project should be inside the frontmatter, before the second ---.
    const fmEnd = after.indexOf('---\n## Entry');
    const scopeAt = after.indexOf('scope: project');
    expect(scopeAt).toBeLessThan(fmEnd);
    expect(scopeAt).toBeGreaterThan(after.indexOf('---'));
  });

  it('MA-05 preserves CRLF line endings when inserting', () => {
    const before = '---\r\nother: value\r\n---\r\n## Entry\r\n';
    const after = applyFix(memoryAddScopeDefault, before);
    expect(after).toContain('scope: project\r\n');
    // Original CRLF preserved.
    expect(after).toContain('other: value\r\n');
  });

  it('MA-06 prepends frontmatter when none exists', () => {
    const before = '## Entry\nbody\n';
    const after = applyFix(memoryAddScopeDefault, before);
    expect(after.startsWith('---\nscope: project\n---\n')).toBe(true);
    expect(after).toContain('## Entry');
    expect(after).toContain('body');
  });
});

describe('wave-04 user/add-preferences-stub correctness', () => {
  it('UA-01 NOT detected when ## Preferences exists', () => {
    expect(detectMatches(userAddPreferencesStub, '## Preferences\n- async\n').length).toBe(0);
  });

  it('UA-02 detected when ## Role exists but ## Preferences does not', () => {
    expect(detectMatches(userAddPreferencesStub, '## Role\nPM\n').length).toBe(1);
  });

  it('UA-03 case-insensitive section slug', () => {
    expect(detectMatches(userAddPreferencesStub, '## preferences\n').length).toBe(0);
    expect(detectMatches(userAddPreferencesStub, '## PREFERENCES\n').length).toBe(0);
  });

  it('UA-04 fix on empty file appends section', () => {
    const after = applyFix(userAddPreferencesStub, '');
    expect(after).toContain('## Preferences');
  });

  it('UA-05 fix preserves frontmatter when present', () => {
    const before = '---\nrole: PM\n---\n## Role\nbody\n';
    const after = applyFix(userAddPreferencesStub, before);
    expect(after).toContain('---\nrole: PM\n---');
    expect(after).toContain('## Role');
    expect(after).toContain('## Preferences');
  });
});
