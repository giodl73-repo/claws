/**
 * Multi-provider OC-7 merger end-to-end (H1 Scope).
 *
 * Two tests per the pulse 46 D5 scope:
 *   - 2-provider review stickiness: A=review, B=allow → merged is review
 *     (allow cannot downgrade a review decision).
 *   - 2-provider deny-wins: A=allow, B=deny → merged is deny (deny is top
 *     of the OC-7 ladder; any deny wins regardless of other providers).
 *
 * Both exercise the HostMock merger with the full AuthorizationContext
 * surface — including canonicalInvocationHash propagation.
 *
 * Pulse 46 D5.
 */
import { describe, it, expect } from 'vitest';
import { HostMock, canonicalize } from '#harness/host-mock.ts';

describe('multi-provider OC-7 merger (H1 Scope)', () => {
  it('2-provider review stickiness: A=review, B=allow → merged is review', async () => {
    const mock = new HostMock();
    mock.registerProvider({
      id: 'security-review',
      hooks: {
        beforeToolCall: (ctx) => ({
          action: 'review',
          reason: 'R5-data-requires-human',
          handle: {
            providerId: 'security-review',
            contentHash: ctx.canonicalInvocationHash,
          },
        }),
      },
    });
    mock.registerProvider({
      id: 'compliance-review',
      hooks: {
        beforeToolCall: (ctx) => ({
          action: 'allow',
          handle: {
            providerId: 'compliance-review',
            contentHash: ctx.canonicalInvocationHash,
          },
        }),
      },
    });

    const inputs = {
      tool: 'records.export',
      args: { id: 100 },
      snapshotId: 'snap-oc7-1',
      principal: 'user:eve',
    };
    const merged = await mock.beforeToolCall(inputs);

    // The review sticks — allow cannot downgrade it.
    expect(merged.action).toBe('review');
    expect(merged.reason).toBe('R5-data-requires-human');
    expect(merged.canonicalInvocationHash).toBe(canonicalize(inputs));

    // Both contributions are valid (contentHash agrees with host-computed).
    expect(merged.contributions).toHaveLength(2);
    for (const c of merged.contributions) {
      expect(c.invalidReason).toBeUndefined();
    }
    const actionsByProvider = Object.fromEntries(
      merged.contributions.map((c) => [c.providerId, c.action]),
    );
    expect(actionsByProvider).toEqual({
      'security-review': 'review',
      'compliance-review': 'allow',
    });
  });

  it('2-provider deny-wins: A=allow, B=deny → merged is deny', async () => {
    const mock = new HostMock();
    mock.registerProvider({
      id: 'baseline-allow',
      hooks: {
        beforeToolCall: () => ({ action: 'allow' }),
      },
    });
    mock.registerProvider({
      id: 'security-deny',
      hooks: {
        beforeToolCall: () => ({
          action: 'deny',
          reason: 'secret-exfil-detected',
        }),
      },
    });

    const merged = await mock.beforeToolCall({
      tool: 'net.post',
      args: { url: 'https://example.com', body: 'api_key=...' },
      snapshotId: 'snap-oc7-2',
      principal: 'user:mallory',
    });

    expect(merged.action).toBe('deny');
    expect(merged.reason).toBe('secret-exfil-detected');
    // Allow is still recorded as a contribution — audit preserves both
    // provider contributions even when merged outcome is deny.
    expect(merged.contributions).toHaveLength(2);
    const actions = merged.contributions.map((c) => c.action).sort();
    expect(actions).toEqual(['allow', 'deny']);
  });
});
