/**
 * L1 integration tests for GovernanceDiagnosticProvider + GovernanceCodeLensProvider.
 *
 * Required (3 tests):
 *   1. Diagnostics refresh on save via serve compile
 *   2. Code lens renders for multi-server TOOLS.md
 *   3. Diagnostic ranges map to correct source positions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CompilationHost } from '../../src/compilation-host.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';
import { computeGovernanceDiagnostics } from '../../src/providers/governance-diagnostic.js';
import { computeGovernanceCodeLenses } from '../../src/providers/governance-code-lens.js';

/** Compile simulator: parses tool/deny lines into a GovernanceIR shape. */
function simulateCompile(_uri: string, content: string): GovernanceIRLike {
  const tools: unknown[] = [];
  const intents: unknown[] = [];

  for (const line of content.split('\n')) {
    const toolMatch = line.match(/tool:\s*(\S+)\s*\((R[1-5])\)(\s*\[locked])?/i);
    if (toolMatch) {
      const risk = toolMatch[2]!.toUpperCase();
      tools.push({
        name: toolMatch[1],
        riskLevel: risk,
        elicitationGate: risk === 'R5' ? false : true,
        locked: Boolean(toolMatch[3]),
      });
    }
    const denyMatch = line.match(/deny:\s*(\S+)(?:\s+by\s+(compiler|user))?/i);
    if (denyMatch) {
      intents.push({
        kind: 'deny',
        target: denyMatch[1],
        source: denyMatch[2] ?? 'user',
      });
    }
  }

  return {
    capabilities: { tools, skills: [], agents: [], workflows: [] },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents,
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

describe('GovernanceDiagnosticProvider integration', () => {
  let host: CompilationHost;

  beforeEach(() => {
    vi.useFakeTimers();
    host = new CompilationHost(async (uri, content) => simulateCompile(uri, content), 0);
  });

  afterEach(() => {
    host.clear();
    vi.useRealTimers();
  });

  // Required test 1: diagnostics refresh on save
  it('diagnostics refresh on save via serve compile', async () => {
    const uri = 'file:///ws/TOOLS.md';

    const initial = '# Tools\ntool: ping (R1)';
    host.notifyChange(uri, initial);
    await host.flush();
    const ir1 = host.getCachedIR(uri)!;
    const d1 = computeGovernanceDiagnostics(uri, ir1, initial);
    expect(d1.filter((d) => d.code === 'CLAWS-G-R1')).toHaveLength(1);
    expect(d1.filter((d) => d.code === 'CLAWS-G-R5')).toHaveLength(0);

    // Simulate save with a new tool added
    const updated = '# Tools\ntool: ping (R1)\ntool: transfer (R5)';
    host.notifyChange(uri, updated);
    await host.flush();
    const ir2 = host.getCachedIR(uri)!;
    const d2 = computeGovernanceDiagnostics(uri, ir2, updated);

    expect(d2.filter((d) => d.code === 'CLAWS-G-R5')).toHaveLength(1);
    expect(d2.filter((d) => d.code === 'CLAWS-G-ELICIT')).toHaveLength(1);
  });

  // Required test 2: code lens renders for multi-server TOOLS.md
  it('code lens renders for multi-server TOOLS.md', async () => {
    const uri = 'file:///ws/TOOLS.md';
    const content = [
      '# Tools',
      '## filesystem-server',
      'tool: read-file (R1)',
      'tool: write-file (R4)',
      '## finance-server',
      'tool: transfer (R5) [locked]',
    ].join('\n');

    host.notifyChange(uri, content);
    await host.flush();
    const ir = host.getCachedIR(uri)!;

    const lenses = computeGovernanceCodeLenses(uri, ir, content);
    expect(lenses).toHaveLength(3);

    const byName = new Map(lenses.map((l) => [l.line, l.display]));
    expect(byName.get(2)).toBe('R1 READ');
    expect(byName.get(3)).toBe('R4 MUTATE');
    expect(byName.get(5)).toBe('R5 TRANSACT (locked)');
  });

  // Required test 3: diagnostic ranges map to correct source positions
  it('diagnostic ranges map to correct source positions', async () => {
    const uri = 'file:///ws/TOOLS.md';
    const content = [
      '# Tools',                            // line 0
      '',                                   // line 1
      'tool: alpha (R1)',                   // line 2
      '',                                   // line 3
      'tool: omega (R5)',                   // line 4
    ].join('\n');

    host.notifyChange(uri, content);
    await host.flush();
    const ir = host.getCachedIR(uri)!;
    const diags = computeGovernanceDiagnostics(uri, ir, content);

    const alpha = diags.find((d) => d.message.includes('alpha'));
    const omega = diags.find((d) => d.code === 'CLAWS-G-R5');
    expect(alpha!.range.start.line).toBe(2);
    expect(omega!.range.start.line).toBe(4);
    // Range should span the full line
    expect(alpha!.range.end.character).toBe('tool: alpha (R1)'.length);
  });
});
