/**
 * SC-06 — P-02 canonicalInvocationHash conjunctive (CL-07 §1a P-02).
 *
 * Three invariants:
 *
 *   1. Conjunctive: when 2 providers emit approvalHandle, BOTH
 *      `handle.contentHash` values MUST equal `ctx.canonicalInvocationHash`.
 *      A handle with a divergent contentHash produces a merger-level
 *      `divergent-content-hash` invalid-reason on that provider's
 *      contribution.
 *   2. OC-7 merger stickiness: provider A returns `review`, provider B
 *      returns `allow` → merged decision is `review` (B cannot downgrade A).
 *   3. Stability: `canonicalInvocationHash` is a pure function of the
 *      normalized invocation record, so a fresh HostMock instance on the
 *      same input yields the same hash (simulates cross-process restarts).
 *
 * Pulse 46 D2.
 */
import { describe, it, expect } from 'vitest';
import { HostMock, canonicalize } from '#harness/host-mock.ts';

describe('SC-06 P-02 canonicalInvocationHash conjunctive (CL-07 §1a)', () => {
  it('F-01/F-09: 2-provider matching contentHash → merged; divergent → invalid-reason', async () => {
    const inputs = {
      tool: 'records.read',
      args: { id: 42 },
      snapshotId: 'snap-p02-1',
      principal: 'user:alice',
    };
    const expectedHash = canonicalize(inputs);

    // Case A — both providers return matching contentHash: merged decision
    // is `allow` (stickiness not engaged), both contributions valid.
    const mockMatch = new HostMock();
    mockMatch.registerProvider({
      id: 'prov-a',
      hooks: {
        beforeToolCall: (ctx) => ({
          action: 'allow',
          handle: { providerId: 'prov-a', contentHash: ctx.canonicalInvocationHash },
        }),
      },
    });
    mockMatch.registerProvider({
      id: 'prov-b',
      hooks: {
        beforeToolCall: (ctx) => ({
          action: 'allow',
          handle: { providerId: 'prov-b', contentHash: ctx.canonicalInvocationHash },
        }),
      },
    });
    const mergedMatch = await mockMatch.beforeToolCall(inputs);
    expect(mergedMatch.canonicalInvocationHash).toBe(expectedHash);
    expect(mergedMatch.action).toBe('allow');
    for (const c of mergedMatch.contributions) {
      expect(c.invalidReason).toBeUndefined();
    }

    // Case B — provider B returns a handle whose contentHash is mutated
    // (simulates a canonicalizer drift or a provider that re-implements
    // the hash). The merger marks B's contribution with
    // `divergent-content-hash` and falls back to A's winner.
    const mockDivergent = new HostMock();
    mockDivergent.registerProvider({
      id: 'prov-a',
      hooks: {
        beforeToolCall: (ctx) => ({
          action: 'allow',
          handle: { providerId: 'prov-a', contentHash: ctx.canonicalInvocationHash },
        }),
      },
    });
    mockDivergent.registerProvider({
      id: 'prov-b',
      hooks: {
        beforeToolCall: () => ({
          action: 'allow',
          handle: { providerId: 'prov-b', contentHash: 'sha256:' + 'f'.repeat(64) },
        }),
      },
    });
    const mergedDiv = await mockDivergent.beforeToolCall(inputs);
    const divContribution = mergedDiv.contributions.find((c) => c.providerId === 'prov-b')!;
    expect(divContribution.invalidReason).toBe('divergent-content-hash');
    // prov-a remains valid and becomes the merged winner.
    expect(mergedDiv.action).toBe('allow');
  });

  it('F-07: OC-7 merger stickiness — review > allow (B cannot downgrade A)', async () => {
    const mock = new HostMock();
    mock.registerProvider({
      id: 'prov-A',
      hooks: {
        beforeToolCall: () => ({ action: 'review', reason: 'needs-human' }),
      },
    });
    mock.registerProvider({
      id: 'prov-B',
      hooks: {
        beforeToolCall: () => ({ action: 'allow' }),
      },
    });
    const merged = await mock.beforeToolCall({
      tool: 'records.read',
      args: { id: 1 },
      snapshotId: 'snap-p02-2',
      principal: 'user:bob',
    });
    expect(merged.action).toBe('review');
    expect(merged.reason).toBe('needs-human');
  });

  it('F-05: canonicalInvocationHash stable across process-restart simulation', async () => {
    const inputs = {
      tool: 'records.export',
      args: { id: 7, detail: { nested: true, tags: ['a', 'b'] } },
      snapshotId: 'snap-p02-3',
      principal: 'user:carol',
    };

    // Two independent HostMock instances — simulates two process lifetimes
    // running against the same canonicalizer. The hash is a pure function
    // of the normalized record, so both instances MUST agree.
    const mockA = new HostMock();
    mockA.registerProvider({
      id: 'p',
      hooks: { beforeToolCall: () => ({ action: 'allow' }) },
    });
    const mockB = new HostMock();
    mockB.registerProvider({
      id: 'p',
      hooks: { beforeToolCall: () => ({ action: 'allow' }) },
    });

    const decA = await mockA.beforeToolCall(inputs);
    const decB = await mockB.beforeToolCall(inputs);
    expect(decA.canonicalInvocationHash).toBe(decB.canonicalInvocationHash);
    // And both agree with the pure canonicalize() function.
    expect(decA.canonicalInvocationHash).toBe(canonicalize(inputs));
  });
});
