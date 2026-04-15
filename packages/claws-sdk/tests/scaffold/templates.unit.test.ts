/**
 * L0 unit tests for scaffold templates.
 *
 * P29: Basic template output tests
 * P32: Extended tier differentiation — DECLARED 3-line, TYPED plain TS, VERIFIED plain assertions
 */

import { describe, it, expect } from 'vitest';

import {
  declaredTemplate,
  typedTemplate,
  verifiedTemplate,
  generateTemplate,
  skillClassName,
} from '@bic/claws-sdk/scaffold';
import type { TemplateContext } from '@bic/claws-sdk/scaffold';

const BASE_CTX: TemplateContext = {
  name: 'my-skill',
  maxRisk: 3,
  skillRisk: 1,
};

describe('declaredTemplate', () => {
  it('produces a single skill.yaml with 3-line content (name, risk, description)', () => {
    const files = declaredTemplate(BASE_CTX);

    expect(files).toHaveLength(1);
    expect(files[0]!.relativePath).toBe('skill.yaml');

    const content = files[0]!.content;
    // Exactly 3 non-empty lines
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    expect(lines).toHaveLength(3);
    expect(content).toContain('name: my-skill');
    expect(content).toContain('risk: 1');
    expect(content).toContain('description: my-skill skill');
  });
});

describe('typedTemplate', () => {
  it('produces skill.yaml and handler.ts with plain TypeScript (no @bic/claws-skill-kit)', () => {
    const ctx: TemplateContext = { ...BASE_CTX, skillRisk: 2 };
    const files = typedTemplate(ctx);

    expect(files).toHaveLength(2);
    expect(files.map(f => f.relativePath)).toEqual(['skill.yaml', 'handler.ts']);

    const manifest = files[0]!.content;
    expect(manifest).toContain('name: my-skill');
    expect(manifest).toContain('tier: typed');
    expect(manifest).toContain('risk: 2');
    expect(manifest).toContain('inputs:');
    expect(manifest).toContain('outputs:');

    const handler = files[1]!.content;
    expect(handler).toContain('@skill my-skill');
    expect(handler).toContain('@tier typed');
    // Plain TS — no @bic/claws-skill-kit dependency
    expect(handler).not.toContain("from '@bic/claws-skill-kit'");
    expect(handler).toContain('export async function handler(');
    expect(handler).toContain('claws upgrade');
  });
});

describe('verifiedTemplate', () => {
  it('produces skill.yaml, handler.ts, handler.test.ts, and SUPPLY.md', () => {
    const ctx: TemplateContext = { ...BASE_CTX, skillRisk: 3 };
    const files = verifiedTemplate(ctx);

    expect(files).toHaveLength(4);
    expect(files.map(f => f.relativePath)).toEqual([
      'skill.yaml',
      'handler.ts',
      'handler.test.ts',
      'SUPPLY.md',
    ]);

    const manifest = files[0]!.content;
    expect(manifest).toContain('tier: verified');
    expect(manifest).toContain('supply:');
    expect(manifest).toContain('attestation: required');
    expect(manifest).toContain('sbom: true');

    const handler = files[1]!.content;
    // Plain TS — no @bic/claws-skill-kit dependency
    expect(handler).not.toContain("from '@bic/claws-skill-kit'");
    expect(handler).toContain('export async function handler(');
    expect(handler).toContain('claws upgrade');

    const test = files[2]!.content;
    // Plain assertions — no GovernanceValidator / SecurityScanner
    expect(test).not.toContain('GovernanceValidator');
    expect(test).not.toContain('SecurityScanner');
    expect(test).toContain("import { handler } from './handler.js'");
    expect(test).toContain("describe('my-skill'");
    expect(test).toContain('claws upgrade');
  });

  it('generates syntactically valid TypeScript in test template', () => {
    const ctx: TemplateContext = { ...BASE_CTX, skillRisk: 3 };
    const files = verifiedTemplate(ctx);
    const test = files[2]!.content;

    // Basic structural checks for valid TS
    expect(test).toContain('import {');
    expect(test).toContain('describe(');
    expect(test).toContain('it(');
    expect(test).toContain('expect(');
    // Braces balanced (simple check)
    const opens = (test.match(/{/g) ?? []).length;
    const closes = (test.match(/}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

describe('generateTemplate', () => {
  it('dispatches to declared', () => {
    const files = generateTemplate('declared', BASE_CTX);
    expect(files).toHaveLength(1);
  });

  it('dispatches to typed', () => {
    const files = generateTemplate('typed', BASE_CTX);
    expect(files).toHaveLength(2);
  });

  it('dispatches to verified', () => {
    const files = generateTemplate('verified', BASE_CTX);
    expect(files).toHaveLength(4);
  });
});

describe('skillClassName', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(skillClassName('send-invoice')).toBe('SendInvoice');
    expect(skillClassName('my-skill')).toBe('MySkill');
    expect(skillClassName('a')).toBe('A');
    expect(skillClassName('search-docs')).toBe('SearchDocs');
  });
});
