import { parseJsonc } from '@bic/oc-paths-substrate';
import { describe, expect, it } from 'vitest';
import {
  configAddPluginsStub,
  configAddVersionStub,
  configRedactSecretLiteral,
  jsoncStarterFixers,
} from '../../../src/extensions/ocdoctor-fixers-jsonc-starter/index.js';

function detect(spec: typeof configAddPluginsStub, raw: string, fileName = 'gateway.jsonc') {
  return spec.detect({ fileName, ast: parseJsonc(raw).ast, raw });
}
function fix(spec: typeof configAddPluginsStub, raw: string, fileName = 'gateway.jsonc') {
  return spec.fix({
    fileName,
    ast: parseJsonc(raw).ast,
    raw,
    match: { ocPath: `oc://${fileName}` },
  });
}

describe('configAddPluginsStub', () => {
  it('detects missing plugins', () => {
    expect(detect(configAddPluginsStub, '{ "version": "1.0" }').length).toBe(1);
  });
  it('does not detect when plugins is present', () => {
    expect(
      detect(configAddPluginsStub, '{ "plugins": { "entries": {} } }').length,
    ).toBe(0);
  });
  it('inserts plugins stub into a file with other keys', () => {
    const before = '{ "version": "1.0" }';
    const after = fix(configAddPluginsStub, before);
    expect(after).toContain('"plugins"');
    expect(after).toContain('"entries"');
    expect(JSON.parse(after)).toEqual({
      version: '1.0',
      plugins: { entries: {} },
    });
  });
  it('inserts plugins stub into an empty object', () => {
    const after = fix(configAddPluginsStub, '{}');
    expect(JSON.parse(after)).toEqual({ plugins: { entries: {} } });
  });
  it('is idempotent — second fix is a no-op', () => {
    const once = fix(configAddPluginsStub, '{ "version": "1.0" }');
    const twice = fix(configAddPluginsStub, once);
    expect(twice).toBe(once);
  });
  it('no-ops on non-object root', () => {
    expect(fix(configAddPluginsStub, '[]')).toBe('[]');
  });
});

describe('configAddVersionStub', () => {
  it('detects missing version', () => {
    expect(detect(configAddVersionStub, '{ "plugins": {} }').length).toBe(1);
  });
  it('does not detect when version is present', () => {
    expect(
      detect(configAddVersionStub, '{ "version": "1.0", "plugins": {} }').length,
    ).toBe(0);
  });
  it('inserts version stub at the head of the object', () => {
    const after = fix(configAddVersionStub, '{ "plugins": {} }');
    expect(JSON.parse(after)).toEqual({ version: '0.0.0', plugins: {} });
  });
  it('inserts version into empty object', () => {
    const after = fix(configAddVersionStub, '{}');
    expect(JSON.parse(after)).toEqual({ version: '0.0.0' });
  });
  it('is idempotent', () => {
    const once = fix(configAddVersionStub, '{ "plugins": {} }');
    const twice = fix(configAddVersionStub, once);
    expect(twice).toBe(once);
  });
});

describe('configRedactSecretLiteral', () => {
  it('detects GitHub PAT', () => {
    const findings = detect(
      configRedactSecretLiteral,
      '{ "github": { "token": "ghp_abcdef0123456789ABCDEF0123456789abcdef" } }',
    );
    expect(findings.length).toBeGreaterThan(0);
  });
  it('replaces literal with placeholder', () => {
    const before =
      '{ "github": { "token": "ghp_abcdef0123456789ABCDEF0123456789abcdef" } }';
    const after = fix(configRedactSecretLiteral, before);
    expect(after).not.toContain('ghp_abcdef');
    expect(after).toContain('${ENV_VAR_PLACEHOLDER}');
  });
  it('handles multiple secrets in one file', () => {
    const before =
      '{ "a": "ghp_abcdef0123456789ABCDEF0123456789abcdef", "b": "AKIAIOSFODNN7EXAMPLE" }';
    const after = fix(configRedactSecretLiteral, before);
    expect(after).not.toContain('ghp_abcdef');
    expect(after).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });
  it('is idempotent — re-running on redacted file is a no-op', () => {
    const once = fix(
      configRedactSecretLiteral,
      '{ "k": "ghp_abcdef0123456789ABCDEF0123456789abcdef" }',
    );
    const twice = fix(configRedactSecretLiteral, once);
    expect(twice).toBe(once);
  });
  it('passes on `${ENV_VAR}` placeholders (not detected as secrets)', () => {
    expect(
      detect(configRedactSecretLiteral, '{ "k": "${GH_TOKEN}" }').length,
    ).toBe(0);
  });
});

describe('jsoncStarterFixers — pack registration', () => {
  it('exports 3 fixers', () => {
    expect(jsoncStarterFixers).toHaveLength(3);
  });
  it('all share the jsonc kind discriminator', () => {
    for (const f of jsoncStarterFixers) {
      expect(f.kind).toBe('jsonc');
    }
  });
  it('all ids share the starter-v0 namespace', () => {
    for (const f of jsoncStarterFixers) {
      expect(f.id).toMatch(/^jsonc-starter-v0\//);
    }
  });
});
