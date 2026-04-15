/**
 * Scaffold orchestrator — `claws new skill {name}` pipeline.
 *
 * Coordinates: resolve workspace tier -> apply risk cap -> check dependency
 * -> detect OBO -> select template -> write files + .gitignore.
 *
 * @module claws-sdk/scaffold/scaffold
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

import { loadConfig } from '../config/loader.js';
import {
  maxRiskForTier,
  defaultRiskForTemplateTier,
  isRiskPermitted,
  type SkillTemplateTier,
  type RiskLevel,
} from './defaults.js';
import { checkSkillKitDependency, type DependencyCheckResult } from './dependency.js';
import { generateTemplate, type SkillTemplateFile } from './templates/index.js';
import { detectOboFromName } from './obo-suggest.js';

/**
 * Options for the scaffold orchestrator.
 */
export interface ScaffoldOptions {
  /** Skill template tier. Default: 'declared'. */
  readonly tier?: SkillTemplateTier | undefined;
}

/**
 * Result of a successful scaffold operation.
 */
export interface ScaffoldResult {
  /** Skill name. */
  readonly name: string;
  /** Template tier used. */
  readonly tier: SkillTemplateTier;
  /** Risk level assigned to the skill. */
  readonly skillRisk: RiskLevel;
  /** Maximum risk allowed by the workspace. */
  readonly maxRisk: RiskLevel;
  /** Workspace trust tier. */
  readonly trustTier: number;
  /** Files written (relative to skill directory). */
  readonly files: readonly string[];
  /** Absolute path to the skill directory. */
  readonly skillDir: string;
  /** Dependency check result. */
  readonly dependency: DependencyCheckResult;
  /** Whether OBO hints were injected into the generated skill. */
  readonly oboDetected: boolean;
  /** OBO hint lines injected (empty if not detected). */
  readonly oboHints: readonly string[];
}

/**
 * Error thrown when a skill directory already exists.
 */
export class SkillAlreadyExistsError extends Error {
  readonly skillDir: string;

  constructor(skillDir: string) {
    super(`Skill directory already exists: ${skillDir}`);
    this.name = 'SkillAlreadyExistsError';
    this.skillDir = skillDir;
  }
}

/**
 * Error thrown when the requested risk level exceeds the workspace cap.
 */
export class RiskCapExceededError extends Error {
  readonly requestedRisk: RiskLevel;
  readonly maxRisk: RiskLevel;
  readonly trustTier: number;

  constructor(requestedRisk: RiskLevel, maxRisk: RiskLevel, trustTier: number) {
    super(
      `Risk level R${requestedRisk} exceeds workspace cap R${maxRisk} (trust tier T${trustTier}). ` +
      `Use a lower-risk template tier, or upgrade the workspace trust tier.`,
    );
    this.name = 'RiskCapExceededError';
    this.requestedRisk = requestedRisk;
    this.maxRisk = maxRisk;
    this.trustTier = trustTier;
  }
}

/**
 * Validate a skill name.
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
 * Run the full scaffold orchestration pipeline.
 *
 * 1. Validate skill name
 * 2. Load workspace config (trust tier)
 * 3. Compute risk cap from trust tier
 * 4. Check dependency on @bic/claws-skill-kit
 * 5. Select template tier (default: declared)
 * 6. Verify requested risk <= cap
 * 7. Generate and write template files
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param skillName - Name for the new skill
 * @param options - Scaffold options (tier)
 * @returns ScaffoldResult with details of the scaffolded skill
 * @throws Error if skill name is invalid
 * @throws SkillAlreadyExistsError if the skill directory exists
 * @throws RiskCapExceededError if risk exceeds workspace cap
 */
export async function scaffoldSkill(
  workspaceRoot: string,
  skillName: string,
  options: ScaffoldOptions = {},
): Promise<ScaffoldResult> {
  // Step 1: Validate name
  const nameError = validateSkillName(skillName);
  if (nameError) {
    throw new Error(nameError);
  }

  // Step 2: Load config for trust tier
  const configResult = await loadConfig(workspaceRoot);
  const trustTier = configResult.config.trustTier;

  // Step 3: Compute risk cap
  const cappedTier = Math.min(trustTier, 4);
  const maxRisk = maxRiskForTier(cappedTier);

  // Step 4: Check dependency
  const dependency = await checkSkillKitDependency(workspaceRoot);

  // Step 5: Select template
  const tier: SkillTemplateTier = options.tier ?? 'declared';
  const skillRisk = defaultRiskForTemplateTier(tier);

  // Step 6: Verify risk cap
  if (!isRiskPermitted(cappedTier, skillRisk)) {
    throw new RiskCapExceededError(skillRisk, maxRisk, trustTier);
  }

  // Step 7: OBO auto-suggestion — reuses annotate heuristics
  const oboResult = detectOboFromName(skillName);

  // Step 8: Check skill dir doesn't exist, then write files
  const skillDir = join(workspaceRoot, 'skills', skillName);
  const exists = await fileExists(skillDir);
  if (exists) {
    throw new SkillAlreadyExistsError(skillDir);
  }

  await mkdir(skillDir, { recursive: true });

  const templateFiles = generateTemplate(tier, {
    name: skillName,
    maxRisk,
    skillRisk,
    oboHints: oboResult.hints,
  });

  const writtenFiles: string[] = [];
  for (const file of templateFiles) {
    const filePath = join(skillDir, file.relativePath);
    await writeFile(filePath, file.content, 'utf-8');
    writtenFiles.push(file.relativePath);
  }

  // Step 9: Generate .gitignore with .claws/ entry
  const gitignorePath = join(skillDir, '.gitignore');
  await writeFile(gitignorePath, '.claws/\n', 'utf-8');
  writtenFiles.push('.gitignore');

  return {
    name: skillName,
    tier,
    skillRisk,
    maxRisk,
    trustTier,
    files: writtenFiles,
    skillDir,
    dependency,
    oboDetected: oboResult.detected,
    oboHints: oboResult.hints,
  };
}

/**
 * Check if a path exists on disk.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
