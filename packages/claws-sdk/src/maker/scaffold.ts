/**
 * Maker scaffold engine — template selection + file generation.
 *
 * Coordinates: validate input -> resolve workspace context -> select template
 * -> build governance frontmatter -> generate files -> write to disk.
 *
 * Performance target: < 2 seconds (S01 scenario).
 *
 * @module claws-sdk/maker/scaffold
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadConfig } from '../config/loader.js';
import { levenshtein } from '../util/levenshtein.js';
import { pathExists } from '../util/fs.js';
import { detectOboFromName } from '../scaffold/obo-suggest.js';
import type {
  TemplateCategory,
  RiskLevel,
  GovernanceTier,
  GovernanceFrontmatter,
  SkillTemplate,
  MakerScaffoldOptions,
  MakerScaffoldResult,
  ScaffoldFile,
  AnnotationSuggestion,
  TEMPLATE_CATEGORIES,
} from './types.js';
import { communicationTemplate, generateCommunication } from './templates/communication.js';
import { dataProcessingTemplate, generateDataProcessing } from './templates/data-processing.js';
import { browserAutomationTemplate, generateBrowserAutomation } from './templates/browser-automation.js';
import { developerToolsTemplate, generateDeveloperTools } from './templates/developer-tools.js';
import { baseTemplate, generateBase } from './templates/base.js';

/**
 * Template registry — maps category to template definition + generator.
 */
interface TemplateRegistryEntry {
  readonly template: SkillTemplate;
  readonly generate: (name: string, frontmatter: GovernanceFrontmatter) => readonly ScaffoldFile[];
}

const TEMPLATE_REGISTRY: Readonly<Record<TemplateCategory, TemplateRegistryEntry>> = {
  communication: { template: communicationTemplate, generate: generateCommunication },
  'data-processing': { template: dataProcessingTemplate, generate: generateDataProcessing },
  'browser-automation': { template: browserAutomationTemplate, generate: generateBrowserAutomation },
  'developer-tools': { template: developerToolsTemplate, generate: generateDeveloperTools },
  custom: { template: baseTemplate, generate: generateBase },
};

/**
 * All valid template categories (for enum validation).
 */
const VALID_CATEGORIES: readonly TemplateCategory[] = [
  'communication',
  'data-processing',
  'browser-automation',
  'developer-tools',
  'custom',
];

/**
 * Get the template definition for a category.
 */
export function getTemplate(category: TemplateCategory): SkillTemplate {
  return TEMPLATE_REGISTRY[category].template;
}

/**
 * Get all registered template definitions.
 */
export function getAllTemplates(): readonly SkillTemplate[] {
  return VALID_CATEGORIES.map(c => TEMPLATE_REGISTRY[c].template);
}

/**
 * Validate a template category string. Returns undefined on success,
 * or an error message with closest-value suggestion on failure (S04-F01).
 */
export function validateTemplateCategory(value: string): string | undefined {
  if ((VALID_CATEGORIES as readonly string[]).includes(value)) {
    return undefined;
  }

  // Find closest match using Levenshtein distance
  let closest: string | undefined;
  let closestDist = Infinity;
  for (const cat of VALID_CATEGORIES) {
    const dist = levenshtein(value.toLowerCase(), cat, 5);
    if (dist < closestDist) {
      closestDist = dist;
      closest = cat;
    }
  }

  const suggestion = closest && closestDist <= 3
    ? ` Did you mean '${closest}'?`
    : '';
  return `Invalid template category '${value}'. Valid values: ${VALID_CATEGORIES.join(', ')}.${suggestion}`;
}

/**
 * Validate a skill name for maker scaffold.
 *
 * Must be a non-empty string matching lowercase alphanumeric + hyphens,
 * starting and ending with alphanumeric.
 */
export function validateSkillName(name: string): string | undefined {
  if (name.length === 0) {
    return 'Skill name must not be empty.';
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name) && !/^[a-z0-9]$/.test(name)) {
    return 'Skill name must be lowercase alphanumeric with hyphens, starting and ending with a letter or digit.';
  }
  return undefined;
}

/**
 * Build governance frontmatter from template + workspace context.
 */
function buildFrontmatter(
  name: string,
  template: SkillTemplate,
  trustTier: number,
  tierOverride?: GovernanceTier,
  oboSuggested?: boolean,
): GovernanceFrontmatter {
  const tier = tierOverride ?? template.defaultTier;
  const risk = template.riskRange[0];
  const obo = template.oboDefault || (oboSuggested ?? false);

  return {
    name,
    risk,
    obo,
    oboScope: obo ? template.oboScope : '',
    dataLabels: template.dataLabels,
    tier,
    trustTier,
    template: template.category,
  };
}

/**
 * Build annotation suggestions from template + name heuristics.
 */
function buildSuggestions(
  template: SkillTemplate,
  skillName: string,
): readonly AnnotationSuggestion[] {
  const suggestions: AnnotationSuggestion[] = [];

  // OBO auto-suggestion from skill name heuristics (S01-F08)
  const oboResult = detectOboFromName(skillName);
  if (oboResult.detected && !template.oboDefault) {
    suggestions.push({
      type: 'obo',
      message: `Skill name '${skillName}' implies OBO operations (${oboResult.matchedKeywords.join(', ')}). Consider enabling OBO governance.`,
      confidence: 0.7,
    });
  }

  // Risk suggestion if template has a wide range
  if (template.riskRange[1] - template.riskRange[0] >= 2) {
    suggestions.push({
      type: 'risk',
      message: `Template '${template.category}' supports risk levels R${template.riskRange[0]}-R${template.riskRange[1]}. Review risk level based on actual capabilities.`,
      confidence: 0.5,
    });
  }

  return suggestions;
}

/**
 * Run the maker scaffold pipeline.
 *
 * 1. Validate skill name and template category
 * 2. Load workspace config (trust tier)
 * 3. Select template from registry
 * 4. Build governance frontmatter
 * 5. Generate scaffold files
 * 6. Write files to disk
 *
 * @param options - Scaffold options
 * @returns MakerScaffoldResult with details
 * @throws Error if name or template is invalid
 * @throws Error if skill directory already exists
 */
export async function makerScaffold(
  options: MakerScaffoldOptions,
): Promise<MakerScaffoldResult> {
  const start = performance.now();

  // Step 1: Validate inputs
  const nameError = validateSkillName(options.name);
  if (nameError) {
    throw new Error(nameError);
  }

  const categoryError = validateTemplateCategory(options.template);
  if (categoryError) {
    throw new Error(categoryError);
  }

  // Step 2: Load workspace config for trust tier (S01-F01)
  let trustTier: number;
  if (options.trustTier !== undefined) {
    trustTier = options.trustTier;
  } else {
    const configResult = await loadConfig(options.workspaceRoot);
    trustTier = configResult.config.trustTier;
  }

  // Step 3: Select template
  const entry = TEMPLATE_REGISTRY[options.template];
  const template = entry.template;

  // Step 4: Build governance frontmatter
  // Default tier is TYPED per S01-F03
  const governanceTier = options.governanceTier ?? 'TYPED';
  const oboResult = detectOboFromName(options.name);
  const frontmatter = buildFrontmatter(
    options.name,
    template,
    trustTier,
    governanceTier,
    oboResult.detected,
  );

  // Step 5: Generate files
  const files = entry.generate(options.name, frontmatter);

  // Step 6: Write to disk
  const skillDir = join(options.workspaceRoot, 'skills', options.name);
  const exists = await pathExists(skillDir);
  if (exists) {
    throw new Error(`Skill directory already exists: ${skillDir}`);
  }

  await mkdir(skillDir, { recursive: true });

  const writtenFiles: string[] = [];
  for (const file of files) {
    const filePath = join(skillDir, file.relativePath);
    await writeFile(filePath, file.content, 'utf-8');
    writtenFiles.push(file.relativePath);
  }

  const durationMs = performance.now() - start;

  // Build suggestions
  const suggestions = buildSuggestions(template, options.name);

  return {
    name: options.name,
    template: options.template,
    risk: frontmatter.risk,
    tier: frontmatter.tier,
    obo: frontmatter.obo,
    trustTier,
    files: writtenFiles,
    skillDir,
    suggestions,
    durationMs,
  };
}

