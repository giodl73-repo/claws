/**
 * chunk-assembler L2 e2e test.
 *
 * 1 test — the full pipeline: parseWorkspace → minimalGovernanceIR →
 * assembleChunks, asserting consistent data flow from file bytes to chunk.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { assembleChunks, parseWorkspace } from '../../src/workspace/index.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

const FIXTURE_ROOT = resolve(__dirname, '../fixtures/workspace-parser-full');

describe('assembleChunks — L2 e2e', () => {
  it('runs parseWorkspace → compileGovernance → assembleChunks end-to-end', async () => {
    const workspace = await parseWorkspace(FIXTURE_ROOT);
    const ir = minimalGovernanceIR();

    const result = await assembleChunks(workspace, ir);

    // Parse → assemble wiring is consistent: general.name derived from identity.
    expect(result.general.data.name.length).toBeGreaterThan(0);

    // Governance context flows through.
    const warnings = result.general.governance?.warnings ?? [];
    expect(warnings.some((w) => w.rule === 'AUD-001')).toBe(true);

    // Connections include every IR tool (6 classified, 0 unclassified here).
    const totalTools = result.connections.reduce((sum, c) => sum + c.data.tools.length, 0);
    expect(totalTools).toBe(ir.capabilities.tools.length);

    // Fleet override absent — no lock.source === 'fleet'.
    const hasFleet = result.connections.some((c) =>
      c.data.tools.some((t) => t.lock.source === 'fleet'),
    );
    expect(hasFleet).toBe(false);
  });
});
