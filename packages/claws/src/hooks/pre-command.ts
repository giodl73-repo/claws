/**
 * Pre-command hook — workspace detection, config loading, bypass check.
 *
 * Runs before every claws command. Loads claws.json if present,
 * detects workspace root, and checks CLAWS_BYPASS=1 environment variable.
 *
 * @module claws-cli/hooks/pre-command
 */

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { fileExists } from '../core/fs.js';

/**
 * Platform context propagated to all commands.
 */
export interface PlatformContext {
  /** Absolute path to workspace root (where claws.json lives). */
  readonly workspaceRoot: string;
  /** Whether claws.json was found. */
  readonly hasConfig: boolean;
  /** Parsed claws.json content (null if not found). */
  readonly config: ClawsJsonConfig | null;
  /** Whether CLAWS_BYPASS=1 is set. */
  readonly bypass: boolean;
  /** Rule IDs to suppress (from claws.json suppress array). */
  readonly suppressedRules: readonly string[];
}

/**
 * Minimal claws.json shape used by pre-command hook.
 */
export interface ClawsJsonConfig {
  readonly trustTier?: number;
  readonly suppress?: readonly string[];
  readonly platform?: string;
}

/**
 * Load and parse claws.json from the given directory.
 * Returns null if the file doesn't exist or is malformed.
 */
async function loadClawsJson(dir: string): Promise<ClawsJsonConfig | null> {
  const configPath = join(dir, 'claws.json');
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content) as ClawsJsonConfig;
  } catch {
    return null;
  }
}

/**
 * Detect the workspace root by searching for claws.json.
 * Starts from cwd and walks upward. Returns cwd if not found.
 */
async function detectWorkspaceRoot(startDir: string): Promise<{ root: string; found: boolean }> {
  let dir = resolve(startDir);

  for (;;) {
    if (await fileExists(join(dir, 'claws.json'))) {
      return { root: dir, found: true };
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break; // filesystem root reached
    dir = parent;
  }

  return { root: resolve(startDir), found: false };
}

/**
 * Run pre-command hook: detect workspace, load config, check bypass.
 *
 * @param cwd - Current working directory (defaults to process.cwd())
 * @returns PlatformContext for downstream commands
 */
export async function preCommand(cwd?: string): Promise<PlatformContext> {
  const startDir = cwd ?? process.cwd();
  const { root, found } = await detectWorkspaceRoot(startDir);
  const config = found ? await loadClawsJson(root) : null;
  const bypass = process.env['CLAWS_BYPASS'] === '1';
  const suppressedRules = config?.suppress ?? [];

  return {
    workspaceRoot: root,
    hasConfig: found,
    config,
    bypass,
    suppressedRules,
  };
}
