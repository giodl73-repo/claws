/**
 * `claws uninstall` command — thin CLI adapter for workspace uninstall.
 *
 * All business logic lives in @bic/claws-sdk/init.
 * This module parses CLI options and renders the SDK result.
 *
 * @module claws-cli/commands/uninstall
 */

import { uninstallWorkspace } from '@bic/claws-sdk/init';

import { formatError, formatErrorJson } from '../output/errors.js';
import type { ClawsError } from '../output/errors.js';

/**
 * Uninstall command options.
 */
export interface UninstallOptions {
  readonly json: boolean;
}

/**
 * Run the uninstall command: delegates to SDK, renders result.
 *
 * @param workspaceRoot - Absolute path to workspace root (cwd)
 * @param opts - Command options (json)
 * @returns Exit code (0=success/no-op, 3=runtime error)
 */
export async function runUninstall(
  workspaceRoot: string,
  opts: UninstallOptions,
): Promise<number> {
  try {
    const result = await uninstallWorkspace(workspaceRoot);

    if (result.status === 'no-op') {
      if (opts.json) {
        console.log(JSON.stringify({ status: 'no-op', message: 'No .claws/ directory found.' }));
      } else {
        console.log('Nothing to uninstall — no .claws/ directory found.');
      }
      return 0;
    }

    if (opts.json) {
      console.log(JSON.stringify({
        status: result.status,
        backupPath: result.backupPath ?? null,
        auditArchivePath: result.auditArchivePath ?? null,
        gitignoreRemoved: result.gitignoreRemoved ?? [],
      }));
    } else {
      console.log(result.backupPath
        ? `Uninstalled. Backup at: ${result.backupPath}`
        : 'Uninstalled.');
      if (result.auditArchivePath) {
        console.log(`Audit chain archived at: ${result.auditArchivePath}`);
      }
    }

    return 0;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const uninstallErr: ClawsError = {
      code: 'CLAWS-E085',
      what: `Uninstall failed: ${reason}`,
      howToFix: 'Check write permissions and that no other process is using .claws/.',
      docsRef: 'Run `claws help CLAWS-E085` for details',
    };
    console.error(opts.json ? formatErrorJson(uninstallErr) : formatError(uninstallErr));
    return 3;
  }
}
