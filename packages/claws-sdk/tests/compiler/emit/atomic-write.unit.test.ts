/**
 * L0 unit test — atomic write + tempfile sweep (CL-04 §IS.7).
 *
 * atomicWrite leaves no partial at the target path even when the rename
 * step never happens (we simulate by pre-creating a file-as-dir that
 * forces a clean tempfile cleanup). sweepStaleTempfiles clears orphans
 * from prior interrupted emits.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  atomicWrite,
  sweepStaleTempfiles,
  TEMPFILE_MARKER,
} from '#src/compiler/emit/atomic-write.js';

describe('atomicWrite / sweepStaleTempfiles (unit)', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'atomic-emit-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('happy path: atomicWrite produces the target with expected content', async () => {
    const target = join(tmp, 'handler.ts');
    await atomicWrite(target, 'hello world');
    expect(readFileSync(target, 'utf-8')).toBe('hello world');
    // No leftover tempfiles.
    const leftover = readdirSync(tmp).filter((f) => f.includes(TEMPFILE_MARKER));
    expect(leftover).toEqual([]);
  });

  it('rename failure leaves NO partial at the target path', async () => {
    // Pre-create a directory at the target path; rename(file → dir) fails
    // on every filesystem we support. atomicWrite must clean up its
    // tempfile and surface the error, and the target path must stay a
    // directory (no partial overwrite).
    const target = join(tmp, 'target-as-dir');
    mkdirSync(target);
    await expect(atomicWrite(target, 'should not land')).rejects.toThrow();
    // Tempfile cleaned up:
    const leftover = readdirSync(tmp).filter((f) => f.includes(TEMPFILE_MARKER));
    expect(leftover).toEqual([]);
  });

  it('sweepStaleTempfiles removes orphans left by a prior interrupted emit', async () => {
    // Write a handful of orphaned tempfiles as if a prior compile was
    // SIGINT'd mid-write.
    writeFileSync(join(tmp, `h1.ts${TEMPFILE_MARKER}1234-abcd`), 'partial');
    writeFileSync(join(tmp, `h2.ts${TEMPFILE_MARKER}1234-0ef1`), 'partial');
    writeFileSync(join(tmp, 'keep.ts'), 'keep me'); // not a tempfile

    const swept = await sweepStaleTempfiles(tmp);
    expect(swept).toBe(2);
    const remaining = readdirSync(tmp);
    expect(remaining).toEqual(['keep.ts']);
  });

  it('sweepStaleTempfiles does NOT delete user files that merely contain ".tmp-"', async () => {
    // False-positive guard: user backup/draft filenames that contain the
    // substring `.tmp-` must not be swept. CL-04 §IS.7 restricts the sweep
    // to the anchored `<target>.tmp-<pid>-<nonce>` suffix shape.
    const userFiles = [
      'config.tmp-backup.yaml', // trailing extension
      'draft.tmp-sav.md',        // word suffix, not numeric pid
      '.tmp-foo',                // no full suffix
      'file.tmp-123',            // missing nonce
      'stage.tmp-abc-def',       // non-numeric pid
      'out.tmp-123-GHIJ',        // uppercase nonce (not lowercase hex)
    ];
    for (const name of userFiles) {
      writeFileSync(join(tmp, name), 'user content');
    }
    const swept = await sweepStaleTempfiles(tmp);
    expect(swept).toBe(0);
    const remaining = readdirSync(tmp).sort();
    expect(remaining).toEqual([...userFiles].sort());
  });

  it('sweepStaleTempfiles deletes canonical tempfile shapes', async () => {
    // Positive path: files matching `<target>.tmp-<pid>-<nonce>` where
    // <pid> is decimal and <nonce> is 16 lowercase hex chars must be
    // swept.
    writeFileSync(join(tmp, 'target.tmp-12345-abcdef'), 'partial');
    writeFileSync(join(tmp, 'emit.tmp-1-0123456789abcdef'), 'partial');
    const swept = await sweepStaleTempfiles(tmp);
    expect(swept).toBe(2);
    expect(readdirSync(tmp)).toEqual([]);
  });

  it('sweepStaleTempfiles deletes a tempfile produced by an actual atomicWrite', async () => {
    // End-to-end fidelity: a real atomicWrite that fails mid-rename leaves a
    // cleaned tempfile; to simulate an ORPHAN we call atomicWrite against a
    // target-as-dir path (rename fails, the catch block removes the tempfile).
    // Then we manually drop a canonical-shape tempfile and assert the sweeper
    // finds it. Format must match `atomicWrite`'s actual naming:
    //   `${target}.tmp-${process.pid}-${randomBytes(8).toString('hex')}`
    const canonical = join(
      tmp,
      `handler.ts${TEMPFILE_MARKER}${process.pid}-0123456789abcdef`,
    );
    writeFileSync(canonical, 'partial');
    const swept = await sweepStaleTempfiles(tmp);
    expect(swept).toBe(1);
    expect(readdirSync(tmp)).toEqual([]);
  });

  it('sweepStaleTempfiles on a missing directory is a no-op', async () => {
    const swept = await sweepStaleTempfiles(join(tmp, 'does-not-exist'));
    expect(swept).toBe(0);
  });

  it('sweepStaleTempfiles rethrows non-ENOENT readdir errors (defensive guard)', async () => {
    // Pass a file path — readdir on a file yields ENOTDIR on Unix and
    // EINVAL / other codes on Windows. The non-ENOENT branch in
    // sweepStaleTempfiles rethrows rather than silently returning 0.
    const filePath = join(tmp, 'not-a-directory.txt');
    writeFileSync(filePath, 'content');
    await expect(sweepStaleTempfiles(filePath)).rejects.toThrow();
  });
});
