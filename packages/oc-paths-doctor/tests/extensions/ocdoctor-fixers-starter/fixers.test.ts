import { parseMd } from '@bic/oc-paths-substrate';
import { describe, expect, it } from 'vitest';
import {
  STARTER_FIXERS_V0,
  STARTER_FIXERS_V0_OPTIONAL,
  agentsAddBoundariesStub,
  agentsSeedToolsTodo,
  identityAddTrustLevelStub,
  memoryAddScopeDefault,
  memorySnapScope,
  skillAddRequiredFrontmatterStub,
  skillSnapTier,
  toolsAddGuidanceTableStub,
  userAddPreferencesStub,
} from '../../../src/extensions/ocdoctor-fixers-starter/index.js';
import type { OcPathFixerSpec } from '../../../src/plugin-sdk/oc-doctor/types.js';

function detect(spec: OcPathFixerSpec<unknown>, raw: string, fileName = spec.appliesTo) {
  return spec.detect({ fileName, ast: parseMd(raw).ast, raw });
}

function fix(spec: OcPathFixerSpec<unknown>, raw: string, fileName = spec.appliesTo): string {
  const ast = parseMd(raw).ast;
  const matches = spec.detect({ fileName, ast, raw });
  if (matches.length === 0) return raw;
  return spec.fix({ fileName, ast, raw, match: matches[0]!.match });
}

describe('agentsAddBoundariesStub', () => {
  it('detects missing boundaries section', () => {
    expect(detect(agentsAddBoundariesStub, '## Tools\n- gh\n').length).toBe(1);
  });
  it('does not detect when boundaries section exists', () => {
    expect(
      detect(agentsAddBoundariesStub, '## Tools\n## Boundaries\n- never rm -rf\n').length,
    ).toBe(0);
  });
  it('appends a Boundaries stub', () => {
    const after = fix(agentsAddBoundariesStub, '## Tools\n- gh\n');
    expect(after).toContain('## Boundaries');
    expect(after).toContain('## Tools');
  });
  it('is idempotent', () => {
    const once = fix(agentsAddBoundariesStub, '## Tools\n- gh\n');
    const twice = fix(agentsAddBoundariesStub, once);
    expect(twice).toBe(once);
  });
  it('skips non-md ast (defensive)', () => {
    expect(agentsAddBoundariesStub.appliesTo).toBe('AGENTS.md');
  });
});

describe('toolsAddGuidanceTableStub', () => {
  it('detects missing guidance section', () => {
    expect(detect(toolsAddGuidanceTableStub, '## Header\n').length).toBe(1);
  });
  it('appends a Tool Guidance section with a table', () => {
    const after = fix(toolsAddGuidanceTableStub, '## Header\n');
    expect(after).toContain('## Tool Guidance');
    expect(after).toMatch(/\|\s*tool\s*\|\s*guidance\s*\|/);
  });
  it('is idempotent', () => {
    const once = fix(toolsAddGuidanceTableStub, '## Header\n');
    const twice = fix(toolsAddGuidanceTableStub, once);
    expect(twice).toBe(once);
  });
});

describe('memoryAddScopeDefault', () => {
  it('detects missing scope frontmatter', () => {
    expect(detect(memoryAddScopeDefault, '## Entry\nbody\n').length).toBe(1);
  });
  it('does not detect when scope present', () => {
    expect(
      detect(memoryAddScopeDefault, '---\nscope: default\n---\n## Entry\n').length,
    ).toBe(0);
  });
  it('inserts scope: default into frontmatter', () => {
    const after = fix(memoryAddScopeDefault, '## Entry\nbody\n');
    expect(after).toContain('scope:');
  });
  it('is idempotent', () => {
    const once = fix(memoryAddScopeDefault, '## Entry\nbody\n');
    const twice = fix(memoryAddScopeDefault, once);
    expect(twice).toBe(once);
  });
});

describe('skillAddRequiredFrontmatterStub', () => {
  it('detects missing required frontmatter', () => {
    expect(detect(skillAddRequiredFrontmatterStub, '## Body\n').length).toBeGreaterThan(0);
  });
  it('appends required frontmatter on the empty case', () => {
    const after = fix(skillAddRequiredFrontmatterStub, '## Body\n');
    // The stub touches frontmatter — we don't lock the exact string,
    // just that it differs and is idempotent.
    expect(after).not.toBe('## Body\n');
  });
  it('is idempotent', () => {
    const once = fix(skillAddRequiredFrontmatterStub, '## Body\n');
    const twice = fix(skillAddRequiredFrontmatterStub, once);
    expect(twice).toBe(once);
  });
});

describe('identityAddTrustLevelStub', () => {
  it('detects missing trust-level section', () => {
    expect(detect(identityAddTrustLevelStub, '## Section\n').length).toBe(1);
  });
  it('appends a Trust Level section', () => {
    const after = fix(identityAddTrustLevelStub, '## Section\n');
    expect(after.toLowerCase()).toContain('trust');
  });
  it('is idempotent', () => {
    const once = fix(identityAddTrustLevelStub, '## Section\n');
    const twice = fix(identityAddTrustLevelStub, once);
    expect(twice).toBe(once);
  });
});

describe('userAddPreferencesStub', () => {
  it('detects missing preferences section', () => {
    expect(detect(userAddPreferencesStub, '## Role\n').length).toBe(1);
  });
  it('appends a Preferences section', () => {
    const after = fix(userAddPreferencesStub, '## Role\n');
    expect(after).toContain('## Preferences');
  });
  it('is idempotent', () => {
    const once = fix(userAddPreferencesStub, '## Role\n');
    const twice = fix(userAddPreferencesStub, once);
    expect(twice).toBe(once);
  });
});

describe('agentsSeedToolsTodo (optional)', () => {
  it('declares default placeholder option', () => {
    expect(agentsSeedToolsTodo.defaultOptions?.placeholder).toBeTruthy();
  });
});

describe('memorySnapScope (optional)', () => {
  it('declares default targetScope option', () => {
    expect(memorySnapScope.defaultOptions?.targetScope).toBe('default');
  });
});

describe('skillSnapTier (optional)', () => {
  it('declares default targetTier option', () => {
    expect(skillSnapTier.defaultOptions?.targetTier).toBe(1);
  });
});

describe('starter-v0 pack invariants', () => {
  it('exports 6 default fixers', () => {
    expect(STARTER_FIXERS_V0).toHaveLength(6);
  });
  it('exports 3 optional fixers', () => {
    expect(STARTER_FIXERS_V0_OPTIONAL).toHaveLength(3);
  });
  it('all default fixer ids share starter-v0 namespace', () => {
    for (const f of STARTER_FIXERS_V0) {
      expect(f.id.startsWith('starter-v0/')).toBe(true);
    }
  });
  it('every fixer has a non-empty description', () => {
    for (const f of [...STARTER_FIXERS_V0, ...STARTER_FIXERS_V0_OPTIONAL]) {
      expect(typeof f.description).toBe('string');
      expect(f.description.length).toBeGreaterThan(0);
    }
  });
  it('all default fixer ids are unique', () => {
    const ids = STARTER_FIXERS_V0.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('starter-v0 — adversarial inputs do not throw', () => {
  const inputs = [
    '',
    '\n',
    '   \n',
    '## Heading only\n',
    '---\n---\n',
    '---\nbroken: [unclosed\n---\n## H\n',
    'just preamble',
  ];
  for (const fixer of [...STARTER_FIXERS_V0, ...STARTER_FIXERS_V0_OPTIONAL]) {
    for (const raw of inputs) {
      it(`${fixer.id} no-throw on ${JSON.stringify(raw.slice(0, 30))}`, () => {
        expect(() => fix(fixer, raw)).not.toThrow();
      });
    }
  }
});
