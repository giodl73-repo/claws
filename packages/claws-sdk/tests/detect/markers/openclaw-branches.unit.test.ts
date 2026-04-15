/**
 * L0: OpenClaw marker detection — branch coverage for SOUL.md read failure,
 * absent SOUL.md, and confidence scaling.
 */

import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectOpenClaw } from '../../../src/detect/markers/openclaw.js';

describe('detectOpenClaw — branch coverage', () => {
  it('returns null when SOUL.md does not exist', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-oc-absent-'));
    try {
      const result = await detectOpenClaw(tmp);
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns null when SOUL.md has insufficient governance keywords', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-oc-lowkw-'));
    try {
      // Only 1 governance keyword — below MIN_GOVERNANCE_HITS (2)
      await writeFile(
        join(tmp, 'SOUL.md'),
        '# Our Soul\nWe strive for excellence and innovation.\nWe never give up.\n',
      );
      const result = await detectOpenClaw(tmp);
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('scales confidence with governance keyword density', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-oc-conf-'));
    try {
      // Many governance keywords → high confidence
      await writeFile(
        join(tmp, 'SOUL.md'),
        [
          '# Governance Policy',
          'Agents must follow trust tier rules.',
          'Tool declarations are mandatory.',
          'Agents must not bypass enforcement.',
          'Always validate inputs.',
          'Never allow unauthorized access.',
        ].join('\n'),
      );
      const result = await detectOpenClaw(tmp);
      expect(result).not.toBeNull();
      // With 6+ hits, confidence should be capped at 1.0
      expect(result!.confidence).toBe(1.0);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns null when SOUL.md exists but readFile fails', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-oc-readfail-'));
    try {
      // Create SOUL.md then make it a directory to cause readFile to fail
      // (access succeeds on directories, but readFile('dir', 'utf-8') throws)
      await mkdir(join(tmp, 'SOUL.md'), { recursive: true });

      const result = await detectOpenClaw(tmp);
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects with exactly MIN_GOVERNANCE_HITS keywords', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-oc-exact-'));
    try {
      // Exactly 2 governance keywords: "never" + "always"
      await writeFile(
        join(tmp, 'SOUL.md'),
        '# Policy\nWe never skip reviews.\nAlways validate inputs.\n',
      );
      const result = await detectOpenClaw(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('openclaw');
      // confidence = 0.6 + 2*0.1 = 0.8
      expect(result!.confidence).toBeCloseTo(0.8, 1);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
