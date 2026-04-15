/**
 * `claws init` command — thin CLI adapter for workspace initialization.
 *
 * All business logic lives in @bic/claws-sdk/init.
 * This module parses CLI options and renders the SDK result.
 *
 * @module claws-cli/commands/init
 */

import {
  initWorkspace,
  TemplateNotFoundError,
  getStarterFileDescription,
} from '@bic/claws-sdk/init';

import {
  scaffoldSkill,
  SkillAlreadyExistsError,
  RiskCapExceededError,
  validateSkillName,
} from '@bic/claws-sdk/scaffold';
import type { SkillTemplateTier } from '@bic/claws-sdk/scaffold';

import {
  formatError,
  formatErrorJson,
  alreadyInitializedError,
  initWriteFailedError,
  templateNotFoundError,
} from '../output/errors.js';

/**
 * Init command options.
 */
export interface InitOptions {
  readonly json: boolean;
  readonly template?: string | undefined;
  readonly scaffold?: boolean | undefined;
}

/**
 * Run the init command: delegates to SDK orchestrator, renders result.
 *
 * @param workspaceRoot - Absolute path to workspace root (cwd)
 * @param opts - Command options (json, template)
 * @returns Exit code (0=success, 2=already initialized)
 */
export async function runInit(
  workspaceRoot: string,
  opts: InitOptions,
): Promise<number> {
  try {
    const result = await initWorkspace(workspaceRoot, {
      template: opts.template,
      scaffold: opts.scaffold,
    });

    if (result.exitCode === 2) {
      const err = alreadyInitializedError(result.configPath);
      console.error(opts.json ? formatErrorJson(err) : formatError(err));
      return 2;
    }

    // Success output
    const scaffold = result.workspaceScaffold;
    if (opts.json) {
      console.log(JSON.stringify({
        status: result.status,
        platform: result.detection?.platform ?? 'unknown',
        method: result.detection?.method ?? 'unknown',
        configPath: result.configPath,
        template: result.templateApplied ?? null,
        policyFiles: result.policyFiles ?? [],
        sidecarDirs: result.sidecarDirs ?? [],
        gitignoreAdded: result.gitignoreAdded ?? [],
        workspaceFilesCreated: scaffold?.created ?? [],
        workspaceFilesSkipped: scaffold?.skipped ?? [],
      }));
    } else {
      const platform = result.detection?.platform ?? 'unknown';
      const hasCreatedFiles = scaffold !== undefined && scaffold.created.length > 0;
      const templateInfo = result.templateApplied
        ? ` Template: ${result.templateApplied} (${result.policyFiles?.length ?? 0} policies).`
        : '';

      if (hasCreatedFiles) {
        console.log(`Detected: ${platform}. Created .claws/ sidecar + starter workspace:`);
        const padWidth = 26;
        for (const name of scaffold.created) {
          const desc = getStarterFileDescription(name) ?? name;
          console.log(`  ${name.padEnd(padWidth)}${desc}`);
        }
        console.log(`  ${'claws.json'.padEnd(padWidth)}configuration`);
        if (templateInfo) {
          console.log(templateInfo.trim());
        }
        console.log('');
        console.log('Next: edit your workspace files, then run `claws check`');
      } else {
        console.log(
          `Detected: ${platform}. Created claws.json + .claws/.${templateInfo} Run \`claws check\` to check governance.`,
        );
        if (!scaffold) {
          console.log('No workspace files found. Run `claws init --scaffold` to create starter files.');
        }
      }
    }

    return 0;
  } catch (err) {
    if (err instanceof TemplateNotFoundError) {
      const tErr = templateNotFoundError(err.templateName, err.availableTemplates);
      console.error(opts.json ? formatErrorJson(tErr) : formatError(tErr));
      return 1;
    }
    const reason = err instanceof Error ? err.message : String(err);
    const writeErr = initWriteFailedError(reason);
    console.error(opts.json ? formatErrorJson(writeErr) : formatError(writeErr));
    return 2;
  }
}

/**
 * Options for `claws init skill`.
 */
export interface InitSkillOptions {
  readonly json: boolean;
  readonly tier?: SkillTemplateTier | undefined;
}

const VALID_TIERS: readonly string[] = ['declared', 'typed', 'verified'];

/**
 * Run `claws init skill <name>` — scaffold a skill in the workspace.
 *
 * @returns Exit code (0=success, 1=validation error, 2=risk cap exceeded, 3=error)
 */
export async function runInitSkill(
  workspaceRoot: string,
  skillName: string,
  opts: InitSkillOptions,
): Promise<number> {
  if (opts.tier && !VALID_TIERS.includes(opts.tier)) {
    const msg = `Invalid tier "${opts.tier}". Valid tiers: ${VALID_TIERS.join(', ')}`;
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }

  const nameError = validateSkillName(skillName);
  if (nameError) {
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message: nameError }));
    } else {
      console.error(`Error: ${nameError}`);
    }
    return 1;
  }

  try {
    const result = await scaffoldSkill(workspaceRoot, skillName, { tier: opts.tier });

    if (result.dependency.instruction) {
      if (!opts.json) {
        console.warn(`Warning: ${result.dependency.instruction}`);
      }
    }

    if (opts.json) {
      console.log(JSON.stringify({
        status: 'ok',
        name: result.name,
        tier: result.tier,
        skillRisk: result.skillRisk,
        maxRisk: result.maxRisk,
        trustTier: result.trustTier,
        files: result.files,
        skillDir: result.skillDir,
        dependency: {
          installed: result.dependency.installed,
          version: result.dependency.version ?? null,
          versionAligned: result.dependency.versionAligned,
          instruction: result.dependency.instruction ?? null,
        },
        oboDetected: result.oboDetected,
      }));
    } else {
      console.log(`Scaffolded skill "${result.name}" (tier: ${result.tier}, risk: R${result.skillRisk})`);
      console.log(`  Directory: ${result.skillDir}`);
      console.log(`  Files: ${result.files.join(', ')}`);
      console.log(`  Workspace trust: T${result.trustTier} (max risk: R${result.maxRisk})`);
      if (result.oboDetected) {
        console.log(`  OBO: detected — governance hints injected`);
      }
    }

    return 0;
  } catch (err) {
    if (err instanceof SkillAlreadyExistsError) {
      const msg = `Skill directory already exists: ${err.skillDir}`;
      if (opts.json) {
        console.error(JSON.stringify({ status: 'error', message: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      return 1;
    }

    if (err instanceof RiskCapExceededError) {
      if (opts.json) {
        console.error(JSON.stringify({
          status: 'risk_cap_exceeded',
          message: err.message,
          requestedRisk: err.requestedRisk,
          maxRisk: err.maxRisk,
          trustTier: err.trustTier,
        }));
      } else {
        console.error(`Error: ${err.message}`);
      }
      return 2;
    }

    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 3;
  }
}
