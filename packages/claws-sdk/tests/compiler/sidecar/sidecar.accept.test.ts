/**
 * L3 acceptance test — forma scenario findings verified.
 *
 * Validates the 3 scenario codes referenced in the pulse plan:
 * - forma/S01: YAML sidecar resolves with correct version + targets
 * - forma/S02: JSON sidecar resolves with correct format detection
 * - forma/S04: Missing sidecar triggers heuristic fallback, not error
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { resolveSidecar, SidecarValidationError } from '#src/compiler/sidecar/resolver.js';
import { detectWorkspacePlatforms } from '#src/compiler/sidecar/detect.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('forma scenario acceptance', () => {
  it('forma/S01+S02+S04: sidecar resolves YAML/JSON, missing falls back to heuristics', async () => {
    // ── forma/S01: YAML sidecar resolves ─────────────────────────────
    const yamlResult = await resolveSidecar(resolve(FIXTURES, 'sidecar-yaml'));
    expect(yamlResult.found).toBe(true);
    if (yamlResult.found) {
      expect(yamlResult.sidecar.version).toBe('1.0.0');
      expect(yamlResult.sidecar.targets).toContain('claude-code');
      expect(yamlResult.sidecar.targets).toContain('cursor');
      expect(yamlResult.format).toBe('yaml');
    }

    // ── forma/S02: JSON sidecar resolves ─────────────────────────────
    const jsonResult = await resolveSidecar(resolve(FIXTURES, 'sidecar-json'));
    expect(jsonResult.found).toBe(true);
    if (jsonResult.found) {
      expect(jsonResult.sidecar.version).toBe('2.1.0');
      expect(jsonResult.sidecar.targets).toContain('openclaw');
      expect(jsonResult.sidecar.targets).toContain('bedrock');
      expect(jsonResult.format).toBe('json');
    }

    // ── forma/S04: Missing sidecar → heuristic fallback ──────────────
    // Verify no sidecar file → heuristics instead of error
    const noSidecar = await resolveSidecar(resolve(FIXTURES, 'sidecar-heuristic-claude'));
    expect(noSidecar.found).toBe(false);
    if (!noSidecar.found) {
      expect(noSidecar.heuristics.length).toBeGreaterThan(0);
      expect(noSidecar.heuristics[0]!.platform).toBe('claude-code');
    }

    // Verify detection heuristics identify 3 platform types
    const claude = await detectWorkspacePlatforms(resolve(FIXTURES, 'sidecar-heuristic-claude'));
    expect(claude.some((h) => h.platform === 'claude-code')).toBe(true);

    const cursor = await detectWorkspacePlatforms(resolve(FIXTURES, 'sidecar-heuristic-cursor'));
    expect(cursor.some((h) => h.platform === 'cursor')).toBe(true);

    const oc = await detectWorkspacePlatforms(resolve(FIXTURES, 'sidecar-heuristic-oc'));
    expect(oc.some((h) => h.platform === 'openclaw')).toBe(true);

    // Verify invalid sidecar produces error with path
    await expect(
      resolveSidecar(resolve(FIXTURES, 'sidecar-invalid')),
    ).rejects.toThrow(SidecarValidationError);

    // Zero imports from @craftworks/compiler-sdk verified by:
    // - No FORMA imports in src/compiler/sidecar/*.ts
    // - Types are standalone in types.ts
    // - Detection heuristics in detect.ts use only node:fs/node:path
  });
});
