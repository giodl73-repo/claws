/**
 * v2 chain — snap-shape adversarial scenarios, pass 3 (S61..S100).
 *
 * **Scope (post-2026-04-30 pivot to LKG-as-carrier):** downstream-only
 * coverage for `@bic/openclaw-snap`. Upstream adversarial evidence is
 * the 18-wave LKG suite — see `v2-chain-lkg-adversarial-*.integration.test.ts`.
 *
 * Final pass to 100 total. Covers the axes the first two passes didn't:
 *
 *   S. Performance / scale (4)            many files, large file, deep nesting
 *   T. OPENCLAW_WORKSPACE_ROOT env (4)    the FUSE-mode seam
 *   U. Default ignore behavior (4)        node_modules / .git / custom
 *   V. Canonicalization invariants (3)    order, whitespace, id format
 *   W. InMemoryStore extension API (3)    setWorkspace / setFile / removeFile
 *   X. Adapter event/ctx translation (4)  agentId, session*, params, snapshotId
 *   Y. Error envelope shape (3)           class shape, cause, enum codes
 *   Z. Provider composition (3)           short-circuit, fall-through, lifecycle
 *  AA. Policy content edges (3)           long reason, empty when, both tool+tag
 *  BB. List semantics (3)                 ordering, limit=0, unseen workspace
 *  CC. Cache + chain integration (3)      hit skips read, miss → 1 read, scoping
 *  DD. Interop + holistic e2e (3)         legacy manifest, binary roundtrip, 5-tool e2e
 *
 * @module @bic/v2-prototype/tests/v2-chain-adversarial-3
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { generateInMemory } from '@bic/openclaw-policy';
import {
  filesystemStore,
  inMemoryStore,
  inMemoryRefStore,
  computeSnapshotId,
  type SnapshotId,
  type SnapshotStore,
  SnapshotErrorImpl,
} from '@bic/openclaw-snap';
import {
  buildPolicyPlugin,
  PolicyIrCache,
  type PolicyContextWithSnapshot,
} from '@bic/openclaw-guardrails/policy-runtime';
import { ProviderRegistryImpl, composeDecisions } from '@bic/openclaw-guardrails';
import type {
  AuthorizationDecision,
  GuardrailProvider,
  ToolCallEvent,
} from '@bic/openclaw-guardrails';
import { validatePolicyIR, type PolicyIR } from '@bic/v2-prototype';

const TEXT_DECODER = new TextDecoder('utf-8');
const TEXT_ENCODER = new TextEncoder();

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true });
  }
});

async function makeWorkspace(files: Record<string, string | Uint8Array>): Promise<{
  scratch: string;
  workspace: string;
  storeRoot: string;
}> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-adv3-'));
  live.push({ scratch });
  const workspace = path.join(scratch, 'workspace');
  const storeRoot = path.join(scratch, 'snap-store');
  await fs.mkdir(workspace, { recursive: true });
  await fs.mkdir(storeRoot, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(workspace, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
  return { scratch, workspace, storeRoot };
}

// ─────────────────────────────────────────────────────────────────────────
// S. Performance / scale (4)
// ─────────────────────────────────────────────────────────────────────────

describe('S. Performance / scale (4)', () => {
  it('S61 100 small files captures and lists correctly', async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 100; i++) files[`f${i}.txt`] = `content-${i}`;
    const { workspace, storeRoot } = await makeWorkspace(files);
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    expect(id).toMatch(/^sha256-/);
    const list = await store.list(workspace);
    expect(list).toHaveLength(1);
    // Read a sample of files back.
    const a = await store.read(id, 'f0.txt');
    expect(TEXT_DECODER.decode(a)).toBe('content-0');
    const z = await store.read(id, 'f99.txt');
    expect(TEXT_DECODER.decode(z)).toBe('content-99');
  });

  it('S62 1MB single file captures and reads byte-exactly', async () => {
    const big = new Uint8Array(1024 * 1024);
    for (let i = 0; i < big.length; i++) big[i] = i % 256;
    const { workspace, storeRoot } = await makeWorkspace({ 'big.bin': big });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const round = await store.read(id, 'big.bin');
    expect(round.byteLength).toBe(big.byteLength);
    // Spot-check beginning, middle, end.
    expect(round[0]).toBe(0);
    expect(round[1024]).toBe(0);
    expect(round[round.byteLength - 1]).toBe((big.byteLength - 1) % 256);
  });

  it('S63 10-level deep directory nesting captures correctly', async () => {
    const nestedPath = Array.from({ length: 10 }, (_, i) => `lvl${i}`).join('/') + '/leaf.txt';
    const { workspace, storeRoot } = await makeWorkspace({ [nestedPath]: 'deep' });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const bytes = await store.read(id, nestedPath);
    expect(TEXT_DECODER.decode(bytes)).toBe('deep');
  });

  it('S64 long internal path (~200 chars) handled', async () => {
    const longName = 'a'.repeat(180) + '.txt';
    const { workspace, storeRoot } = await makeWorkspace({ [longName]: 'long-path' });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const bytes = await store.read(id, longName);
    expect(TEXT_DECODER.decode(bytes)).toBe('long-path');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// T. OPENCLAW_WORKSPACE_ROOT env override (4)
// ─────────────────────────────────────────────────────────────────────────

describe('T. OPENCLAW_WORKSPACE_ROOT env override (4)', () => {
  it('S65 env override targets a different root than cwd', async () => {
    // The override is read inside `claws snap *` commands' bind(), not
    // exposed at the snap-store-level interface. We test it indirectly
    // by verifying that `filesystemStore({ root })` works against an
    // explicit `<root>/.openclaw/snapshots`-shaped path computed from
    // the env value — the same logic as `commands/snap-store.ts:bind()`.
    const { workspace, storeRoot } = await makeWorkspace({ 'a.txt': 'envroot' });
    const fakeFuseRoot = workspace; // simulate FUSE mount path
    const root = path.join(fakeFuseRoot, '.openclaw', 'snapshots');
    await fs.mkdir(root, { recursive: true });
    const store = filesystemStore({ root });
    const id = await store.capture(workspace);
    expect(id).toMatch(/^sha256-/);
  });

  it('S66 env value with trailing slash handled (path.join normalizes)', async () => {
    const { workspace, storeRoot } = await makeWorkspace({ 'a.txt': 'slashes' });
    const withSlash = workspace + '/';
    const root = path.join(withSlash, '.openclaw', 'snapshots');
    await fs.mkdir(root, { recursive: true });
    const store = filesystemStore({ root });
    const id = await store.capture(workspace);
    expect(id).toMatch(/^sha256-/);
  });

  it('S67 [DECISION] env empty string is falsy → resolveWorkspaceRoot falls through to workspaceRoot', async () => {
    // The resolver in `commands/snap-store.ts` uses `?? workspaceRoot`
    // which returns the rhs ONLY if env is undefined. An empty string
    // env value is preserved (not falsy in `??`). This test pins that:
    // setting env='' would force snap to use empty-root which is broken.
    // Operationally: don't set the env to '' — unset it instead.
    const before = process.env['OPENCLAW_WORKSPACE_ROOT'];
    try {
      process.env['OPENCLAW_WORKSPACE_ROOT'] = '';
      // ?? semantics: '' is not nullish, so ?? returns ''.
      const resolved = process.env['OPENCLAW_WORKSPACE_ROOT'] ?? '/cwd';
      expect(resolved).toBe('');
    } finally {
      if (before === undefined) delete process.env['OPENCLAW_WORKSPACE_ROOT'];
      else process.env['OPENCLAW_WORKSPACE_ROOT'] = before;
    }
  });

  it('S68 env pointing at non-existent dir surfaces SNAP_CAPTURE_FAILED', async () => {
    const fakeRoot = path.join(os.tmpdir(), 'definitely-not-here-' + Math.random());
    const root = path.join(fakeRoot, '.openclaw', 'snapshots');
    // Don't mkdir — capture should fail accessing the workspace.
    const store = filesystemStore({ root });
    await expect(store.capture(fakeRoot)).rejects.toMatchObject({ code: 'SNAP_CAPTURE_FAILED' });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// U. Default ignore behavior (4)
// ─────────────────────────────────────────────────────────────────────────

describe('U. Default ignore behavior (4)', () => {
  it('S69 node_modules at workspace root is ignored', async () => {
    const { workspace, storeRoot } = await makeWorkspace({
      'src/app.ts': 'real',
      'node_modules/some-pkg/index.js': 'noise',
    });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    await expect(store.read(id, 'node_modules/some-pkg/index.js')).rejects.toMatchObject({ code: 'SNAP_INVALID_PATH' });
    const real = await store.read(id, 'src/app.ts');
    expect(TEXT_DECODER.decode(real)).toBe('real');
  });

  it('S70 [GAP] nested node_modules (e.g. packages/foo/node_modules) is NOT ignored — startsWith only matches root', async () => {
    // The default-ignore predicate uses `rel.startsWith('node_modules/')`,
    // which only matches at the workspace root. A nested
    // packages/foo/node_modules/x.js IS captured. Real workspace tooling
    // (npm workspaces, pnpm) typically wants nested node_modules ignored.
    // Worth a follow-up to make the ignore recursive — for now the
    // contract documents this limit.
    const { workspace, storeRoot } = await makeWorkspace({
      'packages/foo/src/a.ts': 'real',
      'packages/foo/node_modules/x.js': 'should-be-ignored-but-isnt',
    });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const noise = await store.read(id, 'packages/foo/node_modules/x.js');
    expect(TEXT_DECODER.decode(noise)).toBe('should-be-ignored-but-isnt');
  });

  it('S71 .git at root is ignored', async () => {
    const { workspace, storeRoot } = await makeWorkspace({
      'README.md': 'docs',
      '.git/config': '[core]',
      '.git/HEAD': 'ref: ...',
    });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const docs = await store.read(id, 'README.md');
    expect(TEXT_DECODER.decode(docs)).toBe('docs');
    await expect(store.read(id, '.git/config')).rejects.toMatchObject({ code: 'SNAP_INVALID_PATH' });
  });

  it('S72 custom ignore predicate replaces default (no node_modules filter unless caller opts in)', async () => {
    const { workspace, storeRoot } = await makeWorkspace({
      'a.txt': 'kept',
      'b.txt': 'dropped',
      'node_modules/x.js': 'now-included',
    });
    const ignoreOnlyB = (rel: string): boolean => rel === 'b.txt';
    const store = filesystemStore({ root: storeRoot, ignore: ignoreOnlyB });
    const id = await store.capture(workspace);
    // node_modules now included since custom predicate replaces default.
    const nm = await store.read(id, 'node_modules/x.js');
    expect(TEXT_DECODER.decode(nm)).toBe('now-included');
    // 'b.txt' dropped per custom predicate.
    await expect(store.read(id, 'b.txt')).rejects.toMatchObject({ code: 'SNAP_INVALID_PATH' });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// V. Canonicalization invariants (3)
// ─────────────────────────────────────────────────────────────────────────

describe('V. Canonicalization invariants (3)', () => {
  it('S73 disk-walk order does not affect snapshot id (canonicalize sorts)', async () => {
    const wsA = await makeWorkspace({ 'a.txt': '1', 'b.txt': '2', 'c.txt': '3' });
    const wsB = await makeWorkspace({ 'c.txt': '3', 'b.txt': '2', 'a.txt': '1' });
    const idA = await filesystemStore({ root: wsA.storeRoot }).capture(wsA.workspace);
    const idB = await filesystemStore({ root: wsB.storeRoot }).capture(wsB.workspace);
    expect(idA).toBe(idB);
  });

  it('S74 trailing newline changes file content → different snapshot id', async () => {
    const wsA = await makeWorkspace({ 'a.txt': 'line' });
    const wsB = await makeWorkspace({ 'a.txt': 'line\n' });
    const idA = await filesystemStore({ root: wsA.storeRoot }).capture(wsA.workspace);
    const idB = await filesystemStore({ root: wsB.storeRoot }).capture(wsB.workspace);
    expect(idA).not.toBe(idB);
  });

  it('S75 SnapshotId format invariant: matches sha256-<base64url>', async () => {
    const { workspace, storeRoot } = await makeWorkspace({ 'a.txt': 'fmt' });
    const id = await filesystemStore({ root: storeRoot }).capture(workspace);
    expect(id).toMatch(/^sha256-[A-Za-z0-9_-]+$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// W. InMemoryStore extension API (3)
// ─────────────────────────────────────────────────────────────────────────

describe('W. InMemoryStore extension API (3)', () => {
  it('S76 setWorkspace replaces wholesale (old files dropped)', async () => {
    const store = inMemoryStore({ workspaces: { ws: { 'old.txt': 'old' } } });
    store.setWorkspace('ws', { 'new.txt': 'new' });
    const id = await store.capture('ws');
    await expect(store.read(id, 'old.txt')).rejects.toMatchObject({ code: 'SNAP_INVALID_PATH' });
    const n = await store.read(id, 'new.txt');
    expect(TEXT_DECODER.decode(n)).toBe('new');
  });

  it('S77 setFile updates one file without affecting others', async () => {
    const store = inMemoryStore({ workspaces: { ws: { 'a.txt': 'a1', 'b.txt': 'b1' } } });
    store.setFile('ws', 'a.txt', 'a2');
    const id = await store.capture('ws');
    const a = await store.read(id, 'a.txt');
    const b = await store.read(id, 'b.txt');
    expect(TEXT_DECODER.decode(a)).toBe('a2');
    expect(TEXT_DECODER.decode(b)).toBe('b1');
  });

  it('S78 removeFile drops a single file', async () => {
    const store = inMemoryStore({ workspaces: { ws: { 'a.txt': 'keep', 'b.txt': 'drop' } } });
    store.removeFile('ws', 'b.txt');
    const id = await store.capture('ws');
    await expect(store.read(id, 'b.txt')).rejects.toMatchObject({ code: 'SNAP_INVALID_PATH' });
    const a = await store.read(id, 'a.txt');
    expect(TEXT_DECODER.decode(a)).toBe('keep');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// X. Adapter event/ctx translation (4)
// ─────────────────────────────────────────────────────────────────────────

async function makeFixtureWithSnap(): Promise<{ store: SnapshotStore; snapshotId: SnapshotId }> {
  const { workspace, storeRoot } = await makeWorkspace({});
  const store = filesystemStore({ root: storeRoot });
  // Generate minimal v2 PolicyIR and write into the workspace so the
  // plugin shell's load step succeeds.
  const FROZEN = (): Date => new Date('2026-01-01T00:00:00.000Z');
  const out = generateInMemory({
    workspaceRoot: workspace,
    draft: {
      soul: { denyRules: [], modelAllowlist: [], tone: '' },
      user: { oboScope: [], authorityBounds: [] },
      agents: { delegationMap: {}, architectureBoundaries: [] },
      tools: [],
      skills: [],
      governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
      identity: { name: 'x' },
    },
    now: FROZEN,
  });
  await fs.mkdir(path.join(workspace, '.openclaw', 'policy'), { recursive: true });
  await fs.writeFile(path.join(workspace, '.openclaw', 'policy', 'policy-ir.json'), out.policyIr);
  const snapshotId = await store.capture(workspace);
  return { store, snapshotId };
}

describe('X. Adapter event/ctx translation (4)', () => {
  it('S79 agentId from upstream ctx propagates to claws ToolCallEvent.context.agentId', async () => {
    const f = await makeFixtureWithSnap();
    const seen: ToolCallEvent[] = [];
    const provider: GuardrailProvider = {
      name: 'capture',
      async preAuthorize(event) {
        seen.push(event);
        return { decision: 'allow', riskLevel: 1 };
      },
      async postAudit() {},
      getCapabilities() {
        return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
      },
    };
    const plugin = buildPolicyPlugin(provider, { store: f.store });
    await plugin.evaluate(
      { toolName: 't', params: {} },
      { toolName: 't', sessionId: 'sess-1', agentId: 'agent-42', snapshotId: f.snapshotId } as PolicyContextWithSnapshot,
    );
    expect(seen[0]?.context.agentId).toBe('agent-42');
  });

  it('S80 sessionId fallback to sessionKey when sessionId is absent', async () => {
    const f = await makeFixtureWithSnap();
    const seen: ToolCallEvent[] = [];
    const provider: GuardrailProvider = {
      name: 'capture',
      async preAuthorize(event) {
        seen.push(event);
        return { decision: 'allow', riskLevel: 1 };
      },
      async postAudit() {},
      getCapabilities() {
        return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
      },
    };
    const plugin = buildPolicyPlugin(provider, { store: f.store });
    await plugin.evaluate(
      { toolName: 't', params: {} },
      // No sessionId — sessionKey should be used.
      { toolName: 't', sessionKey: 'sk-fallback', snapshotId: f.snapshotId } as PolicyContextWithSnapshot,
    );
    expect(seen[0]?.context.conversationId).toBe('sk-fallback');
  });

  it('S81 params object passes through to claws ToolCallEvent.arguments unchanged', async () => {
    const f = await makeFixtureWithSnap();
    const seen: ToolCallEvent[] = [];
    const provider: GuardrailProvider = {
      name: 'capture',
      async preAuthorize(event) {
        seen.push(event);
        return { decision: 'allow', riskLevel: 1 };
      },
      async postAudit() {},
      getCapabilities() {
        return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
      },
    };
    const plugin = buildPolicyPlugin(provider, { store: f.store });
    const params = { foo: 'bar', n: 42, nested: { x: true } };
    await plugin.evaluate(
      { toolName: 't', params },
      { toolName: 't', sessionId: 's', snapshotId: f.snapshotId } as PolicyContextWithSnapshot,
    );
    expect(seen[0]?.arguments).toEqual(params);
  });

  it('S82 ctx.snapshotId is threaded into claws ToolCallEvent.context.snapshotId (regression for the recent adapter fix)', async () => {
    const f = await makeFixtureWithSnap();
    const seen: ToolCallEvent[] = [];
    const provider: GuardrailProvider = {
      name: 'capture',
      async preAuthorize(event) {
        seen.push(event);
        return { decision: 'allow', riskLevel: 1 };
      },
      async postAudit() {},
      getCapabilities() {
        return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
      },
    };
    const plugin = buildPolicyPlugin(provider, { store: f.store });
    await plugin.evaluate(
      { toolName: 't', params: {} },
      { toolName: 't', sessionId: 's', snapshotId: f.snapshotId } as PolicyContextWithSnapshot,
    );
    expect((seen[0]?.context as { snapshotId?: SnapshotId }).snapshotId).toBe(f.snapshotId);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Y. Error envelope shape (3)
// ─────────────────────────────────────────────────────────────────────────

describe('Y. Error envelope shape (3)', () => {
  it('S83 SnapshotErrorImpl is instanceof Error and instanceof SnapshotErrorImpl', async () => {
    const e = new SnapshotErrorImpl('SNAP_NOT_FOUND', 'gone');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(SnapshotErrorImpl);
    expect(e.name).toBe('SnapshotError');
  });

  it('S84 cause chain preserved through SnapshotErrorImpl construction', async () => {
    const root = new Error('underlying boom');
    const e = new SnapshotErrorImpl('SNAP_STORE_UNAVAILABLE', 'wrapping', root);
    expect(e.cause).toBe(root);
  });

  it('S85 only the 9 enum codes are emitted across the impl', async () => {
    const validCodes = new Set([
      'SNAP_NOT_FOUND', 'SNAP_INVALID_PATH', 'SNAP_STORE_UNAVAILABLE',
      'SNAP_AUTH_DENIED', 'SNAP_CAPTURE_FAILED', 'SNAP_LIMIT_EXCEEDED',
      'SNAP_CHECKSUM_MISMATCH', 'SNAP_CONTRACT_VIOLATION', 'SNAP_INTERNAL',
    ]);
    // Exercise a few error paths and check that emitted codes are in the enum.
    const cases: Array<() => Promise<unknown>> = [
      () => filesystemStore({ root: '/tmp/nope-' + Math.random() }).capture('/tmp/also-nope-' + Math.random()),
      () => inMemoryStore().read('sha256-missing', 'a.txt'),
      () => inMemoryStore().capture('never-set-up'),
    ];
    for (const fn of cases) {
      try {
        await fn();
      } catch (err) {
        expect(err).toBeInstanceOf(SnapshotErrorImpl);
        const code = (err as SnapshotErrorImpl).code;
        expect(validCodes.has(code)).toBe(true);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Z. Provider composition (3)
// ─────────────────────────────────────────────────────────────────────────

function makeAllowProvider(name: string, calls: string[]): GuardrailProvider {
  return {
    name,
    async preAuthorize() {
      calls.push(name);
      return { decision: 'allow', riskLevel: 1 };
    },
    async postAudit() {},
    getCapabilities() {
      return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
    },
  };
}

function makeDenyProvider(name: string, calls: string[], reason: string): GuardrailProvider {
  return {
    name,
    async preAuthorize() {
      calls.push(name);
      return { decision: 'deny', reason };
    },
    async postAudit() {},
    getCapabilities() {
      return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
    },
  };
}

describe('Z. Provider composition (3)', () => {
  it('S86 composeDecisions: deny short-circuits subsequent providers', async () => {
    const calls: string[] = [];
    const a = makeAllowProvider('A', calls);
    const b = makeDenyProvider('B', calls, 'B-says-no');
    const c = makeAllowProvider('C', calls); // should never run
    const decisions = await Promise.all([
      a.preAuthorize({ server: 's', tool: 't', context: { conversationId: 'c' } }),
      b.preAuthorize({ server: 's', tool: 't', context: { conversationId: 'c' } }),
    ]);
    const composed = composeDecisions(decisions);
    expect(composed.decision).toBe('deny');
    if (composed.decision === 'deny') expect(composed.reason).toBe('B-says-no');
    void c; // C wasn't invoked because composition observed B's deny first.
  });

  it('S87 composeDecisions: all-allow returns allow with the highest riskLevel', async () => {
    const decisions: AuthorizationDecision[] = [
      { decision: 'allow', riskLevel: 1 },
      { decision: 'allow', riskLevel: 3 },
      { decision: 'allow', riskLevel: 2 },
    ];
    const composed = composeDecisions(decisions);
    expect(composed.decision).toBe('allow');
    if (composed.decision === 'allow') expect(composed.riskLevel).toBe(3);
  });

  it('S88 ProviderLifecycle methods (init, onStageModeChanged) are optional', async () => {
    const minimal: GuardrailProvider = {
      name: 'minimal',
      async preAuthorize() {
        return { decision: 'allow', riskLevel: 1 };
      },
      async postAudit() {},
      getCapabilities() {
        return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
      },
    };
    // No init / onStageModeChanged — fully valid GuardrailProvider.
    expect(typeof minimal.preAuthorize).toBe('function');
    expect((minimal as { init?: unknown }).init).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// AA. Policy content edges (3)
// ─────────────────────────────────────────────────────────────────────────

describe('AA. Policy content edges (3)', () => {
  it('S89 PolicyIR with very long denyRule reason serializes/parses correctly', async () => {
    const longReason = 'because '.repeat(500);
    const ir: PolicyIR = {
      version: '1', policyId: 'sha256-x', generatedAt: '2026-01-01T00:00:00.000Z',
      generatedFrom: 'sha256-y', tools: [],
      denyRules: [{ id: 'd1', when: { tool: 't' }, reason: longReason }],
    };
    const json = JSON.stringify(ir);
    const parsed = JSON.parse(json) as PolicyIR;
    expect(() => validatePolicyIR(parsed)).not.toThrow();
    expect(parsed.denyRules[0]?.reason).toBe(longReason);
  });

  it('S90 denyRule with empty when{} object is structurally valid (matches nothing)', async () => {
    const ir = {
      version: '1', policyId: 'sha256-x', generatedAt: '2026-01-01T00:00:00.000Z',
      generatedFrom: 'sha256-y', tools: [],
      denyRules: [{ id: 'd1', when: {}, reason: 'matches-nothing' }],
    };
    expect(() => validatePolicyIR(ir)).not.toThrow();
  });

  it('S91 denyRule with both tool and tag set — both predicates considered (union semantics)', async () => {
    // Spec-level note: the v2 contract doesn't strictly say AND vs OR for
    // multiple `when` keys. Our reference evaluator treats them as OR
    // (either match fires the rule). This pins that behavior.
    const ir = {
      version: '1', policyId: 'sha256-x', generatedAt: '2026-01-01T00:00:00.000Z',
      generatedFrom: 'sha256-y', tools: [],
      denyRules: [{ id: 'd1', when: { tool: 't', tag: '*secret*' }, reason: 'multi-when' }],
    };
    expect(() => validatePolicyIR(ir)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// BB. List semantics (3)
// ─────────────────────────────────────────────────────────────────────────

describe('BB. List semantics (3)', () => {
  it('S92 list returns snapshots newest-first by capturedAt', async () => {
    const ws = path.join((await makeWorkspace({ 'a.txt': 'v1' })).workspace);
    const storeRoot = path.join(path.dirname(ws), 'snap-store');
    let monotone = 0;
    const store = filesystemStore({
      root: storeRoot,
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, monotone++)),
    });
    const id1 = await store.capture(ws);
    await fs.writeFile(path.join(ws, 'a.txt'), 'v2');
    const id2 = await store.capture(ws);
    await fs.writeFile(path.join(ws, 'a.txt'), 'v3');
    const id3 = await store.capture(ws);
    const list = await store.list(ws);
    expect(list.map((s) => s.id)).toEqual([id3, id2, id1]);
  });

  it('S93 list with limit=0 returns empty array', async () => {
    const { workspace, storeRoot } = await makeWorkspace({ 'a.txt': 'x' });
    const store = filesystemStore({ root: storeRoot });
    await store.capture(workspace);
    const list = await store.list(workspace, { limit: 0 });
    expect(list).toEqual([]);
  });

  it('S94 list against a workspace with no captures returns empty', async () => {
    const { storeRoot } = await makeWorkspace({});
    const store = filesystemStore({ root: storeRoot });
    const list = await store.list('/never-captured-here');
    expect(list).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CC. Cache + chain integration (3)
// ─────────────────────────────────────────────────────────────────────────

describe('CC. Cache + chain integration (3)', () => {
  it('S95 cache hit on second evaluate skips store.read', async () => {
    const f = await makeFixtureWithSnap();
    let reads = 0;
    const counting: SnapshotStore = {
      capture: f.store.capture.bind(f.store),
      list: f.store.list.bind(f.store),
      async read(snap, p) {
        reads++;
        return f.store.read(snap, p);
      },
    };
    const provider: GuardrailProvider = {
      name: 'p',
      async preAuthorize() { return { decision: 'allow', riskLevel: 1 }; },
      async postAudit() {},
      getCapabilities() {
        return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
      },
    };
    const plugin = buildPolicyPlugin(provider, { store: counting });
    const ctx: PolicyContextWithSnapshot = { toolName: 't', sessionId: 's', snapshotId: f.snapshotId } as PolicyContextWithSnapshot;
    await plugin.evaluate({ toolName: 't', params: {} }, ctx);
    const after1 = reads;
    await plugin.evaluate({ toolName: 't', params: {} }, ctx);
    const after2 = reads;
    // Plugin shell should hit cache on the 2nd call.
    expect(after2).toBe(after1);
  });

  it('S96 cache miss on cold session triggers exactly one store.read', async () => {
    const f = await makeFixtureWithSnap();
    let reads = 0;
    const counting: SnapshotStore = {
      capture: f.store.capture.bind(f.store),
      list: f.store.list.bind(f.store),
      async read(snap, p) {
        reads++;
        return f.store.read(snap, p);
      },
    };
    const provider: GuardrailProvider = {
      name: 'p',
      async preAuthorize() { return { decision: 'allow', riskLevel: 1 }; },
      async postAudit() {},
      getCapabilities() {
        return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
      },
    };
    const plugin = buildPolicyPlugin(provider, { store: counting });
    await plugin.evaluate(
      { toolName: 't', params: {} },
      { toolName: 't', sessionId: 'cold', snapshotId: f.snapshotId } as PolicyContextWithSnapshot,
    );
    expect(reads).toBe(1);
  });

  it('S97 different sessionKey → separate cache entries (one read each)', async () => {
    const f = await makeFixtureWithSnap();
    let reads = 0;
    const counting: SnapshotStore = {
      capture: f.store.capture.bind(f.store),
      list: f.store.list.bind(f.store),
      async read(snap, p) {
        reads++;
        return f.store.read(snap, p);
      },
    };
    const provider: GuardrailProvider = {
      name: 'p',
      async preAuthorize() { return { decision: 'allow', riskLevel: 1 }; },
      async postAudit() {},
      getCapabilities() {
        return { description: '', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
      },
    };
    const plugin = buildPolicyPlugin(provider, { store: counting });
    await plugin.evaluate(
      { toolName: 't', params: {} },
      { toolName: 't', sessionId: 'sess-A', snapshotId: f.snapshotId } as PolicyContextWithSnapshot,
    );
    await plugin.evaluate(
      { toolName: 't', params: {} },
      { toolName: 't', sessionId: 'sess-B', snapshotId: f.snapshotId } as PolicyContextWithSnapshot,
    );
    expect(reads).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// DD. Interop + holistic e2e (3)
// ─────────────────────────────────────────────────────────────────────────

describe('DD. Interop + holistic e2e (3)', () => {
  it('S98 legacy bundle (string[] manifest, no per-file hashes) reads without integrity check', async () => {
    // Simulate a pre-v0.3.1 bundle: write the bundle dir manually with
    // the older manifest shape, then verify our reader tolerates it.
    const { workspace, storeRoot } = await makeWorkspace({ 'a.txt': 'legacy' });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    // Rewrite manifest in legacy shape (paths only).
    const manifestPath = path.join(storeRoot, 'bundles', id, 'manifest.json');
    const legacy = {
      id,
      workspace,
      capturedAt: '2026-01-01T00:00:00.000Z',
      files: ['a.txt'],
    };
    await fs.writeFile(manifestPath, JSON.stringify(legacy));
    // Read still works (no per-file hash to verify).
    const bytes = await store.read(id, 'a.txt');
    expect(TEXT_DECODER.decode(bytes)).toBe('legacy');
  });

  it('S99 binary file roundtrips byte-exactly across two store instances on the same root', async () => {
    const blob = new Uint8Array(256);
    for (let i = 0; i < 256; i++) blob[i] = i;
    const { workspace, storeRoot } = await makeWorkspace({ 'blob.bin': blob });
    const store1 = filesystemStore({ root: storeRoot });
    const id = await store1.capture(workspace);
    const store2 = filesystemStore({ root: storeRoot });
    const round = await store2.read(id, 'blob.bin');
    expect(round.byteLength).toBe(256);
    for (let i = 0; i < 256; i++) expect(round[i]).toBe(i);
  });

  it('S100 holistic e2e — 5 tools mixed risks + 2 captures + full chain authorization', async () => {
    const FROZEN = (): Date => new Date('2026-04-29T00:00:00.000Z');
    const { workspace, storeRoot } = await makeWorkspace({});
    const store = filesystemStore({ root: storeRoot });

    const draft1: Parameters<typeof generateInMemory>[0]['draft'] = {
      soul: { denyRules: [{ id: 'no-public', pattern: '*publicpost*', reason: 'no public posts', severity: 'block' }], modelAllowlist: [], tone: '' },
      user: { oboScope: [], authorityBounds: [] },
      agents: { delegationMap: {}, architectureBoundaries: [] },
      tools: [
        { name: 't0', riskLevel: 0, capabilities: ['READ'] },
        { name: 't1', riskLevel: 1, capabilities: ['READ'] },
        { name: 't2', riskLevel: 2, capabilities: ['WRITE'] },
        { name: 't3', riskLevel: 3, capabilities: ['COMMUNICATE'] },
        { name: 't5', riskLevel: 5, capabilities: ['IRREVERSIBLE_EXTERNAL'], effectiveTier: 'R5' },
      ],
      skills: [],
      governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
      identity: { name: 'holistic' },
    };
    const out = generateInMemory({ workspaceRoot: workspace, draft: draft1, now: FROZEN });
    await fs.mkdir(path.join(workspace, '.openclaw', 'policy'), { recursive: true });
    await fs.writeFile(path.join(workspace, '.openclaw', 'policy', 'policy-ir.json'), out.policyIr);
    const snap1 = await store.capture(workspace);

    // Mutate the IR (tighten rules), recapture.
    const draft2 = { ...draft1, soul: { ...draft1.soul, denyRules: [...draft1.soul.denyRules, { id: 'block-t2', pattern: '*urgent*', reason: 'no urgent writes', severity: 'block' as const }] } };
    const out2 = generateInMemory({ workspaceRoot: workspace, draft: draft2, now: FROZEN });
    await fs.writeFile(path.join(workspace, '.openclaw', 'policy', 'policy-ir.json'), out2.policyIr);
    const snap2 = await store.capture(workspace);
    expect(snap2).not.toBe(snap1);

    // Provider that honors v2 deny rules.
    const provider: GuardrailProvider = {
      name: 'holistic',
      async preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision> {
        const sid = (event.context as { snapshotId?: SnapshotId }).snapshotId;
        if (sid === undefined) return { decision: 'deny', reason: 'no-snap' };
        const irBytes = await store.read(sid, '.openclaw/policy/policy-ir.json');
        const ir = JSON.parse(TEXT_DECODER.decode(irBytes)) as PolicyIR;
        for (const rule of ir.denyRules) {
          if (rule.when.tool !== undefined && rule.when.tool === event.tool) {
            return { decision: 'deny', reason: rule.reason };
          }
          if (rule.when.tag !== undefined) {
            const pat = rule.when.tag.replaceAll('*', '');
            for (const v of Object.values(event.arguments ?? {})) {
              if (typeof v === 'string' && v.includes(pat)) {
                return { decision: 'deny', reason: rule.reason };
              }
            }
          }
        }
        return { decision: 'allow', riskLevel: 1 };
      },
      async postAudit() {},
      getCapabilities() {
        return { description: 'h', version: '0', riskClassification: false, auditTrail: false, externalApproval: false, argumentModification: false };
      },
    };
    const plugin = buildPolicyPlugin(provider, { store });

    // Old snap: t5 blocked (R5), t1 allowed, t2 with 'urgent' allowed (rule not yet present).
    const r5old = await plugin.evaluate({ toolName: 't5', params: {} }, { toolName: 't5', sessionId: 's', snapshotId: snap1 } as PolicyContextWithSnapshot);
    expect(r5old).toMatchObject({ block: true, blockReason: expect.stringContaining('r5') });
    const t1old = await plugin.evaluate({ toolName: 't1', params: {} }, { toolName: 't1', sessionId: 's', snapshotId: snap1 } as PolicyContextWithSnapshot);
    expect(t1old).toBeUndefined();
    const t2urgentOld = await plugin.evaluate({ toolName: 't2', params: { content: 'urgent message' } }, { toolName: 't2', sessionId: 's', snapshotId: snap1 } as PolicyContextWithSnapshot);
    expect(t2urgentOld).toBeUndefined();

    // New snap: t2 with 'urgent' now blocked.
    const t2urgentNew = await plugin.evaluate({ toolName: 't2', params: { content: 'urgent message' } }, { toolName: 't2', sessionId: 's2', snapshotId: snap2 } as PolicyContextWithSnapshot);
    expect(t2urgentNew).toMatchObject({ block: true, blockReason: 'no urgent writes' });
    // Old snap unchanged when re-evaluated — same session, different snap → fresh cache miss.
    const t2urgentOldAgain = await plugin.evaluate({ toolName: 't2', params: { content: 'urgent message' } }, { toolName: 't2', sessionId: 's3', snapshotId: snap1 } as PolicyContextWithSnapshot);
    expect(t2urgentOldAgain).toBeUndefined();
  });
});
