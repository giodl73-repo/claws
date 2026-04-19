/**
 * L0 unit tests for the SOUL.md section parser (pulse 35).
 *
 * Covers the eight cases the pulse plan enumerates:
 *  1. single-section parse
 *  2. multi-section parse with nested headings
 *  3. lossless round-trip
 *  4. governance context deny rule counts
 *  5. compiler-injected marking detection
 *  6. empty SOUL.md returns empty sections
 *  7. frontmatter preserved in round-trip
 *  8. stable section ids across parses
 */
import { describe, expect, it } from 'vitest';
import {
  parseSoulSections,
  reassembleSoulSections,
  replaceSectionContent,
  SoulSectionError,
} from '../../src/workspace/soul-sections.js';
import type { DenyIntent, GovernanceIR } from '../../src/ir/index.js';
import type { SoulSection } from '@bic/openclaw-workspace/path';

function soul(raw: string): SoulSection {
  return { raw, preamble: '', sections: [] };
}

function minimalIR(intents: readonly DenyIntent[] = []): GovernanceIR {
  return {
    capabilities: { tools: [], skills: [], agents: [], workflows: [] },
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
      compilerVersion: '0.1.0',
      compiledAt: '2026-04-17T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

function deny(overrides: Partial<DenyIntent> & Pick<DenyIntent, 'target'>): DenyIntent {
  return {
    kind: 'deny',
    id: overrides.id ?? `deny:${overrides.target}`,
    ruleId: overrides.ruleId ?? 'R-LOCAL-01',
    level: overrides.level ?? 3,
    description: overrides.description ?? 'test deny',
    target: overrides.target,
    reason: overrides.reason ?? 'test',
  };
}

describe('parseSoulSections — L0', () => {
  it('parses a single-section SOUL.md into one SoulSectionView', () => {
    const raw = '# Soul\n\n## Purpose\n\nWrite well.\n';
    const parse = parseSoulSections(soul(raw));
    expect(parse.sections).toHaveLength(1);
    const [s] = parse.sections;
    expect(s!.id).toBe('purpose');
    expect(s!.heading).toBe('Purpose');
    expect(s!.content).toBe('\nWrite well.\n');
    expect(s!.line).toBe(3);
    expect(s!.governanceContext).toEqual({
      denyRuleCount: 0,
      compilerInjected: false,
      lockSource: 'none',
    });
  });

  it('parses a multi-section file with nested H3 headings under each H2', () => {
    const raw =
      '# Soul\n\n## Purpose\n\n### North Star\n\nWrite well.\n\n## Values\n\n### Integrity\n\nBe honest.\n';
    const parse = parseSoulSections(soul(raw));
    expect(parse.sections.map((s) => s.heading)).toEqual(['Purpose', 'Values']);
    expect(parse.sections[0]!.content).toContain('### North Star');
    expect(parse.sections[1]!.content).toContain('### Integrity');
    expect(parse.sections[0]!.line).toBe(3);
    expect(parse.sections[1]!.line).toBe(9);
  });

  it('round-trips losslessly — parse → reassemble reproduces the source', () => {
    const raw = '# Soul\n\n## Purpose\n\nWrite well.\n\n## Values\n\n- Integrity\n- Kindness\n';
    const parse = parseSoulSections(soul(raw));
    expect(reassembleSoulSections(parse)).toBe(raw);
  });

  it('round-trips losslessly with CRLF line endings and a trailing blank', () => {
    const raw = '# Soul\r\n\r\n## Purpose\r\n\r\nWrite well.\r\n\r\n';
    const parse = parseSoulSections(soul(raw));
    expect(reassembleSoulSections(parse)).toBe(raw);
  });

  it('attaches deny rule counts from a GovernanceIR', () => {
    const ir = minimalIR([
      deny({ target: 'SOUL.purpose', ruleId: 'R-LOCAL-01' }),
      deny({ target: 'SOUL.purpose', ruleId: 'R-LOCAL-02' }),
      deny({ target: 'SOUL.values', ruleId: 'FLEET-02' }),
      deny({ target: 'TOOLS.send_mail' }),
    ]);
    const raw = '# Soul\n\n## Purpose\n\nP\n\n## Values\n\nV\n';
    const parse = parseSoulSections(soul(raw), ir);
    const purpose = parse.sections.find((s) => s.id === 'purpose')!;
    const values = parse.sections.find((s) => s.id === 'values')!;
    expect(purpose.governanceContext.denyRuleCount).toBe(2);
    expect(purpose.governanceContext.lockSource).toBe('governance');
    expect(values.governanceContext.denyRuleCount).toBe(1);
    expect(values.governanceContext.lockSource).toBe('fleet');
  });

  it('marks compilerInjected true for rule ids that start with G-', () => {
    const ir = minimalIR([
      deny({ target: 'SOUL.purpose', ruleId: 'G-INPUT-01' }),
      deny({ target: 'SOUL.values', ruleId: 'R-LOCAL-01', level: 5 }),
    ]);
    const raw = '# Soul\n\n## Purpose\n\nP\n\n## Values\n\nV\n';
    const parse = parseSoulSections(soul(raw), ir);
    const purpose = parse.sections.find((s) => s.id === 'purpose')!;
    const values = parse.sections.find((s) => s.id === 'values')!;
    expect(purpose.governanceContext.compilerInjected).toBe(true);
    expect(values.governanceContext.compilerInjected).toBe(false);
    expect(values.governanceContext.lockSource).toBe('r5');
  });

  it('returns an empty sections array for a preamble-only or empty SOUL.md', () => {
    const empty = parseSoulSections(soul(''));
    expect(empty.sections).toEqual([]);
    expect(empty.preamble).toBe('');
    expect(reassembleSoulSections(empty)).toBe('');

    const preambleOnly = parseSoulSections(soul('# Soul\n\nNo headings.\n'));
    expect(preambleOnly.sections).toEqual([]);
    expect(preambleOnly.preamble).toBe('# Soul\n\nNo headings.\n');
    expect(reassembleSoulSections(preambleOnly)).toBe('# Soul\n\nNo headings.\n');
  });

  it('preserves YAML frontmatter in the preamble across a round-trip', () => {
    const raw = '---\ntitle: soul\n---\n\n# Soul\n\n## Purpose\n\nP\n';
    const parse = parseSoulSections(soul(raw));
    expect(parse.preamble.startsWith('---\ntitle: soul\n---')).toBe(true);
    expect(reassembleSoulSections(parse)).toBe(raw);
  });

  it('produces stable section ids across repeated parses (including duplicate headings)', () => {
    const raw = '## Values\n\nA\n\n## Values\n\nB\n';
    const first = parseSoulSections(soul(raw));
    const second = parseSoulSections(soul(raw));
    expect(first.sections.map((s) => s.id)).toEqual(['values', 'values-2']);
    expect(first.sections.map((s) => s.id)).toEqual(second.sections.map((s) => s.id));
  });
});

describe('parseSoulSections — edge cases', () => {
  it('round-trips a heading with no trailing newline at EOF', () => {
    const raw = '## A';
    const parse = parseSoulSections(soul(raw));
    expect(parse.sections).toHaveLength(1);
    expect(parse.sections[0]!.content).toBe('');
    expect(reassembleSoulSections(parse)).toBe(raw);
  });

  it('round-trips a heading with empty body and no trailing EOL between two sections', () => {
    // Final empty-content section with trailingEol=false.
    const raw = '## A\n\nBody\n## B';
    const parse = parseSoulSections(soul(raw));
    expect(parse.sections).toHaveLength(2);
    expect(parse.sections[1]!.content).toBe('');
    expect(reassembleSoulSections(parse)).toBe(raw);
  });

  it('attaches an R5 lock source for critical deny intents', () => {
    const ir = minimalIR([deny({ target: 'SOUL.purpose', ruleId: 'R-CRIT', level: 5 })]);
    const parse = parseSoulSections(soul('## Purpose\n\nP\n'), ir);
    expect(parse.sections[0]!.governanceContext.lockSource).toBe('r5');
  });

  it('preserves a leading UTF-8 BOM across a round-trip', () => {
    const raw = '\uFEFF# Soul\n\n## Purpose\n\nBody.\n';
    const parse = parseSoulSections(soul(raw));
    expect(parse.shape.bom).toBe('\uFEFF');
    expect(reassembleSoulSections(parse)).toBe(raw);
  });

  it('ignores non-deny intents and intents whose target is not a SOUL section', () => {
    const ir = minimalIR([
      deny({ target: 'TOOLS.send_mail' }),
      // Non-deny intent kinds coexist in `intents[]`; the indexer must
      // skip them so the count for SOUL sections stays accurate.
      {
        kind: 'elicit',
        id: 'e1',
        ruleId: 'R-LOCAL',
        level: 2,
        description: 'confirm',
        target: 'SOUL.purpose',
        prompt: 'are you sure',
      },
    ]);
    const parse = parseSoulSections(soul('## Purpose\n\nP\n'), ir);
    expect(parse.sections[0]!.governanceContext.denyRuleCount).toBe(0);
  });
});

describe('replaceSectionContent — L0', () => {
  it('replaces body and reassembles losslessly for unaffected sections', () => {
    const raw = '# Soul\n\n## Purpose\n\nOld.\n\n## Values\n\nV\n';
    const parse = parseSoulSections(soul(raw));
    const updated = replaceSectionContent(parse, 'purpose', '\nNew body.\n\n');
    const out = reassembleSoulSections(updated);
    expect(out).toBe('# Soul\n\n## Purpose\n\nNew body.\n\n## Values\n\nV\n');
  });

  it('throws SoulSectionError when the id is not present', () => {
    const parse = parseSoulSections(soul('## A\n\nA\n'));
    expect(() => replaceSectionContent(parse, 'missing', 'x')).toThrow(SoulSectionError);
  });
});
