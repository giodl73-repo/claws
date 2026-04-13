/**
 * L0: Multi-platform emission — per-platform adapter correctness,
 * OC full fidelity, generic advisory-only, Cursor adapter output,
 * import scanning on TS source.
 *
 * 4 unit tests:
 * 1. OC platform emits all 4 artifact types (full fidelity)
 * 2. Generic platform emits SKILL.md only (L1 advisory)
 * 3. Platform adapter produces valid output for Cursor target
 * 4. Import scanning on TS source, not compiled JS
 */

import { describe, it, expect } from 'vitest';
import { getAdapter, getAllAdapters } from '../../src/emit/platforms/index.js';
import { verifyNoForbiddenImports } from '../../src/emit/emit-plugin.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

describe('emit-multi-platform', () => {
  it('OC platform emits all 4 artifact types (full fidelity)', () => {
    const ir = minimalGovernanceIR();
    const adapter = getAdapter('openclaw');
    expect(adapter).toBeDefined();

    const result = adapter!.emit(ir);

    expect(result.platform).toBe('openclaw');

    // Must have at least: index.ts, package.json, 3 hook handlers, SKILL.md, exec-approvals.json
    const paths = result.artifacts.map((a) => a.path);
    expect(paths).toContain('index.ts');
    expect(paths).toContain('package.json');
    expect(paths).toContain('handlers/before-tool-call.ts');
    expect(paths).toContain('handlers/a2a-firewall.ts');
    expect(paths).toContain('handlers/elicitation-gate.ts');
    expect(paths).toContain('SKILL.md');
    expect(paths).toContain('exec-approvals.json');

    // All artifacts must have non-empty content
    for (const artifact of result.artifacts) {
      expect(artifact.content.length).toBeGreaterThan(0);
    }
  });

  it('generic platform emits SKILL.md only (L1 advisory)', () => {
    const ir = minimalGovernanceIR();

    // CrewAI is advisory-only — should produce SKILL.md only
    const adapter = getAdapter('crewai');
    expect(adapter).toBeDefined();

    const result = adapter!.emit(ir);
    expect(result.platform).toBe('crewai');

    // Should have exactly 1 artifact: SKILL.md
    expect(result.artifacts.length).toBe(1);
    expect(result.artifacts[0]!.path).toBe('SKILL.md');
    expect(result.artifacts[0]!.content.length).toBeGreaterThan(0);

    // SKILL.md must contain governance instructions
    expect(result.artifacts[0]!.content).toContain('Governance');
  });

  it('platform adapter produces valid output for Cursor target', () => {
    const ir = minimalGovernanceIR();
    const adapter = getAdapter('cursor');
    expect(adapter).toBeDefined();

    const result = adapter!.emit(ir);
    expect(result.platform).toBe('cursor');

    // Cursor should produce .cursorrules + SKILL.md
    const paths = result.artifacts.map((a) => a.path);
    expect(paths).toContain('.cursorrules');
    expect(paths).toContain('SKILL.md');

    // .cursorrules content should be governance advisory
    const cursorrules = result.artifacts.find((a) => a.path === '.cursorrules');
    expect(cursorrules).toBeDefined();
    expect(cursorrules!.content).toContain('Governance');
    expect(cursorrules!.content).toContain('MUST');

    // No forbidden imports in advisory content
    const forbidden = verifyNoForbiddenImports(cursorrules!.content);
    expect(forbidden).toEqual([]);
  });

  it('import scanning on TS source, not compiled JS', () => {
    const ir = minimalGovernanceIR();
    const adapter = getAdapter('openclaw');
    expect(adapter).toBeDefined();

    const result = adapter!.emit(ir);

    // Get all TypeScript artifacts
    const tsArtifacts = result.artifacts.filter(
      (a) => a.path.endsWith('.ts'),
    );
    expect(tsArtifacts.length).toBeGreaterThan(0);

    // Verify forbidden imports are checked on TS source
    for (const artifact of tsArtifacts) {
      const forbidden = verifyNoForbiddenImports(artifact.content);
      expect(forbidden).toEqual([]);

      // The source should be TypeScript, not compiled JS
      // (no "use strict", no require(), no __esModule)
      expect(artifact.content).not.toContain('"use strict"');
      expect(artifact.content).not.toMatch(/\brequire\(/);
      expect(artifact.content).not.toContain('__esModule');
    }

    // All 7 platform adapters must be registered
    const allAdapters = getAllAdapters();
    expect(allAdapters.length).toBe(7);
  });
});
