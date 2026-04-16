/**
 * L0 unit tests for maker scaffold engine.
 *
 * P27: template selection, SKILL.md frontmatter, handler decorators,
 * .gitignore .claws/ entry, OBO auto-suggestion from name.
 */

import { describe, it, expect } from 'vitest';

import {
  getTemplate,
  getAllTemplates,
  validateTemplateCategory,
  validateSkillName,
  communicationTemplate,
  dataProcessingTemplate,
  browserAutomationTemplate,
  developerToolsTemplate,
  baseTemplate,
  TEMPLATE_CATEGORIES,
} from '@bic/claws-sdk/maker';
import type { GovernanceFrontmatter } from '@bic/claws-sdk/maker';
import { generateCommunication } from '../../src/maker/templates/communication.js';
import { generateBase } from '../../src/maker/templates/base.js';
import { generateBrowserAutomation } from '../../src/maker/templates/browser-automation.js';
import { generateDataProcessing } from '../../src/maker/templates/data-processing.js';
import { generateDeveloperTools } from '../../src/maker/templates/developer-tools.js';
import { buildSkillMd, buildGitignore } from '../../src/maker/templates/shared.js';

describe('template selection', () => {
  it('getTemplate returns correct template for each category', () => {
    expect(getTemplate('communication')).toBe(communicationTemplate);
    expect(getTemplate('data-processing')).toBe(dataProcessingTemplate);
    expect(getTemplate('browser-automation')).toBe(browserAutomationTemplate);
    expect(getTemplate('developer-tools')).toBe(developerToolsTemplate);
    expect(getTemplate('custom')).toBe(baseTemplate);
  });

  it('getAllTemplates returns all 5 templates', () => {
    const all = getAllTemplates();
    expect(all).toHaveLength(5);
    const categories = all.map(t => t.category);
    expect(categories).toEqual([
      'communication',
      'data-processing',
      'browser-automation',
      'developer-tools',
      'custom',
    ]);
  });

  it('TEMPLATE_CATEGORIES contains all 5 categories', () => {
    expect(TEMPLATE_CATEGORIES).toHaveLength(5);
    expect(TEMPLATE_CATEGORIES).toContain('communication');
    expect(TEMPLATE_CATEGORIES).toContain('data-processing');
    expect(TEMPLATE_CATEGORIES).toContain('browser-automation');
    expect(TEMPLATE_CATEGORIES).toContain('developer-tools');
    expect(TEMPLATE_CATEGORIES).toContain('custom');
  });

  it('validateTemplateCategory accepts valid categories', () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(validateTemplateCategory(cat)).toBeUndefined();
    }
  });

  it('validateTemplateCategory rejects invalid and suggests closest (S04-F01)', () => {
    const err = validateTemplateCategory('comunication');
    expect(err).toContain('Invalid template category');
    expect(err).toContain("Did you mean 'communication'");
  });

  it('validateTemplateCategory rejects completely wrong value without suggestion', () => {
    const err = validateTemplateCategory('zzzzzzzzzzz');
    expect(err).toContain('Invalid template category');
    expect(err).not.toContain('Did you mean');
  });
});

describe('SKILL.md frontmatter generated', () => {
  it('communication template produces SKILL.md with correct governance frontmatter', () => {
    const fm: GovernanceFrontmatter = {
      name: 'send-email',
      risk: 3,
      obo: true,
      oboScope: 'email/message sending on behalf of user',
      dataLabels: ['pii', 'communication'],
      tier: 'TYPED',
      trustTier: 2,
      template: 'communication',
    };
    const content = buildSkillMd(fm);

    expect(content).toContain('name: send-email');
    expect(content).toContain('tier: TYPED');
    expect(content).toContain('risk: 3');
    expect(content).toContain('obo: true');
    expect(content).toContain('obo_scope: "email/message sending on behalf of user"');
    expect(content).toContain('data_labels:');
    expect(content).toContain('  - pii');
    expect(content).toContain('  - communication');
    expect(content).toContain('trust_tier: 2');
    expect(content).toContain('template: communication');
  });

  it('custom template produces SKILL.md without OBO fields', () => {
    const fm: GovernanceFrontmatter = {
      name: 'my-tool',
      risk: 1,
      obo: false,
      oboScope: '',
      dataLabels: [],
      tier: 'TYPED',
      trustTier: 2,
      template: 'custom',
    };
    const content = buildSkillMd(fm);

    expect(content).toContain('obo: false');
    expect(content).not.toContain('obo_scope');
    expect(content).not.toContain('data_labels');
  });

  it('all templates default tier is TYPED (S01-F03)', () => {
    const all = getAllTemplates();
    for (const t of all) {
      expect(t.defaultTier).toBe('TYPED');
    }
  });
});

describe('handler.ts has decorators', () => {
  it('communication handler has @Obo and @Risk decorators', () => {
    const fm: GovernanceFrontmatter = {
      name: 'send-email',
      risk: 3,
      obo: true,
      oboScope: 'email/message sending on behalf of user',
      dataLabels: ['pii', 'communication'],
      tier: 'TYPED',
      trustTier: 2,
      template: 'communication',
    };
    const files = generateCommunication('send-email', fm);
    const handler = files.find(f => f.relativePath === 'handler.ts');
    expect(handler).toBeDefined();
    expect(handler!.content).toContain('@Obo()');
    expect(handler!.content).toContain('@Risk(3)');
    expect(handler!.content).toContain('@DataLabel(pii, communication)');
  });

  it('custom base handler has @Risk decorator only (no OBO)', () => {
    const fm: GovernanceFrontmatter = {
      name: 'my-tool',
      risk: 1,
      obo: false,
      oboScope: '',
      dataLabels: [],
      tier: 'TYPED',
      trustTier: 2,
      template: 'custom',
    };
    const files = generateBase('my-tool', fm);
    const handler = files.find(f => f.relativePath === 'handler.ts');
    expect(handler).toBeDefined();
    expect(handler!.content).toContain('@Risk(1)');
    expect(handler!.content).not.toContain('@Obo');
  });
});

describe('.gitignore includes .claws/ (S01-F05)', () => {
  it('buildGitignore produces .claws/ entry', () => {
    const content = buildGitignore();
    expect(content).toContain('.claws/');
  });

  it('all templates include .gitignore file', () => {
    const fm: GovernanceFrontmatter = {
      name: 'test-skill',
      risk: 3,
      obo: true,
      oboScope: 'test',
      dataLabels: ['pii'],
      tier: 'TYPED',
      trustTier: 2,
      template: 'communication',
    };
    const commFiles = generateCommunication('test-skill', fm);
    expect(commFiles.some(f => f.relativePath === '.gitignore')).toBe(true);
    const gitignore = commFiles.find(f => f.relativePath === '.gitignore')!;
    expect(gitignore.content).toContain('.claws/');
  });
});

describe('makerScaffold error paths', () => {
  it('rejects invalid skill name via makerScaffold', async () => {
    const { makerScaffold } = await import('@bic/claws-sdk/maker');
    await expect(
      makerScaffold({
        name: '',
        template: 'custom',
        workspaceRoot: '/tmp/fake',
      }),
    ).rejects.toThrow('empty');
  });

  it('rejects invalid template category via makerScaffold', async () => {
    const { makerScaffold } = await import('@bic/claws-sdk/maker');
    await expect(
      makerScaffold({
        name: 'valid-name',
        template: 'nonexistent' as any,
        workspaceRoot: '/tmp/fake',
      }),
    ).rejects.toThrow('Invalid template category');
  });

  it('uses trustTier override when provided', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { makerScaffold } = await import('@bic/claws-sdk/maker');

    const dir = await mkdtemp(join(tmpdir(), 'claws-maker-tier-'));
    try {
      // No claws.json needed since we override trustTier
      const result = await makerScaffold({
        name: 'tier-override',
        template: 'custom',
        workspaceRoot: dir,
        trustTier: 3,
      });
      expect(result.trustTier).toBe(3);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('throws when skill directory already exists', async () => {
    const { mkdtemp, writeFile, mkdir, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { makerScaffold } = await import('@bic/claws-sdk/maker');

    const dir = await mkdtemp(join(tmpdir(), 'claws-maker-exists-'));
    try {
      await writeFile(join(dir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');
      // Pre-create the skill directory
      await mkdir(join(dir, 'skills', 'existing-skill'), { recursive: true });

      await expect(
        makerScaffold({
          name: 'existing-skill',
          template: 'custom',
          workspaceRoot: dir,
        }),
      ).rejects.toThrow('already exists');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('uses governanceTier override when provided', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { makerScaffold } = await import('@bic/claws-sdk/maker');

    const dir = await mkdtemp(join(tmpdir(), 'claws-maker-govtier-'));
    try {
      await writeFile(join(dir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');
      const result = await makerScaffold({
        name: 'gov-override',
        template: 'custom',
        workspaceRoot: dir,
        governanceTier: 'VERIFIED',
      });
      expect(result.tier).toBe('VERIFIED');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('suggests OBO when name implies delegation on non-OBO template', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { makerScaffold } = await import('@bic/claws-sdk/maker');

    const dir = await mkdtemp(join(tmpdir(), 'claws-maker-suggest-'));
    try {
      await writeFile(join(dir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');
      // 'send-email' implies OBO, but 'custom' template has oboDefault=false
      const result = await makerScaffold({
        name: 'send-email',
        template: 'custom',
        workspaceRoot: dir,
      });
      // OBO should be detected from name even on custom template
      expect(result.obo).toBe(true);
      // Should have OBO suggestion
      expect(result.suggestions.some(s => s.type === 'obo')).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('OBO auto-suggestion from name (S01-F08)', () => {
  it('communication and browser-automation templates have oboDefault true', () => {
    expect(communicationTemplate.oboDefault).toBe(true);
    expect(browserAutomationTemplate.oboDefault).toBe(true);
  });

  it('data-processing, developer-tools, and custom templates have oboDefault false', () => {
    expect(dataProcessingTemplate.oboDefault).toBe(false);
    expect(developerToolsTemplate.oboDefault).toBe(false);
    expect(baseTemplate.oboDefault).toBe(false);
  });

  it('browser-automation template generates OBO decorator in handler', () => {
    const fm: GovernanceFrontmatter = {
      name: 'post-tweet',
      risk: 4,
      obo: true,
      oboScope: 'browser session control for social/web actions',
      dataLabels: ['pii', 'web-session'],
      tier: 'TYPED',
      trustTier: 3,
      template: 'browser-automation',
    };
    const files = generateBrowserAutomation('post-tweet', fm);
    const handler = files.find(f => f.relativePath === 'handler.ts');
    expect(handler!.content).toContain('@Obo()');
  });

  it('data-processing template generates all 7 scaffold files', () => {
    const fm: GovernanceFrontmatter = {
      name: 'etl-pipeline',
      risk: 2,
      obo: false,
      oboScope: '',
      dataLabels: ['internal'],
      tier: 'TYPED',
      trustTier: 2,
      template: 'data-processing',
    };
    const files = generateDataProcessing('etl-pipeline', fm);
    expect(files).toHaveLength(7);
    const paths = files.map(f => f.relativePath);
    expect(paths).toContain('SKILL.md');
    expect(paths).toContain('handler.ts');
    expect(paths).toContain('handler.test.ts');
    expect(paths).toContain('package.json');
    expect(paths).toContain('vitest.config.ts');
    expect(paths).toContain('.claws-manifest');
    expect(paths).toContain('.gitignore');

    const handler = files.find(f => f.relativePath === 'handler.ts')!;
    expect(handler.content).toContain('@Risk(2)');
    expect(handler.content).toContain('@DataLabel(internal)');
    expect(handler.content).toContain('ProcessInput');
    expect(handler.content).toContain('ProcessOutput');
  });

  it('developer-tools template generates all 7 scaffold files', () => {
    const fm: GovernanceFrontmatter = {
      name: 'ci-runner',
      risk: 3,
      obo: false,
      oboScope: '',
      dataLabels: ['source-code'],
      tier: 'TYPED',
      trustTier: 2,
      template: 'developer-tools',
    };
    const files = generateDeveloperTools('ci-runner', fm);
    expect(files).toHaveLength(7);
    const paths = files.map(f => f.relativePath);
    expect(paths).toContain('SKILL.md');
    expect(paths).toContain('handler.ts');
    expect(paths).toContain('handler.test.ts');
    expect(paths).toContain('package.json');
    expect(paths).toContain('vitest.config.ts');
    expect(paths).toContain('.claws-manifest');
    expect(paths).toContain('.gitignore');

    const handler = files.find(f => f.relativePath === 'handler.ts')!;
    expect(handler.content).toContain('@Risk(3)');
    expect(handler.content).toContain('@DataLabel(source-code)');
    expect(handler.content).toContain('ToolInput');
    expect(handler.content).toContain('ToolOutput');
  });

  it('validateSkillName accepts valid names', () => {
    expect(validateSkillName('send-email')).toBeUndefined();
    expect(validateSkillName('a')).toBeUndefined();
    expect(validateSkillName('my-tool-123')).toBeUndefined();
  });

  it('validateSkillName rejects invalid names', () => {
    expect(validateSkillName('')).toContain('empty');
    expect(validateSkillName('Invalid_Name')).toContain('lowercase');
    expect(validateSkillName('-starts-dash')).toContain('lowercase');
  });
});
