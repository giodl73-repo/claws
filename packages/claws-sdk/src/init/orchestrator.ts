/**
 * Init orchestrator — full `claws init` pipeline.
 *
 * Coordinates: platform detect → config create → sidecar scaffold → gitignore update.
 * Idempotent: returns exit code 2 if workspace is already initialized.
 *
 * @module claws-sdk/init/orchestrator
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { CLAWS_CONFIG_FILE } from '../types/sidecar.js';
import { detect } from '../detect/detect.js';
import { detectWorkspacePlatform, type WorkspacePlatformResult } from './platform-detect.js';
import { buildInitConfig, writeInitConfig, type InitConfig } from './config-create.js';
import { scaffoldSidecar } from './sidecar-scaffold.js';
import { updateGitignore } from './gitignore-update.js';
import { applyTemplate, TemplateNotFoundError } from './templates/index.js';
import { scaffoldWorkspaceFiles, type WorkspaceScaffoldResult } from './workspace-scaffold.js';

/**
 * Options for the init orchestrator.
 */
export interface InitOrchestratorOptions {
  /** Optional template to include in claws.json. */
  readonly template?: string | undefined;
  /** When true, create starter OC workspace files if none exist. */
  readonly scaffold?: boolean | undefined;
}

/**
 * Result of a successful init orchestration.
 */
export interface InitResult {
  /** Exit code: 0 = success, 2 = already initialized. */
  readonly exitCode: 0 | 2;
  /** Status description. */
  readonly status: 'initialized' | 'already-initialized';
  /** Detected workspace platform info (only present on success). */
  readonly detection?: WorkspacePlatformResult;
  /** The config that was written (only present on success). */
  readonly config?: InitConfig;
  /** Path to the written claws.json (always present). */
  readonly configPath: string;
  /** Sidecar directories created (only present on success). */
  readonly sidecarDirs?: readonly string[];
  /** Gitignore entries added (only present on success). */
  readonly gitignoreAdded?: readonly string[];
  /** Template that was applied (only present when --template used). */
  readonly templateApplied?: string;
  /** Policy files written by the template (only present when --template used). */
  readonly policyFiles?: readonly string[];
  /** Workspace file scaffolding result (only present on success). */
  readonly workspaceScaffold?: WorkspaceScaffoldResult;
}

/**
 * Run the full init orchestration pipeline.
 *
 * 1. Check if already initialized (claws.json exists → exit 2)
 * 2. Detect workspace platform from marker files
 * 3. Create claws.json with detected platform + T2 trust tier
 * 4. Scaffold .claws/ sidecar with all 13 subdirectories
 * 5. Update .gitignore with .claws/keys/ and .claws/secrets/
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param options - Init options (template, etc.)
 * @returns InitResult with exit code and details
 * @throws Error if filesystem operations fail (permissions, disk full, etc.)
 */
export async function initWorkspace(
  workspaceRoot: string,
  options: InitOrchestratorOptions = {},
): Promise<InitResult> {
  const configPath = join(workspaceRoot, CLAWS_CONFIG_FILE);

  // Step 1: Check idempotency — already initialized?
  const alreadyExists = await fileExists(configPath);
  if (alreadyExists) {
    return {
      exitCode: 2,
      status: 'already-initialized',
      configPath,
    };
  }

  // Step 2: Detect workspace language platform (node/python/rust/etc.)
  const detection = await detectWorkspacePlatform(workspaceRoot);

  // Step 2b: Detect agent platform (openclaw/cursor/claude-code/etc.)
  // Falls back to 'openclaw' when no agent platform markers are found.
  const agentInventory = await detect(workspaceRoot);
  const agentPlatform = agentInventory.detected
    ? agentInventory.platforms.keys().next().value ?? 'openclaw'
    : 'openclaw';

  // Step 3: Build and write config (uses agent platform, not workspace language)
  const config = buildInitConfig(agentPlatform, options.template);
  await writeInitConfig(workspaceRoot, config);

  // Step 4: Scaffold sidecar
  const sidecarDirs = await scaffoldSidecar(workspaceRoot);

  // Step 5: Update gitignore
  const gitignoreAdded = await updateGitignore(workspaceRoot);

  // Step 6: Scaffold starter workspace files (only when --scaffold is passed)
  const workspaceScaffold = options.scaffold
    ? await scaffoldWorkspaceFiles(workspaceRoot)
    : undefined;

  // Step 7: Apply template (if specified)
  const base: InitResult = {
    exitCode: 0,
    status: 'initialized',
    detection,
    config,
    configPath,
    sidecarDirs,
    gitignoreAdded,
    ...(workspaceScaffold !== undefined ? { workspaceScaffold } : {}),
  };

  if (options.template) {
    const templateResult = await applyTemplate(workspaceRoot, options.template);

    // Merge template configOverrides into claws.json (e.g. trustTier, complianceFramework)
    const mergedConfig = { ...config, ...templateResult.template.configOverrides };
    await writeInitConfig(workspaceRoot, mergedConfig);

    return {
      ...base,
      config: mergedConfig,
      templateApplied: templateResult.template.name,
      policyFiles: templateResult.policyFiles,
    };
  }

  return base;
}

/**
 * Check if a file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
