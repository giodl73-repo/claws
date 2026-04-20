import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { guardPath, PathGuardError } from '../path-guard.ts';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeRoot(): Promise<string> {
  const dir = realpathSync.native(await mkdtemp(join(tmpdir(), 'pulse36-guard-')));
  createdDirs.push(dir);
  await mkdir(join(dir, 'inside', 'deeper'), { recursive: true });
  await writeFile(join(dir, 'inside', 'ok.txt'), 'ok', 'utf8');
  return dir;
}

describe('guardPath — traversal rejection', () => {
  it('rejects a `..` candidate that escapes the root', async () => {
    const root = await makeRoot();
    expect(() => guardPath(root, '../outside')).toThrow(PathGuardError);
    expect(() => guardPath(root, '../outside')).toThrow(/traversal/);
  });

  it('rejects a symlink whose real target is outside the root', async () => {
    const root = await makeRoot();
    const sibling = realpathSync.native(
      await mkdtemp(join(tmpdir(), 'pulse36-guard-outside-')),
    );
    createdDirs.push(sibling);
    await writeFile(join(sibling, 'secret.txt'), 'leak', 'utf8');

    try {
      await symlink(join(sibling, 'secret.txt'), join(root, 'escape'));
    } catch (err) {
      // Windows without developer mode refuses to create symlinks. Skip —
      // the guard's symlink rejection is exercised on platforms where it
      // can actually be instantiated.
      if ((err as NodeJS.ErrnoException).code === 'EPERM') return;
      throw err;
    }

    expect(() => guardPath(root, 'escape')).toThrow(PathGuardError);
    expect(() => guardPath(root, 'escape')).toThrow(/symlink/);
  });

  it('accepts a candidate nested inside the root', async () => {
    const root = await makeRoot();
    const resolved = guardPath(root, 'inside/deeper');
    expect(resolved.startsWith(root)).toBe(true);
  });

  it('rejects an absolute candidate', async () => {
    const root = await makeRoot();
    expect(() => guardPath(root, join(root, 'inside'))).toThrow(PathGuardError);
    expect(() => guardPath(root, join(root, 'inside'))).toThrow(/absolute/);
  });

  it('rejects a Windows 8.3 short-name segment', async () => {
    const root = await makeRoot();
    // Typical DOS-ish short name: `PROGRA~1` would appear in a candidate
    // that tried to traverse via legacy filesystem aliases.
    expect(() => guardPath(root, 'PROGRA~1/inside')).toThrow(PathGuardError);
    expect(() => guardPath(root, 'PROGRA~1/inside')).toThrow(/short-name/);
    // Numeric suffix variation.
    expect(() => guardPath(root, 'inside/NAME~12')).toThrow(/short-name/);
  });

  it('accepts a candidate targeting a path that does not yet exist', async () => {
    const root = await makeRoot();
    // The guard is used when validating a destination path we are about
    // to write to — that path won't exist yet, so realpath falls back to
    // its loose walk-up helper.
    const resolved = guardPath(root, 'inside/new-subdir/new-file.txt');
    expect(resolved.startsWith(root)).toBe(true);
    expect(resolved.endsWith('new-file.txt')).toBe(true);
  });

  it('rejects a directory junction inside the root that escapes via realpath', async () => {
    const root = await makeRoot();
    const outside = realpathSync.native(
      await mkdtemp(join(tmpdir(), 'pulse36-guard-outside-dir-')),
    );
    createdDirs.push(outside);

    // Junctions work on Windows without elevation and persist realpath
    // resolution outside the root — exactly the escape case the guard
    // needs to catch.
    try {
      await symlink(outside, join(root, 'dir-junction'), 'junction');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EPERM') return;
      throw err;
    }

    expect(() => guardPath(root, 'dir-junction')).toThrow(PathGuardError);
    expect(() => guardPath(root, 'dir-junction')).toThrow(/symlink/);
  });

  it('surfaces reason and candidate fields on the structured error', async () => {
    const root = await makeRoot();
    try {
      guardPath(root, '../escape-two');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PathGuardError);
      const pge = err as PathGuardError;
      expect(pge.reason).toBe('traversal');
      expect(pge.candidate).toBe('../escape-two');
    }
  });
});
