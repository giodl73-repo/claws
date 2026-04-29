/**
 * Tests for `emitJsoncWithObject(doc, newRoot)` — the structural-mutation
 * emit API. This is the load-bearing primitive at the
 * `replaceConfigFile` chokepoint (io.ts:2082, io.ts:1381) and must
 * produce output byte-identical to `JSON.stringify(newRoot, null, 2) + "\n"`
 * for plain-JSON inputs (no comments, default 2-space indent), so that
 * existing `src/config/io.test.ts` byte-compare assertions pass UNCHANGED.
 *
 * Also covers: comment preservation under structural mutation,
 * `OcEmitSentinelError` substrate defense, type-change fallback.
 */

import { describe, it, expect } from 'vitest';
import { parseJsonc } from '../../src/ast/jsonc/parse.js';
import { emitJsoncWithObject, OcEmitSentinelError } from '../../src/ast/jsonc/emit.js';

describe('emitJsoncWithObject — pristine no-op', () => {
  it('newRoot deep-equals doc.value: returns input verbatim for plain JSON', () => {
    const cfg = {
      $schema: 'https://openclaw.ai/config.json',
      gateway: { mode: 'local', port: 18789 },
    };
    const onDisk = `${JSON.stringify(cfg, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, cfg);
    expect(out).toBe(onDisk);
  });

  it('empty object input → returns empty object output', () => {
    const onDisk = '{}\n';
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, {});
    expect(out).toBe(onDisk);
  });
});

describe('emitJsoncWithObject — leaf-value updates (byte-identity vs JSON.stringify)', () => {
  it('changing a single nested leaf produces JSON.stringify(next)-compatible output', () => {
    const prev = { gateway: { mode: 'local', port: 18789 } };
    const next = { gateway: { mode: 'local', port: 18790 } };
    const onDisk = `${JSON.stringify(prev, null, 2)}\n`;
    const expected = `${JSON.stringify(next, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, next);
    expect(out).toBe(expected);
  });

  it('changing a deeply nested leaf produces stringify-compatible output', () => {
    const prev = {
      $schema: 'https://openclaw.ai/config.json',
      gateway: { mode: 'local', port: 18789 },
      agents: { list: [{ id: 'main', default: true }, { id: 'discord-dm' }] },
      channels: { telegram: { enabled: true, dmPolicy: 'pairing' } },
    };
    const next = {
      ...prev,
      channels: { telegram: { enabled: false, dmPolicy: 'pairing' } },
    };
    const onDisk = `${JSON.stringify(prev, null, 2)}\n`;
    const expected = `${JSON.stringify(next, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, next);
    expect(out).toBe(expected);
  });
});

describe('emitJsoncWithObject — adding new keys', () => {
  it('appends new top-level key with stringify-compatible formatting', () => {
    const prev = { gateway: { mode: 'local' } };
    const next = { gateway: { mode: 'local' }, agents: { list: [] } };
    const onDisk = `${JSON.stringify(prev, null, 2)}\n`;
    const expected = `${JSON.stringify(next, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, next);
    expect(out).toBe(expected);
  });

  it('appends new nested key in existing object', () => {
    const prev = { gateway: { mode: 'local' } };
    const next = { gateway: { mode: 'local', port: 18789 } };
    const onDisk = `${JSON.stringify(prev, null, 2)}\n`;
    const expected = `${JSON.stringify(next, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, next);
    expect(out).toBe(expected);
  });
});

describe('emitJsoncWithObject — deleting keys', () => {
  it('drops removed keys, byte-identical to stringify(next)', () => {
    const prev = { gateway: { mode: 'local', port: 18789 }, deprecated: 'x' };
    const next = { gateway: { mode: 'local', port: 18789 } };
    const onDisk = `${JSON.stringify(prev, null, 2)}\n`;
    const expected = `${JSON.stringify(next, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, next);
    expect(out).toBe(expected);
  });

  it('drops nested key', () => {
    const prev = { gateway: { mode: 'local', port: 18789, legacy: true } };
    const next = { gateway: { mode: 'local', port: 18789 } };
    const onDisk = `${JSON.stringify(prev, null, 2)}\n`;
    const expected = `${JSON.stringify(next, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, next);
    expect(out).toBe(expected);
  });
});

describe('emitJsoncWithObject — type changes fall back to stringify', () => {
  it('object → string: falls back', () => {
    const prev = { gateway: { mode: 'local' } };
    const next = { gateway: 'disabled' };
    const onDisk = `${JSON.stringify(prev, null, 2)}\n`;
    const expected = `${JSON.stringify(next, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, next);
    expect(out).toBe(expected);
  });

  it('array → object: falls back', () => {
    const prev = { agents: ['a', 'b'] };
    const next = { agents: { list: ['a', 'b'] } };
    const onDisk = `${JSON.stringify(prev, null, 2)}\n`;
    const expected = `${JSON.stringify(next, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, next);
    expect(out).toBe(expected);
  });
});

describe('emitJsoncWithObject — sentinel rejection (substrate defense)', () => {
  it('throws OcEmitSentinelError when newRoot has top-level redacted leaf', () => {
    const onDisk = `${JSON.stringify({ secret: 'real' }, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    expect(() =>
      emitJsoncWithObject(doc, { secret: '__OPENCLAW_REDACTED__' }),
    ).toThrow(OcEmitSentinelError);
  });

  it('throws OcEmitSentinelError when newRoot has deeply-nested redacted leaf', () => {
    const onDisk = `${JSON.stringify({ a: { b: { c: 'real' } } }, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    try {
      emitJsoncWithObject(doc, { a: { b: { c: '__OPENCLAW_REDACTED__' } } });
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(OcEmitSentinelError);
      expect((e as OcEmitSentinelError).path).toEqual(['a', 'b', 'c']);
    }
  });

  it('throws when redacted leaf is in array element', () => {
    const onDisk = `${JSON.stringify({ items: ['a', 'b'] }, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    try {
      emitJsoncWithObject(doc, { items: ['a', '__OPENCLAW_REDACTED__'] });
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(OcEmitSentinelError);
      expect((e as OcEmitSentinelError).path).toEqual(['items', 1]);
    }
  });

  it('error message includes path information', () => {
    const onDisk = '{"a": "x"}\n';
    const doc = parseJsonc(onDisk);
    try {
      emitJsoncWithObject(doc, { a: '__OPENCLAW_REDACTED__' });
      expect.fail('expected throw');
    } catch (e) {
      expect((e as Error).message).toContain('__OPENCLAW_REDACTED__');
      expect((e as Error).message).toContain('a');
    }
  });

  it('does NOT throw on a string that merely contains the sentinel as substring', () => {
    const onDisk = `${JSON.stringify({ note: 'real' }, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    // Substring is fine — we only reject the exact sentinel literal.
    expect(() =>
      emitJsoncWithObject(doc, { note: 'see __OPENCLAW_REDACTED__ for details' }),
    ).not.toThrow();
  });
});

describe('emitJsoncWithObject — JSONC behavior (documented limitation)', () => {
  // emitJsoncWithObject re-emits objects with normalized stringify-style
  // formatting. Inter-member comments at the OBJECT level are dropped.
  // For comment-preserving emit on leaf-only mutations, callers should
  // use `emitJsoncWithMutation` instead — see the byte-identity test in
  // tests/path/byte-identity-real-config.test.ts:120 which proves
  // comments survive leaf-mutation.
  //
  // The chokepoint (io.ts:2082) should diff old-vs-new and dispatch:
  //   • only leaf changes  → emitJsoncWithMutation (comments preserved)
  //   • structural changes → emitJsoncWithObject (this API)
  // This split is enforced at the integration layer, not inside the
  // emit primitives.

  it('comments are dropped under structural emit (leaf change variant)', () => {
    const jsonc = `{
  // bumped from beta to stable
  "gateway": {
    "mode": "local",
    "port": 18789
  }
}
`;
    const doc = parseJsonc(jsonc);
    const next = { gateway: { mode: 'local', port: 18790 } };
    const out = emitJsoncWithObject(doc, next);
    // Leaf is updated.
    expect(out).toContain('18790');
    expect(out).not.toContain('18789');
    // Comments on object members are dropped — this is the documented
    // limitation of structural emit. Use emitJsoncWithMutation when
    // comment fidelity matters.
    expect(out).not.toContain('// bumped from beta to stable');
  });

  it('comments are dropped under structural emit (added-key variant)', () => {
    const jsonc = `{
  // primary gateway
  "gateway": {
    "mode": "local"
  }
}
`;
    const doc = parseJsonc(jsonc);
    const next = { gateway: { mode: 'local' }, agents: { list: [] } };
    const out = emitJsoncWithObject(doc, next);
    expect(out).toContain('"agents"');
    expect(out).not.toContain('// primary gateway');
  });

  it('comments are dropped under structural emit (dropped-key variant)', () => {
    const jsonc = `{
  // gateway settings
  "gateway": { "mode": "local" },
  // legacy flag — to be removed
  "legacy": true
}
`;
    const doc = parseJsonc(jsonc);
    const next = { gateway: { mode: 'local' } };
    const out = emitJsoncWithObject(doc, next);
    expect(out).not.toContain('legacy');
    expect(out).not.toContain('// gateway settings');
    expect(out).not.toContain('// legacy flag');
  });
});

describe('emitJsoncWithObject — empty/edge inputs', () => {
  it('empty document with newRoot writes fresh stringify', () => {
    const doc = parseJsonc('');
    const out = emitJsoncWithObject(doc, { gateway: { mode: 'local' } });
    // Empty doc has no root; writes fresh stringify with trailing newline.
    expect(out).toBe(`${JSON.stringify({ gateway: { mode: 'local' } }, null, 2)}\n`);
  });

  it('input without trailing newline produces output without trailing newline', () => {
    const onDisk = JSON.stringify({ a: 1 }, null, 2); // no trailing \n
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithObject(doc, { a: 2 });
    expect(out.endsWith('\n')).toBe(false);
    expect(out).toBe(JSON.stringify({ a: 2 }, null, 2));
  });
});
