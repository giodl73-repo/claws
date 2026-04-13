/**
 * L0: GitHub Copilot marker detection — .github/copilot-instructions.md
 * and .copilot/ directory forward-compat path.
 *
 * Detects the nested .github/ path for Copilot instructions and
 * the .copilot/ directory as a forward-compat location.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectCopilot } from '../../../src/detect/markers/copilot.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('detectCopilot', () => {
  it('detects .github/copilot-instructions.md with advisory enforcement', async () => {
    const root = resolve(FIXTURES, 'platform-multi');
    const result = await detectCopilot(root);

    expect(result).not.toBeNull();
    expect(result!.platform).toBe('github-copilot');
    expect(result!.enforcement).toBe('advisory');
    expect(result!.defaultTrustTier).toBe(1);
    expect(result!.confidence).toBe(1.0);
    expect(result!.markerFiles).toHaveLength(1);
    expect(result!.markerFiles[0]).toContain('copilot-instructions.md');
  });

  it('detects .copilot/ directory as forward-compat Copilot path', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-copilot-dir-'));
    try {
      await mkdir(join(tmp, '.copilot'), { recursive: true });
      await writeFile(join(tmp, '.copilot', 'config.yml'), 'version: 1');

      const result = await detectCopilot(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('github-copilot');
      expect(result!.enforcement).toBe('advisory');
      expect(result!.markerFiles[0]).toContain('.copilot');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
