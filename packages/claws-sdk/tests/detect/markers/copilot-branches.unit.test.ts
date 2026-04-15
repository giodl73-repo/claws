/**
 * L0: Copilot marker detection — branch coverage for .copilot as file,
 * both markers present, and neither present.
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectCopilot } from '../../../src/detect/markers/copilot.js';

describe('detectCopilot — branch coverage', () => {
  it('returns null when neither .copilot/ nor .github/copilot-instructions.md exist', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-copilot-none-'));
    try {
      const result = await detectCopilot(tmp);
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('.copilot as a file (not directory) is not detected', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-copilot-file-'));
    try {
      // .copilot as a regular file, not a directory
      await writeFile(join(tmp, '.copilot'), 'not a directory');

      const result = await detectCopilot(tmp);
      // .copilot file is not a directory → stat().isDirectory() returns false
      // No .github/copilot-instructions.md → null
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects both .copilot/ dir and .github/copilot-instructions.md', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-copilot-both-'));
    try {
      await mkdir(join(tmp, '.copilot'), { recursive: true });
      await writeFile(join(tmp, '.copilot', 'config.yml'), 'version: 1');
      await mkdir(join(tmp, '.github'), { recursive: true });
      await writeFile(
        join(tmp, '.github', 'copilot-instructions.md'),
        'Use TypeScript.',
      );

      const result = await detectCopilot(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('github-copilot');
      expect(result!.markerFiles).toHaveLength(2);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
