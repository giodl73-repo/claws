/**
 * oc-files.unit.test.ts — invariants for the OC workspace file registry.
 *
 * Shape assertions only. Claws-specific lock-step checks (e.g. compile
 * plane readers dispatch matches `OC_WORKSPACE_FILES`) live in
 * `claws-sdk/tests/workspace/` because they depend on claws-sdk internals.
 */

import { describe, it, expect } from 'vitest';
import { OC_WORKSPACE_FILES, OC_PARSED_FILES } from '../../src/path/index.js';

describe('OC_WORKSPACE_FILES — shape', () => {
  it('has exactly 9 entries', () => {
    expect(OC_WORKSPACE_FILES).toHaveLength(9);
  });

  it('has no duplicates', () => {
    expect(new Set(OC_WORKSPACE_FILES).size).toBe(OC_WORKSPACE_FILES.length);
  });

  it('matches the canonical ordered list', () => {
    expect([...OC_WORKSPACE_FILES]).toEqual([
      'SOUL.md',
      'TOOLS.md',
      'AGENTS.md',
      'MEMORY.md',
      'IDENTITY.md',
      'USER.md',
      'HEARTBEAT.md',
      'skills/',
      'lobster.yaml',
    ]);
  });
});

describe('OC_PARSED_FILES — shape', () => {
  it('is the markdown subset surfaced on WorkspaceState', () => {
    expect([...OC_PARSED_FILES]).toEqual([
      'SOUL.md',
      'TOOLS.md',
      'AGENTS.md',
      'MEMORY.md',
      'IDENTITY.md',
      'USER.md',
      'HEARTBEAT.md',
    ]);
  });

  it('is a subset of OC_WORKSPACE_FILES', () => {
    for (const name of OC_PARSED_FILES) {
      expect(OC_WORKSPACE_FILES as readonly string[]).toContain(name);
    }
  });

  it('complement is exactly the non-markdown compile-only entries', () => {
    const extras = (OC_WORKSPACE_FILES as readonly string[]).filter(
      (f) => !(OC_PARSED_FILES as readonly string[]).includes(f),
    );
    expect(extras.sort()).toEqual(['lobster.yaml', 'skills/'].sort());
  });
});
