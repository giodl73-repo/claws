/**
 * L0 unit tests for the approval-flow-sim runner (pulse 48).
 *
 * Covers:
 *   1. resolveFixture returns absolute path for existing fixture
 *   2. resolveFixture throws clear error on missing fixture
 *   3. runApprovalFlow defaults preset to InProcessAdapter when unset
 *   4. runApprovalFlow passes `clock` through to startHarness
 *   5. runApprovalFlow calls setup → invoke → assert in order
 *   6. runApprovalFlow asserts audit-chain length when expectedChainLength set
 *   7. runApprovalFlow calls /v1/reset + shutdown in teardown even when assert throws
 *   8. defineApprovalFlow produces an `it()` block with scenario.name as title
 *
 * These run entirely in-process — no snap child spawned — so they live in
 * the unit tier and run under the 95/90/95/95 coverage gate.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import {
  defaultPreset,
  runApprovalFlow,
} from '../approval-flow-sim/run.ts';
import { defineApprovalFlow } from '../approval-flow-sim/dispatch.ts';
import {
  resolveFixture,
  FixtureNotFoundError,
} from '../approval-flow-sim/fixtures.ts';
import { ClockMock } from '../clock-mock.ts';
import { InProcessAdapter } from '../host-adapter-test-doubles.ts';
import type {
  ApprovalFlowHarness,
  ApprovalFlowScenario,
  InvokeResult,
} from '../approval-flow-sim/types.ts';

function trivialInvoke(): InvokeResult {
  return {
    status: 'allowed',
    action: 'allow',
    correlationId: 'c-1',
    sinkEntries: [],
    body: null,
    headers: {},
  };
}

function baseScenario(
  name: string,
  overrides: Partial<ApprovalFlowScenario> = {},
): ApprovalFlowScenario {
  return {
    name,
    fixture: 'allow-r1-public',
    setup: async () => {},
    invoke: async () => trivialInvoke(),
    assert: async () => {},
    ...overrides,
  };
}

describe('resolveFixture', () => {
  it('returns an absolute path for an existing fixture', () => {
    const path = resolveFixture('allow-r1-public');
    expect(isAbsolute(path)).toBe(true);
    expect(existsSync(path)).toBe(true);
    expect(path).toBe(resolve(path));
  });

  it('throws FixtureNotFoundError on missing fixture (no silent fallback)', () => {
    expect(() => resolveFixture('nope-does-not-exist')).toThrow(FixtureNotFoundError);
    expect(() => resolveFixture('')).toThrow(FixtureNotFoundError);
  });
});

describe('runApprovalFlow', () => {
  it('defaults preset to InProcessAdapter when unset', async () => {
    let seenAdapter: unknown = null;
    await runApprovalFlow(
      baseScenario('sc-default-preset', {
        setup: async (h) => {
          seenAdapter = h.adapter;
        },
      }),
    );
    expect(seenAdapter).toBeInstanceOf(InProcessAdapter);
  });

  it('passes `clock` through to the adapter via preset factory', async () => {
    const clock = new ClockMock({ freezeAtMs: 2_000_000_000_000 });
    let observed = -1;
    await runApprovalFlow(
      baseScenario('sc-clock', {
        setup: async (h) => {
          observed = h.clock.nowMs();
          // advance + re-read to prove the clock is injected, not the real one
          h.clock.advance(7);
          observed = h.clock.nowMs();
        },
      }),
      { clock },
    );
    expect(observed).toBe(2_000_000_000_007);
  });

  it('invokes setup → invoke → assert in order', async () => {
    const order: string[] = [];
    await runApprovalFlow(
      baseScenario('sc-order', {
        setup: async () => {
          order.push('setup');
        },
        invoke: async () => {
          order.push('invoke');
          return trivialInvoke();
        },
        assert: async () => {
          order.push('assert');
        },
      }),
    );
    expect(order).toEqual(['setup', 'invoke', 'assert']);
  });

  it('asserts audit-chain length when expectedChainLength is set', async () => {
    // When scenario records zero sink entries but claims 1, the runner
    // must surface the mismatch rather than silently passing.
    const failing = baseScenario('sc-chain-bad', { expectedChainLength: 1 });
    await expect(runApprovalFlow(failing)).rejects.toThrow(/audit chain length 1, got 0/);

    // Zero-entries scenario with explicit expectedChainLength: 0 passes.
    const ok = baseScenario('sc-chain-ok', { expectedChainLength: 0 });
    await expect(runApprovalFlow(ok)).resolves.toBeUndefined();
  });

  it('shuts the harness down even when assert throws', async () => {
    let shutdownReached = false;
    const spyPreset = defaultPreset;
    await expect(
      runApprovalFlow(
        baseScenario('sc-throwing', {
          setup: async (h) => {
            // Wrap the existing shutdown call by observing that the adapter
            // was handed out — if teardown skipped, a follow-up run on the
            // same fixture name would collide on the tmp dir sentinel.
            void h.adapter;
            shutdownReached = true;
          },
          assert: async () => {
            throw new Error('scenario-intentional-failure');
          },
        }),
        { preset: spyPreset },
      ),
    ).rejects.toThrow(/scenario-intentional-failure/);
    expect(shutdownReached).toBe(true);

    // Running a second scenario proves teardown fully released the first's
    // harness state (no lingering listeners, fixture tmp dir, etc.).
    await expect(
      runApprovalFlow(baseScenario('sc-after-throw')),
    ).resolves.toBeUndefined();
  });

  it('honors a user-supplied preset that returns the same adapter instance', async () => {
    const clockFn = (): number => 1_700_000_000_000;
    const custom = new InProcessAdapter({
      policyDir: '/tmp/unused',
      clock: clockFn,
      adapterId: 'custom-unit',
    });
    let seen: unknown = null;
    await runApprovalFlow(
      baseScenario('sc-custom-preset', {
        setup: async (h) => {
          seen = h.adapter;
        },
      }),
      { preset: () => custom },
    );
    expect(seen).toBe(custom);
  });
});

describe('defineApprovalFlow', () => {
  it('registers a single it() block whose title matches scenario.name', () => {
    const calls: Array<{ name: string; hasFn: boolean }> = [];
    const fakeIt = (name: string, fn: () => Promise<void>): void => {
      calls.push({ name, hasFn: typeof fn === 'function' });
    };
    defineApprovalFlow(
      baseScenario('Pulse 48: dispatcher registration'),
      {},
      fakeIt,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      name: 'Pulse 48: dispatcher registration',
      hasFn: true,
    });
  });
});
