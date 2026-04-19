import { describe, it, expect } from 'vitest';
import { analyze } from '../src/compile/analyze.js';
import { waffles } from './helpers/fixture.js';

describe('Analyze phase — IR validity (4 tests)', () => {
  it('well-formed Waffles IR is OK', () => {
    const ir = waffles();
    const { ok, diagnostics } = analyze(ir);
    expect(ok).toBe(true);
    expect(diagnostics.every((d) => d.severity !== 'error')).toBe(true);
  });

  it('IRREVERSIBLE_EXTERNAL below R5 produces OC-POLICY-E102', () => {
    const ir = waffles({
      tools: [
        {
          name: 'bad',
          riskLevel: 3,
          capabilities: ['IRREVERSIBLE_EXTERNAL'],
        },
      ],
    });
    const { ok, diagnostics } = analyze(ir);
    expect(ok).toBe(false);
    expect(diagnostics.some((d) => d.code === 'OC-POLICY-E102')).toBe(true);
  });

  it('args_from cycles produce OC-POLICY-E230', () => {
    const ir = waffles({
      tools: [
        {
          name: 'a',
          riskLevel: 1,
          capabilities: ['READ'],
          argsFrom: { x: [{ tool_output: 'b' }] },
        },
        {
          name: 'b',
          riskLevel: 1,
          capabilities: ['READ'],
          argsFrom: { x: [{ tool_output: 'a' }] },
        },
      ],
    });
    const { ok, diagnostics } = analyze(ir);
    expect(ok).toBe(false);
    expect(diagnostics.some((d) => d.code === 'OC-POLICY-E230')).toBe(true);
  });

  it('R3+ without args_from produces OC-POLICY-E231', () => {
    const ir = waffles({
      tools: [{ name: 'risky', riskLevel: 3, capabilities: ['WRITE'] }],
    });
    const { ok, diagnostics } = analyze(ir);
    expect(ok).toBe(false);
    expect(diagnostics.some((d) => d.code === 'OC-POLICY-E231')).toBe(true);
  });
});
