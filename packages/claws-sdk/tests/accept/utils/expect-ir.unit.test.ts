/**
 * L0: expect-ir — IR assertion helpers unit tests.
 *
 * Exercises all branches in expectGovernanceIR, expectViolations,
 * expectArtifacts, and expectNoForbiddenImports.
 */

import { describe, it, expect } from 'vitest';
import {
  expectGovernanceIR,
  expectViolations,
  expectArtifacts,
  expectNoForbiddenImports,
  INFRASTRUCTURE_RULE_IDS,
  type GovernanceIRExpectation,
} from './expect-ir.js';

// ---------------------------------------------------------------------------
// Test IR factory
// ---------------------------------------------------------------------------

function makeIR(overrides?: {
  schemaVersion?: number;
  tools?: Array<{ name: string }>;
  intents?: Array<{ type?: string }>;
  violations?: Array<{ ruleId: string; level: number; message: string; target: string; diagnosticCode: string; fixSuggestions: string[]; toolFuzzyMatches: string[] }>;
  warnings?: Array<{ ruleId: string; level: number; message: string; target: string; diagnosticCode: string; fixSuggestions: string[] }>;
}) {
  return {
    compiler: {
      compilerVersion: '0.1.0',
      compiledAt: '2026-01-01T00:00:00Z',
      schemaVersion: overrides?.schemaVersion ?? 1,
    },
    capabilities: {
      tools: overrides?.tools ?? [],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: overrides?.violations ?? [],
      warnings: overrides?.warnings ?? [],
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
    intents: overrides?.intents ?? [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// expectGovernanceIR — manifest.files_parsed
// ---------------------------------------------------------------------------

describe('expectGovernanceIR — manifest branches', () => {
  it('checks files_parsed against capabilities tools', () => {
    const ir = makeIR({ tools: [{ name: 'read_file' }] });

    // Should not throw — TOOLS matches the soft check
    expect(() => {
      expectGovernanceIR(ir, {
        manifest: { files_parsed: ['TOOLS.md'] },
      });
    }).not.toThrow();
  });

  it('checks files_parsed with SOUL.md', () => {
    const ir = makeIR({ tools: [] });

    expect(() => {
      expectGovernanceIR(ir, {
        manifest: { files_parsed: ['SOUL.md'] },
      });
    }).not.toThrow();
  });

  it('checks files_parsed with tool name match', () => {
    const ir = makeIR({ tools: [{ name: 'my_tool' }] });

    expect(() => {
      expectGovernanceIR(ir, {
        manifest: { files_parsed: ['my_tool'] },
      });
    }).not.toThrow();
  });

  it('checks intent_types with populated intents', () => {
    const ir = makeIR({ intents: [{ type: 'tool-use' }] });

    expect(() => {
      expectGovernanceIR(ir, {
        manifest: { intent_types: ['tool-use'] },
      });
    }).not.toThrow();
  });

  it('checks intent_types with empty intents', () => {
    const ir = makeIR();

    // Empty expected intent_types — should not throw
    expect(() => {
      expectGovernanceIR(ir, {
        manifest: { intent_types: [] },
      });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// expectGovernanceIR — analysis branches
// ---------------------------------------------------------------------------

describe('expectGovernanceIR — analysis branches', () => {
  it('checks analysis.violations with zero expected and zero actual', () => {
    const ir = makeIR();

    expect(() => {
      expectGovernanceIR(ir, {
        analysis: { violations: [] },
      });
    }).not.toThrow();
  });

  it('fails when zero violations expected but significant violations present', () => {
    // Has a non-infrastructure violation → significant.length > 0 → assertion fails
    const ir = makeIR({
      violations: [
        { ruleId: 'G-A2A-IDENTITY', level: 4, message: 'trust violation', target: 'AGENTS.md', diagnosticCode: 'CLAWS-G-A2A-IDENTITY', fixSuggestions: [], toolFuzzyMatches: [] },
      ],
    });

    expect(() => {
      expectGovernanceIR(ir, {
        analysis: { violations: [] },
      });
    }).toThrow();
  });

  it('checks analysis.violations with zero expected filters infrastructure', () => {
    // Add only infrastructure violations — should pass since they're filtered
    const ir = makeIR({
      violations: [
        { ruleId: 'G-CLASS-02', level: 2, message: 'infra', target: 'TOOLS.md', diagnosticCode: 'CLAWS-G-CLASS-02', fixSuggestions: [], toolFuzzyMatches: [] },
        { ruleId: 'G-DATA-NOLABEL', level: 2, message: 'infra', target: 'AGENTS.md', diagnosticCode: 'CLAWS-G-DATA-NOLABEL', fixSuggestions: [], toolFuzzyMatches: [] },
      ],
    });

    expect(() => {
      expectGovernanceIR(ir, {
        analysis: { violations: [] },
      });
    }).not.toThrow();
  });

  it('checks analysis.violations with expected ruleIds', () => {
    const ir = makeIR({
      violations: [
        { ruleId: 'G-PERM-01', level: 3, message: 'missing perm', target: 'TOOLS.md', diagnosticCode: 'CLAWS-G-PERM-01', fixSuggestions: [], toolFuzzyMatches: [] },
      ],
    });

    expect(() => {
      expectGovernanceIR(ir, {
        analysis: { violations: [{ ruleId: 'G-PERM-01' }] },
      });
    }).not.toThrow();
  });

  it('fails when expected violation ruleId is missing', () => {
    const ir = makeIR();

    expect(() => {
      expectGovernanceIR(ir, {
        analysis: { violations: [{ ruleId: 'G-PERM-01' }] },
      });
    }).toThrow();
  });

  it('checks analysis.warnings with zero expected', () => {
    const ir = makeIR();

    expect(() => {
      expectGovernanceIR(ir, {
        analysis: { warnings: [] },
      });
    }).not.toThrow();
  });

  it('checks analysis.rules_evaluated', () => {
    const ir = makeIR();

    expect(() => {
      expectGovernanceIR(ir, {
        analysis: { rules_evaluated: true },
      });
    }).not.toThrow();
  });

  it('checks analysis.rules_evaluated with numeric value', () => {
    const ir = makeIR();

    expect(() => {
      expectGovernanceIR(ir, {
        analysis: { rules_evaluated: 10 },
      });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// expectViolations — all branches
// ---------------------------------------------------------------------------

describe('expectViolations()', () => {
  const violation = (ruleId: string, level: number, message: string) => ({
    ruleId,
    level,
    message,
    target: 'TOOLS.md',
    diagnosticCode: `CLAWS-${ruleId}`,
    fixSuggestions: [],
    toolFuzzyMatches: [],
  });

  it('matches by ruleId only', () => {
    expect(() => {
      expectViolations([violation('G-PERM-01', 3, 'test')], [{ ruleId: 'G-PERM-01' }]);
    }).not.toThrow();
  });

  it('matches by level only', () => {
    expect(() => {
      expectViolations([violation('G-PERM-01', 3, 'test')], [{ level: 3 }]);
    }).not.toThrow();
  });

  it('matches by message substring', () => {
    expect(() => {
      expectViolations([violation('G-PERM-01', 3, 'permission denied')], [{ message: 'denied' }]);
    }).not.toThrow();
  });

  it('matches by all three criteria', () => {
    expect(() => {
      expectViolations(
        [violation('G-PERM-01', 3, 'permission denied')],
        [{ ruleId: 'G-PERM-01', level: 3, message: 'denied' }],
      );
    }).not.toThrow();
  });

  it('fails when ruleId does not match', () => {
    expect(() => {
      expectViolations([violation('G-PERM-01', 3, 'test')], [{ ruleId: 'G-CLASS-01' }]);
    }).toThrow();
  });

  it('fails when level does not match', () => {
    expect(() => {
      expectViolations([violation('G-PERM-01', 3, 'test')], [{ ruleId: 'G-PERM-01', level: 5 }]);
    }).toThrow();
  });

  it('fails when message substring not found', () => {
    expect(() => {
      expectViolations([violation('G-PERM-01', 3, 'test')], [{ message: 'nonexistent' }]);
    }).toThrow();
  });

  it('fails when zero expected but violations present', () => {
    // This exercises the error message template at line 181
    expect(() => {
      expectViolations(
        [violation('G-PERM-01', 3, 'test')],
        [],
      );
    }).toThrow();
  });

  it('treats undefined actual as empty array', () => {
    expect(() => {
      expectViolations(undefined, []);
    }).not.toThrow();
  });

  it('treats empty actual as matching empty expected', () => {
    expect(() => {
      expectViolations([], []);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// expectArtifacts — all branches
// ---------------------------------------------------------------------------

describe('expectArtifacts()', () => {
  it('validates count', () => {
    expect(() => {
      expectArtifacts({ count: 3 }, { count: 3 });
    }).not.toThrow();
  });

  it('fails on count mismatch', () => {
    expect(() => {
      expectArtifacts({ count: 3 }, { count: 5 });
    }).toThrow();
  });

  it('validates artifact types', () => {
    expect(() => {
      expectArtifacts(
        { count: 3, types: ['plugin', 'skill', 'exec-approvals'] },
        { types: ['plugin', 'skill'] },
      );
    }).not.toThrow();
  });

  it('fails when expected type is missing', () => {
    expect(() => {
      expectArtifacts(
        { count: 1, types: ['plugin'] },
        { types: ['skill'] },
      );
    }).toThrow();
  });

  it('handles undefined actual types', () => {
    expect(() => {
      expectArtifacts(
        { count: 0 },
        { types: ['plugin'] },
      );
    }).toThrow();
  });

  it('validates both count and types together', () => {
    expect(() => {
      expectArtifacts(
        { count: 2, types: ['plugin', 'skill'] },
        { count: 2, types: ['plugin'] },
      );
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// expectNoForbiddenImports — all branches
// ---------------------------------------------------------------------------

describe('expectNoForbiddenImports()', () => {
  it('passes for code without forbidden imports', () => {
    const cleanCode = `
import { readFile } from 'node:fs';
import { join } from 'path';
const x = 42;
`;
    expect(() => {
      expectNoForbiddenImports(cleanCode);
    }).not.toThrow();
  });

  it('fails when @craftworks/ import is present', () => {
    const code = `import { parse } from '@bic/claws-sdk/compile/parse.js';`;
    expect(() => {
      expectNoForbiddenImports(code);
    }).toThrow();
  });

  it('fails when @claws/ import is present', () => {
    const code = `import { something } from '@bic/claws-test/utils.js';`;
    expect(() => {
      expectNoForbiddenImports(code);
    }).toThrow();
  });

  it('fails when both @craftworks/ and @claws/ imports are present', () => {
    const code = `
import { parse } from '@bic/claws-sdk/compile/parse.js';
import { something } from '@bic/claws-test/utils.js';
`;
    expect(() => {
      expectNoForbiddenImports(code);
    }).toThrow();
  });

  it('passes for code with similar but non-matching patterns', () => {
    // Contains "craftworks" but not "@craftworks/"
    const code = `const craftworksVersion = '1.0.0'; // not an import`;
    expect(() => {
      expectNoForbiddenImports(code);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// INFRASTRUCTURE_RULE_IDS
// ---------------------------------------------------------------------------

describe('INFRASTRUCTURE_RULE_IDS', () => {
  it('contains expected infrastructure rule IDs', () => {
    expect(INFRASTRUCTURE_RULE_IDS.has('G-CLASS-02')).toBe(true);
    expect(INFRASTRUCTURE_RULE_IDS.has('G-DATA-NOLABEL')).toBe(true);
    expect(INFRASTRUCTURE_RULE_IDS.has('G-PERM-01')).toBe(true);
    expect(INFRASTRUCTURE_RULE_IDS.has('G-ELICIT-GATE')).toBe(true);
    expect(INFRASTRUCTURE_RULE_IDS.has('G-ELICIT-PREAUTH')).toBe(true);
  });

  it('does not contain non-infrastructure rules', () => {
    expect(INFRASTRUCTURE_RULE_IDS.has('G-A2A-01')).toBe(false);
    expect(INFRASTRUCTURE_RULE_IDS.has('G-INPUT-01')).toBe(false);
  });
});
