/**
 * write-atomic — atomic trust-set rotation primitive for the P-04 fixture.
 *
 * CL-11 §3a requires trust-set updates to land via same-drive `fs.rename`
 * so the policy runtime's `fs.watch` only ever observes a fully-written
 * file. A partial write would bounce the runtime through a transient
 * "no allowed tiers" state, which is the very bug P-04 guards against.
 *
 * The primitive:
 *   1. writes the new bytes to a sibling `<target>.tmp-<uuid>`
 *   2. fsyncs the data to durable storage
 *   3. renames `.tmp-<uuid>` → target (POSIX atomic rename; on Windows the
 *      NT rename is atomic per-volume as long as source+dest share a drive)
 *   4. fsyncs the containing directory so the rename is durable
 *
 * The helper lives in the fixture so scenarios can invoke it directly
 * without threading harness imports through fixture boundaries.
 *
 * Scenarios use:
 *
 *   import { writeTrustSetAtomic } from './write-atomic.ts';
 *   await writeTrustSetAtomic(tmpFixtureDir, 'trust-set.v1.json');
 *
 * This reads `seed/trust-set.v1.json` from the fixture tree, writes it to
 * `.openclaw/policy/trust-set.json` inside `tmpFixtureDir` via atomic
 * rename, and returns the absolute path to the landed file.
 */

import { randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export interface WriteTrustSetResult {
  readonly path: string;
  readonly revision: string;
}

/**
 * Read one of the seed trust-set JSONs and atomically write it to the
 * policy directory inside `tmpFixtureDir`. Returns the absolute path to
 * the landed file along with the revision string parsed from the seed.
 *
 * Throws when the seed is missing, when the policy directory parent cannot
 * be created, or when source and target land on different drive letters
 * (Windows) — a cross-drive rename degrades to copy+unlink which is NOT
 * atomic and would defeat the P-04 guarantee.
 */
export async function writeTrustSetAtomic(
  tmpFixtureDir: string,
  seedFile: 'trust-set.v1.json' | 'trust-set.v2.json',
): Promise<WriteTrustSetResult> {
  const seedPath = join(HERE, 'seed', seedFile);
  const seedBytes = await readFile(seedPath);

  const policyDir = join(tmpFixtureDir, '.openclaw', 'policy');
  await mkdir(policyDir, { recursive: true });

  const target = join(policyDir, 'trust-set.json');
  assertSameDrive(seedPath, target);

  const staging = join(policyDir, `trust-set.json.tmp-${randomUUID()}`);

  // 1. write the bytes to a staging file alongside the target. Using the
  //    same directory guarantees the rename stays on the same volume.
  await writeFile(staging, seedBytes);

  // 2. fsync the data to durable storage before the rename.
  const stagingHandle = await open(staging, 'r+');
  try {
    await stagingHandle.sync();
  } finally {
    await stagingHandle.close();
  }

  // 3. atomic rename — POSIX guarantees this; on Windows, ReplaceFile
  //    (which is what Node's rename resolves to when the target exists)
  //    is atomic per-volume.
  await rename(staging, target);

  // 4. fsync the directory so the rename metadata survives a crash.
  //    Windows does not expose directory fsync; open() of a directory
  //    fails there, so the sync is best-effort-skipped.
  await syncDirectoryBestEffort(policyDir);

  const revision = parseRevision(seedBytes);
  return { path: target, revision };
}

function assertSameDrive(seedPath: string, targetPath: string): void {
  if (process.platform !== 'win32') {
    return;
  }
  const seedDrive = parse(seedPath).root.toLowerCase();
  const targetDrive = parse(targetPath).root.toLowerCase();
  if (seedDrive !== targetDrive) {
    throw new Error(
      `write-atomic: seed (${seedDrive}) and target (${targetDrive}) must ` +
        `share a drive for atomic rename — CL-11 §3a.`,
    );
  }
}

async function syncDirectoryBestEffort(dir: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }
  try {
    const handle = await open(dir, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch {
    // Best-effort; some filesystems reject directory fsync.
  }
}

function parseRevision(bytes: Buffer): string {
  const parsed = JSON.parse(bytes.toString('utf8')) as { revision?: unknown };
  if (typeof parsed.revision !== 'string') {
    throw new Error('write-atomic: seed JSON missing string `revision`.');
  }
  return parsed.revision;
}
