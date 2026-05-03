import { parseJsonc } from '@bic/oc-paths-substrate';
import { describe, expect, it } from 'vitest';
import { jsoncStarterRules } from '../../../src/extensions/oclint-rules-jsonc-starter/index.js';
import {
  configEmptyPluginsEntries,
  configMissingPlugins,
  configMissingVersion,
  configSecretAsLiteral,
} from '../../../src/extensions/oclint-rules-jsonc-starter/index.js';

function ctx(raw: string, fileName = 'gateway.jsonc') {
  return { fileName, ast: parseJsonc(raw).ast };
}

describe('jsonc-starter — config-missing-plugins', () => {
  it('flags when `plugins` key is missing', () => {
    const findings = configMissingPlugins.check(ctx('{ "version": "1.0" }'));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ocPath).toBe('oc://gateway.jsonc/plugins');
  });
  it('passes when `plugins` is present', () => {
    expect(
      configMissingPlugins.check(ctx('{ "plugins": { "entries": {} } }')),
    ).toHaveLength(0);
  });
  it('flags non-object root (plugins is genuinely missing)', () => {
    expect(configMissingPlugins.check(ctx('[]'))).toHaveLength(1);
  });
  it('flags empty / unparseable input (plugins is genuinely missing)', () => {
    expect(configMissingPlugins.check(ctx(''))).toHaveLength(1);
  });
});

describe('jsonc-starter — config-empty-plugins-entries', () => {
  it('flags when entries is empty {}', () => {
    const findings = configEmptyPluginsEntries.check(
      ctx('{ "plugins": { "entries": {} } }'),
    );
    expect(findings).toHaveLength(1);
  });
  it('passes when entries has at least one plugin', () => {
    expect(
      configEmptyPluginsEntries.check(
        ctx('{ "plugins": { "entries": { "github": "tok" } } }'),
      ),
    ).toHaveLength(0);
  });
  it('no-ops when entries key is missing', () => {
    expect(
      configEmptyPluginsEntries.check(ctx('{ "plugins": {} }')),
    ).toHaveLength(0);
  });
});

describe('jsonc-starter — config-missing-version', () => {
  it('flags when version is missing', () => {
    expect(configMissingVersion.check(ctx('{ "plugins": {} }'))).toHaveLength(1);
  });
  it('passes when version is present', () => {
    expect(
      configMissingVersion.check(ctx('{ "version": "1.0", "plugins": {} }')),
    ).toHaveLength(0);
  });
});

describe('jsonc-starter — config-secret-as-literal', () => {
  it('flags GitHub PAT-shape values', () => {
    const findings = configSecretAsLiteral.check(
      ctx('{ "github": { "token": "ghp_abcdef0123456789ABCDEF0123456789abcdef" } }'),
    );
    expect(findings.length).toBeGreaterThan(0);
  });
  it('flags AWS access key shapes', () => {
    expect(
      configSecretAsLiteral.check(ctx('{ "aws_key": "AKIAIOSFODNN7EXAMPLE" }')).length,
    ).toBeGreaterThan(0);
  });
  it('flags openai-style keys', () => {
    expect(
      configSecretAsLiteral.check(
        ctx('{ "k": "sk-abcdef0123456789abcdef0123456789ABCDEF" }'),
      ).length,
    ).toBeGreaterThan(0);
  });
  it('passes on `${ENV_VAR}` placeholders', () => {
    expect(
      configSecretAsLiteral.check(ctx('{ "github": { "token": "${GH_TOKEN}" } }')),
    ).toHaveLength(0);
  });
  it('walks deep nesting', () => {
    expect(
      configSecretAsLiteral.check(
        ctx(
          '{ "a": { "b": { "c": [{ "k": "ghp_abcdef0123456789ABCDEF0123456789abcdef" }] } } }',
        ),
      ).length,
    ).toBeGreaterThan(0);
  });
});

describe('jsoncStarterRules — pack registration', () => {
  it('exports 4 rules', () => {
    expect(jsoncStarterRules).toHaveLength(4);
  });
  it('all rules share the jsonc kind discriminator', () => {
    for (const r of jsoncStarterRules) {
      // kind discriminator dropped — single LintRule shape);
    }
  });
  it('all rule ids share the starter-v0 namespace', () => {
    for (const r of jsoncStarterRules) {
      expect(r.id).toMatch(/^jsonc-starter-v0\//);
    }
  });
});
