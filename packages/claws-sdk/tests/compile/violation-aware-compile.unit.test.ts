/**
 * L0 unit tests for compileWithViolationGuard.
 *
 * The wrapper is a thin reducer over `ViolationStateMachine` and the
 * supplied compile function. These tests verify the three branches:
 *   - Clean compile → fresh IR served, state CLEAN
 *   - Violations   → last good IR served, state transitions
 *   - Compile throw → onCompileError synthesizes violations → ERROR
 */

import { describe, expect, it, vi } from 'vitest';
import { compileWithViolationGuard } from '../../src/compile/violation-aware-compile.js';
import { ViolationStateMachine, type ViolationInput } from '../../src/workspace/violation-state.js';

function fakeIR(tag: string): import('../../src/ir/governance-ir.js').GovernanceIR {
  return { tag } as never;
}

describe('compileWithViolationGuard', () => {
  it('clean compile → fresh IR, state CLEAN', async () => {
    const machine = new ViolationStateMachine();
    const fresh = fakeIR('fresh');
    const result = await compileWithViolationGuard(
      {
        compile: async () => fresh,
        classify: () => [],
        machine,
        currentVersion: 42,
      },
      fakeIR('stale'),
    );
    expect(result.degraded).toBe(false);
    expect(result.ir).toBe(fresh);
    expect(result.state).toBe('clean');
    expect(machine.getLastGoodVersion()).toBe(42);
  });

  it('violations → last good IR preserved, state transitions', async () => {
    const machine = new ViolationStateMachine();
    const stale = fakeIR('stale');
    const r5: ViolationInput = {
      path: 'oc://TOOLS.md',
      severity: 'error',
      rule: 'R5/transact',
      message: 'r5',
      fixGuidance: 'fix',
      source: 'external_edit',
      scope: 'isolated',
      tool: 'send_email',
    };

    const result = await compileWithViolationGuard(
      {
        compile: async () => fakeIR('fresh-but-bad'),
        classify: () => [r5],
        machine,
        currentVersion: 43,
      },
      stale,
    );
    expect(result.degraded).toBe(true);
    expect(result.ir).toBe(stale);
    expect(result.state).toBe('degraded_r5');
    expect(machine.getLastGoodVersion()).toBe(null);
  });

  it('compile throws + onCompileError supplied → ERROR with synthetic violation', async () => {
    const machine = new ViolationStateMachine();
    const onCompileError = vi.fn((_err: unknown): readonly ViolationInput[] => [
      {
        path: 'oc://SOUL.md',
        severity: 'fatal',
        rule: 'parse/structural',
        message: 'parse failed',
        fixGuidance: 'restore',
        source: 'external_edit',
        scope: 'structural',
      },
    ]);

    const result = await compileWithViolationGuard(
      {
        compile: async () => {
          throw new Error('parse kaboom');
        },
        classify: () => [],
        machine,
        currentVersion: 7,
        onCompileError,
      },
      undefined,
    );
    expect(onCompileError).toHaveBeenCalledOnce();
    expect(result.degraded).toBe(true);
    expect(result.ir).toBeUndefined();
    expect(result.state).toBe('error');
  });

  it('compile throws + no onCompileError → rethrows', async () => {
    const machine = new ViolationStateMachine();
    await expect(
      compileWithViolationGuard(
        {
          compile: async () => {
            throw new Error('boom');
          },
          classify: () => [],
          machine,
          currentVersion: 0,
        },
        undefined,
      ),
    ).rejects.toThrow('boom');
  });
});
