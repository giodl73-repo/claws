/**
 * Custom base template — minimal skill (R1, minimal).
 *
 * Minimal template for custom skill types. Lowest risk,
 * minimal governance surface.
 *
 * @module claws-sdk/maker/templates/base
 */

import type { SkillTemplate, GovernanceFrontmatter, ScaffoldFile } from '../types.js';
import { buildSkillMd, buildHandlerTs, buildGitignore } from './shared.js';

/**
 * Custom base template definition.
 */
export const baseTemplate: SkillTemplate = {
  category: 'custom',
  name: 'Custom Base',
  description: 'Minimal template for custom skill types. Lowest risk, minimal governance surface.',
  riskRange: [1, 1],
  oboDefault: false,
  oboScope: '',
  dataLabels: [],
  defaultTier: 'TYPED',
};

/**
 * Generate scaffold files for the custom base template.
 */
export function generateBase(name: string, frontmatter: GovernanceFrontmatter): readonly ScaffoldFile[] {
  const handlerBody = [
    `export interface SkillInput {`,
    `  readonly query: string;`,
    `}`,
    ``,
    `export interface SkillOutput {`,
    `  readonly result: string;`,
    `}`,
    ``,
    `/**`,
    ` * @Risk(${frontmatter.risk})`,
    ` */`,
    `export async function handler(input: SkillInput): Promise<SkillOutput> {`,
    `  // TODO: Implement skill logic`,
    `  return { result: input.query };`,
    `}`,
  ].join('\n');

  return [
    { relativePath: 'SKILL.md', content: buildSkillMd(frontmatter) },
    { relativePath: 'handler.ts', content: buildHandlerTs(name, frontmatter, handlerBody) },
    { relativePath: '.gitignore', content: buildGitignore() },
  ];
}
