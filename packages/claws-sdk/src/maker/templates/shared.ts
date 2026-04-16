/**
 * Shared template builders for maker scaffold files.
 *
 * Produces shared builders for scaffold files. Non-custom templates
 * generate 7 files (SKILL.md, handler.ts, handler.test.ts, package.json,
 * vitest.config.ts, .claws-manifest, .gitignore). Custom template
 * generates 3 files (SKILL.md, handler.ts, .gitignore).
 *
 * @module claws-sdk/maker/templates/shared
 */

import type { GovernanceFrontmatter } from '../types.js';

/**
 * Build SKILL.md with governance frontmatter.
 */
export function buildSkillMd(fm: GovernanceFrontmatter): string {
  const lines: string[] = [
    '---',
    `name: ${fm.name}`,
    `template: ${fm.template}`,
    `tier: ${fm.tier}`,
    `risk: ${fm.risk}`,
    `trust_tier: ${fm.trustTier}`,
    `obo: ${fm.obo}`,
  ];
  if (fm.obo && fm.oboScope) {
    lines.push(`obo_scope: "${fm.oboScope}"`);
  }
  if (fm.dataLabels.length > 0) {
    lines.push(`data_labels:`);
    for (const label of fm.dataLabels) {
      lines.push(`  - ${label}`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(`# ${fm.name}`);
  lines.push('');
  lines.push(`> Template: **${fm.template}** | Risk: **R${fm.risk}** | Tier: **${fm.tier}**`);
  lines.push('');
  if (fm.obo) {
    lines.push('## OBO Governance');
    lines.push('');
    lines.push(`This skill operates on behalf of the user (${fm.oboScope}).`);
    lines.push('Explicit user consent is REQUIRED before execution.');
    lines.push('');
  }
  lines.push('## Description');
  lines.push('');
  lines.push(`TODO: Describe what ${fm.name} does.`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Build handler.ts with governance decorators as JSDoc comments.
 */
export function buildHandlerTs(name: string, fm: GovernanceFrontmatter, body: string): string {
  const lines: string[] = [
    `/**`,
    ` * ${name} skill handler.`,
    ` *`,
    ` * Template: ${fm.template}`,
    ` * Tier: ${fm.tier}`,
    ` * Risk: R${fm.risk}`,
  ];
  if (fm.obo) {
    lines.push(` * OBO: ${fm.oboScope}`);
  }
  lines.push(` */`);
  lines.push('');
  lines.push(body);
  lines.push('');
  return lines.join('\n');
}

/**
 * Build package.json with claws dependencies.
 */
export function buildPackageJson(name: string): string {
  const pkg = {
    name: `@skills/${name}`,
    version: '0.1.0',
    type: 'module',
    main: 'handler.ts',
    scripts: {
      test: 'vitest run',
      lint: 'tsc --noEmit',
    },
    dependencies: {},
    devDependencies: {
      typescript: '^5.0.0',
      vitest: '^4.0.0',
    },
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

/**
 * Build vitest.config.ts for test configuration.
 */
export function buildVitestConfig(): string {
  return [
    `import { defineConfig } from 'vitest/config';`,
    ``,
    `export default defineConfig({`,
    `  test: {`,
    `    include: ['**/*.test.ts'],`,
    `  },`,
    `});`,
    ``,
  ].join('\n');
}

/**
 * Build handler.test.ts with a minimal test stub.
 */
export function buildHandlerTest(name: string): string {
  return [
    `import { describe, it, expect } from 'vitest';`,
    ``,
    `describe('${name} handler', () => {`,
    `  it('should be implemented', () => {`,
    `    // TODO: Add handler tests`,
    `    expect(true).toBe(true);`,
    `  });`,
    `});`,
    ``,
  ].join('\n');
}

/**
 * Build .claws-manifest stub for future compilation.
 */
export function buildManifest(name: string): string {
  return [
    `# claws manifest — auto-generated, do not edit manually`,
    `skill: ${name}`,
    `version: 0.1.0`,
    `files:`,
    `  - SKILL.md`,
    `  - handler.ts`,
    `  - handler.test.ts`,
    `  - package.json`,
    `  - vitest.config.ts`,
    ``,
  ].join('\n');
}

/**
 * Build .gitignore with .claws/ directory entry (S01-F05).
 */
export function buildGitignore(): string {
  return [
    `# claws compilation output`,
    `.claws/`,
    ``,
    `# Dependencies`,
    `node_modules/`,
    ``,
    `# Build output`,
    `dist/`,
    ``,
    `# Coverage`,
    `coverage/`,
    ``,
  ].join('\n');
}
