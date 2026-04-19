/**
 * L0 unit tests for the static stage dependency graph (CL-04 §IS.3).
 *
 * Readers have no upstream. `downstreamOf('soul')` includes every
 * consumer: modelToIR, baselineAnalysis, enforceR5, emit, validate.
 */

import { describe, it, expect } from 'vitest';
import {
  READER_STAGES,
  STAGE_ORDER,
  upstreamOf,
  downstreamOf,
  isReaderStage,
} from '#src/compiler/host/stage-deps.js';

describe('stage-deps (unit)', () => {
  it('readers have no upstream', () => {
    for (const reader of READER_STAGES) {
      expect(upstreamOf(reader)).toEqual([]);
      expect(isReaderStage(reader)).toBe(true);
    }
  });

  it('downstreamOf("soul") includes every downstream consumer', () => {
    const downstream = downstreamOf('soul');
    expect(downstream).toContain('modelToIR');
    expect(downstream).toContain('baselineAnalysis');
    expect(downstream).toContain('enforceR5');
    expect(downstream).toContain('emit');
    expect(downstream).toContain('validate');
  });

  it('modelToIR upstream is every reader', () => {
    const up = upstreamOf('modelToIR');
    for (const r of READER_STAGES) {
      expect(up).toContain(r);
    }
  });

  it('STAGE_ORDER has all 14 stages exactly once in declaration order', () => {
    expect(STAGE_ORDER.length).toBe(14);
    expect(new Set(STAGE_ORDER).size).toBe(14);
    expect(STAGE_ORDER[0]).toBe('soul');
    expect(STAGE_ORDER[8]).toBe('lobster');
    expect(STAGE_ORDER[9]).toBe('modelToIR');
    expect(STAGE_ORDER[13]).toBe('validate');
  });

  it('validate upstream includes emit, enforceR5, and modelToIR', () => {
    const up = upstreamOf('validate');
    expect(up).toContain('emit');
    expect(up).toContain('enforceR5');
    expect(up).toContain('modelToIR');
  });
});
