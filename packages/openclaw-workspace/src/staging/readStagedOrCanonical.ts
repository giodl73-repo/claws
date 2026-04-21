/**
 * @bic/openclaw-workspace/staging — read workspace files preferring staged
 * content over canonical.
 *
 * Contract (matches openclaw-upstream `snap-commands.md`): a file present
 * in `<root>/.stage/<path>` takes precedence over the same `<path>` in the
 * canonical working tree. Returns a `Record<relativePath, utf-8 string>`
 * whose keys are forward-slash paths relative to `root`. Hidden
 * directories (any path segment starting with `.`) other than `.stage`
 * itself are skipped — this keeps `.git`, `.openclaw`, and tooling caches
 * out of snapshots.
 *
 * This helper is the *read* half of the snap upload pipeline; handler
 * bodies in `@bic/openclaw-snap/cli-handlers/*` must never touch `fs`
 * directly (R1 M8 — fs-read lives in the workspace library, not the
 * handler).
 *
 * @module @bic/openclaw-workspace/staging
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const STAGE_DIR = '.stage';

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

function isHidden(relPath: string): boolean {
  const segments = relPath.split('/');
  return segments.some((s) => s.length > 0 && s.startsWith('.'));
}

async function walk(root: string, current: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = join(current, entry.name);
    const rel = toPosix(relative(root, abs));
    if (entry.isDirectory()) {
      if (isHidden(rel)) continue;
      await walk(root, abs, out);
    } else if (entry.isFile()) {
      if (isHidden(rel)) continue;
      out.push(rel);
    }
  }
}

/**
 * Read workspace files from `<root>` preferring content at
 * `<root>/.stage/<path>` over canonical `<root>/<path>`.
 *
 * Paths are returned as forward-slash keys relative to `root`. UTF-8 is
 * the only supported encoding — binary files are out of scope for the
 * OpenClaw workspace (it's text files all the way down).
 */
export async function readStagedOrCanonical(
  root: string,
): Promise<Record<string, string>> {
  const canonicalFiles: string[] = [];
  await walk(root, root, canonicalFiles);

  const stageRoot = join(root, STAGE_DIR);
  let stageExists = false;
  try {
    const st = await stat(stageRoot);
    stageExists = st.isDirectory();
  } catch {
    stageExists = false;
  }

  const stagedFiles: string[] = [];
  if (stageExists) {
    await walk(stageRoot, stageRoot, stagedFiles);
  }

  const files: Record<string, string> = {};
  for (const rel of canonicalFiles) {
    const abs = join(root, ...rel.split('/'));
    files[rel] = await readFile(abs, 'utf-8');
  }
  for (const rel of stagedFiles) {
    const abs = join(stageRoot, ...rel.split('/'));
    files[rel] = await readFile(abs, 'utf-8');
  }

  const ordered: Record<string, string> = {};
  for (const key of Object.keys(files).sort()) {
    ordered[key] = files[key] as string;
  }
  return ordered;
}
