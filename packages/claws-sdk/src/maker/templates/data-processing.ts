/**
 * Data-processing template — data transformation skill (R2-R3, no OBO).
 *
 * Skills that transform, aggregate, or analyze data without acting
 * on behalf of users. No OBO governance required.
 *
 * @module claws-sdk/maker/templates/data-processing
 */

import type { SkillTemplate, GovernanceFrontmatter, ScaffoldFile } from '../types.js';
import { buildSkillMd, buildHandlerTs, buildHandlerTest, buildPackageJson, buildVitestConfig, buildManifest, buildGitignore } from './shared.js';

/**
 * Data-processing template definition.
 */
export const dataProcessingTemplate: SkillTemplate = {
  category: 'data-processing',
  name: 'Data Processing',
  description: 'Skills that transform, aggregate, or analyze data without acting on behalf of users. No OBO governance required.',
  riskRange: [2, 3],
  oboDefault: false,
  oboScope: '',
  dataLabels: ['internal'],
  defaultTier: 'TYPED',
};

/**
 * Generate scaffold files for the data-processing template.
 */
export function generateDataProcessing(name: string, frontmatter: GovernanceFrontmatter): readonly ScaffoldFile[] {
  const handlerBody = [
    `export interface ProcessInput {`,
    `  readonly data: readonly Record<string, unknown>[];`,
    `  readonly operation: 'transform' | 'aggregate' | 'filter';`,
    `}`,
    ``,
    `export interface ProcessOutput {`,
    `  readonly result: readonly Record<string, unknown>[];`,
    `  readonly recordCount: number;`,
    `}`,
    ``,
    `/**`,
    ` * @Risk(${frontmatter.risk})`,
    ` * @DataLabel(${frontmatter.dataLabels.join(', ')})`,
    ` */`,
    `export async function handler(input: ProcessInput): Promise<ProcessOutput> {`,
    `  // TODO: Implement data processing logic`,
    `  return { result: input.data, recordCount: input.data.length };`,
    `}`,
  ].join('\n');

  return [
    { relativePath: 'SKILL.md', content: buildSkillMd(frontmatter) },
    { relativePath: 'handler.ts', content: buildHandlerTs(name, frontmatter, handlerBody) },
    { relativePath: 'handler.test.ts', content: buildHandlerTest(name) },
    { relativePath: 'package.json', content: buildPackageJson(name) },
    { relativePath: 'vitest.config.ts', content: buildVitestConfig() },
    { relativePath: '.claws-manifest', content: buildManifest(name) },
    { relativePath: '.gitignore', content: buildGitignore() },
  ];
}
