/**
 * L2 end-to-end test — full sidecar resolution from fixture workspace.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { resolveSidecar } from '#src/compiler/sidecar/resolver.js';
import { detectWorkspacePlatforms } from '#src/compiler/sidecar/detect.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('sidecar e2e resolution', () => {
  it('resolves sidecar end-to-end from fixture workspace directory', async () => {
    // Workspace with YAML sidecar: full pipeline
    const yamlResult = await resolveSidecar(resolve(FIXTURES, 'sidecar-yaml'));
    expect(yamlResult.found).toBe(true);
    if (!yamlResult.found) return;
    expect(yamlResult.sidecar.version).toBe('1.0.0');
    expect(yamlResult.sidecar.targets).toContain('claude-code');
    expect(yamlResult.format).toBe('yaml');

    // Workspace with JSON sidecar: full pipeline
    const jsonResult = await resolveSidecar(resolve(FIXTURES, 'sidecar-json'));
    expect(jsonResult.found).toBe(true);
    if (!jsonResult.found) return;
    expect(jsonResult.sidecar.version).toBe('2.1.0');
    expect(jsonResult.sidecar.targets).toContain('openclaw');
    expect(jsonResult.format).toBe('json');

    // Workspace without sidecar: heuristics detect all 3 platform types
    const claudeHeuristics = await detectWorkspacePlatforms(
      resolve(FIXTURES, 'sidecar-heuristic-claude'),
    );
    expect(claudeHeuristics.some((h) => h.platform === 'claude-code')).toBe(true);

    const cursorHeuristics = await detectWorkspacePlatforms(
      resolve(FIXTURES, 'sidecar-heuristic-cursor'),
    );
    expect(cursorHeuristics.some((h) => h.platform === 'cursor')).toBe(true);

    const ocHeuristics = await detectWorkspacePlatforms(
      resolve(FIXTURES, 'sidecar-heuristic-oc'),
    );
    expect(ocHeuristics.some((h) => h.platform === 'openclaw')).toBe(true);

    // Empty workspace: no sidecar, no heuristics
    const emptyResult = await resolveSidecar(resolve(FIXTURES, 'sidecar-missing'));
    expect(emptyResult.found).toBe(false);
    if (emptyResult.found) return;
    expect(emptyResult.heuristics).toHaveLength(0);
  });
});
