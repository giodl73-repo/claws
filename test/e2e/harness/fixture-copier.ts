/**
 * fixture-copier — deep-copy a fixture tree into a per-scenario tmp dir.
 *
 * Contract:
 * - Source is NEVER mutated. Caller runs `claws policy generate` against
 *   the returned copy.
 * - File bytes are preserved verbatim (CRLF and UTF-8 BOM survive round-trip).
 * - Refuses a "dirty" source that already contains `.openclaw/policy/`.
 * - Refuses a source containing symlinks that escape the source root.
 * - Tmp dirs are labelled `claws-harness-{scenarioId}-{uuid}/` so the
 *   presuite-hygiene sweep (pulse 37) can find and reap them.
 */

import { randomUUID } from 'node:crypto';
import {
  copyFile,
  mkdir,
  readdir,
  readlink,
  stat,
  utimes,
} from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

export class UncleanSourceError extends Error {
  constructor(sourcePath: string) {
    super(
      `source fixture contains a generated .openclaw/policy/ tree: ${sourcePath}. ` +
        `Fixtures must be pristine — remove .openclaw/policy/ before running.`,
    );
    this.name = 'UncleanSourceError';
  }
}

export class SymlinkEscapeError extends Error {
  constructor(linkPath: string, target: string) {
    super(
      `symlink escapes source root: ${linkPath} -> ${target}. ` +
        `Fixture symlinks must stay inside the fixture tree.`,
    );
    this.name = 'SymlinkEscapeError';
  }
}

const TMP_PREFIX = 'claws-harness';

/**
 * Copy `source` into `os.tmpdir()/claws-harness-{scenarioId}-{uuid}/` and
 * return the absolute path to the copy.
 */
export async function copyFixture(
  source: string,
  scenarioId: string,
): Promise<string> {
  validateScenarioId(scenarioId);

  const sourceReal = resolveReal(source);
  await assertCleanSource(sourceReal);

  const destRoot = await makeTmpDir(scenarioId);
  await deepCopy(sourceReal, destRoot, sourceReal);
  return destRoot;
}

function validateScenarioId(scenarioId: string): void {
  if (scenarioId.length === 0) {
    throw new Error('scenarioId must be non-empty');
  }
  // Restrict to a filesystem-safe alphabet so tmp names stay predictable
  // for the sweep and don't accidentally contain separators.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(scenarioId)) {
    throw new Error(
      `scenarioId must match /^[A-Za-z0-9][A-Za-z0-9._-]*$/: ${scenarioId}`,
    );
  }
}

function resolveReal(p: string): string {
  const abs = resolve(p);
  try {
    return realpathSync.native(abs);
  } catch (err) {
    throw new Error(
      `source fixture does not exist: ${p} (${(err as Error).message})`,
    );
  }
}

async function assertCleanSource(sourceReal: string): Promise<void> {
  const rootStat = await stat(sourceReal);
  if (!rootStat.isDirectory()) {
    throw new Error(`source fixture is not a directory: ${sourceReal}`);
  }
  const policyDir = join(sourceReal, '.openclaw', 'policy');
  // Any presence of `.openclaw/policy` — file or directory — means the
  // source was previously run through `claws policy generate`. Treat that
  // as unclean so fixture authors notice and wipe it.
  const policyExists = await pathExists(policyDir);
  if (policyExists) {
    throw new UncleanSourceError(sourceReal);
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function makeTmpDir(scenarioId: string): Promise<string> {
  const uuid = randomUUID();
  const dir = join(tmpdir(), `${TMP_PREFIX}-${scenarioId}-${uuid}`);
  await mkdir(dir, { recursive: true });
  // Resolve symlinks on the tmp root (macOS points /tmp -> /private/tmp;
  // on Windows, the user's %TEMP% can live under an 8.3 alias). Callers
  // that walk back up from a copied file need a stable root.
  return realpathSync.native(dir);
}

async function deepCopy(
  srcRoot: string,
  destRoot: string,
  currentSrc: string,
): Promise<void> {
  const entries = await readdir(currentSrc, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(currentSrc, entry.name);
    const rel = relative(srcRoot, srcPath);
    const destPath = join(destRoot, rel);

    if (entry.isSymbolicLink()) {
      // Any symlink in a fixture is treated as an escape risk and rejected.
      // Fixtures are plain trees — symlinks complicate byte-fidelity
      // guarantees (target bytes may live outside the source root, or the
      // target may not exist at all on CI). readlink gives the link
      // contents for the diagnostic.
      const target = await readlink(srcPath);
      throw new SymlinkEscapeError(srcPath, target);
    }

    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      await deepCopy(srcRoot, destRoot, srcPath);
      continue;
    }
    // Regular file (or anything non-dir non-symlink that `copyFile` can
    // handle). Fixtures never contain sockets/FIFOs/device files.
    await copyFileByteExact(srcPath, destPath);
  }

  // Set directory mtime last so file copies inside don't bump it again.
  try {
    const st = await stat(currentSrc);
    await utimes(
      join(destRoot, relative(srcRoot, currentSrc)),
      st.atime,
      st.mtime,
    );
  } catch {
    // Non-fatal: directory mtime preservation is best-effort on Windows,
    // where it often reflects "time of last file update" rather than
    // whatever we set.
  }
}


/**
 * Byte-exact file copy. `fs.copyFile` is a syscall-level copy — it never
 * decodes text, so CRLF line endings and the UTF-8 BOM survive. After the
 * copy, atime/mtime are aligned to the source so fixture staleness heuristics
 * elsewhere don't misfire.
 */
async function copyFileByteExact(src: string, dest: string): Promise<void> {
  await copyFile(src, dest);
  const st = await stat(src);
  await utimes(dest, st.atime, st.mtime);
}
