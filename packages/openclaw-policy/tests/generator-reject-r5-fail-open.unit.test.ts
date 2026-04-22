/**
 * L0 unit: r5-fail-open validator (CP-6 pulse 53, SC-07).
 *
 * Covers D1 of the pulse plan: the pure validator function consumed by
 * the generator's declaration-lowering pass. Two cases — valid tool
 * passes, invalid tool (R5 + failOpen) returns a structured diagnostic
 * with `invalidReason: 'r5-fail-open-declared'` plus source location.
 */

import { describe, it, expect } from 'vitest';

import { validateR5FailOpen } from '../src/generator/validators/r5-fail-open.js';
import { formatR5FailOpenStderr } from '../src/generator/diagnostics.js';
import type { ToolSpec } from '../src/types/index.js';

describe('validateR5FailOpen (pulse 53)', () => {
  it('accepts R4 tool that declares failOpen (mutual-exclusion only at R5)', () => {
    const tool: ToolSpec = {
      name: 'notify-oncall',
      riskLevel: 4,
      capabilities: ['COMMUNICATE'],
      failOpen: true,
      sourceLocation: { path: 'TOOLS.md', line: 7, column: 5 },
    };
    const r = validateR5FailOpen(tool);
    expect(r.ok).toBe(true);
  });

  it('rejects R5 + failOpen with structured diagnostic carrying source location', () => {
    const tool: ToolSpec = {
      name: 'send-email-failopen',
      riskLevel: 5,
      capabilities: ['COMMUNICATE', 'IRREVERSIBLE_EXTERNAL'],
      failOpen: true,
      sourceLocation: { path: 'TOOLS.md', line: 12, column: 5 },
    };
    const r = validateR5FailOpen(tool);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure branch');
    expect(r.diagnostic.kind).toBe('r5-fail-open');
    expect(r.diagnostic.invalidReason).toBe('r5-fail-open-declared');
    expect(r.diagnostic.toolName).toBe('send-email-failopen');
    expect(r.diagnostic.sourcePath).toBe('TOOLS.md');
    expect(r.diagnostic.line).toBe(12);
    expect(r.diagnostic.column).toBe(5);
    expect(r.diagnostic.message).toMatch(/R5/);
    expect(r.diagnostic.message).toMatch(/failOpen/);
  });

  it('accepts R5 tool without failOpen (fail-closed default)', () => {
    const tool: ToolSpec = {
      name: 'wire-transfer',
      riskLevel: 5,
      capabilities: ['IRREVERSIBLE_EXTERNAL'],
    };
    const r = validateR5FailOpen(tool);
    expect(r.ok).toBe(true);
  });

  it('falls back to TOOLS.md + 0/0 when source location is missing', () => {
    const tool: ToolSpec = {
      name: 'legacy-r5',
      riskLevel: 5,
      capabilities: [],
      failOpen: true,
    };
    const r = validateR5FailOpen(tool);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure branch');
    expect(r.diagnostic.sourcePath).toBe('TOOLS.md');
    expect(r.diagnostic.line).toBe(0);
    expect(r.diagnostic.column).toBe(0);
  });
});

describe('formatR5FailOpenStderr (pulse 53)', () => {
  it('renders a multi-line block with branded prefix, tool, location, reason', () => {
    const out = formatR5FailOpenStderr('claws', {
      kind: 'r5-fail-open',
      toolName: 'send-email-failopen',
      sourcePath: 'TOOLS.md',
      line: 12,
      column: 5,
      invalidReason: 'r5-fail-open-declared',
      message: 'ignored by formatter',
    });
    expect(out).toContain('claws policy generate: ERROR: R5 + failOpen');
    expect(out).toContain('Tool: send-email-failopen');
    expect(out).toContain('Location: TOOLS.md:12:5');
    expect(out).toContain('fail-closed semantics');
    expect(out).toContain('proposal §1.6');
  });

  it('supports the openclaw-branded binary name', () => {
    const out = formatR5FailOpenStderr('openclaw', {
      kind: 'r5-fail-open',
      toolName: 't',
      sourcePath: 'x/TOOLS.md',
      line: 1,
      column: 1,
      invalidReason: 'r5-fail-open-declared',
      message: '',
    });
    expect(out.startsWith('openclaw policy generate: ERROR:')).toBe(true);
  });
});
