/**
 * Smoke test — prove the lint engine end-to-end on a redacted-placeholder
 * fixture (the data-corruption class that motivates the package).
 */

import { describe, it, expect } from 'vitest';
import { parseJsonc } from '../../src/ast/jsonc/parse.js';
import { lint } from '../../src/lint/index.js';

describe('lint smoke', () => {
  it('catches OC_CFG_REDACTED_PLACEHOLDER in a typical openclaw config', () => {
    const source = `{
  // bumped from beta to stable
  "channels": {
    "matrix": {
      "accessToken": "__OPENCLAW_REDACTED__",
      "homeserver": "https://matrix.example.com"
    }
  }
}
`;
    const doc = parseJsonc(source);
    const findings = lint(doc);
    const redactionFinding = findings.find((f) => f.code === 'OC_CFG_REDACTED_PLACEHOLDER');
    expect(redactionFinding).toBeDefined();
    expect(redactionFinding!.severity).toBe('error');
    expect(redactionFinding!.path).toEqual(['channels', 'matrix', 'accessToken']);
    expect(redactionFinding!.ocUri).toBe('oc://config/channels/matrix/accessToken');
    // Message has the URI woven in via engine post-processing.
    expect(redactionFinding!.message).toContain('oc://config/channels/matrix/accessToken');
  });

  it('catches OC_CFG_DUPLICATE_KEY', () => {
    const source = `{
  "homeserver": "a",
  "homeserver": "b"
}
`;
    const doc = parseJsonc(source);
    const findings = lint(doc);
    const dupFinding = findings.find((f) => f.code === 'OC_CFG_DUPLICATE_KEY');
    expect(dupFinding).toBeDefined();
    expect(dupFinding!.path).toEqual(['homeserver']);
    expect(dupFinding!.ocUri).toBe('oc://config/homeserver');
  });

  it('catches OC_CFG_TRAILING_COMMA_INCONSISTENT only when truly inconsistent', () => {
    const sourceWithMix = `{
  "a": [1, 2,],
  "b": [3, 4]
}
`;
    const docMix = parseJsonc(sourceWithMix);
    const mixedFindings = lint(docMix).filter((f) => f.code === 'OC_CFG_TRAILING_COMMA_INCONSISTENT');
    expect(mixedFindings.length).toBeGreaterThan(0);

    const sourceConsistent = `{
  "a": [1, 2],
  "b": [3, 4]
}
`;
    const docConsistent = parseJsonc(sourceConsistent);
    const consistentFindings = lint(docConsistent).filter((f) => f.code === 'OC_CFG_TRAILING_COMMA_INCONSISTENT');
    expect(consistentFindings.length).toBe(0);
  });

  it('schema-aware rules are silent without a schema', () => {
    const source = `{ "unknownKey": 1 }`;
    const doc = parseJsonc(source);
    const findings = lint(doc); // no schema
    const schemaFindings = findings.filter(
      (f) => f.code === 'OC_CFG_UNKNOWN_FIELD' || f.code === 'OC_CFG_TYPE_MISMATCH',
    );
    expect(schemaFindings).toEqual([]);
  });

  it('OC_CFG_UNKNOWN_FIELD fires with did-you-mean when schema injected', () => {
    const source = `{ "homserver": "x" }`;
    const doc = parseJsonc(source);
    const findings = lint(doc, {
      schema: {
        kindOf: () => 'unknown',
        knownChildKeys: (path) => (path.length === 0 ? ['homeserver', 'accessToken'] : []),
        requiredChildKeys: () => [],
        deprecatedKeys: () => new Map(),
        legacyKeys: () => new Map(),
        pluginIdSources: () => [],
      },
    });
    const unknownFinding = findings.find((f) => f.code === 'OC_CFG_UNKNOWN_FIELD');
    expect(unknownFinding).toBeDefined();
    expect(unknownFinding!.suggestion).toBe('homeserver');
    expect(unknownFinding!.message).toContain('did you mean "homeserver"');
  });
});
