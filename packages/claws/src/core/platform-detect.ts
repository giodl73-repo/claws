/**
 * Platform auto-detection — thin CLI wrapper around claws-sdk detect module.
 *
 * Reads workspace marker files (SOUL.md, .cursorrules, CLAUDE.md, etc.)
 * to determine the target platform. When claws.json specifies a platform,
 * that takes precedence over auto-detection.
 *
 * @module claws-cli/core/platform-detect
 */

import { detect, resolve } from '@bic/claws-sdk/detect';
import type { ResolveConfig, PlatformTarget, PlatformInventory } from '@bic/claws-sdk/detect';
import type { Platform } from '@bic/claws-sdk/types';
import type { ClawsJsonConfig } from '../hooks/pre-command.js';

/**
 * Known platform IDs — must stay in sync with Platform type in claws-sdk.
 */
export const VALID_PLATFORMS: ReadonlySet<string> = new Set<Platform>([
  'openclaw',
  'cursor',
  'claude-code',
  'github-copilot',
  'bedrock',
  'langgraph',
  'crewai',
]);

/**
 * Result of platform auto-detection.
 */
export interface DetectResult {
  /** Resolved platform ID (e.g. 'openclaw', 'claude-code'). */
  readonly platform: Platform;
  /** How the platform was determined. */
  readonly method: 'config' | 'auto-detect';
  /** Full resolution target from SDK. */
  readonly target: PlatformTarget;
  /** Raw inventory from SDK detection. */
  readonly inventory: PlatformInventory;
}

/**
 * Auto-detect the target platform for a workspace.
 *
 * Priority:
 * 1. Explicit `platform` field in claws.json config
 * 2. SDK marker-file detection with enforcement-based resolution
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param config - Parsed claws.json (may be null)
 * @returns DetectResult with resolved platform
 * @throws {Error} When no platforms are detected and no config override exists
 */
export async function detectPlatform(
  workspaceRoot: string,
  config: ClawsJsonConfig | null,
): Promise<DetectResult> {
  // Run SDK detection
  const inventory = await detect(workspaceRoot);

  // Config override: explicit platform in claws.json
  if (config?.platform) {
    if (!VALID_PLATFORMS.has(config.platform)) {
      throw new Error(
        `Invalid platform "${config.platform}" in claws.json. ` +
        `Valid platforms: ${[...VALID_PLATFORMS].join(', ')}`,
      );
    }
    const configPlatform = config.platform as Platform;
    const resolveConfig: ResolveConfig = { targets: [configPlatform] };

    // If the platform is detected, resolve using config override
    if (inventory.detected && inventory.platforms.has(configPlatform)) {
      const target = resolve(inventory, resolveConfig);
      return {
        platform: configPlatform,
        method: 'config',
        target,
        inventory,
      };
    }

    // Platform specified in config but not detected — fail fast
    // Config explicitly names a platform; silently ignoring it would be surprising.
    if (inventory.detected) {
      throw new Error(
        `Platform "${configPlatform}" specified in claws.json but could not be resolved. ` +
        `Detected platforms: ${[...inventory.platforms.keys()].join(', ')}. ` +
        `Either update claws.json or add the appropriate marker files.`,
      );
    }

    throw new Error(
      `Platform "${configPlatform}" specified in claws.json but no platforms were detected. ` +
      `Run \`claws init\` to set up workspace markers.`,
    );
  }

  // Auto-detection via SDK resolve
  const target = resolve(inventory);
  const platform = target.primary.marker.platform;

  return {
    platform,
    method: 'auto-detect',
    target,
    inventory,
  };
}
