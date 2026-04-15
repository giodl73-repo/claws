/**
 * L0: detect() orchestration — branch coverage for variant detection,
 * multi-platform detection, and PlatformInfo notes derivation.
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detect } from '../../src/detect/detect.js';

describe('detect() — branch coverage', () => {
  it('detects multiple platforms simultaneously', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-multi-'));
    try {
      // Create CLAUDE.md (claude-code) AND .cursorrules (cursor)
      await writeFile(join(tmp, 'CLAUDE.md'), '# Project\nUse vitest.\n');
      await writeFile(join(tmp, '.cursorrules'), 'Use TypeScript strict mode.\n');

      const inventory = await detect(tmp);
      expect(inventory.detected).toBe(true);
      expect(inventory.platforms.size).toBeGreaterThanOrEqual(2);
      expect(inventory.platforms.has('claude-code')).toBe(true);
      expect(inventory.platforms.has('cursor')).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('does not set guidance when platforms are detected', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-no-guidance-'));
    try {
      await writeFile(join(tmp, '.cursorrules'), 'rules\n');

      const inventory = await detect(tmp);
      expect(inventory.detected).toBe(true);
      expect(inventory.guidance).toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects LangGraph with variant note', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-langgraph-'));
    try {
      // Create langgraph.json with language field to trigger variant detection
      await writeFile(
        join(tmp, 'langgraph.json'),
        JSON.stringify({ language: 'python', graph: 'my-graph' }),
      );

      const inventory = await detect(tmp);
      expect(inventory.detected).toBe(true);
      expect(inventory.platforms.has('langgraph')).toBe(true);

      const lg = inventory.platforms.get('langgraph')!;
      // Variant should produce notes in PlatformInfo
      expect(lg.notes).toBe('Python variant');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects LangGraph JS variant', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-langgraph-js-'));
    try {
      await writeFile(
        join(tmp, 'langgraph.json'),
        JSON.stringify({ language: 'javascript' }),
      );

      const inventory = await detect(tmp);
      expect(inventory.detected).toBe(true);
      const lg = inventory.platforms.get('langgraph')!;
      expect(lg.notes).toBe('JS variant');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('guidance message is actionable when no platforms detected', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-guidance-'));
    try {
      const inventory = await detect(tmp);
      expect(inventory.detected).toBe(false);
      expect(inventory.guidance).toContain('claws init');
      expect(inventory.guidance).toContain('SOUL.md');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
