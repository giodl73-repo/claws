/**
 * Wave 7 — JSONC starter fixer pack adversarial scenarios.
 *
 * Drives every jsonc fixer through the contract surface:
 *   - idempotency (fix(fix(x)) === fix(x))
 *   - hostile inputs do not throw
 *   - already-fixed inputs are no-ops
 *   - detect findings have valid shape
 *   - fix preserves keys outside the touched region
 */
import { parseJsonc } from '@bic/oc-paths-substrate';
import { describe, expect, it } from 'vitest';
import {
  configAddPluginsStub,
  configAddVersionStub,
  configRedactSecretLiteral,
  jsoncStarterFixers,
} from '../../src/extensions/ocdoctor-fixers-jsonc-starter/index.js';
import type { JsoncOcPathFixerSpec } from '../../src/plugin-sdk/oc-doctor/types.js';

function applyFix(
  spec: JsoncOcPathFixerSpec<unknown>,
  raw: string,
  fileName = 'gateway.jsonc',
): string {
  const ast = parseJsonc(raw).ast;
  const matches = spec.detect({ fileName, ast, raw });
  if (matches.length === 0) return raw;
  return spec.fix({
    fileName,
    ast,
    raw,
    match: matches[0]!.match,
  });
}

const HOSTILE_INPUTS: string[] = [
  '',
  '\n',
  '   \n',
  '{}',
  '[]',
  'null',
  '42',
  '"string root"',
  '{ broken json',
  '/* only a comment */',
  '// line comment only\n',
  '{ "x": "value with \\"escapes\\"" }',
  '{\n  // comment\n  "x": 1\n}\n',
];

describe('wave-07 jsonc fixers — idempotency', () => {
  for (const fixer of jsoncStarterFixers) {
    describe(fixer.id, () => {
      for (const raw of HOSTILE_INPUTS) {
        const label = JSON.stringify(raw.slice(0, 30));
        it(`is idempotent on ${label}`, () => {
          const once = applyFix(fixer, raw);
          const twice = applyFix(fixer, once);
          expect(twice).toBe(once);
        });
      }
    });
  }
});

describe('wave-07 jsonc fixers — hostile inputs do not throw', () => {
  for (const fixer of jsoncStarterFixers) {
    for (const raw of HOSTILE_INPUTS) {
      it(`${fixer.id} does not throw on ${JSON.stringify(raw.slice(0, 30))}`, () => {
        expect(() => applyFix(fixer, raw)).not.toThrow();
      });
    }
  }
});

describe('wave-07 jsonc fixers — detect findings have valid shape', () => {
  for (const fixer of jsoncStarterFixers) {
    it(`${fixer.id} produces ocPath strings starting with oc://`, () => {
      const ast = parseJsonc('{ "version": "1.0" }').ast;
      const findings = fixer.detect({ fileName: 'config.jsonc', ast, raw: '{ "version": "1.0" }' });
      for (const f of findings) {
        expect(f.ocPath.startsWith('oc://')).toBe(true);
        expect(typeof f.message).toBe('string');
        expect(typeof f.line).toBe('number');
      }
    });
  }
});

describe('wave-07 add-plugins-stub — sibling preservation', () => {
  it('preserves untouched keys when inserting plugins', () => {
    const before = '{ "version": "2.0", "extra": "keep me" }';
    const after = applyFix(configAddPluginsStub, before);
    expect(JSON.parse(after)).toEqual({
      version: '2.0',
      extra: 'keep me',
      plugins: { entries: {} },
    });
  });
});

describe('wave-07 add-version-stub — sibling preservation', () => {
  it('preserves untouched keys when inserting version', () => {
    const before = '{ "plugins": { "entries": { "a": 1 } } }';
    const after = applyFix(configAddVersionStub, before);
    expect(JSON.parse(after)).toEqual({
      version: '0.0.0',
      plugins: { entries: { a: 1 } },
    });
  });
});

describe('wave-07 redact-secret-literal — multiple secrets', () => {
  it('replaces every distinct secret literal in the file', () => {
    const before = JSON.stringify({
      a: { token: 'ghp_abcdef0123456789ABCDEF0123456789abcdef' },
      b: { key: 'AKIAIOSFODNN7EXAMPLE' },
      c: { sk: 'sk-abcdef0123456789abcdef0123456789ABCDEF' },
    });
    const after = applyFix(configRedactSecretLiteral, before);
    expect(after).not.toContain('ghp_abcdef');
    expect(after).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(after).not.toContain('sk-abcdef');
    expect(after).toContain('${ENV_VAR_PLACEHOLDER}');
  });

  it('preserves env-var placeholders unchanged', () => {
    const before = '{ "k": "${GH_TOKEN}" }';
    const after = applyFix(configRedactSecretLiteral, before);
    expect(after).toBe(before);
  });

  it('handles same-secret-multiple-places consistently', () => {
    const secret = 'ghp_abcdef0123456789ABCDEF0123456789abcdef';
    const before = JSON.stringify({ a: secret, b: secret, c: { d: secret } });
    const after = applyFix(configRedactSecretLiteral, before);
    expect(after).not.toContain(secret);
    // All three slots have the placeholder.
    const placeholderCount = (after.match(/\$\{ENV_VAR_PLACEHOLDER\}/g) ?? []).length;
    expect(placeholderCount).toBe(3);
  });
});

describe('wave-07 jsonc fixers — pack invariants', () => {
  it('exports 3 fixers', () => {
    expect(jsoncStarterFixers).toHaveLength(3);
  });
  it('all share kind discriminator', () => {
    for (const f of jsoncStarterFixers) expect(f.kind).toBe('jsonc');
  });
  it('all ids unique', () => {
    const ids = jsoncStarterFixers.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('all ids share namespace', () => {
    for (const f of jsoncStarterFixers) {
      expect(f.id.startsWith('jsonc-starter-v0/')).toBe(true);
    }
  });
});
