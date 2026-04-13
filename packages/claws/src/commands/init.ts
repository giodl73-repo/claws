/**
 * `claws init` command — initialize governance configuration for a workspace.
 *
 * Auto-detects the platform from workspace marker files (SOUL.md, CLAUDE.md,
 * .cursorrules, etc.), creates claws.json with detected platform + defaults,
 * and scaffolds the .claws/ sidecar directory.
 *
 * This is a thin CLI adapter: it calls SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/init
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { detect, resolve } from '@bic/claws-sdk/detect';
import { initSidecar } from '@bic/claws-sdk/types';
import type { Platform } from '@bic/claws-sdk/types';

import { fileExists } from '../core/fs.js';

/**
 * Init command options.
 */
export interface InitOptions {
  readonly json: boolean;
  readonly template?: string | undefined;
}

/**
 * Shape of the generated claws.json config file.
 */
interface ClawsJsonOutput {
  readonly platform: Platform;
  readonly trustTier: number;
  readonly suppress: readonly string[];
  readonly template?: string;
}

/**
 * Run the init command: detect platform → write claws.json → scaffold .claws/.
 *
 * @param workspaceRoot - Absolute path to workspace root (cwd)
 * @param opts - Command options (json, template)
 * @returns Exit code (0=success, 1=warning, 2=error)
 */
export async function runInit(
  workspaceRoot: string,
  opts: InitOptions,
): Promise<number> {
  // Check if claws.json already exists
  const configPath = join(workspaceRoot, 'claws.json');
  if (await fileExists(configPath)) {
    if (opts.json) {
      console.log(JSON.stringify({
        status: 'already-initialized',
        message: 'Remove claws.json and run `claws init` again to reinitialize.',
        configPath,
      }));
    } else {
      console.error('claws.json already exists in this directory.');
      console.error('Remove it manually and run `claws init` again to reinitialize.');
    }
    return 2;
  }

  // Auto-detect platform via SDK
  let platform: Platform;
  let method: string;

  try {
    const inventory = await detect(workspaceRoot);

    if (!inventory.detected) {
      // No markers found — default to openclaw
      platform = 'openclaw';
      method = 'default (no markers found)';
    } else {
      const target = resolve(inventory);
      platform = target.primary.marker.platform;
      method = 'auto-detect';
    }
  } catch {
    // Detection failed — fall back to openclaw
    platform = 'openclaw';
    method = 'default (detection error)';
  }

  // Build config
  const config: ClawsJsonOutput = {
    platform,
    trustTier: 2,
    suppress: [],
    ...(opts.template ? { template: opts.template } : {}),
  };

  // Write claws.json
  const configContent = JSON.stringify(config, null, 2) + '\n';
  await writeFile(configPath, configContent, 'utf-8');

  // Scaffold .claws/ sidecar
  await initSidecar(workspaceRoot);

  // Output result
  if (opts.json) {
    console.log(JSON.stringify({
      status: 'initialized',
      platform,
      method,
      configPath,
      template: opts.template ?? null,
    }));
  } else {
    console.log(
      `Detected: ${platform}. Created claws.json + .claws/. Run \`claws check\` to check governance.`,
    );
  }

  return 0;
}

