/**
 * L0: Marker registry — registry contents, getMarkerSpecs lookup.
 */

import { describe, it, expect } from 'vitest';
import { MARKER_REGISTRY, getMarkerSpecs } from '../../src/detect/marker-registry.js';

describe('MARKER_REGISTRY', () => {
  it('contains all 7 platforms', () => {
    const platforms = new Set(MARKER_REGISTRY.map((m) => m.platform));
    expect(platforms.size).toBe(7);
    expect(platforms).toContain('openclaw');
    expect(platforms).toContain('cursor');
    expect(platforms).toContain('claude-code');
    expect(platforms).toContain('github-copilot');
    expect(platforms).toContain('bedrock');
    expect(platforms).toContain('langgraph');
    expect(platforms).toContain('crewai');
  });

  it('every spec has at least one path', () => {
    for (const spec of MARKER_REGISTRY) {
      expect(spec.paths.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('openclaw validator requires governance keywords in SOUL.md content', () => {
    const openclaw = MARKER_REGISTRY.find((m) => m.platform === 'openclaw');
    expect(openclaw).toBeDefined();
    expect(openclaw!.validator).toBeDefined();

    // Not enough keywords — should reject
    expect(openclaw!.validator!('Just a mission statement.')).toBe(false);

    // Enough keywords — should accept
    expect(openclaw!.validator!('Agents must never access the tool declaration without governance enforcement.')).toBe(true);
  });

  it('crewai validator matches crewai keyword', () => {
    const crewai = MARKER_REGISTRY.find((m) => m.platform === 'crewai');
    expect(crewai).toBeDefined();
    expect(crewai!.validator).toBeDefined();
    expect(crewai!.validator!('crewai = ">=0.30"')).toBe(true);
    expect(crewai!.validator!('flask = ">=2.0"')).toBe(false);
  });

  it('nested flag is set for github-copilot and bedrock', () => {
    const copilot = MARKER_REGISTRY.find((m) => m.platform === 'github-copilot');
    const bedrock = MARKER_REGISTRY.find((m) => m.platform === 'bedrock');
    expect(copilot!.nested).toBe(true);
    expect(bedrock!.nested).toBe(true);
  });

  it('non-nested platforms have nested=false', () => {
    const nonNested = MARKER_REGISTRY.filter((m) => !m.nested);
    const ids = nonNested.map((m) => m.platform);
    expect(ids).toContain('openclaw');
    expect(ids).toContain('cursor');
    expect(ids).toContain('claude-code');
    expect(ids).toContain('langgraph');
    expect(ids).toContain('crewai');
  });
});

describe('getMarkerSpecs', () => {
  it('returns specs for a known platform', () => {
    const specs = getMarkerSpecs('bedrock');
    expect(specs.length).toBeGreaterThanOrEqual(1);
    expect(specs.every((s) => s.platform === 'bedrock')).toBe(true);
  });

  it('returns empty array for unknown platform', () => {
    const specs = getMarkerSpecs('nonexistent' as never);
    expect(specs).toEqual([]);
  });
});
