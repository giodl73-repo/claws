import { describe, it, expect } from 'vitest';
import {
  LifecycleManager,
  AlreadyInitializedError,
  type ProviderLifecycle,
} from '#harness/provider-lifecycle.ts';

describe('provider-lifecycle init exactly once per registration (CL-07 §1a)', () => {
  it('init fires exactly once per provider registration', async () => {
    const mgr = new LifecycleManager();
    const calls: Array<{ id: string; ctx: unknown }> = [];
    const providerA: ProviderLifecycle = {
      id: 'A',
      init: (ctx) => {
        calls.push({ id: 'A', ctx });
      },
    };
    const providerB: ProviderLifecycle = {
      id: 'B',
      init: async (ctx) => {
        calls.push({ id: 'B', ctx });
      },
    };
    const providerC: ProviderLifecycle = { id: 'C' }; // no init hook

    const ctxA = { marker: 'a' };
    const ctxB = { marker: 'b' };
    const ctxC = { marker: 'c' };

    await mgr.init(providerA, ctxA);
    await mgr.init(providerB, ctxB);
    await mgr.init(providerC, ctxC);

    expect(calls).toEqual([
      { id: 'A', ctx: ctxA },
      { id: 'B', ctx: ctxB },
    ]);
    expect(mgr.hasInitialized(providerA)).toBe(true);
    expect(mgr.hasInitialized(providerB)).toBe(true);
    expect(mgr.hasInitialized(providerC)).toBe(true);

    // Re-init throws (silent no-op would hide registration bugs).
    await expect(mgr.init(providerA, ctxA)).rejects.toBeInstanceOf(
      AlreadyInitializedError,
    );
    await expect(mgr.init(providerA, ctxA)).rejects.toMatchObject({
      providerId: 'A',
    });

    // No extra invocation occurred despite the throw attempts.
    expect(calls).toHaveLength(2);
  });

  it('init completes before any decision hook (preAuthorize/beforeIngest) fires (SC-03 F-01 order)', async () => {
    const mgr = new LifecycleManager();
    const order: string[] = [];
    let initResolve: (() => void) | undefined;
    const initDone = new Promise<void>((r) => {
      initResolve = r;
    });

    type Decider = {
      readonly lifecycle: ProviderLifecycle;
      preAuthorize(): Promise<void>;
    };

    const makeDecider = (id: string): Decider => ({
      lifecycle: {
        id,
        init: async () => {
          // Simulate real init work (I/O, lazy compile) by awaiting a microtask.
          await Promise.resolve();
          order.push(`init:${id}`);
          if (id === 'B') initResolve?.();
        },
      },
      preAuthorize: async () => {
        // Guard: preAuthorize MUST NOT run before init completed.
        if (!mgr.hasInitialized(deciderA.lifecycle)) {
          throw new Error('preAuthorize fired before init — SC-03 F-01 violation');
        }
        order.push(`preAuth:${id}`);
      },
    });

    const deciderA = makeDecider('A');
    const deciderB = makeDecider('B');

    const startInit = (async () => {
      await mgr.init(deciderA.lifecycle, {});
      await mgr.init(deciderB.lifecycle, {});
    })();

    await initDone;
    await startInit;

    await deciderA.preAuthorize();
    await deciderB.preAuthorize();

    expect(order).toEqual(['init:A', 'init:B', 'preAuth:A', 'preAuth:B']);
  });
});
