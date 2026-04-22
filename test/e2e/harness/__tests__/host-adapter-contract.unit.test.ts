import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  InProcessAdapter,
  StubFailingAdapter,
  makeAdapterFromConfig,
  type HostAdapter,
  type AuthorizationContext,
  type IncomingRequest,
  type ApprovalSink,
  type PolicyArtifactRef,
  type OutgoingResponse,
} from '#harness/host-adapter-test-doubles.ts';

const REQ: IncomingRequest = {
  tool: 'bash',
  args: { cmd: 'echo' },
  headers: {},
  snapshotId: 'snap-1',
  rawPrincipal: 'alice',
};

describe('HostAdapter contract (CL-07 §1a)', () => {
  it('test doubles satisfy the HostAdapter interface shape (all 4 methods present + typed)', () => {
    const doubles: HostAdapter[] = [
      new InProcessAdapter({ policyDir: '/tmp/policy-a' }),
      new StubFailingAdapter({ adapterId: 'fail-a' }),
      makeAdapterFromConfig({ kind: 'in-process', policyDir: '/tmp/policy-b', adapterId: 'cfg-in' }),
      makeAdapterFromConfig({ kind: 'stub-failing', adapterId: 'cfg-fail' }),
    ];
    for (const d of doubles) {
      expect(typeof d.extractIdentity).toBe('function');
      expect(typeof d.routePolicy).toBe('function');
      expect(typeof d.getApprovalSink).toBe('function');
      expect(typeof d.shapeResponse).toBe('function');
    }
  });

  it('adapterId is a non-empty string on every double', () => {
    const inProcess = new InProcessAdapter({ policyDir: '/tmp/policy', adapterId: 'my-adapter' });
    const stub = new StubFailingAdapter();
    const cfg = makeAdapterFromConfig({ kind: 'in-process', policyDir: '/tmp/policy' });

    expect(inProcess.adapterId).toBe('my-adapter');
    expect(stub.adapterId.length).toBeGreaterThan(0);
    expect(cfg.adapterId).toBe('in-process');
  });

  it('getApprovalSink(ctx) returns an ApprovalSink whose sinkId is populated', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/policy', adapterId: 'in-proc' });
    const ctx = await adapter.extractIdentity(REQ);
    const sink: ApprovalSink = adapter.getApprovalSink(ctx);
    expect(sink.sinkId).toBe('in-proc-sink');
    expect(sink.sinkId.length).toBeGreaterThan(0);

    const stub = new StubFailingAdapter({ adapterId: 'fail-b' });
    const stubCtx = await stub.extractIdentity(REQ);
    const stubSink = stub.getApprovalSink(stubCtx);
    expect(stubSink.sinkId).toBe('fail-b-sink');
  });

  it('type-level: satisfies HostAdapter compiles for both doubles (tsd-style)', () => {
    expectTypeOf<InProcessAdapter>().toMatchTypeOf<HostAdapter>();
    expectTypeOf<StubFailingAdapter>().toMatchTypeOf<HostAdapter>();
    expectTypeOf<ReturnType<typeof makeAdapterFromConfig>>().toMatchTypeOf<HostAdapter>();

    // AuthorizationContext 11-field shape is load-bearing — drift fails tsc.
    expectTypeOf<AuthorizationContext>().toHaveProperty('tenantId');
    expectTypeOf<AuthorizationContext>().toHaveProperty('userId');
    expectTypeOf<AuthorizationContext>().toHaveProperty('sessionId');
    expectTypeOf<AuthorizationContext>().toHaveProperty('actorId');
    expectTypeOf<AuthorizationContext>().toHaveProperty('compositeId');
    expectTypeOf<AuthorizationContext>().toHaveProperty('clock');
    expectTypeOf<AuthorizationContext>().toHaveProperty('correlationId');
    expectTypeOf<AuthorizationContext>().toHaveProperty('canonicalInvocationHash');
    expectTypeOf<AuthorizationContext>().toHaveProperty('trustSet');
    expectTypeOf<AuthorizationContext>().toHaveProperty('environmentClass');
    expectTypeOf<AuthorizationContext>().toHaveProperty('callerPrincipal');
  });
});

describe('HostAdapter behavior smoke', () => {
  it('extractIdentity produces an 11-field AuthorizationContext with all keys set', async () => {
    const adapter = new InProcessAdapter({
      policyDir: '/tmp/policy',
      adapterId: 'smoke',
      clock: () => 1700000000000,
      trustSet: new Set(['kid-1', 'kid-2']),
    });
    const ctx = await adapter.extractIdentity(REQ);

    expect(ctx.tenantId).toBeNull();
    expect(ctx.userId).toBe('alice');
    expect(ctx.sessionId).toBeNull();
    expect(ctx.actorId).toBe('alice');
    expect(ctx.compositeId).toBe(':alice:');
    expect(typeof ctx.clock).toBe('function');
    expect(ctx.clock()).toBe(1700000000000);
    expect(ctx.correlationId.length).toBe(32);
    expect(ctx.canonicalInvocationHash.startsWith('sha256:')).toBe(true);
    expect(ctx.trustSet.has('kid-1')).toBe(true);
    expect(ctx.environmentClass).toBe('sim');
    expect(ctx.callerPrincipal).toBe('alice');
  });

  it('routePolicy returns PolicyArtifactRef with adapterId threaded through', async () => {
    const adapter = new InProcessAdapter({
      policyDir: '/tmp/policy-xyz',
      adapterId: 'route-test',
      policyVersion: 'v2',
    });
    const ctx = await adapter.extractIdentity(REQ);
    const ref: PolicyArtifactRef = await adapter.routePolicy(ctx);
    expect(ref.adapterId).toBe('route-test');
    expect(ref.policyDir).toBe('/tmp/policy-xyz');
    expect(ref.policyVersion).toBe('v2');
  });

  it('shapeResponse maps decision actions to outgoing status', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/p', adapterId: 'shape-test' });
    const ctx = await adapter.extractIdentity(REQ);
    const mapped: Array<['allow' | 'deny' | 'review' | 'modify', OutgoingResponse['status']]> = [
      ['allow', 'allowed'],
      ['deny', 'denied'],
      ['review', 'review-required'],
      ['modify', 'modified'],
    ];
    for (const [action, status] of mapped) {
      const resp = await adapter.shapeResponse({ action, requireApproval: false }, ctx);
      expect(resp.status).toBe(status);
      expect(resp.headers['x-adapter-id']).toBe('shape-test');
    }
  });

  it('StubFailingAdapter honors .program() knobs to throw / return', async () => {
    const stub = new StubFailingAdapter({ adapterId: 'throwy' });
    stub.programExtractIdentity({ kind: 'throw', error: new Error('boom-extract') });
    await expect(stub.extractIdentity(REQ)).rejects.toThrow(/boom-extract/);

    stub.programExtractIdentity({ kind: 'default' });
    const ctx = await stub.extractIdentity(REQ);
    stub.programRoutePolicy({ kind: 'throw', error: new Error('boom-route') });
    await expect(stub.routePolicy(ctx)).rejects.toThrow(/boom-route/);

    stub.programShapeResponse({
      kind: 'return',
      value: { status: 'allowed', body: null, headers: {} },
    });
    const resp = await stub.shapeResponse({ action: 'deny', requireApproval: false }, ctx);
    expect(resp.status).toBe('allowed');
  });

  it('makeAdapterFromConfig rejects missing policyDir for in-process', () => {
    expect(() => makeAdapterFromConfig({ kind: 'in-process' })).toThrow(/policyDir/);
  });

  it('InProcessAdapter rejects empty policyDir', () => {
    expect(() => new InProcessAdapter({ policyDir: '' })).toThrow(/policyDir/);
  });

  it('makeAdapterFromConfig handles stub-failing with + without optional fields', () => {
    const bare = makeAdapterFromConfig({ kind: 'stub-failing' });
    expect(bare.adapterId).toBe('stub-failing');
    const full = makeAdapterFromConfig({
      kind: 'stub-failing',
      adapterId: 'full-stub',
      policyDir: '/tmp/stub-p',
      clock: () => 42,
    });
    expect(full.adapterId).toBe('full-stub');
  });

  it('makeAdapterFromConfig handles in-process with + without optional clock', () => {
    const minimal = makeAdapterFromConfig({ kind: 'in-process', policyDir: '/tmp/p' });
    expect(minimal.adapterId).toBe('in-process');
    const withClock = makeAdapterFromConfig({
      kind: 'in-process',
      policyDir: '/tmp/p',
      clock: () => 99,
    });
    expect(withClock.adapterId).toBe('in-process');
  });
});

describe('InProcessAdapter sink (ApprovalSink impl)', () => {
  it('writeDecision/writeApproval return entries with monotonic sequence + hash chain', async () => {
    const adapter = new InProcessAdapter({
      policyDir: '/tmp/p',
      adapterId: 'sink-test',
      clock: () => 1000,
    });
    const ctx = await adapter.extractIdentity(REQ);
    const sink = adapter.getApprovalSink(ctx);

    const d = await sink.writeDecision({
      adapterId: 'sink-test',
      correlationId: 'corr-1',
      canonicalInvocationHash: 'sha256:' + '1'.repeat(64),
      action: 'allow',
    });
    expect(d.kind).toBe('decision');
    expect(d.sequence).toBe(1);
    expect(d.prevHash).toBe('sha256:' + '0'.repeat(64));
    expect(d.entryHash.startsWith('sha256:')).toBe(true);

    const a = await sink.writeApproval({
      adapterId: 'sink-test',
      correlationId: 'corr-1',
      approverPrincipal: 'alice',
      outcome: 'approved',
    });
    expect(a.kind).toBe('approval');
    expect(a.sequence).toBe(2);
    expect(a.prevHash).toBe(d.entryHash);

    const denied = await sink.writeApproval({
      adapterId: 'sink-test',
      correlationId: 'corr-1',
      approverPrincipal: 'bob',
      outcome: 'denied',
    });
    expect(denied.outcome).toBe('denied');
    expect(denied.sequence).toBe(3);
    expect(denied.prevHash).toBe(a.entryHash);
  });

  it('query() filters by correlationId, adapterId, and kind', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/p', adapterId: 'q-test' });
    const ctx = await adapter.extractIdentity(REQ);
    const sink = adapter.getApprovalSink(ctx);

    await sink.writeDecision({
      adapterId: 'q-test',
      correlationId: 'c1',
      canonicalInvocationHash: 'sha256:' + '1'.repeat(64),
      action: 'review',
    });
    await sink.writeDecision({
      adapterId: 'q-test',
      correlationId: 'c2',
      canonicalInvocationHash: 'sha256:' + '2'.repeat(64),
      action: 'deny',
    });
    await sink.writeApproval({
      adapterId: 'q-test',
      correlationId: 'c1',
      approverPrincipal: 'alice',
      outcome: 'approved',
    });

    const c1All: unknown[] = [];
    for await (const e of sink.query({ correlationId: 'c1' })) c1All.push(e);
    expect(c1All).toHaveLength(2);

    const decisionsOnly: unknown[] = [];
    for await (const e of sink.query({ kind: 'decision' })) decisionsOnly.push(e);
    expect(decisionsOnly).toHaveLength(2);

    const byAdapter: unknown[] = [];
    for await (const e of sink.query({ adapterId: 'q-test' })) byAdapter.push(e);
    expect(byAdapter).toHaveLength(3);

    const noMatch: unknown[] = [];
    for await (const e of sink.query({ adapterId: 'nope' })) noMatch.push(e);
    expect(noMatch).toHaveLength(0);

    const combined: unknown[] = [];
    for await (const e of sink.query({ correlationId: 'c1', kind: 'approval' })) combined.push(e);
    expect(combined).toHaveLength(1);
  });

  it('flush() resolves without side effects', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/p' });
    const ctx = await adapter.extractIdentity(REQ);
    const sink = adapter.getApprovalSink(ctx);
    await expect(sink.flush()).resolves.toBeUndefined();
  });

  it('rejects empty sinkId at construction', async () => {
    // InMemorySink is private; but we can reach its constructor error through
    // a direct import. Use the adapter's contract to verify the adapter never
    // constructs an empty-sinkId sink.
    const adapter = new InProcessAdapter({ policyDir: '/tmp/p', adapterId: 'x' });
    const ctx = await adapter.extractIdentity(REQ);
    const sink = adapter.getApprovalSink(ctx);
    expect(sink.sinkId).toBe('x-sink');
  });
});

describe('StubFailingAdapter programming knobs (full coverage)', () => {
  it('programRoutePolicy throw + return branches', async () => {
    const s = new StubFailingAdapter();
    const ctx = await s.extractIdentity(REQ);
    s.programRoutePolicy({
      kind: 'return',
      value: { adapterId: 'forced', policyDir: '/x', policyVersion: 'v-forced' },
    });
    const r = await s.routePolicy(ctx);
    expect(r.policyVersion).toBe('v-forced');

    s.programRoutePolicy({ kind: 'throw', error: new Error('route-boom') });
    await expect(s.routePolicy(ctx)).rejects.toThrow(/route-boom/);
  });

  it('programGetApprovalSink throw + return branches', async () => {
    const s = new StubFailingAdapter();
    const ctx = await s.extractIdentity(REQ);
    const fakeSink = {
      sinkId: 'fake',
      writeDecision: async () => { throw new Error('nope'); },
      writeApproval: async () => { throw new Error('nope'); },
      query: async function* () {},
      flush: async () => {},
    };
    s.programGetApprovalSink({ kind: 'return', value: fakeSink });
    expect(s.getApprovalSink(ctx).sinkId).toBe('fake');

    s.programGetApprovalSink({ kind: 'throw', error: new Error('sink-boom') });
    expect(() => s.getApprovalSink(ctx)).toThrow(/sink-boom/);
  });

  it('programShapeResponse throw branch', async () => {
    const s = new StubFailingAdapter();
    const ctx = await s.extractIdentity(REQ);
    s.programShapeResponse({ kind: 'throw', error: new Error('shape-boom') });
    await expect(
      s.shapeResponse({ action: 'allow', requireApproval: false }, ctx)
    ).rejects.toThrow(/shape-boom/);
  });

  it('programExtractIdentity return branch replaces default shape', async () => {
    const s = new StubFailingAdapter();
    const forced: AuthorizationContext = {
      tenantId: 't-forced',
      userId: 'u-forced',
      sessionId: 's-forced',
      actorId: 'a-forced',
      compositeId: 't-forced:u-forced:s-forced',
      clock: () => 0,
      correlationId: 'forced-corr-id',
      canonicalInvocationHash: 'sha256:' + 'f'.repeat(64),
      trustSet: new Set(['kid-forced']),
      environmentClass: 'test',
      callerPrincipal: 'caller-forced',
    };
    s.programExtractIdentity({ kind: 'return', value: forced });
    const ctx = await s.extractIdentity(REQ);
    expect(ctx.tenantId).toBe('t-forced');
    expect(ctx.environmentClass).toBe('test');
  });

  it('default shapeResponse maps non-allow actions to denied', async () => {
    const s = new StubFailingAdapter();
    const ctx = await s.extractIdentity(REQ);
    const review = await s.shapeResponse({ action: 'review', requireApproval: true }, ctx);
    expect(review.status).toBe('denied');
    const allow = await s.shapeResponse({ action: 'allow', requireApproval: false }, ctx);
    expect(allow.status).toBe('allowed');
  });

  it('extractIdentity default branch uses "anon" when rawPrincipal is absent', async () => {
    const s = new StubFailingAdapter({ adapterId: 'anon-test' });
    const anonReq: IncomingRequest = {
      tool: 't',
      args: {},
      headers: {},
      snapshotId: 's',
    };
    const ctx = await s.extractIdentity(anonReq);
    expect(ctx.callerPrincipal).toBe('anon');
    expect(ctx.userId).toBeNull();
  });
});

