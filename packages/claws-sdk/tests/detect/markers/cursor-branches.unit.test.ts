/**
 * L0: Cursor marker detection — branch coverage for both .cursor/ dir
 * and .cursorrules present simultaneously, and absence of both.
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectCursor } from '../../../src/detect/markers/cursor.js';

describe('detectCursor — branch coverage', () => {
  it('detects both .cursor/ dir and .cursorrules (2 marker files)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-cursor-both-'));
    try {
      // Create both .cursor/ directory AND .cursorrules file
      await mkdir(join(tmp, '.cursor'), { recursive: true });
      await writeFile(join(tmp, '.cursor', 'rules'), 'cursor rules');
      await writeFile(join(tmp, '.cursorrules'), 'legacy rules');

      const result = await detectCursor(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('cursor');
      expect(result!.markerFiles).toHaveLength(2);
      // Both paths should be present
      expect(result!.markerFiles.some((f) => f.includes('.cursor'))).toBe(true);
      expect(result!.markerFiles.some((f) => f.includes('.cursorrules'))).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns null when neither .cursor/ nor .cursorrules exist', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-cursor-none-'));
    try {
      const result = await detectCursor(tmp);
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('.cursor path that is a file (not directory) is not detected as dir marker', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-cursor-file-'));
    try {
      // .cursor as a file, not a directory
      await writeFile(join(tmp, '.cursor'), 'not a directory');

      const result = await detectCursor(tmp);
      // .cursor file is not a directory → stat().isDirectory() returns false
      // No .cursorrules either → null
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
