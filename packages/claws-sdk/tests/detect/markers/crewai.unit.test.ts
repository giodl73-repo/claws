/**
 * L0: CrewAI marker detection — crewai.yaml, crew.yaml, pyproject.toml variants.
 *
 * CrewAI uses full enforcement via guards and defaults to trust tier T2.
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectCrewAI } from '../../../src/detect/markers/crewai.js';

describe('detectCrewAI', () => {
  it('detects crewai.yaml; crew.yaml also accepted as variant', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-crewai-'));
    try {
      await writeFile(join(tmp, 'crewai.yaml'), 'agents:\n  - name: researcher\n');

      const result = await detectCrewAI(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('crewai');
      expect(result!.enforcement).toBe('full');
      expect(result!.defaultTrustTier).toBe(2);
      expect(result!.markerFiles).toHaveLength(1);

      // Also test crew.yaml variant
      await rm(join(tmp, 'crewai.yaml'));
      await writeFile(join(tmp, 'crew.yaml'), 'agents:\n  - name: writer\n');

      const result2 = await detectCrewAI(tmp);
      expect(result2).not.toBeNull();
      expect(result2!.platform).toBe('crewai');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns null when no marker files exist', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-crewai-none-'));
    try {
      const result = await detectCrewAI(tmp);
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns null for pyproject.toml without crewai dependency', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-crewai-nocrewai-'));
    try {
      await writeFile(
        join(tmp, 'pyproject.toml'),
        '[project]\nname = "unrelated"\n[project.dependencies]\nflask = ">=2.0"\n',
      );
      const result = await detectCrewAI(tmp);
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects pyproject.toml with CrewAI dependency markers', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-crewai-pyproj-'));
    try {
      await writeFile(
        join(tmp, 'pyproject.toml'),
        [
          '[project]',
          'name = "my-crew"',
          '',
          '[project.dependencies]',
          'crewai = ">=0.30.0"',
          'langchain = ">=0.1.0"',
        ].join('\n'),
      );

      const result = await detectCrewAI(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('crewai');
      expect(result!.confidence).toBe(0.8);
      expect(result!.enforcement).toBe('full');
      expect(result!.markerFiles[0]).toContain('pyproject.toml');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
