/**
 * Per-rule coverage — positive (rule fires) + negative (rule silent) for
 * every code in the catalog. 26 cases across 13 rules.
 *
 * @see plan claws-workspace-lint H4 — per-rule unit fixture target
 */

import { describe, it, expect } from 'vitest';
import { parseJsonc } from '../../src/ast/jsonc/parse.js';
import { lint } from '../../src/lint/index.js';
import { makeTestSchema } from './helpers.js';

function findingsFor(source: string, ...args: Parameters<typeof lint>[1] extends infer O ? [O?] : never): ReturnType<typeof lint> {
  const doc = parseJsonc(source);
  return lint(doc, ...args);
}

// -- AST-only rules ---------------------------------------------------------

describe('OC_CFG_DUPLICATE_KEY', () => {
  it('fires on duplicate object key', () => {
    const f = findingsFor('{ "a": 1, "a": 2 }');
    expect(f.find((x) => x.code === 'OC_CFG_DUPLICATE_KEY')).toBeDefined();
  });
  it('silent on distinct keys', () => {
    const f = findingsFor('{ "a": 1, "b": 2 }');
    expect(f.find((x) => x.code === 'OC_CFG_DUPLICATE_KEY')).toBeUndefined();
  });
});

describe('OC_CFG_TRAILING_WHITESPACE', () => {
  it('fires on trailing space', () => {
    const f = findingsFor('{\n  "a": 1   \n}');
    expect(f.find((x) => x.code === 'OC_CFG_TRAILING_WHITESPACE')).toBeDefined();
  });
  it('silent on clean lines', () => {
    const f = findingsFor('{\n  "a": 1\n}');
    expect(f.find((x) => x.code === 'OC_CFG_TRAILING_WHITESPACE')).toBeUndefined();
  });
});

describe('OC_CFG_MIXED_INDENT', () => {
  it('fires when tabs and spaces are mixed across indent', () => {
    const f = findingsFor('{\n\t"a": 1,\n  "b": 2\n}');
    expect(f.find((x) => x.code === 'OC_CFG_MIXED_INDENT')).toBeDefined();
  });
  it('silent on consistent space indent', () => {
    const f = findingsFor('{\n  "a": 1,\n  "b": 2\n}');
    expect(f.find((x) => x.code === 'OC_CFG_MIXED_INDENT')).toBeUndefined();
  });
});

describe('OC_CFG_TRAILING_COMMA_INCONSISTENT', () => {
  it('fires when some containers have trailing comma, others not', () => {
    const f = findingsFor('{ "a": [1, 2,], "b": [3, 4] }');
    expect(f.find((x) => x.code === 'OC_CFG_TRAILING_COMMA_INCONSISTENT')).toBeDefined();
  });
  it('silent when all containers consistent', () => {
    const f = findingsFor('{ "a": [1, 2], "b": [3, 4] }');
    expect(f.find((x) => x.code === 'OC_CFG_TRAILING_COMMA_INCONSISTENT')).toBeUndefined();
  });
});

describe('OC_CFG_REDACTED_PLACEHOLDER', () => {
  it('fires on __OPENCLAW_REDACTED__ literal', () => {
    const f = findingsFor('{ "secret": "__OPENCLAW_REDACTED__" }');
    const finding = f.find((x) => x.code === 'OC_CFG_REDACTED_PLACEHOLDER');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });
  it('silent on benign strings', () => {
    const f = findingsFor('{ "secret": "actual-secret-value" }');
    expect(f.find((x) => x.code === 'OC_CFG_REDACTED_PLACEHOLDER')).toBeUndefined();
  });
});

// -- Schema-aware rules -----------------------------------------------------

describe('OC_CFG_DEAD_COMMENT', () => {
  it('fires when comment precedes an unknown root member', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver'] : []),
    });
    const f = findingsFor('{\n  // dead comment\n  "removedField": 1\n}', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_DEAD_COMMENT')).toBeDefined();
  });
  it('silent when comment precedes a known member', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver'] : []),
    });
    const f = findingsFor('{\n  // alive comment\n  "homeserver": "x"\n}', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_DEAD_COMMENT')).toBeUndefined();
  });
});

describe('OC_CFG_UNKNOWN_FIELD', () => {
  it('fires with did-you-mean for typos', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver', 'accessToken'] : []),
    });
    const f = findingsFor('{ "homserver": "x" }', { schema });
    const finding = f.find((x) => x.code === 'OC_CFG_UNKNOWN_FIELD');
    expect(finding).toBeDefined();
    expect(finding!.suggestion).toBe('homeserver');
  });
  it('silent on known keys', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver'] : []),
    });
    const f = findingsFor('{ "homeserver": "x" }', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_UNKNOWN_FIELD')).toBeUndefined();
  });
  it('emits suggestion at edit-distance 3 (boundary of did-you-mean cap)', () => {
    // "homeser" → "homeserver" is 3 deletions (edit-distance 3); should accept.
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver'] : []),
    });
    const f = findingsFor('{ "homeser": "x" }', { schema });
    const finding = f.find((x) => x.code === 'OC_CFG_UNKNOWN_FIELD');
    expect(finding).toBeDefined();
    expect(finding!.suggestion).toBe('homeserver');
  });
  it('omits suggestion at edit-distance 4 (over the cap; falls through to "gateway will reject")', () => {
    // "homese" → "homeserver" is 4 deletions; over the cap of 3.
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver'] : []),
    });
    const f = findingsFor('{ "homese": "x" }', { schema });
    const finding = f.find((x) => x.code === 'OC_CFG_UNKNOWN_FIELD');
    expect(finding).toBeDefined();
    expect(finding!.suggestion).toBeUndefined();
    expect(finding!.message).toContain('gateway will reject');
  });
});

describe('OC_CFG_DEPRECATED_FIELD', () => {
  it('fires on deprecated key with replacement suggestion', () => {
    const schema = makeTestSchema({
      knownChildKeys: () => [],
      deprecatedKeys: (path) =>
        path.length === 0 ? new Map([['oldField', 'newField']]) : new Map(),
    });
    const f = findingsFor('{ "oldField": 1 }', { schema });
    const finding = f.find((x) => x.code === 'OC_CFG_DEPRECATED_FIELD');
    expect(finding).toBeDefined();
    expect(finding!.suggestion).toBe('newField');
  });
  it('silent when no deprecated keys present', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['newField'] : []),
      deprecatedKeys: (path) =>
        path.length === 0 ? new Map([['oldField', 'newField']]) : new Map(),
    });
    const f = findingsFor('{ "newField": 1 }', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_DEPRECATED_FIELD')).toBeUndefined();
  });
});

describe('OC_CFG_LEGACY_FIELD', () => {
  it('fires on legacy key with auto-migration suggestion', () => {
    const schema = makeTestSchema({
      knownChildKeys: () => [],
      legacyKeys: (path) =>
        path.length === 0 ? new Map([['legacyKey', 'modernKey']]) : new Map(),
    });
    const f = findingsFor('{ "legacyKey": 1 }', { schema });
    const finding = f.find((x) => x.code === 'OC_CFG_LEGACY_FIELD');
    expect(finding).toBeDefined();
    expect(finding!.message).toContain('auto-migrates');
  });
  it('silent without legacy keys present', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['modernKey'] : []),
      legacyKeys: (path) =>
        path.length === 0 ? new Map([['legacyKey', 'modernKey']]) : new Map(),
    });
    const f = findingsFor('{ "modernKey": 1 }', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_LEGACY_FIELD')).toBeUndefined();
  });
});

describe('OC_CFG_TYPE_MISMATCH', () => {
  it('fires when value kind differs from schema kind', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['port'] : []),
      kindOf: (path) => (path.length === 1 && path[0] === 'port' ? 'number' : 'unknown'),
    });
    const f = findingsFor('{ "port": "8080" }', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_TYPE_MISMATCH')).toBeDefined();
  });
  it('silent on matching kind', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['port'] : []),
      kindOf: (path) => (path.length === 1 && path[0] === 'port' ? 'number' : 'unknown'),
    });
    const f = findingsFor('{ "port": 8080 }', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_TYPE_MISMATCH')).toBeUndefined();
  });
});

describe('OC_CFG_MISSING_REQUIRED_FIELD', () => {
  it('fires when a required key is absent', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver', 'accessToken'] : []),
      requiredChildKeys: (path) => (path.length === 0 ? ['accessToken'] : []),
    });
    const f = findingsFor('{ "homeserver": "x" }', { schema });
    const finding = f.find((x) => x.code === 'OC_CFG_MISSING_REQUIRED_FIELD');
    expect(finding).toBeDefined();
    expect(finding!.path).toEqual(['accessToken']);
  });
  it('silent when all required keys present', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver', 'accessToken'] : []),
      requiredChildKeys: (path) => (path.length === 0 ? ['accessToken'] : []),
    });
    const f = findingsFor('{ "homeserver": "x", "accessToken": "y" }', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_MISSING_REQUIRED_FIELD')).toBeUndefined();
  });
  it('fires when a required key is present but null (null-as-absence semantics)', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver', 'accessToken'] : []),
      requiredChildKeys: (path) => (path.length === 0 ? ['accessToken'] : []),
    });
    const f = findingsFor('{ "homeserver": "x", "accessToken": null }', { schema });
    const finding = f.find((x) => x.code === 'OC_CFG_MISSING_REQUIRED_FIELD');
    expect(finding).toBeDefined();
    expect(finding!.path).toEqual(['accessToken']);
    expect(finding!.message).toContain('null');
  });
  it('silent when an optional (not required) key is present but null', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['homeserver', 'accessToken'] : []),
      requiredChildKeys: () => [],
    });
    const f = findingsFor('{ "homeserver": "x", "accessToken": null }', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_MISSING_REQUIRED_FIELD')).toBeUndefined();
  });
});

describe('OC_CFG_PLUGIN_ID_COLLISION', () => {
  it('fires when same id appears at two distinct sources', () => {
    const schema = makeTestSchema({
      knownChildKeys: () => [],
      pluginIdSources: () => [
        { path: ['channels', 'matrix'], id: 'matrix' },
        { path: ['plugins', 'entries', 'matrix'], id: 'matrix' },
      ],
    });
    const f = findingsFor(
      '{ "channels": { "matrix": {} }, "plugins": { "entries": { "matrix": {} } } }',
      { schema },
    );
    expect(f.find((x) => x.code === 'OC_CFG_PLUGIN_ID_COLLISION')).toBeDefined();
  });
  it('silent when ids unique', () => {
    const schema = makeTestSchema({
      knownChildKeys: () => [],
      pluginIdSources: () => [
        { path: ['channels', 'matrix'], id: 'matrix' },
        { path: ['plugins', 'entries', 'webhook'], id: 'webhook' },
      ],
    });
    const f = findingsFor(
      '{ "channels": { "matrix": {} }, "plugins": { "entries": { "webhook": {} } } }',
      { schema },
    );
    expect(f.find((x) => x.code === 'OC_CFG_PLUGIN_ID_COLLISION')).toBeUndefined();
  });
});

describe('OC_CFG_SECRET_REF_AMBIGUOUS', () => {
  it('fires on partial env reference at a string-typed path', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['accessToken'] : []),
      kindOf: (path) =>
        path.length === 1 && path[0] === 'accessToken' ? 'string' : 'unknown',
    });
    const f = findingsFor('{ "accessToken": "$ENV_VAR_NO_BRACES" }', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_SECRET_REF_AMBIGUOUS')).toBeDefined();
  });
  it('silent on clean ${VAR} reference', () => {
    const schema = makeTestSchema({
      knownChildKeys: (path) => (path.length === 0 ? ['accessToken'] : []),
      kindOf: (path) =>
        path.length === 1 && path[0] === 'accessToken' ? 'string' : 'unknown',
    });
    const f = findingsFor('{ "accessToken": "${ENV_VAR}" }', { schema });
    expect(f.find((x) => x.code === 'OC_CFG_SECRET_REF_AMBIGUOUS')).toBeUndefined();
  });
});
