/**
 * G-CHAIN generator-compile integration test (SC-15, pulse 56 D5 L1).
 *
 * Proves `computeEffectiveSensitivity` drives the shipping behaviour from
 * proposal §5 property 1 row 2:
 *
 *   TOOLS.md `args_from: [ memory.RESTRICTED ]` (modelling the spec's
 *   `{ source: 'RESTRICTED-classifier' }` shape) → downstream tool's
 *   `effectiveSensitivity` lifts to `'RESTRICTED'` regardless of its own
 *   declared baseline. Transitive chains propagate the elevation through
 *   `tool_output.X` references.
 *
 * This is NOT OC-9 hook-result stickiness (§6.1, unshipped): the
 * elevation is purely a compile-time property of the IR.
 */

import { describe, expect, it } from 'vitest';

import { computeEffectiveSensitivity } from '../src/compile/gchain.js';
import type { ToolSpec } from '../src/types/index.js';

describe('G-CHAIN — generator-compiled sensitivity propagation', () => {
  it('elevates downstream tool to RESTRICTED when args_from binds a RESTRICTED memory source', () => {
    // `RESTRICTED-classifier` is the spec-level name for "a source of
    // RESTRICTED data". We model it as a tool whose own args_from binds
    // memory.RESTRICTED; the downstream `summarize-secrets` binds its
    // input via `tool_output.RESTRICTED-classifier`.
    const tools: ToolSpec[] = [
      {
        name: 'RESTRICTED-classifier',
        riskLevel: 3,
        capabilities: ['READ'],
        argsFrom: { input: [{ memory: 'RESTRICTED' }] },
      },
      {
        name: 'summarize-secrets',
        riskLevel: 3,
        capabilities: ['READ'],
        sensitivity: 'PUBLIC',
        argsFrom: { payload: [{ tool_output: 'RESTRICTED-classifier' }] },
      },
    ];
    const effective = computeEffectiveSensitivity(tools);
    expect(effective.get('RESTRICTED-classifier')).toBe('RESTRICTED');
    expect(effective.get('summarize-secrets')).toBe('RESTRICTED');
  });

  it('propagates RESTRICTED transitively through a 3-step chain (SC-15 F-04)', () => {
    const tools: ToolSpec[] = [
      {
        name: 'RESTRICTED-classifier',
        riskLevel: 3,
        capabilities: ['READ'],
        argsFrom: { seed: [{ memory: 'RESTRICTED' }] },
      },
      {
        name: 'mid-tool',
        riskLevel: 3,
        capabilities: ['READ'],
        argsFrom: { relay: [{ tool_output: 'RESTRICTED-classifier' }] },
      },
      {
        name: 'downstream-tool',
        riskLevel: 3,
        capabilities: ['READ'],
        sensitivity: 'PUBLIC',
        argsFrom: { final: [{ tool_output: 'mid-tool' }] },
      },
    ];
    const effective = computeEffectiveSensitivity(tools);
    expect(effective.get('downstream-tool')).toBe('RESTRICTED');
  });

  it('does NOT elevate downstream when upstream is PUBLIC (control case, SC-15 F-05)', () => {
    const tools: ToolSpec[] = [
      {
        name: 'PUBLIC-classifier',
        riskLevel: 1,
        capabilities: ['READ'],
        sensitivity: 'PUBLIC',
      },
      {
        name: 'downstream-tool',
        riskLevel: 1,
        capabilities: ['READ'],
        sensitivity: 'PUBLIC',
        argsFrom: { payload: [{ tool_output: 'PUBLIC-classifier' }] },
      },
    ];
    const effective = computeEffectiveSensitivity(tools);
    expect(effective.get('downstream-tool')).toBe('PUBLIC');
  });

  it('uses max(declared, upstream) — a CONFIDENTIAL declared tool with a RESTRICTED upstream yields RESTRICTED', () => {
    const tools: ToolSpec[] = [
      {
        name: 'restricted-source',
        riskLevel: 3,
        capabilities: ['READ'],
        argsFrom: { seed: [{ memory: 'RESTRICTED' }] },
      },
      {
        name: 'confidential-declared-sink',
        riskLevel: 3,
        capabilities: ['READ'],
        sensitivity: 'CONFIDENTIAL',
        argsFrom: { payload: [{ tool_output: 'restricted-source' }] },
      },
    ];
    const effective = computeEffectiveSensitivity(tools);
    expect(effective.get('confidential-declared-sink')).toBe('RESTRICTED');
  });

  it('defaults a tool with no declaration and no sources to PUBLIC', () => {
    const tools: ToolSpec[] = [
      { name: 'bare', riskLevel: 1, capabilities: [] },
    ];
    const effective = computeEffectiveSensitivity(tools);
    expect(effective.get('bare')).toBe('PUBLIC');
  });
});
