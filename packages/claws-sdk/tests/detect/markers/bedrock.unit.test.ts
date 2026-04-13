/**
 * L0: Bedrock marker detection — guardrails.json variants.
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectBedrock } from '../../../src/detect/markers/bedrock.js';

describe('detectBedrock', () => {
  it('detects bedrock-guardrails.json at root', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-bedrock-'));
    try {
      await writeFile(join(tmp, 'bedrock-guardrails.json'), '{}');
      const result = await detectBedrock(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('bedrock');
      expect(result!.confidence).toBe(1.0);
      expect(result!.enforcement).toBe('explicit-only');
      expect(result!.defaultTrustTier).toBe(3);
      expect(result!.markerFiles).toHaveLength(1);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects .bedrock/guardrails.json', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-bedrock-nested-'));
    try {
      await mkdir(join(tmp, '.bedrock'), { recursive: true });
      await writeFile(join(tmp, '.bedrock', 'guardrails.json'), '{}');
      const result = await detectBedrock(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('bedrock');
      expect(result!.markerFiles).toHaveLength(1);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects both files when present', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-bedrock-both-'));
    try {
      await writeFile(join(tmp, 'bedrock-guardrails.json'), '{}');
      await mkdir(join(tmp, '.bedrock'), { recursive: true });
      await writeFile(join(tmp, '.bedrock', 'guardrails.json'), '{}');
      const result = await detectBedrock(tmp);
      expect(result).not.toBeNull();
      expect(result!.markerFiles).toHaveLength(2);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns null when no marker files exist', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-bedrock-empty-'));
    try {
      const result = await detectBedrock(tmp);
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
