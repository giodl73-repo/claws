/**
 * L0 unit tests for mtime fast-path (CL-04 §IS.1, S01-F04).
 *
 * Unchanged mtime returns 'unchanged' (caller can skip re-hash). A changed
 * mtime returns 'changed' so content hashing runs again.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { utimes, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mtimeFastPath } from '#src/compiler/host/stage-cache-mtime.js';

describe('mtimeFastPath (unit)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mtime-fast-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('unchanged mtime returns "unchanged"', async () => {
    const file = join(tmpDir, 'SOUL.md');
    writeFileSync(file, 'hello');
    const before = await stat(file);
    const status = await mtimeFastPath(file, before.mtimeMs);
    expect(status).toBe('unchanged');
  });

  it('changed mtime returns "changed"', async () => {
    const file = join(tmpDir, 'SOUL.md');
    writeFileSync(file, 'hello');
    const before = await stat(file);
    // Force a distinct mtime.
    await utimes(file, new Date(Date.now() + 2000), new Date(Date.now() + 2000));
    const status = await mtimeFastPath(file, before.mtimeMs);
    expect(status).toBe('changed');
  });

  it('missing file returns "missing"', async () => {
    const status = await mtimeFastPath(join(tmpDir, 'does-not-exist'), 12345);
    expect(status).toBe('missing');
  });

  it('undefined storedMtimeMs forces "changed" (first-time populate)', async () => {
    const file = join(tmpDir, 'SOUL.md');
    writeFileSync(file, 'hello');
    const status = await mtimeFastPath(file, undefined);
    expect(status).toBe('changed');
  });

  it('non-ENOENT stat errors rethrow (defensive guard)', async () => {
    // Create a file and then delete it after making the path invalid.
    // On Windows, stat on a null-byte path yields ERR_INVALID_ARG_VALUE
    // (not ENOENT) which exercises the rethrow branch.
    const badPath = join(tmpDir, 'bad\0path');
    await expect(mtimeFastPath(badPath, 12345)).rejects.toThrow();
  });
});
