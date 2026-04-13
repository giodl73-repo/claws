/**
 * L0: conflicts-ir conversion unit tests.
 *
 * Covers:
 * 1. toIRConflictReport — empty report
 * 2. OBO-WITHOUT-ELICIT entries map to oboConflicts
 * 3. DENY-vs-TOOL entries map to multiConstraintConflicts
 * 4. Other multi-constraint categories (DATA-LABEL-MISMATCH, SCHEDULE-NO-APPROVAL, etc.)
 * 5. toIRSeverity maps Error/Warning/unknown correctly
 * 6. extractToolName parses tool name from explanation
 * 7. haltReason set when errorCount > 0
 * 8. hasOboWithoutElicit flag
 * 9. Mixed categories are routed correctly
 */

import { describe, it, expect } from 'vitest';
import { toIRConflictReport } from '../../src/compile/conflicts-ir.js';
import type { ConflictReport, ConflictEntry } from '../../src/compile/types.js';

function makeReport(conflicts: ConflictEntry[], errorCount = 0, warningCount = 0): ConflictReport {
  return { conflicts, errorCount, warningCount };
}

function makeEntry(overrides: Partial<ConflictEntry>): ConflictEntry {
  return {
    category: 'DENY-vs-TOOL',
    code: 'CLAWS-C001',
    severity: 'Error',
    locationA: { file: 'SOUL.md', line: 5 },
    locationB: { file: 'TOOLS.md', line: 10 },
    explanation: 'Test conflict',
    ...overrides,
  } as ConflictEntry;
}

describe('toIRConflictReport()', () => {
  it('returns empty report for empty input', () => {
    const result = toIRConflictReport(makeReport([]));

    expect(result.oboConflicts).toEqual([]);
    expect(result.multiConstraintConflicts).toEqual([]);
    expect(result.haltReason).toBeNull();
    expect(result.hasOboWithoutElicit).toBe(false);
    expect(result.totalConflicts).toBe(0);
  });

  it('routes OBO-WITHOUT-ELICIT to oboConflicts', () => {
    const entry = makeEntry({
      category: 'OBO-WITHOUT-ELICIT',
      code: 'CLAWS-C003',
      severity: 'Error',
      locationA: { file: 'TOOLS.md', line: 8 },
      locationB: { file: 'USER.md', line: 1 },
      explanation: 'Tool "prod-deploy" (R5) has OBO flag but no elicitation gate',
    });

    const result = toIRConflictReport(makeReport([entry], 1, 0));

    expect(result.oboConflicts).toHaveLength(1);
    expect(result.oboConflicts[0]!.toolName).toBe('prod-deploy');
    expect(result.oboConflicts[0]!.severity).toBe('error');
    expect(result.oboConflicts[0]!.oboWithoutElicit).toBe(true);
    expect(result.oboConflicts[0]!.description).toContain('prod-deploy');
    expect(result.multiConstraintConflicts).toHaveLength(0);
  });

  it('routes DENY-vs-TOOL to multiConstraintConflicts', () => {
    const entry = makeEntry({
      category: 'DENY-vs-TOOL',
      code: 'CLAWS-C001',
      severity: 'Error',
      locationA: { file: 'SOUL.md', line: 5 },
      locationB: { file: 'TOOLS.md', line: 10 },
      explanation: 'Deny conflicts with tool declaration',
    });

    const result = toIRConflictReport(makeReport([entry], 1, 0));

    expect(result.multiConstraintConflicts).toHaveLength(1);
    expect(result.multiConstraintConflicts[0]!.target).toBe('SOUL.md:5');
    expect(result.multiConstraintConflicts[0]!.ruleIds).toHaveLength(2);
    expect(result.multiConstraintConflicts[0]!.severity).toBe('error');
    expect(result.oboConflicts).toHaveLength(0);
  });

  it('routes DATA-LABEL-MISMATCH to multiConstraintConflicts', () => {
    const entry = makeEntry({
      category: 'DATA-LABEL-MISMATCH',
      code: 'CLAWS-C004',
      severity: 'Warning',
    });

    const result = toIRConflictReport(makeReport([entry], 0, 1));

    expect(result.multiConstraintConflicts).toHaveLength(1);
    expect(result.multiConstraintConflicts[0]!.severity).toBe('warning');
  });

  it('routes TRUST-ESCALATION to multiConstraintConflicts', () => {
    const entry = makeEntry({
      category: 'TRUST-ESCALATION',
      code: 'CLAWS-C002',
      severity: 'Error',
    });

    const result = toIRConflictReport(makeReport([entry], 1, 0));
    expect(result.multiConstraintConflicts).toHaveLength(1);
  });

  it('routes CIRCULAR-DELEGATION to multiConstraintConflicts', () => {
    const entry = makeEntry({
      category: 'CIRCULAR-DELEGATION',
      code: 'CLAWS-C005',
      severity: 'Error',
    });

    const result = toIRConflictReport(makeReport([entry], 1, 0));
    expect(result.oboConflicts).toHaveLength(0);
    expect(result.multiConstraintConflicts).toHaveLength(1);
    expect(result.totalConflicts).toBe(1);
  });

  it('routes SKILL-TOOL-GHOST to multiConstraintConflicts', () => {
    const entry = makeEntry({
      category: 'SKILL-TOOL-GHOST',
      code: 'CLAWS-C006',
      severity: 'Warning',
    });

    const result = toIRConflictReport(makeReport([entry], 0, 1));
    expect(result.multiConstraintConflicts).toHaveLength(1);
  });

  it('routes SCHEDULE-NO-APPROVAL to multiConstraintConflicts', () => {
    const entry = makeEntry({
      category: 'SCHEDULE-NO-APPROVAL',
      code: 'CLAWS-C007',
      severity: 'Error',
    });

    const result = toIRConflictReport(makeReport([entry], 1, 0));
    expect(result.multiConstraintConflicts).toHaveLength(1);
  });

  it('maps Warning severity to "warning" in IR', () => {
    const entry = makeEntry({
      category: 'OBO-WITHOUT-ELICIT',
      code: 'CLAWS-C003',
      severity: 'Warning',
      explanation: 'Tool "api-call" (R3) has OBO flag',
    });

    const result = toIRConflictReport(makeReport([entry], 0, 1));
    expect(result.oboConflicts[0]!.severity).toBe('warning');
  });

  it('maps unknown severity to "info" in IR', () => {
    // Force an entry with a non-standard severity
    const entry = {
      ...makeEntry({ category: 'DENY-vs-TOOL' }),
      severity: 'Info' as 'Error',
    };

    const result = toIRConflictReport(makeReport([entry], 0, 0));
    expect(result.multiConstraintConflicts[0]!.severity).toBe('info');
  });

  it('extractToolName falls back to raw explanation when pattern does not match', () => {
    const entry = makeEntry({
      category: 'OBO-WITHOUT-ELICIT',
      code: 'CLAWS-C003',
      explanation: 'no tool name pattern here',
    });

    const result = toIRConflictReport(makeReport([entry], 1, 0));
    expect(result.oboConflicts[0]!.toolName).toBe('no tool name pattern here');
  });

  it('sets haltReason when errorCount > 0', () => {
    const entry = makeEntry({ category: 'DENY-vs-TOOL', severity: 'Error' });
    const result = toIRConflictReport(makeReport([entry], 2, 0));

    expect(result.haltReason).toBe('2 error-severity conflicts');
  });

  it('haltReason is null when errorCount is 0', () => {
    const entry = makeEntry({ category: 'OBO-WITHOUT-ELICIT', severity: 'Warning', code: 'CLAWS-C003', explanation: 'Tool "x" warn' });
    const result = toIRConflictReport(makeReport([entry], 0, 1));

    expect(result.haltReason).toBeNull();
  });

  it('hasOboWithoutElicit is true when any OBO conflict has oboWithoutElicit flag', () => {
    const entry = makeEntry({
      category: 'OBO-WITHOUT-ELICIT',
      code: 'CLAWS-C003',
      explanation: 'Tool "x" (R5) has OBO flag but no elicitation gate',
    });

    const result = toIRConflictReport(makeReport([entry], 1, 0));
    expect(result.hasOboWithoutElicit).toBe(true);
  });

  it('handles mixed OBO and multi-constraint entries', () => {
    const oboEntry = makeEntry({
      category: 'OBO-WITHOUT-ELICIT',
      code: 'CLAWS-C003',
      explanation: 'Tool "deploy" (R5) without gate',
    });
    const denyEntry = makeEntry({
      category: 'DENY-vs-TOOL',
      code: 'CLAWS-C001',
    });
    const schedEntry = makeEntry({
      category: 'SCHEDULE-NO-APPROVAL',
      code: 'CLAWS-C007',
    });

    const result = toIRConflictReport(makeReport([oboEntry, denyEntry, schedEntry], 3, 0));

    expect(result.oboConflicts).toHaveLength(1);
    expect(result.multiConstraintConflicts).toHaveLength(2);
    expect(result.totalConflicts).toBe(3);
  });
});
