/**
 * Skill scaffold templates — one per tier: declared, typed, verified.
 *
 * Each template returns a map of relative file paths to their content.
 * The orchestrator writes these files into the skill directory.
 *
 * @module claws-sdk/scaffold/templates
 */

import type { SkillTemplateTier, RiskLevel } from '../defaults.js';

/**
 * A single file to write during scaffolding.
 */
export interface SkillTemplateFile {
  /** Relative path within the skill directory. */
  readonly relativePath: string;
  /** File content. */
  readonly content: string;
}

/**
 * Context passed to template generators.
 */
export interface TemplateContext {
  /** Skill name (e.g. "my-skill"). */
  readonly name: string;
  /** Maximum risk level allowed by the workspace. */
  readonly maxRisk: RiskLevel;
  /** Risk level assigned to this skill. */
  readonly skillRisk: RiskLevel;
  /** OBO hint lines to inject into the handler (empty if not applicable). */
  readonly oboHints?: readonly string[] | undefined;
}

/**
 * Generate DECLARED tier skill files — minimal 3-line YAML manifest.
 */
export function declaredTemplate(ctx: TemplateContext): readonly SkillTemplateFile[] {
  const manifest = [
    `name: ${ctx.name}`,
    `risk: ${ctx.skillRisk}`,
    `description: ${ctx.name} skill`,
    '',
  ].join('\n');

  return [
    { relativePath: 'skill.yaml', content: manifest },
  ];
}

/**
 * Build OBO hint comment block for injection into handler files.
 */
function formatOboHintBlock(hints: readonly string[]): string {
  if (hints.length === 0) return '';
  return [
    `// OBO: This skill name implies on-behalf-of operations.`,
    `// Consider adding explicit OBO governance:`,
    ...hints.map(h => `//   - ${h}`),
    ``,
  ].join('\n');
}

/**
 * Generate TYPED tier skill files — plain TypeScript handler + frontmatter YAML.
 *
 * Uses plain function exports instead of `@bic/claws-skill-kit` decorators.
 * When the skill-kit package is published, users can upgrade with `claws upgrade`.
 */
export function typedTemplate(ctx: TemplateContext): readonly SkillTemplateFile[] {
  const manifest = [
    `name: ${ctx.name}`,
    `tier: typed`,
    `risk: ${ctx.skillRisk}`,
    `inputs:`,
    `  - name: query`,
    `    type: string`,
    `    required: true`,
    `outputs:`,
    `  - name: result`,
    `    type: string`,
    '',
  ].join('\n');

  const oboBlock = formatOboHintBlock(ctx.oboHints ?? []);
  const handler = [
    `// When @bic/claws-skill-kit is available, upgrade to decorator syntax with: claws upgrade`,
    ``,
    `/**`,
    ` * ${ctx.name} skill handler.`,
    ` *`,
    ` * @skill ${ctx.name}`,
    ` * @tier typed`,
    ` * @risk ${ctx.skillRisk}`,
    ` */`,
    ...(oboBlock ? [oboBlock] : []),
    `export async function handler(input: { query: string }): Promise<{ result: string }> {`,
    `  return { result: input.query };`,
    `}`,
    '',
  ].join('\n');

  return [
    { relativePath: 'skill.yaml', content: manifest },
    { relativePath: 'handler.ts', content: handler },
  ];
}

/**
 * Generate VERIFIED tier skill files — full manifest, plain TypeScript handler,
 * test template with plain assertions, and supply chain stub.
 *
 * Uses plain function exports and direct assertions instead of `@bic/claws-skill-kit`
 * decorators and testing utilities. When the skill-kit package is published,
 * users can upgrade with `claws upgrade`.
 */
export function verifiedTemplate(ctx: TemplateContext): readonly SkillTemplateFile[] {
  const manifest = [
    `name: ${ctx.name}`,
    `tier: verified`,
    `risk: ${ctx.skillRisk}`,
    `inputs:`,
    `  - name: query`,
    `    type: string`,
    `    required: true`,
    `outputs:`,
    `  - name: result`,
    `    type: string`,
    `supply:`,
    `  attestation: required`,
    `  sbom: true`,
    '',
  ].join('\n');

  const oboBlock = formatOboHintBlock(ctx.oboHints ?? []);
  const handler = [
    `// When @bic/claws-skill-kit is available, upgrade to decorator syntax with: claws upgrade`,
    ``,
    `/**`,
    ` * ${ctx.name} skill handler.`,
    ` *`,
    ` * @skill ${ctx.name}`,
    ` * @tier verified`,
    ` * @risk ${ctx.skillRisk}`,
    ` */`,
    ...(oboBlock ? [oboBlock] : []),
    `export async function handler(input: { query: string }): Promise<{ result: string }> {`,
    `  return { result: input.query };`,
    `}`,
    '',
  ].join('\n');

  const test = [
    `// When @bic/claws-skill-kit is available, upgrade to decorator syntax with: claws upgrade`,
    `import { describe, it, expect } from 'vitest';`,
    `import { handler } from './handler.js';`,
    ``,
    `describe('${ctx.name}', () => {`,
    `  it('returns query as result', async () => {`,
    `    const result = await handler({ query: 'hello' });`,
    `    expect(result).toEqual({ result: 'hello' });`,
    `  });`,
    ``,
    `  it('handler returns expected shape for governance', () => {`,
    `    // Verify the handler is a function with the expected signature`,
    `    expect(typeof handler).toBe('function');`,
    `  });`,
    ``,
    `  it('handler does not throw on valid input', async () => {`,
    `    await expect(handler({ query: 'test' })).resolves.toBeDefined();`,
    `  });`,
    `});`,
    '',
  ].join('\n');

  const supplyChain = [
    `# Supply Chain Attestation`,
    ``,
    `skill: ${ctx.name}`,
    `tier: verified`,
    `attestation: pending`,
    `sbom: []`,
    '',
  ].join('\n');

  return [
    { relativePath: 'skill.yaml', content: manifest },
    { relativePath: 'handler.ts', content: handler },
    { relativePath: 'handler.test.ts', content: test },
    { relativePath: 'SUPPLY.md', content: supplyChain },
  ];
}

/**
 * Mapping of template tier to generator function.
 */
const TEMPLATE_GENERATORS: Readonly<Record<SkillTemplateTier, (ctx: TemplateContext) => readonly SkillTemplateFile[]>> = {
  declared: declaredTemplate,
  typed: typedTemplate,
  verified: verifiedTemplate,
};

/**
 * Generate template files for a given tier.
 *
 * @param tier - Skill template tier
 * @param ctx - Template context
 * @returns Array of files to write
 */
export function generateTemplate(
  tier: SkillTemplateTier,
  ctx: TemplateContext,
): readonly SkillTemplateFile[] {
  return TEMPLATE_GENERATORS[tier](ctx);
}

/**
 * Convert a kebab-case skill name to a PascalCase class name.
 * E.g., "send-invoice" → "SendInvoice".
 */
export function skillClassName(name: string): string {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
