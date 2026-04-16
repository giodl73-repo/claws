/**
 * Developer-tools template — dev tooling skill (R2-R4, no OBO).
 *
 * Skills for IDE integration, code generation, CI/CD interaction.
 * Variable risk without OBO delegation.
 *
 * @module claws-sdk/maker/templates/developer-tools
 */

import type { SkillTemplate, GovernanceFrontmatter, ScaffoldFile } from '../types.js';
import { buildSkillMd, buildHandlerTs, buildHandlerTest, buildPackageJson, buildVitestConfig, buildManifest, buildGitignore } from './shared.js';

/**
 * Developer-tools template definition.
 */
export const developerToolsTemplate: SkillTemplate = {
  category: 'developer-tools',
  name: 'Developer Tools',
  description: 'Skills for IDE integration, code generation, CI/CD interaction. Variable risk without OBO delegation.',
  riskRange: [2, 4],
  oboDefault: false,
  oboScope: '',
  dataLabels: ['source-code'],
  defaultTier: 'TYPED',
};

/**
 * Generate scaffold files for the developer-tools template.
 */
export function generateDeveloperTools(name: string, frontmatter: GovernanceFrontmatter): readonly ScaffoldFile[] {
  const handlerBody = [
    `export interface ToolInput {`,
    `  readonly command: string;`,
    `  readonly args?: readonly string[];`,
    `  readonly workingDir?: string;`,
    `}`,
    ``,
    `export interface ToolOutput {`,
    `  readonly exitCode: number;`,
    `  readonly stdout: string;`,
    `  readonly stderr: string;`,
    `}`,
    ``,
    `/**`,
    ` * @Risk(${frontmatter.risk})`,
    ` * @DataLabel(${frontmatter.dataLabels.join(', ')})`,
    ` */`,
    `export async function handler(input: ToolInput): Promise<ToolOutput> {`,
    `  // TODO: Implement developer tool logic`,
    `  return { exitCode: 0, stdout: '', stderr: '' };`,
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
