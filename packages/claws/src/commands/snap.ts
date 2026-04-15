/**
 * `claws snap` command — snapshot save, restore, list, delete.
 *
 * Thin CLI adapter: calls SDK snapshot functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/snap
 */

import {
  save,
  restore,
  list,
  remove,
  exists,
  diff,
  renderDiff,
  renderDiffJson,
  TamperError,
  promote,
  PromotionError,
  listVersions,
} from '@bic/claws-sdk/snapshot';

/**
 * Options for snap subcommands.
 */
export interface SnapOptions {
  readonly json: boolean;
}

/**
 * Extended options for the promote subcommand.
 */
export interface SnapPromoteOptions extends SnapOptions {
  /** Fleet root directory for the registry. */
  readonly fleet: string;
  /** Signer identifier. Default: 'local'. */
  readonly signer?: string;
}

/**
 * `claws snap save <name>` — save a snapshot.
 *
 * @returns Exit code (0=success, 3=error)
 */
export async function runSnapSave(
  workspaceRoot: string,
  name: string,
  opts: SnapOptions,
): Promise<number> {
  try {
    const result = await save(workspaceRoot, name);
    if (opts.json) {
      console.log(JSON.stringify({
        status: 'ok',
        snapshot: result.name,
        fileCount: result.fileCount,
        timestamp: result.manifest.timestamp,
        workspaceHash: result.manifest.workspaceHash,
      }));
    } else {
      console.log(`Snapshot "${result.name}" saved (${result.fileCount} files)`);
    }
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return 3;
  }
}

/**
 * `claws snap restore <name>` — restore a snapshot.
 *
 * @returns Exit code (0=success, 1=tamper, 3=error)
 */
export async function runSnapRestore(
  workspaceRoot: string,
  name: string,
  opts: SnapOptions,
): Promise<number> {
  try {
    const result = await restore(workspaceRoot, name);
    if (opts.json) {
      console.log(JSON.stringify({
        status: 'ok',
        snapshot: result.name,
        fileCount: result.fileCount,
      }));
    } else {
      console.log(`Snapshot "${result.name}" restored (${result.fileCount} files)`);
    }
    return 0;
  } catch (err) {
    if (err instanceof TamperError) {
      if (opts.json) {
        console.error(JSON.stringify({
          status: 'tamper',
          message: err.message,
          failedFiles: err.failedFiles,
        }));
      } else {
        console.error(`Tamper detected: ${err.message}`);
        for (const f of err.failedFiles) {
          console.error(`  ${f.relativePath}: ${f.reason}`);
        }
      }
      return 1;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return 3;
  }
}

/**
 * `claws snap list` — list all snapshots.
 *
 * @returns Exit code (0=success)
 */
export async function runSnapList(
  workspaceRoot: string,
  opts: SnapOptions,
): Promise<number> {
  const snapshots = await list(workspaceRoot);
  if (opts.json) {
    console.log(JSON.stringify({ status: 'ok', snapshots }));
  } else if (snapshots.length === 0) {
    console.log('No snapshots found.');
  } else {
    console.log('Snapshots:');
    for (const s of snapshots) {
      console.log(`  ${s.name}  ${s.timestamp}  (${s.fileCount} files)`);
    }
  }
  return 0;
}

/**
 * `claws snap delete <name>` — delete a snapshot.
 *
 * @returns Exit code (0=success, 3=error)
 */
export async function runSnapDelete(
  workspaceRoot: string,
  name: string,
  opts: SnapOptions,
): Promise<number> {
  const found = await exists(workspaceRoot, name);
  if (!found) {
    const message = `Snapshot "${name}" not found`;
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(message);
    }
    return 3;
  }

  await remove(workspaceRoot, name);
  if (opts.json) {
    console.log(JSON.stringify({ status: 'ok', deleted: name }));
  } else {
    console.log(`Snapshot "${name}" deleted.`);
  }
  return 0;
}

/**
 * `claws snap diff <name1> <name2>` — governance-aware semantic diff.
 *
 * @returns Exit code (0=success, 1=tamper, 3=error)
 */
export async function runSnapDiff(
  workspaceRoot: string,
  baseName: string,
  targetName: string,
  opts: SnapOptions,
): Promise<number> {
  try {
    const result = await diff(workspaceRoot, baseName, targetName);
    if (opts.json) {
      console.log(JSON.stringify(renderDiffJson(result)));
    } else {
      const lines = renderDiff(result);
      for (const line of lines) {
        console.log(line);
      }
    }
    return 0;
  } catch (err) {
    if (err instanceof TamperError) {
      if (opts.json) {
        console.error(JSON.stringify({
          status: 'tamper',
          message: err.message,
          failedFiles: err.failedFiles,
        }));
      } else {
        console.error(`Tamper detected: ${err.message}`);
        for (const f of err.failedFiles) {
          console.error(`  ${f.relativePath}: ${f.reason}`);
        }
      }
      return 1;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return 3;
  }
}

/**
 * `claws snap promote <name> [--fleet dir]` — promote snapshot to fleet registry.
 *
 * @returns Exit code (0=success, 1=tamper, 2=pinch gate failed, 3=error)
 */
export async function runSnapPromote(
  workspaceRoot: string,
  name: string,
  opts: SnapPromoteOptions,
): Promise<number> {
  try {
    const promoteOpts: { signer?: string } = {};
    if (opts.signer) promoteOpts.signer = opts.signer;
    const result = await promote(workspaceRoot, name, opts.fleet, promoteOpts);
    if (opts.json) {
      console.log(JSON.stringify({
        status: 'ok',
        snapshot: result.name,
        version: result.version,
        provenance: result.provenance,
      }));
    } else {
      console.log(
        `Snapshot "${result.name}" promoted to fleet registry v${result.version}`,
      );
      console.log(`  signer:        ${result.provenance.signer}`);
      console.log(`  bundleHash:    ${result.provenance.bundleHash.slice(0, 16)}...`);
      console.log(`  workspaceHash: ${result.provenance.workspaceHash.slice(0, 16)}...`);
      console.log(`  timestamp:     ${result.provenance.timestamp}`);
    }
    return 0;
  } catch (err) {
    if (err instanceof TamperError) {
      if (opts.json) {
        console.error(JSON.stringify({
          status: 'tamper',
          message: err.message,
          failedFiles: err.failedFiles,
        }));
      } else {
        console.error(`Tamper detected: ${err.message}`);
        for (const f of err.failedFiles) {
          console.error(`  ${f.relativePath}: ${f.reason}`);
        }
      }
      return 1;
    }
    if (err instanceof PromotionError) {
      if (opts.json) {
        console.error(JSON.stringify({
          status: 'pinch_failed',
          message: err.message,
          violations: err.violations,
        }));
      } else {
        console.error(`Promotion blocked: ${err.message}`);
        for (const v of err.violations) {
          console.error(`  [${v.ruleId}] ${v.target}: ${v.message}`);
        }
      }
      return 2;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return 3;
  }
}
