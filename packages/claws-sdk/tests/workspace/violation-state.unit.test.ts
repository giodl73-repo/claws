/**
 * L0 unit tests for the ViolationStateMachine + `reduceState` helper.
 *
 * Covers the 8 AC cases from pulse 73:
 *   1. CLEAN → DEGRADED_R5 on R5 tool violation
 *   2. CLEAN → ERROR on structural failure
 *   3. DEGRADED_R5 → CLEAN on fix
 *   4. ERROR → CLEAN on fix
 *   5. R5 tool blocking surfaces via getBlockedTools()
 *   6. isPatchAllowed gates repair vs non-repair in ERROR
 *   7. lastGoodVersion pinned during degraded
 *   8. Violation attribution surfaces source + scope + file
 */

import { describe, it, expect } from 'vitest';
import {
  ViolationStateMachine,
  reduceState,
  type ViolationInput,
} from '../../src/workspace/violation-state.js';
import { ViolationState } from '../../src/workspace/violation-types.js';

function r5Violation(overrides: Partial<ViolationInput> = {}): ViolationInput {
  return {
    path: 'oc://TOOLS.md#send_email',
    severity: 'error',
    rule: 'R5/transact',
    message: 'send_email requires R5 approval',
    fixGuidance: 'Remove send_email or attach signed R5 approval',
    source: 'oc_runtime',
    scope: 'isolated',
    tool: 'send_email',
    file: 'TOOLS.md',
    ...overrides,
  };
}

function structuralViolation(overrides: Partial<ViolationInput> = {}): ViolationInput {
  return {
    path: 'oc://SOUL.md',
    severity: 'error',
    rule: 'parse/structural',
    message: 'SOUL.md has unparseable YAML frontmatter',
    fixGuidance: 'Restore SOUL.md from the last good snapshot',
    source: 'external_edit',
    scope: 'structural',
    file: 'SOUL.md',
    ...overrides,
  };
}

describe('ViolationStateMachine — transitions', () => {
  it('CLEAN → DEGRADED_R5 on R5 tool violation', () => {
    const m = new ViolationStateMachine();
    expect(m.getState()).toBe(ViolationState.CLEAN);
    const next = m.applyRecompile({
      violations: [r5Violation()],
      lastGoodVersion: 41,
    });
    expect(next).toBe(ViolationState.DEGRADED_R5);
    expect(m.getBlockedTools()).toEqual(['send_email']);
  });

  it('CLEAN → ERROR on structural failure', () => {
    const m = new ViolationStateMachine();
    const next = m.applyRecompile({
      violations: [structuralViolation()],
      lastGoodVersion: 10,
    });
    expect(next).toBe(ViolationState.ERROR);
    expect(m.getRepairPaths()).toContain('oc://SOUL.md');
  });

  it('DEGRADED_R5 → CLEAN on fix', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 });
    expect(m.getState()).toBe(ViolationState.DEGRADED_R5);

    const after = m.applyRecompile({ violations: [], lastGoodVersion: 2 });
    expect(after).toBe(ViolationState.CLEAN);
    expect(m.getBlockedTools()).toEqual([]);
    expect(m.getLastGoodVersion()).toBe(2);
  });

  it('ERROR → CLEAN on fix (structural repair)', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({ violations: [structuralViolation()], lastGoodVersion: 7 });
    expect(m.getState()).toBe(ViolationState.ERROR);

    const after = m.applyRecompile({ violations: [], lastGoodVersion: 8 });
    expect(after).toBe(ViolationState.CLEAN);
    expect(m.getRepairPaths()).toEqual([]);
    expect(m.getLastGoodVersion()).toBe(8);
  });
});

describe('ViolationStateMachine — gating + attribution', () => {
  it('R5 tool blocking only blocks the offending tool', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({
      violations: [r5Violation({ tool: 'send_email' })],
      lastGoodVersion: 1,
    });
    expect(m.isPatchAllowed({ tool: 'send_email' })).toBe(false);
    expect(m.isPatchAllowed({ tool: 'read_inbox' })).toBe(true);
    // CP-7 R1 dragon M-4: fail-closed when tool cannot be identified in
    // DEGRADED_R5. An explicit repair-path PATCH on the violating file
    // still passes so admins can fix the root cause under lock.
    expect(m.isPatchAllowed({ tool: undefined })).toBe(false);
    expect(m.isPatchAllowed({})).toBe(false);
    expect(
      m.isPatchAllowed({ path: 'oc://TOOLS.md#send_email' }),
    ).toBe(true);
  });

  it('ERROR gates non-repair PATCHes but admits repair paths', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({ violations: [structuralViolation()], lastGoodVersion: 1 });

    expect(m.isPatchAllowed({ path: 'oc://SOUL.md' })).toBe(true);
    expect(m.isPatchAllowed({ path: 'oc://TOOLS.md' })).toBe(false);
    expect(m.isPatchAllowed({})).toBe(false);
  });

  it('last-good version pins during degraded and advances on clean compile', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({ violations: [], lastGoodVersion: 5 });
    expect(m.getLastGoodVersion()).toBe(5);

    // A compile with violations must NOT advance the last-good version.
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 6 });
    expect(m.getLastGoodVersion()).toBe(5);

    m.applyRecompile({ violations: [], lastGoodVersion: 6 });
    expect(m.getLastGoodVersion()).toBe(6);
  });

  it('summary() on a clean machine returns empty fixGuidance', () => {
    // Covers the `violations.length === 0 ? '' : ...` branch — a freshly
    // constructed machine with no recompile should report an empty guidance
    // string rather than throwing on `violations[0]!.fixGuidance`.
    const m = new ViolationStateMachine();
    const s = m.summary();
    expect(s.state).toBe(ViolationState.CLEAN);
    expect(s.violations).toHaveLength(0);
    expect(s.fixGuidance).toBe('');
    expect(s.blockedTools).toEqual([]);
    expect(s.lastGoodVersion).toBe(null);
  });

  it('attribution: surfaces source + scope + file via summary()', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({
      violations: [
        r5Violation({ source: 'onedrive_sync', tool: 'send_email', file: 'TOOLS.md' }),
      ],
      lastGoodVersion: 1,
    });
    const s = m.summary();
    expect(s.state).toBe(ViolationState.DEGRADED_R5);
    expect(s.violations).toHaveLength(1);
    expect(s.violations[0]!.source).toBe('onedrive_sync');
    expect(s.violations[0]!.scope).toBe('isolated');
    expect(s.violations[0]!.file).toBe('TOOLS.md');
    expect(s.blockedTools).toEqual(['send_email']);
  });
});

describe('ViolationStateMachine — partial fix + persistence + debounce', () => {
  it('partial fix drops to next-worst, not CLEAN', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({
      violations: [
        structuralViolation(),
        r5Violation(),
      ],
      lastGoodVersion: 1,
    });
    expect(m.getState()).toBe(ViolationState.ERROR);

    // Fix only the structural error; R5 remains.
    m.resolveViolation('oc://SOUL.md', 'parse/structural');
    expect(m.getState()).toBe(ViolationState.DEGRADED_R5);
    expect(m.getBlockedTools()).toEqual(['send_email']);
  });

  it('snapshot + restore round-trip preserves state and violations', () => {
    const m1 = new ViolationStateMachine({ now: () => '2026-04-17T00:00:00.000Z' });
    m1.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 42 });
    const snap = m1.snapshot();

    const m2 = new ViolationStateMachine();
    m2.restore(snap);
    expect(m2.getState()).toBe(ViolationState.DEGRADED_R5);
    expect(m2.getLastGoodVersion()).toBe(null);
    expect(m2.getViolations()).toHaveLength(1);
    expect(m2.getBlockedTools()).toEqual(['send_email']);
  });

  it('debounce: duplicate violation observations merge on path+rule key', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({
      violations: [r5Violation(), r5Violation()],
      lastGoodVersion: 1,
    });
    // Two inputs with identical path+rule collapse to one entry.
    expect(m.getViolations()).toHaveLength(1);
  });

  it('transition listener fires with from + to + violations', () => {
    const events: Array<{ from: string; to: string; n: number }> = [];
    const m = new ViolationStateMachine({
      onTransition: (from, to, vs) => events.push({ from, to, n: vs.length }),
    });
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 });
    m.applyRecompile({ violations: [], lastGoodVersion: 2 });
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ from: 'clean', to: 'degraded_r5', n: 1 });
    expect(events[1]).toEqual({ from: 'degraded_r5', to: 'clean', n: 0 });
  });

  it('DEGRADED_WARN: PATCHes allowed, isPatchAllowed returns true', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({
      violations: [{
        path: 'oc://SOUL.md',
        severity: 'warning',
        rule: 'advisory/style',
        message: 'style drift',
        fixGuidance: 'Reflow the YAML block',
        source: 'external_edit',
        scope: 'isolated',
      }],
      lastGoodVersion: 1,
    });
    expect(m.getState()).toBe(ViolationState.DEGRADED_WARN);
    expect(m.isPatchAllowed({ tool: 'send_email' })).toBe(true);
    expect(m.isPatchAllowed({ path: 'oc://TOOLS.md' })).toBe(true);
  });

  it('fatal severity → ERROR regardless of scope', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({
      violations: [{
        path: 'oc://IDENTITY.md',
        severity: 'fatal',
        rule: 'identity/missing',
        message: 'IDENTITY.md is missing',
        fixGuidance: 'Restore IDENTITY.md',
        source: 'external_edit',
        scope: 'isolated',
      }],
      lastGoodVersion: 1,
    });
    expect(m.getState()).toBe(ViolationState.ERROR);
  });

  it('fleet rule → DEGRADED_FLEET, PATCHes pass through', () => {
    const m = new ViolationStateMachine();
    m.applyRecompile({
      violations: [{
        path: 'oc://fleet.yaml',
        severity: 'info',
        rule: 'fleet/drift',
        message: 'fleet policy drift',
        fixGuidance: 'Sync fleet policy',
        source: 'external_edit',
        scope: 'isolated',
      }],
      lastGoodVersion: 1,
    });
    expect(m.getState()).toBe(ViolationState.DEGRADED_FLEET);
    expect(m.isPatchAllowed({ tool: 'anything' })).toBe(true);
  });
});

describe('ViolationStateMachine — restore() integrity check (M-5)', () => {
  it('accepts envelope without integrity check (legacy path)', () => {
    const m1 = new ViolationStateMachine();
    m1.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 42 });
    const snap = m1.snapshot();

    const m2 = new ViolationStateMachine();
    m2.restore(snap);
    expect(m2.getState()).toBe(ViolationState.DEGRADED_R5);
    expect(m2.getBlockedTools()).toEqual(['send_email']);
  });

  it('accepts envelope when integrity classifier agrees', () => {
    const m1 = new ViolationStateMachine();
    m1.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 42 });
    const snap = m1.snapshot();

    const drifts: Array<unknown> = [];
    const m2 = new ViolationStateMachine();
    m2.restore(snap, {
      lastGoodIR: { sentinel: true },
      classify: () => [r5Violation()],
      onDrift: (cached, rederived) => drifts.push({ cached, rederived }),
    });
    expect(m2.getState()).toBe(ViolationState.DEGRADED_R5);
    expect(drifts).toHaveLength(0);
  });

  it('rejects tampered envelope (ERROR→CLEAN forgery) and fires onDrift', () => {
    // Attacker-provided snapshot claims CLEAN but the classifier re-derives
    // a structural ERROR from the last-good IR.
    const tampered: import('../../src/workspace/violation-types.js').PersistedViolationState = {
      state: ViolationState.CLEAN,
      lastGoodVersion: 99,
      violations: [],
      updatedAt: '2026-04-18T00:00:00.000Z',
    };
    const drifts: Array<{
      cached: import('../../src/workspace/violation-types.js').PersistedViolationState;
      rederived: import('../../src/workspace/violation-types.js').PersistedViolationState;
    }> = [];

    const m = new ViolationStateMachine();
    m.restore(tampered, {
      lastGoodIR: { sentinel: true },
      classify: () => [structuralViolation()],
      onDrift: (cached, rederived) => drifts.push({ cached, rederived }),
    });

    // Re-derived state wins — tampered CLEAN does not take effect.
    expect(m.getState()).toBe(ViolationState.ERROR);
    expect(m.getRepairPaths()).toContain('oc://SOUL.md');
    expect(drifts).toHaveLength(1);
    expect(drifts[0]!.cached.state).toBe(ViolationState.CLEAN);
    expect(drifts[0]!.rederived.state).toBe(ViolationState.ERROR);
  });

  it('rejects tampered envelope with extra violations classifier disagrees with', () => {
    const m1 = new ViolationStateMachine();
    m1.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 42 });
    const genuine = m1.snapshot();
    // Tampered: adds a bogus violation the classifier will not re-derive.
    const tampered = {
      ...genuine,
      violations: [
        ...genuine.violations,
        { ...r5Violation({ path: 'oc://GHOST.md', rule: 'R5/bogus' }), firstSeenAt: '2026-04-18T00:00:00.000Z' },
      ],
    };
    const drifts: number[] = [];
    const m2 = new ViolationStateMachine();
    m2.restore(tampered, {
      lastGoodIR: {},
      classify: () => [r5Violation()],
      onDrift: () => drifts.push(1),
    });
    // Only one violation survives — the authoritative one from the
    // classifier. The bogus entry is dropped.
    expect(m2.getViolations()).toHaveLength(1);
    expect(m2.getBlockedTools()).toEqual(['send_email']);
    expect(drifts).toHaveLength(1);
  });

  it('skips integrity check when lastGoodIR is undefined (cold-start)', () => {
    // No IR to re-derive against — accept the envelope as-is so first boot
    // after a persisted crash still rehydrates the state.
    const m1 = new ViolationStateMachine();
    m1.applyRecompile({ violations: [structuralViolation()], lastGoodVersion: 7 });
    const snap = m1.snapshot();

    const m2 = new ViolationStateMachine();
    m2.restore(snap, {
      lastGoodIR: undefined,
      classify: () => {
        throw new Error('classifier must not run when lastGoodIR is undefined');
      },
    });
    expect(m2.getState()).toBe(ViolationState.ERROR);
  });
});

describe('reduceState', () => {
  it('empty → CLEAN', () => {
    expect(reduceState([])).toBe(ViolationState.CLEAN);
  });

  it('selects worst severity', () => {
    expect(reduceState([r5Violation(), structuralViolation()])).toBe(ViolationState.ERROR);
  });
});

describe('ViolationStateMachine — debounce coalescer (P2)', () => {
  /**
   * Manual timer stub: captures `setTimeout` callbacks so tests can drive
   * the debounce deterministically without real clocks and without the
   * fake-timers footprint. `flush()` can still commit synchronously
   * without the timer ever firing.
   */
  function makeTimers(): {
    setTimer: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
    clearTimer: (handle: ReturnType<typeof setTimeout>) => void;
    fire: () => void;
    pending: () => boolean;
  } {
    let queued: { fn: () => void; ms: number } | null = null;
    const handle = { __stub: true } as unknown as ReturnType<typeof setTimeout>;
    return {
      setTimer: (fn, ms) => {
        queued = { fn, ms };
        return handle;
      },
      clearTimer: () => {
        queued = null;
      },
      fire: () => {
        const q = queued;
        queued = null;
        if (q !== null) q.fn();
      },
      pending: () => queued !== null,
    };
  }

  it('two violations arrive within one window; both appear after one commit (P2)', () => {
    const timers = makeTimers();
    const m = new ViolationStateMachine({
      debounceMs: 200,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });
    // First call: observes R5 violation, does NOT commit synchronously.
    expect(m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 })).toBe(
      ViolationState.CLEAN,
    );
    expect(m.getViolations()).toHaveLength(0);
    expect(timers.pending()).toBe(true);

    // Second call inside the window: different path+rule, also buffered.
    expect(
      m.applyRecompile({
        violations: [structuralViolation()],
        lastGoodVersion: 1,
      }),
    ).toBe(ViolationState.CLEAN);
    expect(m.getViolations()).toHaveLength(0);

    // Flush the window — both violations appear, worst severity wins.
    expect(m.flush()).toBe(ViolationState.ERROR);
    expect(m.getViolations()).toHaveLength(2);
  });

  it('debounceMs=0 preserves synchronous commit (backward-compat default)', () => {
    const m = new ViolationStateMachine();
    expect(m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 })).toBe(
      ViolationState.DEGRADED_R5,
    );
    // No debounce — state mutated immediately, no pending buffer to flush.
    expect(m.flush()).toBe(ViolationState.DEGRADED_R5);
    expect(m.getViolations()).toHaveLength(1);
  });

  it('timer-driven commit fires without explicit flush()', () => {
    const timers = makeTimers();
    const m = new ViolationStateMachine({
      debounceMs: 200,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 });
    expect(m.getViolations()).toHaveLength(0);
    timers.fire();
    expect(m.getState()).toBe(ViolationState.DEGRADED_R5);
    expect(m.getViolations()).toHaveLength(1);
  });

  it('duplicate observations of the same path+rule within the window collapse to one', () => {
    const timers = makeTimers();
    const m = new ViolationStateMachine({
      debounceMs: 200,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 });
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 });
    m.flush();
    expect(m.getViolations()).toHaveLength(1);
  });

  it('all-clean window advances lastGoodVersion and lands CLEAN', () => {
    const timers = makeTimers();
    const m = new ViolationStateMachine({
      debounceMs: 200,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });
    // Prime the machine with a prior violation (commits synchronously
    // because resolveViolation bypasses the debounce path).
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 0 });
    m.flush();
    expect(m.getState()).toBe(ViolationState.DEGRADED_R5);

    // Two clean compiles inside the window collapse to one commit.
    m.applyRecompile({ violations: [], lastGoodVersion: 11 });
    m.applyRecompile({ violations: [], lastGoodVersion: 12 });
    expect(m.flush()).toBe(ViolationState.CLEAN);
    expect(m.getLastGoodVersion()).toBe(12);
    expect(m.getViolations()).toHaveLength(0);
  });

  it('mixed clean + violating calls in the same window keep violations', () => {
    const timers = makeTimers();
    const m = new ViolationStateMachine({
      debounceMs: 200,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });
    m.applyRecompile({ violations: [], lastGoodVersion: 5 });
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 5 });
    expect(m.flush()).toBe(ViolationState.DEGRADED_R5);
    // Violation persists even though an empty call was seen in the window.
    expect(m.getViolations()).toHaveLength(1);
    // lastGoodVersion does NOT advance because the merged set is non-empty.
    expect(m.getLastGoodVersion()).toBe(null);
  });

  it('flush() on an idle machine is a no-op returning current state', () => {
    const m = new ViolationStateMachine({ debounceMs: 200 });
    expect(m.flush()).toBe(ViolationState.CLEAN);
  });

  it('flush() cancels a pending timer so no double-commit occurs', () => {
    const timers = makeTimers();
    const m = new ViolationStateMachine({
      debounceMs: 200,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 });
    expect(timers.pending()).toBe(true);
    m.flush();
    expect(timers.pending()).toBe(false);
    // Second flush with no pending buffer is a no-op.
    expect(m.flush()).toBe(ViolationState.DEGRADED_R5);
  });

  it('negative or non-finite debounceMs is rejected at construction', () => {
    expect(() => new ViolationStateMachine({ debounceMs: -1 })).toThrow(RangeError);
    expect(() => new ViolationStateMachine({ debounceMs: Number.NaN })).toThrow(RangeError);
  });

  it('default setTimer/clearTimer exercise inline lambdas (flush cancels real timer)', async () => {
    // Omit setTimer/clearTimer so the inline lambda defaults are exercised
    // for coverage. Use a 1ms debounce to keep the test fast.
    const m = new ViolationStateMachine({ debounceMs: 1 });
    m.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 });
    // flush() cancels the scheduled real timer (exercises default clearTimer).
    expect(m.flush()).toBe(ViolationState.DEGRADED_R5);
    expect(m.getViolations()).toHaveLength(1);

    // Also exercise the real-timer fire path: schedule, do nothing,
    // await a macrotask tick so setTimeout fires the queued commit.
    const m2 = new ViolationStateMachine({ debounceMs: 1 });
    m2.applyRecompile({ violations: [r5Violation()], lastGoodVersion: 1 });
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(m2.getState()).toBe(ViolationState.DEGRADED_R5);
    expect(m2.getViolations()).toHaveLength(1);
  });
});
