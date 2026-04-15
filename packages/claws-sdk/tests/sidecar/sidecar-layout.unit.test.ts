/**
 * L0: .claws sidecar layout — constants, initSidecar.
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CLAWS_SIDECAR_LAYOUT,
  CLAWS_CONFIG_FILE,
  CLAWS_SIDECAR_VERSION,
  CLAWS_GITIGNORE_DIRS,
  type ClawsSidecarDir,
} from '../../src/types/sidecar.js';
import { scaffoldSidecar as initSidecar } from '../../src/init/sidecar-scaffold.js';

describe('sidecar constants', () => {
  it('has 13 subdirectories', () => {
    const dirs = Object.keys(CLAWS_SIDECAR_LAYOUT) as ClawsSidecarDir[];
    expect(dirs).toHaveLength(13);
  });

  it('all paths start with .claws/', () => {
    for (const path of Object.values(CLAWS_SIDECAR_LAYOUT)) {
      expect(path).toMatch(/^\.claws\//);
    }
  });

  it('config file is claws.json', () => {
    expect(CLAWS_CONFIG_FILE).toBe('claws.json');
  });

  it('version is a positive integer', () => {
    expect(CLAWS_SIDECAR_VERSION).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(CLAWS_SIDECAR_VERSION)).toBe(true);
  });

  it('gitignore dirs are a subset of the layout', () => {
    const allPaths = new Set(Object.values(CLAWS_SIDECAR_LAYOUT));
    for (const dir of CLAWS_GITIGNORE_DIRS) {
      expect(allPaths.has(dir)).toBe(true);
    }
  });

  it('gitignore includes keys, secrets, cache, runtime', () => {
    expect(CLAWS_GITIGNORE_DIRS).toContain('.claws/keys');
    expect(CLAWS_GITIGNORE_DIRS).toContain('.claws/secrets');
    expect(CLAWS_GITIGNORE_DIRS).toContain('.claws/cache');
    expect(CLAWS_GITIGNORE_DIRS).toContain('.claws/runtime');
  });
});

describe('initSidecar', () => {
  it('creates all 13 subdirectories and .gitignore', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-sidecar-'));
    try {
      await initSidecar(tmp);

      const clawsDir = join(tmp, '.claws');
      const entries = await readdir(clawsDir);
      // 13 dirs + .gitignore
      expect(entries.length).toBeGreaterThanOrEqual(14);

      for (const dir of Object.values(CLAWS_SIDECAR_LAYOUT)) {
        const rel = dir.replace(/^\.claws\//, '');
        expect(entries).toContain(rel);
      }

      expect(entries).toContain('.gitignore');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('writes .gitignore with correct entries', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-sidecar-gi-'));
    try {
      await initSidecar(tmp);

      const gitignore = await readFile(join(tmp, '.claws', '.gitignore'), 'utf-8');
      expect(gitignore).toContain('keys/');
      expect(gitignore).toContain('secrets/');
      expect(gitignore).toContain('cache/');
      expect(gitignore).toContain('runtime/');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('is idempotent — safe to call multiple times', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-sidecar-idem-'));
    try {
      await initSidecar(tmp);
      await initSidecar(tmp); // second call should not throw

      const entries = await readdir(join(tmp, '.claws'));
      expect(entries.length).toBeGreaterThanOrEqual(14);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
