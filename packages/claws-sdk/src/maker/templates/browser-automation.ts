/**
 * Browser-automation template — browser control skill (R4, OBO social).
 *
 * Skills that control browser sessions for social media, form submission,
 * or web interaction. High-risk with OBO for social actions.
 *
 * @module claws-sdk/maker/templates/browser-automation
 */

import type { SkillTemplate, GovernanceFrontmatter, ScaffoldFile } from '../types.js';
import { buildSkillMd, buildHandlerTs, buildHandlerTest, buildPackageJson, buildVitestConfig, buildManifest, buildGitignore } from './shared.js';

/**
 * Browser-automation template definition.
 */
export const browserAutomationTemplate: SkillTemplate = {
  category: 'browser-automation',
  name: 'Browser Automation',
  description: 'Skills that control browser sessions for social media, form submission, or web interaction. High-risk with OBO for social actions.',
  riskRange: [4, 4],
  oboDefault: true,
  oboScope: 'browser session control for social/web actions',
  dataLabels: ['pii', 'web-session'],
  defaultTier: 'TYPED',
};

/**
 * Generate scaffold files for the browser-automation template.
 */
export function generateBrowserAutomation(name: string, frontmatter: GovernanceFrontmatter): readonly ScaffoldFile[] {
  const handlerBody = [
    `export interface BrowserAction {`,
    `  readonly url: string;`,
    `  readonly action: 'navigate' | 'click' | 'fill' | 'submit';`,
    `  readonly selector?: string;`,
    `  readonly value?: string;`,
    `}`,
    ``,
    `export interface BrowserResult {`,
    `  readonly success: boolean;`,
    `  readonly pageTitle: string;`,
    `  readonly screenshot?: string;`,
    `}`,
    ``,
    `/**`,
    ` * @Obo() — requires explicit user consent for browser actions.`,
    ` * @Risk(${frontmatter.risk})`,
    ` * @DataLabel(${frontmatter.dataLabels.join(', ')})`,
    ` */`,
    `export async function handler(input: BrowserAction): Promise<BrowserResult> {`,
    `  // TODO: Implement browser automation logic`,
    `  return { success: true, pageTitle: 'Page' };`,
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
