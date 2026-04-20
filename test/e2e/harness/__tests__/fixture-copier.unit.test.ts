import { describe, it, expect, afterEach } from 'vitest';
import {
  mkdtemp,
  mkdir,
  rm,
  readFile,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  copyFixture,
  SymlinkEscapeError,
  UncleanSourceError,
} from '../fixture-copier.ts';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeSourceFixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pulse36-src-'));
  createdDirs.push(dir);
  await mkdir(join(dir, 'nested'), { recursive: true });
  await writeFile(join(dir, 'SOUL.md'), '# soul\n', 'utf8');
  await writeFile(join(dir, 'nested', 'TOOLS.md'), 'nested file\n', 'utf8');
  return dir;
}

describe('copyFixture — deep copy + source immutability', () => {
  it('produces a new directory under os.tmpdir() with full contents copied', async () => {
    const src = await makeSourceFixture();
    const dest = await copyFixture(src, 'deep-copy');
    createdDirs.push(dest);

    expect(dest.startsWith(tmpdir())).toBe(true);
    expect(dest).toMatch(/claws-harness-deep-copy-/);

    const soul = await readFile(join(dest, 'SOUL.md'), 'utf8');
    expect(soul).toBe('# soul\n');
    const tools = await readFile(join(dest, 'nested', 'TOOLS.md'), 'utf8');
    expect(tools).toBe('nested file\n');
  });

  it('does not mutate the source after copying', async () => {
    const src = await makeSourceFixture();
    const before = await readFile(join(src, 'SOUL.md'), 'utf8');

    const dest = await copyFixture(src, 'source-immutable');
    createdDirs.push(dest);

    // Mutating the copy must not affect the source.
    await writeFile(join(dest, 'SOUL.md'), 'MUTATED\n', 'utf8');

    const after = await readFile(join(src, 'SOUL.md'), 'utf8');
    expect(after).toBe(before);
  });

  it('refuses to copy a source that already contains .openclaw/policy/', async () => {
    const src = await makeSourceFixture();
    await mkdir(join(src, '.openclaw', 'policy'), { recursive: true });
    await writeFile(
      join(src, '.openclaw', 'policy', 'policy-ir.json'),
      '{}',
      'utf8',
    );

    await expect(copyFixture(src, 'unclean')).rejects.toBeInstanceOf(
      UncleanSourceError,
    );
  });

  it('rejects an empty scenarioId', async () => {
    const src = await makeSourceFixture();
    await expect(copyFixture(src, '')).rejects.toThrow(/non-empty/);
  });

  it('rejects a scenarioId with filesystem-unsafe characters', async () => {
    const src = await makeSourceFixture();
    await expect(copyFixture(src, '../escape')).rejects.toThrow(
      /scenarioId must match/,
    );
    await expect(copyFixture(src, 'a/b')).rejects.toThrow(/scenarioId must match/);
    await expect(copyFixture(src, ' leading-space')).rejects.toThrow(
      /scenarioId must match/,
    );
  });

  it('reports a clear error when the source path does not exist', async () => {
    const phantom = join(tmpdir(), `pulse36-does-not-exist-${Date.now()}`);
    await expect(copyFixture(phantom, 'missing')).rejects.toThrow(
      /does not exist/,
    );
  });

  it('reports a clear error when the source is a file, not a directory', async () => {
    const containing = await mkdtemp(join(tmpdir(), 'pulse36-notdir-'));
    createdDirs.push(containing);
    const filePath = join(containing, 'not-a-dir.txt');
    await writeFile(filePath, 'x', 'utf8');
    await expect(copyFixture(filePath, 'not-a-dir')).rejects.toThrow(
      /not a directory/,
    );
  });

  it('deep-copies multi-level nested directories and preserves mtime', async () => {
    const src = await mkdtemp(join(tmpdir(), 'pulse36-deep-'));
    createdDirs.push(src);
    await mkdir(join(src, 'a', 'b', 'c'), { recursive: true });
    await writeFile(join(src, 'a', 'top.md'), 'top\n', 'utf8');
    await writeFile(join(src, 'a', 'b', 'mid.md'), 'mid\n', 'utf8');
    await writeFile(join(src, 'a', 'b', 'c', 'leaf.md'), 'leaf\n', 'utf8');

    const srcLeafMtime = (await stat(join(src, 'a', 'b', 'c', 'leaf.md'))).mtimeMs;

    const dest = await copyFixture(src, 'deep-nested');
    createdDirs.push(dest);

    expect(await readFile(join(dest, 'a', 'top.md'), 'utf8')).toBe('top\n');
    expect(await readFile(join(dest, 'a', 'b', 'mid.md'), 'utf8')).toBe(
      'mid\n',
    );
    expect(await readFile(join(dest, 'a', 'b', 'c', 'leaf.md'), 'utf8')).toBe(
      'leaf\n',
    );

    const destLeafMtime = (await stat(join(dest, 'a', 'b', 'c', 'leaf.md')))
      .mtimeMs;
    // utimes precision varies by OS; allow sub-second drift.
    expect(Math.abs(destLeafMtime - srcLeafMtime)).toBeLessThan(2000);
  });

  it('rejects a symlink (junction) pointing outside the source root', async () => {
    const src = await mkdtemp(join(tmpdir(), 'pulse36-escape-'));
    createdDirs.push(src);
    await writeFile(join(src, 'SOUL.md'), '# soul\n', 'utf8');

    const outside = await mkdtemp(join(tmpdir(), 'pulse36-outside-'));
    createdDirs.push(outside);
    await writeFile(join(outside, 'leak.txt'), 'leak', 'utf8');

    // Try to create an escaping symlink. On Windows this requires dev
    // mode or admin; fall back to a junction (allowed without elevation).
    try {
      await symlink(outside, join(src, 'escape'));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EPERM') throw err;
      try {
        await symlink(outside, join(src, 'escape'), 'junction');
      } catch (err2) {
        // Even junctions can fail in locked-down CI; skip.
        if ((err2 as NodeJS.ErrnoException).code === 'EPERM') return;
        throw err2;
      }
    }

    await expect(copyFixture(src, 'escape-test')).rejects.toBeInstanceOf(
      SymlinkEscapeError,
    );
  });

  it('rejects every symlink found in the source, including internal ones', async () => {
    const src = await mkdtemp(join(tmpdir(), 'pulse36-internal-link-'));
    createdDirs.push(src);
    await writeFile(join(src, 'target.txt'), 'inside-target', 'utf8');

    // A symlink to another file in the same root is still rejected —
    // fixtures are plain trees. Use a junction to a sibling directory
    // when the platform refuses file-level symlinks (Windows without
    // Developer Mode).
    const innerDir = join(src, 'inner');
    await mkdir(innerDir, { recursive: true });
    await writeFile(join(innerDir, 'payload.txt'), 'payload', 'utf8');

    let symlinkCreated = false;
    try {
      await symlink(join(src, 'target.txt'), join(src, 'alias.txt'));
      symlinkCreated = true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EPERM') throw err;
      // Fall back to a junction to the inner dir (junctions don't need
      // elevation on Windows). The contract still applies: any symlink
      // is rejected.
      try {
        await symlink(innerDir, join(src, 'inner-junction'), 'junction');
        symlinkCreated = true;
      } catch (err2) {
        if ((err2 as NodeJS.ErrnoException).code === 'EPERM') return;
        throw err2;
      }
    }

    expect(symlinkCreated).toBe(true);
    await expect(copyFixture(src, 'internal-link')).rejects.toBeInstanceOf(
      SymlinkEscapeError,
    );
  });

  it('resolves the source path through realpath before scanning', async () => {
    // Non-canonical input (trailing separator, relative `.`): copyFixture
    // must canonicalize before comparing paths.
    const src = await mkdtemp(join(tmpdir(), 'pulse36-canon-'));
    createdDirs.push(src);
    await writeFile(join(src, 'x.txt'), 'x', 'utf8');

    const canonicalSrc = realpathSync.native(src);
    const dest = await copyFixture(canonicalSrc + '/.', 'canon');
    createdDirs.push(dest);

    expect(await readFile(join(dest, 'x.txt'), 'utf8')).toBe('x');
  });
});
