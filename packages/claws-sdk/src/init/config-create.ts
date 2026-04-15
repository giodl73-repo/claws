/**
 * Config creation — generate claws.json with detected platform,
 * default trust tier, and compiler version.
 *
 * @module claws-sdk/init/config-create
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CLAWS_CONFIG_FILE } from '../types/sidecar.js';
import { COMPILER_VERSION } from '../compile/version.js';
import type { WorkspacePlatform } from './platform-detect.js';

/**
 * Shape of the generated claws.json config.
 */
export interface InitConfig {
  readonly platform: WorkspacePlatform | string;
  readonly trustTier: number;
  readonly suppress: readonly string[];
  readonly compilerVersion: string;
  readonly template?: string;
  /** Additional keys from template configOverrides. */
  readonly [key: string]: unknown;
}

/**
 * Build the default init config for a detected workspace platform.
 *
 * @param platform - Detected workspace platform
 * @param template - Optional template name
 */
export function buildInitConfig(
  platform: WorkspacePlatform | string,
  template?: string,
): InitConfig {
  return {
    platform: platform as InitConfig['platform'],
    trustTier: 2,
    suppress: [],
    compilerVersion: COMPILER_VERSION,
    ...(template ? { template } : {}),
  };
}

/**
 * Write claws.json to the workspace root.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param config - The config object to write
 */
export async function writeInitConfig(
  workspaceRoot: string,
  config: InitConfig,
): Promise<string> {
  const configPath = join(workspaceRoot, CLAWS_CONFIG_FILE);
  const content = JSON.stringify(config, null, 2) + '\n';
  await writeFile(configPath, content, 'utf-8');
  return configPath;
}
