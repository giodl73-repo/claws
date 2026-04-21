import { describe, it, expect } from 'vitest';
import {
  HostMock,
  canonicalize,
  type AuthorizationContext,
  type ToolCallInputs,
} from '#harness/host-mock.ts';

const IN: ToolCallInputs = { tool: 't', args: { a: 1, b: [2, 3] }, snapshotId: 's1', principal: 'u@t' };

describe('canonicalInvocationHash (host-computed, pre-await)', () => {
  it('is stable across key-order permutations of args', () => {
    const a = canonicalize({ tool: 't', args: { a: 1, b: 2 }, snapshotId: 's', principal: 'p' });
    const b = canonicalize({ tool: 't', args: { b: 2, a: 1 }, snapshotId: 's', principal: 'p' });
    expect(a).toBe(b);
  });

  it('exposes canonicalInvocationHash on context to every provider', async () => {
    const h = new HostMock();
    const seen: string[] = [];
    h.registerProvider({
      id: 'A',
      hooks: {
        beforeToolCall: (ctx: AuthorizationContext) => {
          seen.push(ctx.canonicalInvocationHash);
          return { action: 'allow' };
        },
      },
    });
    h.registerProvider({
      id: 'B',
      hooks: {
        beforeToolCall: (ctx: AuthorizationContext) => {
          seen.push(ctx.canonicalInvocationHash);
          return { action: 'allow' };
        },
      },
    });
    const r = await h.beforeToolCall(IN);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(r.canonicalInvocationHash);
    expect(seen[1]).toBe(r.canonicalInvocationHash);
  });

  it('is computed BEFORE any provider await (hash captured pre-await)', async () => {
    const h = new HostMock();
    let awaitedHash: string | undefined;
    let mutationAfterStart = false;
    const args = { a: 1 };
    h.registerProvider({
      id: 'A',
      hooks: {
        beforeToolCall: async (ctx: AuthorizationContext) => {
          // mutate the "outer" args object after decision path started
          (args as { a: number }).a = 999;
          mutationAfterStart = true;
          awaitedHash = ctx.canonicalInvocationHash;
          return { action: 'allow' };
        },
      },
    });
    const preHash = canonicalize({ tool: 't', args: { a: 1 }, snapshotId: 's', principal: 'p' });
    const r = await h.beforeToolCall({ tool: 't', args, snapshotId: 's', principal: 'p' });
    expect(mutationAfterStart).toBe(true);
    expect(awaitedHash).toBe(preHash);
    expect(r.canonicalInvocationHash).toBe(preHash);
  });

  it('rejects provider handle whose contentHash diverges from canonicalInvocationHash', async () => {
    const h = new HostMock();
    h.registerProvider({
      id: 'A',
      hooks: {
        beforeToolCall: () => ({
          action: 'review',
          handle: { providerId: 'A', contentHash: 'sha256:tampered-by-provider' },
        }),
      },
    });
    const r = await h.beforeToolCall(IN);
    expect(r.contributions[0]?.invalidReason).toBe('divergent-content-hash');
    // sole contribution is invalid -> deny fallback
    expect(r.action).toBe('deny');
    expect(r.reason).toBe('all-decisions-invalid');
  });

  it('accepts provider handle whose contentHash matches canonicalInvocationHash', async () => {
    const h = new HostMock();
    h.registerProvider({
      id: 'A',
      hooks: {
        beforeToolCall: (ctx: AuthorizationContext) => ({
          action: 'review',
          handle: { providerId: 'A', contentHash: ctx.canonicalInvocationHash },
        }),
      },
    });
    const r = await h.beforeToolCall(IN);
    expect(r.contributions[0]?.invalidReason).toBeUndefined();
    expect(r.action).toBe('review');
  });

  it('canonicalize output starts with sha256:', () => {
    const hash = canonicalize({ tool: 't', args: {}, snapshotId: 's', principal: 'p' });
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('canonicalize handles all JSON value shapes', () => {
    expect(() =>
      canonicalize({
        tool: 't',
        args: { n: null, b: true, x: 1, s: 'str', arr: [1, 'a', null, true, { nested: false }] },
        snapshotId: 's',
        principal: 'p',
      })
    ).not.toThrow();
  });

  it('canonicalize rejects non-finite numbers inside args', () => {
    expect(() =>
      canonicalize({
        tool: 't',
        args: { n: Number.POSITIVE_INFINITY as unknown as number },
        snapshotId: 's',
        principal: 'p',
      })
    ).toThrow(/non-finite/);
  });
});

describe('registerProvider', () => {
  it('rejects duplicate provider ids', () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: {} });
    expect(() => h.registerProvider({ id: 'A', hooks: {} })).toThrow(/already registered/);
  });

  it('providerIds returns registration order', () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: {} });
    h.registerProvider({ id: 'B', hooks: {} });
    h.registerProvider({ id: 'C', hooks: {} });
    expect(h.providerIds()).toEqual(['A', 'B', 'C']);
  });

  it('empty provider list returns allow with no contributions', async () => {
    const h = new HostMock();
    const r = await h.beforeToolCall(IN);
    expect(r.action).toBe('allow');
    expect(r.contributions).toHaveLength(0);
    expect(r.requireApproval).toBe(false);
  });

  it('skips providers without beforeToolCall hook', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: {} });
    h.registerProvider({ id: 'B', hooks: { beforeToolCall: () => ({ action: 'deny' }) } });
    const r = await h.beforeToolCall(IN);
    expect(r.action).toBe('deny');
    expect(r.contributions).toHaveLength(1);
    expect(r.contributions[0]?.providerId).toBe('B');
  });
});

describe('lifecycle hooks (unit-level)', () => {
  it('initAll fires init exactly once per provider', async () => {
    const h = new HostMock();
    const calls: string[] = [];
    h.registerProvider({ id: 'A', hooks: { init: () => { calls.push('A'); } } });
    h.registerProvider({ id: 'B', hooks: { init: async () => { calls.push('B'); } } });
    h.registerProvider({ id: 'C', hooks: {} });
    await h.initAll();
    expect(calls).toEqual(['A', 'B']);
    expect(h.hasInitialized('A')).toBe(true);
    expect(h.hasInitialized('B')).toBe(true);
    expect(h.hasInitialized('C')).toBe(true);
    await h.initAll();
    expect(calls).toEqual(['A', 'B']);
  });

  it('onSnapshotPromoted fans out to providers that subscribe', async () => {
    const h = new HostMock();
    const seen: Array<[string, string]> = [];
    h.registerProvider({
      id: 'A',
      hooks: { onSnapshotPromoted: (sid: string) => { seen.push(['A', sid]); } },
    });
    h.registerProvider({
      id: 'B',
      hooks: { onSnapshotPromoted: async (sid: string) => { seen.push(['B', sid]); } },
    });
    h.registerProvider({ id: 'C', hooks: {} });
    const fanout = await h.onSnapshotPromoted('snap-x');
    expect(fanout).toEqual(['A', 'B']);
    expect(seen).toEqual([['A', 'snap-x'], ['B', 'snap-x']]);
  });

  it('hasInitialized returns false before initAll', () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: { init: () => {} } });
    expect(h.hasInitialized('A')).toBe(false);
  });
});

describe('beforeWorkspaceFileIngest', () => {
  it('computes canonicalInvocationHash including path and bytes', async () => {
    const h = new HostMock();
    let seen: string | undefined;
    h.registerProvider({
      id: 'A',
      hooks: {
        beforeWorkspaceFileIngest: (ctx: AuthorizationContext) => {
          seen = ctx.canonicalInvocationHash;
          return { action: 'allow' };
        },
      },
    });
    const r = await h.beforeWorkspaceFileIngest({
      tool: 'ingest',
      principal: 'u@t',
      snapshotId: 's',
      path: 'pkg/file.ts',
      bytes: new TextEncoder().encode('hello'),
    });
    expect(seen).toBe(r.canonicalInvocationHash);
    expect(r.action).toBe('allow');
  });

  it('skips providers without beforeWorkspaceFileIngest hook', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: {} });
    h.registerProvider({
      id: 'B',
      hooks: { beforeWorkspaceFileIngest: () => ({ action: 'allow' }) },
    });
    const r = await h.beforeWorkspaceFileIngest({
      tool: 'ingest',
      principal: 'u@t',
      snapshotId: 's',
      path: 'p',
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(r.contributions).toHaveLength(1);
    expect(r.contributions[0]?.providerId).toBe('B');
  });

  it('applies OC-7 merger over file-ingest decisions', async () => {
    const h = new HostMock();
    h.registerProvider({
      id: 'A',
      hooks: { beforeWorkspaceFileIngest: () => ({ action: 'allow' }) },
    });
    h.registerProvider({
      id: 'B',
      hooks: { beforeWorkspaceFileIngest: () => ({ action: 'deny', reason: 'secret' }) },
    });
    const r = await h.beforeWorkspaceFileIngest({
      tool: 'ingest',
      principal: 'u@t',
      snapshotId: 's',
      path: 'pkg/secret.env',
      bytes: new TextEncoder().encode('KEY=value'),
    });
    expect(r.action).toBe('deny');
    expect(r.reason).toBe('secret');
  });
});

describe('SC-02 F-01: deny short-circuits at top rank', () => {
  it('explicit deny wins even when allow registered first', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'allow1', hooks: { beforeToolCall: () => ({ action: 'allow' }) } });
    h.registerProvider({ id: 'allow2', hooks: { beforeToolCall: () => ({ action: 'allow' }) } });
    h.registerProvider({ id: 'denyMe', hooks: { beforeToolCall: () => ({ action: 'deny', reason: 'policy' }) } });
    const r = await h.beforeToolCall(IN);
    expect(r.action).toBe('deny');
    expect(r.reason).toBe('policy');
  });
});
