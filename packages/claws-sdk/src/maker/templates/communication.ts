/**
 * Communication template — email/message skill (R3-R5, OBO).
 *
 * Skills that send emails, messages, or notifications on behalf of users.
 * Includes OBO governance frontmatter by default.
 *
 * @module claws-sdk/maker/templates/communication
 */

import type { SkillTemplate, GovernanceFrontmatter, ScaffoldFile } from '../types.js';
import { buildSkillMd, buildHandlerTs, buildHandlerTest, buildPackageJson, buildVitestConfig, buildManifest, buildGitignore } from './shared.js';

/**
 * Communication template definition.
 */
export const communicationTemplate: SkillTemplate = {
  category: 'communication',
  name: 'Communication',
  description: 'Skills that send emails, messages, or notifications on behalf of users. Includes OBO governance frontmatter by default.',
  riskRange: [3, 5],
  oboDefault: true,
  oboScope: 'email/message sending on behalf of user',
  dataLabels: ['pii', 'communication'],
  defaultTier: 'TYPED',
};

/**
 * Generate scaffold files for the communication template.
 */
export function generateCommunication(name: string, frontmatter: GovernanceFrontmatter): readonly ScaffoldFile[] {
  const handlerBody = [
    `export interface SendMessageInput {`,
    `  readonly to: string;`,
    `  readonly subject: string;`,
    `  readonly body: string;`,
    `}`,
    ``,
    `export interface SendMessageOutput {`,
    `  readonly messageId: string;`,
    `  readonly status: 'sent' | 'queued' | 'failed';`,
    `}`,
    ``,
    `/**`,
    ` * @Obo() — requires explicit user consent before sending.`,
    ` * @Risk(${frontmatter.risk})`,
    ` * @DataLabel(${frontmatter.dataLabels.join(', ')})`,
    ` */`,
    `export async function handler(input: SendMessageInput): Promise<SendMessageOutput> {`,
    `  // TODO: Implement message sending logic`,
    `  return { messageId: 'msg-001', status: 'queued' };`,
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
