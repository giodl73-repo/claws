/**
 * Template registry and selection logic.
 *
 * Each template defines a governance profile that produces
 * claws.json config overrides and .claws/policies/*.yaml files.
 *
 * @module claws-sdk/init/templates
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CLAWS_SIDECAR_LAYOUT } from '../../types/sidecar.js';
import { minimalTemplate } from './minimal.js';
import { soc2Template } from './soc2.js';
import { hipaaTemplate } from './hipaa.js';
import { euAiActTemplate } from './eu-ai-act.js';

/**
 * A single policy file to be written to .claws/policies/.
 */
export interface PolicyFile {
  /** File name (e.g. "tool_blocklist.yaml"). */
  readonly name: string;
  /** YAML content of the policy file. */
  readonly content: string;
}

/**
 * Config overrides that a template applies to claws.json.
 */
export interface TemplateConfigOverrides {
  /** Override the default trust tier. */
  readonly trustTier?: number;
  /** Additional config keys specific to the template. */
  readonly [key: string]: unknown;
}

/**
 * A governance template definition.
 */
export interface GovernanceTemplate {
  /** Template identifier (e.g. "soc2", "hipaa"). */
  readonly name: string;
  /** Human-readable description. */
  readonly description: string;
  /** Config overrides applied to claws.json. */
  readonly configOverrides: TemplateConfigOverrides;
  /** Policy files to write to .claws/policies/. */
  readonly policies: readonly PolicyFile[];
}

/**
 * Registry of all built-in templates.
 */
const TEMPLATE_REGISTRY: ReadonlyMap<string, GovernanceTemplate> = new Map([
  ['minimal', minimalTemplate],
  ['soc2', soc2Template],
  ['hipaa', hipaaTemplate],
  ['eu-ai-act', euAiActTemplate],
]);

/**
 * List all available template names.
 */
export function listTemplateNames(): readonly string[] {
  return [...TEMPLATE_REGISTRY.keys()];
}

/**
 * Look up a template by name. Returns undefined if not found.
 */
export function getTemplate(name: string): GovernanceTemplate | undefined {
  return TEMPLATE_REGISTRY.get(name);
}

/**
 * Error thrown when a requested template is not found.
 */
export class TemplateNotFoundError extends Error {
  readonly templateName: string;
  readonly availableTemplates: readonly string[];

  constructor(name: string) {
    const available = listTemplateNames();
    super(
      `Template "${name}" not found. Available templates: ${available.join(', ')}`,
    );
    this.name = 'TemplateNotFoundError';
    this.templateName = name;
    this.availableTemplates = available;
  }
}

/**
 * Result of applying a template.
 */
export interface ApplyTemplateResult {
  /** Template that was applied. */
  readonly template: GovernanceTemplate;
  /** Policy files that were written. */
  readonly policyFiles: readonly string[];
}

/**
 * Apply a governance template to a workspace.
 *
 * Writes all policy YAML files to .claws/policies/.
 * Throws TemplateNotFoundError if the template name is invalid.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param templateName - Template identifier
 * @returns Result with template info and written policy file paths
 */
export async function applyTemplate(
  workspaceRoot: string,
  templateName: string,
): Promise<ApplyTemplateResult> {
  const template = getTemplate(templateName);
  if (!template) {
    throw new TemplateNotFoundError(templateName);
  }

  const policiesDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.policies);
  await mkdir(policiesDir, { recursive: true });

  const policyFiles: string[] = [];
  for (const policy of template.policies) {
    const filePath = join(policiesDir, policy.name);
    await writeFile(filePath, policy.content, 'utf-8');
    policyFiles.push(policy.name);
  }

  return { template, policyFiles };
}
