/**
 * L1 unit: readStagedOrCanonical + writeSnapshotFiles + clearStage.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  readStagedOrCanonical,
  writeAtomic,
  writeSnapshotFiles,
  clearStage,
} from '../../src/staging/index.js';

function freshRoot(prefix = 'staging-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe('readStagedOrCanonical', () => {
  it('reads canonical files as a sorted posix-keyed map', async () => {
    const root = freshRoot();
    writeFileSync(join(root, 'b.md'), 'B');
    mkdirSync(join(root, 'nested'));
    writeFileSync(join(root, 'nested', 'a.md'), 'NA');

    const files = await readStagedOrCanonical(root);
    expect(Object.keys(files)).toEqual(['b.md', 'nested/a.md']);
    expect(files['b.md']).toBe('B');
    expect(files['nested/a.md']).toBe('NA');
  });

  it('staged content overrides canonical for the same relative path', async () => {
    const root = freshRoot();
    writeFileSync(join(root, 'AGENTS.md'), 'old');
    mkdirSync(join(root, '.stage'));
    writeFileSync(join(root, '.stage', 'AGENTS.md'), 'new');

    const files = await readStagedOrCanonical(root);
    expect(files['AGENTS.md']).toBe('new');
  });

  it('skips hidden directories except the .stage overlay itself', async () => {
    const root = freshRoot();
    writeFileSync(join(root, 'A.md'), 'a');
    mkdirSync(join(root, '.git'));
    writeFileSync(join(root, '.git', 'HEAD'), 'ref');
    mkdirSync(join(root, '.stage'));
    writeFileSync(join(root, '.stage', 'B.md'), 'b');

    const files = await readStagedOrCanonical(root);
    expect(Object.keys(files).sort()).toEqual(['A.md', 'B.md']);
  });

  it('skips hidden files at any level', async () => {
    const root = freshRoot();
    writeFileSync(join(root, 'A.md'), 'a');
    writeFileSync(join(root, '.hidden'), 'nope');
    const files = await readStagedOrCanonical(root);
    expect(Object.keys(files)).toEqual(['A.md']);
  });

  it('returns only canonical when .stage/ is missing', async () => {
    const root = freshRoot();
    writeFileSync(join(root, 'A.md'), 'a');
    const files = await readStagedOrCanonical(root);
    expect(files).toEqual({ 'A.md': 'a' });
  });

  it('returns empty object on an empty directory', async () => {
    const root = freshRoot();
    const files = await readStagedOrCanonical(root);
    expect(files).toEqual({});
  });

  it('returns {} when root does not exist', async () => {
    const files = await readStagedOrCanonical(join(tmpdir(), 'does-not-exist-staging'));
    expect(files).toEqual({});
  });
});

describe('writeAtomic + writeSnapshotFiles', () => {
  it('writes a file via tmp+rename', async () => {
    const root = freshRoot('staging-write-');
    await writeAtomic(join(root, 'A.md'), 'hello');
    expect(readFileSync(join(root, 'A.md'), 'utf-8')).toBe('hello');
    expect(readdirSync(root).filter((e) => e.includes('.tmp-'))).toHaveLength(0);
  });

  it('creates parent directories on demand', async () => {
    const root = freshRoot('staging-write-mk-');
    await writeAtomic(join(root, 'deep', 'nest', 'A.md'), 'x');
    expect(readFileSync(join(root, 'deep', 'nest', 'A.md'), 'utf-8')).toBe('x');
  });

  it('writeSnapshotFiles materializes a posix-keyed map', async () => {
    const root = freshRoot('staging-snap-');
    await writeSnapshotFiles(root, { 'A.md': 'a', 'sub/B.md': 'b' });
    expect(readFileSync(join(root, 'A.md'), 'utf-8')).toBe('a');
    expect(readFileSync(join(root, 'sub', 'B.md'), 'utf-8')).toBe('b');
  });

  it('cleans up tempfile when the write fails', async () => {
    const root = freshRoot('staging-fail-');
    // Try to write into a path where the parent is actually a regular file.
    writeFileSync(join(root, 'blocker'), '');
    // mkdir on an existing file path is a no-op with recursive:true, so
    // we force rename failure by targeting a directory as the target path.
    mkdirSync(join(root, 'D'));
    await expect(writeAtomic(join(root, 'D'), 'x')).rejects.toThrow();
    // Best-effort sweep: any .tmp- files are removed.
    expect(readdirSync(root).filter((e) => e.includes('.tmp-'))).toHaveLength(0);
    // Silence the unused import lint.
    chmodSync(join(root, 'blocker'), 0o644);
  });
});

describe('clearStage', () => {
  it('removes <root>/.stage/ recursively', async () => {
    const root = freshRoot('staging-clear-');
    mkdirSync(join(root, '.stage', 'nested'), { recursive: true });
    writeFileSync(join(root, '.stage', 'nested', 'x.md'), 'x');
    await clearStage(root);
    expect(existsSync(join(root, '.stage'))).toBe(false);
  });

  it('is a no-op when .stage/ is absent', async () => {
    const root = freshRoot('staging-clear-noop-');
    await clearStage(root);
    expect(existsSync(join(root, '.stage'))).toBe(false);
  });
});
