/**
 * v2 chain — adversarial scenarios (30 tests across 10 categories).
 *
 * Stress-tests the v2 contract chain beyond happy-path. Each scenario
 * proves or exposes something architecturally meaningful:
 *
 *   1. Bundle integrity / tamper detection
 *   2. Unknown / undeclared inputs
 *   3. Argument evasion
 *   4. Decision-type full coverage
 *   5. PolicyIR validation failure modes
 *   6. Rule semantics under multi-match
 *   7. Cache lifecycle
 *   8. Capture edge cases
 *   9. Tier projection (R0–R5)
 *  10. Path safety
 *
 * Some tests document **known gaps** (current behavior diverges from what
 * we'd want) — they're tagged in the title with `[GAP]` and assert the
 * current behavior so we notice when it changes. The fix for those is
 * scoped separately (see follow-up task).
 *
 * @module @bic/v2-prototype/tests/v2-chain-adversarial
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { generateInMemory } from '@bic/openclaw-policy';
import {
  filesystemStore,
  type SnapshotId,
  type SnapshotStore,
} from '@bic/openclaw-snap';
import {
  buildPolicyPlugin,
  PolicyIrCache,
  MAX_SNAPSHOTS_PER_SESSION,
  type PolicyContextWithSnapshot,
} from '@bic/openclaw-guardrails/policy-runtime';
import type {
  AuthorizationDecision,
  GuardrailProvider,
  ToolCallEvent,
} from '@bic/openclaw-guardrails';
import { validatePolicyIR, type PolicyIR } from '@bic/v2-prototype';

const TEXT_DECODER = new TextDecoder('utf-8');
const TEXT_ENCODER = new TextEncoder();

interface Fixture {
  scratch: string;
  workspace: string;
  storeRoot: string;
  store: SnapshotStore;
  snapshotId: SnapshotId;
  policyIrJson: string;
}

const FROZEN_NOW = (): Date => new Date('2026-04-29T00:00:00.000Z');

async function buildFixture(opts: {
  tools?: Array<{
    name: string;
    riskLevel: 0 | 1 | 2 | 3 | 4 | 5;
    capabilities?: readonly string[];
    effectiveTier?: 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
    declaredTier?: 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  }>;
  soulDenyRules?: Array<{ id: string; pattern: string; reason: string; severity: 'block' | 'review' }>;
  extraFiles?: Record<string, string>;
} = {}): Promise<Fixture> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-adv-'));
  const workspace = path.join(scratch, 'workspace');
  const storeRoot = path.join(scratch, 'snap-store');
  await fs.mkdir(workspace, { recursive: true });
  await fs.mkdir(storeRoot, { recursive: true });

  const tools = opts.tools ?? [
    { name: 'send-email', riskLevel: 5 as const, capabilities: ['IRREVERSIBLE_EXTERNAL'], effectiveTier: 'R5' as const },
    { name: 'read-doc', riskLevel: 1 as const, capabilities: ['READ'] },
  ];
  const soulDenyRules = opts.soulDenyRules ?? [
    { id: 'soul-secrets', pattern: '*secret*', reason: 'no secrets', severity: 'block' as const },
  ];

  const out = generateInMemory({
    workspaceRoot: workspace,
    draft: {
      soul: { denyRules: soulDenyRules, modelAllowlist: [], tone: '' },
      user: { oboScope: [], authorityBounds: [] },
      agents: { delegationMap: {}, architectureBoundaries: [] },
      tools: tools as never,
      skills: [],
      governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
      identity: { name: 'adv-fixture' },
    },
    now: FROZEN_NOW,
  });

  const policyDir = path.join(workspace, '.openclaw', 'policy');
  await fs.mkdir(policyDir, { recursive: true });
  await fs.writeFile(path.join(policyDir, 'policy-ir.json'), out.policyIr, 'utf8');

  // Optional extra files inside the workspace, useful for empty-workspace
  // and ignore-only-dirs scenarios.
  for (const [rel, content] of Object.entries(opts.extraFiles ?? {})) {
    const full = path.join(workspace, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf8');
  }

  const store = filesystemStore({ root: storeRoot });
  const snapshotId = await store.capture(workspace);
  return { scratch, workspace, storeRoot, store, snapshotId, policyIrJson: out.policyIr };
}

function v2Evaluator(store: SnapshotStore): GuardrailProvider {
  return {
    name: 'adv-evaluator',
    async preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision> {
      const snap = (event.context as { snapshotId?: SnapshotId }).snapshotId;
      if (snap === undefined) return { decision: 'deny', reason: 'no-snap' };
      const bytes = await store.read(snap, '.openclaw/policy/policy-ir.json');
      const parsed: unknown = JSON.parse(TEXT_DECODER.decode(bytes));
      validatePolicyIR(parsed);
      const ir = parsed as PolicyIR;
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
      return {
        description: 'adversarial test evaluator',
        version: '0.0.1',
        riskClassification: false,
        auditTrail: false,
        externalApproval: false,
        argumentModification: false,
      };
    },
  };
}

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true });
  }
});

async function fixture(opts: Parameters<typeof buildFixture>[0] = {}): Promise<Fixture> {
  const f = await buildFixture(opts);
  live.push({ scratch: f.scratch });
  return f;
}

function ctxFor(snapshotId: SnapshotId, toolName: string, sessionId = 's1'): PolicyContextWithSnapshot {
  return { toolName, sessionId, snapshotId } as PolicyContextWithSnapshot;
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Bundle integrity / tamper detection (5)
// ─────────────────────────────────────────────────────────────────────────

describe('Bundle integrity / tamper (5)', () => {
  it('S01 tampered policy-ir.json is detected on read via SNAP_CHECKSUM_MISMATCH', async () => {
    // Per-file sha256 in the manifest is verified on every `store.read`.
    // Modifying any byte of any file inside a captured bundle is caught
    // before the bytes reach the caller. Closes the tamper-detection gap
    // — see filesystemStore.read.
    const f = await fixture();
    const target = path.join(f.storeRoot, 'bundles', f.snapshotId, 'files', '.openclaw', 'policy', 'policy-ir.json');
    await fs.writeFile(target, '{"tampered": true}', 'utf8');
    await expect(f.store.read(f.snapshotId, '.openclaw/policy/policy-ir.json')).rejects.toMatchObject({
      code: 'SNAP_CHECKSUM_MISMATCH',
    });
  });

  it('S02 read of path that manifest claims but file does not exist throws SNAP_INVALID_PATH', async () => {
    const f = await fixture();
    // Truncate manifest's files list to claim a fake file alongside real one.
    const manifestPath = path.join(f.storeRoot, 'bundles', f.snapshotId, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    manifest.files.push('does-not-exist.txt');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    await expect(f.store.read(f.snapshotId, 'does-not-exist.txt')).rejects.toMatchObject({
      code: 'SNAP_INVALID_PATH',
    });
  });

  it('S03 entire bundle dir deleted → cold-session read fails closed via plugin shell', async () => {
    const f = await fixture();
    await fs.rm(path.join(f.storeRoot, 'bundles', f.snapshotId), { recursive: true, force: true });
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: {} },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    expect(decision).toMatchObject({ block: true });
  });

  it('S04 [GAP] bundle deleted mid-session: plugin shell caches IR but evaluator re-reads, so deletion still propagates', async () => {
    // Architectural finding: policy-plugin.ts loads + caches PolicyIR for
    // lifecycle/fail-closed reasons, but never passes the cached IR to the
    // composed provider (`void ir` in policy-plugin.ts:115). Real evaluators
    // (like the test fixture) re-read PolicyIR per call, paying the IO each
    // time AND exposing backend state changes that the cache should mask.
    // Fix path: extend the upstream event/context shape to carry the cached
    // IR, or have the plugin shell expose it via an injected helper.
    const f = await fixture();
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    await plugin.evaluate({ toolName: 'read-doc', params: {} }, ctxFor(f.snapshotId, 'read-doc'));
    await fs.rm(path.join(f.storeRoot, 'bundles', f.snapshotId), { recursive: true, force: true });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: {} },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    // Today: evaluator's store.read fails → fail-closed via adapter.
    // After fix (IR hand-off to evaluator): cache hit, decision === undefined.
    expect(decision).toMatchObject({ block: true, blockReason: expect.stringContaining('evaluator-error') });
  });

  it('S05 [GAP] bundle dirname mismatching manifest.id is not detected on read', async () => {
    // Same root cause as S01: read does not re-verify identity.
    const f = await fixture();
    const manifestPath = path.join(f.storeRoot, 'bundles', f.snapshotId, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    manifest.id = 'sha256-completely-different';
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    // Read still succeeds — dirname is the lookup key, manifest.id is decorative.
    const bytes = await f.store.read(f.snapshotId, '.openclaw/policy/policy-ir.json');
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Unknown / undeclared inputs (3)
// ─────────────────────────────────────────────────────────────────────────

describe('Unknown / undeclared inputs (3)', () => {
  it('S06 [DECISION] tool not declared in PolicyIR.tools[] is allowed by default (denylist semantics)', async () => {
    // Architectural decision: PolicyIR is denylist-shaped. Unknown tools fall
    // through. Allowlist semantics would require a different evaluator strategy.
    const f = await fixture();
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'never-declared-tool', params: {} },
      ctxFor(f.snapshotId, 'never-declared-tool'),
    );
    expect(decision).toBeUndefined();
  });

  it('S07 tool name containing path-traversal substring is matched literally, not interpreted', async () => {
    const f = await fixture({
      tools: [{ name: '../etc/passwd', riskLevel: 5, capabilities: [], effectiveTier: 'R5' }],
    });
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: '../etc/passwd', params: {} },
      ctxFor(f.snapshotId, '../etc/passwd'),
    );
    // R5-lowering produced a matching denyRule literally on the tool name.
    expect(decision).toMatchObject({ block: true, blockReason: expect.stringContaining('r5-fail-closed') });
  });

  it('S08 tool name match is case-sensitive', async () => {
    const f = await fixture();
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    // Declared as 'send-email' (lowercase). Try 'Send-Email' — should NOT match the R5 deny.
    const decision = await plugin.evaluate(
      { toolName: 'Send-Email', params: {} },
      ctxFor(f.snapshotId, 'Send-Email'),
    );
    expect(decision).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Argument evasion (4)
// ─────────────────────────────────────────────────────────────────────────

describe('Argument evasion against soul-tag rule (4)', () => {
  it('S09 [GAP] secret nested inside an object value is not detected (top-level Object.values only)', async () => {
    // Reference evaluator only iterates top-level arg values. Nested objects
    // bypass the tag check. Real claws-side SecretsProvider does recursive
    // scanning; the v2 contract leaves this to evaluator implementations.
    const f = await fixture();
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: { config: { content: 'secretsauce' } } },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    expect(decision).toBeUndefined(); // EVASION succeeds with naive evaluator
  });

  it('S10 [GAP] secret in array element is not detected', async () => {
    const f = await fixture();
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: { items: ['ok', 'secretsauce', 'ok'] } },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    expect(decision).toBeUndefined();
  });

  it('S11 [GAP] secret in object KEY (not value) is not detected', async () => {
    const f = await fixture();
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: { 'topsecret-data': 'ok' } },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    expect(decision).toBeUndefined();
  });

  it('S12 [GAP] tag pattern match is case-sensitive against argument', async () => {
    // Pattern: '*secret*'. Arg: 'TopSECRETData'. Naive includes() is case-sensitive.
    const f = await fixture();
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: { content: 'TopSECRETData' } },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    expect(decision).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Decision-type full coverage (4)
// ─────────────────────────────────────────────────────────────────────────

describe('Decision-type full coverage (4)', () => {
  function reviewProvider(): GuardrailProvider {
    return {
      name: 'review',
      async preAuthorize() {
        return { decision: 'review', reason: 'needs-human', riskLevel: 4 };
      },
      async postAudit() {},
      getCapabilities() {
        return {
          description: '', version: '0', riskClassification: false, auditTrail: false,
          externalApproval: true, argumentModification: false,
        };
      },
    };
  }
  function modifyProvider(): GuardrailProvider {
    return {
      name: 'modify',
      async preAuthorize() {
        return { decision: 'modify', modifiedArguments: { redacted: true }, reason: 'redacted' };
      },
      async postAudit() {},
      getCapabilities() {
        return {
          description: '', version: '0', riskClassification: false, auditTrail: false,
          externalApproval: false, argumentModification: true,
        };
      },
    };
  }
  function throwingProvider(toThrow: unknown): GuardrailProvider {
    return {
      name: 'throwing',
      async preAuthorize() {
        throw toThrow;
      },
      async postAudit() {},
      getCapabilities() {
        return {
          description: '', version: '0', riskClassification: false, auditTrail: false,
          externalApproval: false, argumentModification: false,
        };
      },
    };
  }

  it('S13 review decision maps to upstream requireApproval shape', async () => {
    const f = await fixture();
    const plugin = buildPolicyPlugin(reviewProvider(), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'whatever', params: {} },
      ctxFor(f.snapshotId, 'whatever'),
    );
    expect(decision).toMatchObject({
      requireApproval: {
        title: 'Approval required',
        description: 'needs-human',
        severity: 'critical',
      },
    });
  });

  it('S14 modify decision maps to upstream params shape', async () => {
    const f = await fixture();
    const plugin = buildPolicyPlugin(modifyProvider(), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'whatever', params: { original: true } },
      ctxFor(f.snapshotId, 'whatever'),
    );
    expect(decision).toMatchObject({ params: { redacted: true } });
  });

  it('S15 provider throws non-Error (string) → adapter still fail-closes', async () => {
    const f = await fixture();
    const plugin = buildPolicyPlugin(throwingProvider('boom'), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'whatever', params: {} },
      ctxFor(f.snapshotId, 'whatever'),
    );
    expect(decision).toMatchObject({
      block: true,
      blockReason: expect.stringContaining('evaluator-error'),
    });
  });

  it('S16 provider throws undefined → adapter still fail-closes (does not crash)', async () => {
    const f = await fixture();
    const plugin = buildPolicyPlugin(throwingProvider(undefined), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'whatever', params: {} },
      ctxFor(f.snapshotId, 'whatever'),
    );
    expect(decision).toMatchObject({ block: true, blockReason: expect.stringContaining('evaluator-error') });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. PolicyIR validation failure modes (3)
// ─────────────────────────────────────────────────────────────────────────

describe('PolicyIR validation failure (3)', () => {
  it('S17 malformed JSON in policy-ir.json fails closed', async () => {
    const f = await fixture();
    const target = path.join(f.storeRoot, 'bundles', f.snapshotId, 'files', '.openclaw', 'policy', 'policy-ir.json');
    await fs.writeFile(target, '{not json', 'utf8');
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: {} },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    expect(decision).toMatchObject({ block: true });
  });

  it('S18 PolicyIR missing denyRules field fails closed via validatePolicyIR', async () => {
    const f = await fixture();
    const target = path.join(f.storeRoot, 'bundles', f.snapshotId, 'files', '.openclaw', 'policy', 'policy-ir.json');
    const partial = JSON.stringify({ version: '1', policyId: 'sha256-x', generatedAt: '...', generatedFrom: 'sha256-y', tools: [] });
    await fs.writeFile(target, partial, 'utf8');
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: {} },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    expect(decision).toMatchObject({ block: true });
  });

  it('S19 PolicyIR with tampered policyId is detected via SNAP_CHECKSUM_MISMATCH (covered by S01 fix)', async () => {
    // Modifying the `policyId` field changes the file bytes → manifest's
    // recorded sha256 mismatches on read. validatePolicyIR by itself doesn't
    // re-compute policyId (would be redundant given the per-file integrity
    // check), but the bytes-level check catches the tamper one layer down.
    const f = await fixture();
    const target = path.join(f.storeRoot, 'bundles', f.snapshotId, 'files', '.openclaw', 'policy', 'policy-ir.json');
    const orig = JSON.parse(await fs.readFile(target, 'utf8'));
    orig.policyId = 'sha256-fakefake';
    await fs.writeFile(target, JSON.stringify(orig), 'utf8');
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: {} },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    expect(decision).toMatchObject({
      block: true,
      blockReason: expect.stringContaining('Content hash mismatch'),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Rule semantics under multi-match (2)
// ─────────────────────────────────────────────────────────────────────────

describe('Rule semantics — multi-match (2)', () => {
  it('S20 multiple matching denyRules — first match wins, deterministic', async () => {
    const f = await fixture({
      tools: [{ name: 'send-email', riskLevel: 5, capabilities: [], effectiveTier: 'R5' }],
      soulDenyRules: [
        { id: 'soul-A', pattern: '*secret*', reason: 'soul-A-fired', severity: 'block' },
        { id: 'soul-B', pattern: '*confidential*', reason: 'soul-B-fired', severity: 'block' },
      ],
    });
    const plugin = buildPolicyPlugin(v2Evaluator(f.store), { store: f.store });
    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: { content: 'this is secret and confidential' } },
      ctxFor(f.snapshotId, 'read-doc'),
    );
    expect(decision).toMatchObject({ block: true, blockReason: 'soul-A-fired' });
  });

  it('S21 R5 rule ordering — soul rules emit BEFORE r5-tier rules in lower.ts', async () => {
    const f = await fixture({
      tools: [{ name: 'send-email', riskLevel: 5, capabilities: [], effectiveTier: 'R5' }],
      soulDenyRules: [
        { id: 'soul-X', pattern: '*evilbits*', reason: 'soul-X-fired', severity: 'block' },
      ],
    });
    const ir = JSON.parse(f.policyIrJson);
    const ids = ir.denyRules.map((r: { id: string }) => r.id);
    // Soul rules first, then r5-tier rules.
    expect(ids).toEqual(['soul-X', 'r5-tier:send-email']);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Cache lifecycle (3)
// ─────────────────────────────────────────────────────────────────────────

describe('Cache lifecycle (3)', () => {
  it('S22 LRU eviction when session exceeds MAX_SNAPSHOTS_PER_SESSION', async () => {
    const cache = new PolicyIrCache();
    expect(MAX_SNAPSHOTS_PER_SESSION).toBe(8);
    const stub = { version: '1', policyId: 'p', generatedAt: 't', generatedFrom: 's', tools: [], denyRules: [] } as PolicyIR;
    for (let i = 0; i < 10; i++) cache.set('s1', `sha256-${i}`, stub);
    // First two should be evicted.
    expect(cache.get('s1', 'sha256-0')).toBeUndefined();
    expect(cache.get('s1', 'sha256-1')).toBeUndefined();
    expect(cache.get('s1', 'sha256-9')).toBeDefined();
  });

  it('S23 caches are isolated across sessions', async () => {
    const cache = new PolicyIrCache();
    const stubA = { version: '1', policyId: 'A', generatedAt: 't', generatedFrom: 's', tools: [], denyRules: [] } as PolicyIR;
    const stubB = { version: '1', policyId: 'B', generatedAt: 't', generatedFrom: 's', tools: [], denyRules: [] } as PolicyIR;
    cache.set('sessA', 'sha256-x', stubA);
    cache.set('sessB', 'sha256-x', stubB);
    expect(cache.get('sessA', 'sha256-x')?.policyId).toBe('A');
    expect(cache.get('sessB', 'sha256-x')?.policyId).toBe('B');
  });

  it('S24 cache.set with same (session, snapshotId) updates rather than appends', async () => {
    const cache = new PolicyIrCache();
    const v1 = { version: '1', policyId: 'v1', generatedAt: 't', generatedFrom: 's', tools: [], denyRules: [] } as PolicyIR;
    const v2 = { version: '1', policyId: 'v2', generatedAt: 't', generatedFrom: 's', tools: [], denyRules: [] } as PolicyIR;
    cache.set('s1', 'sha256-x', v1);
    cache.set('s1', 'sha256-x', v2);
    expect(cache.get('s1', 'sha256-x')?.policyId).toBe('v2');
    expect(cache.size()).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Capture edge cases (3)
// ─────────────────────────────────────────────────────────────────────────

describe('Capture edge cases (3)', () => {
  it('S25 empty workspace captures successfully with valid id', async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-empty-'));
    live.push({ scratch });
    const ws = path.join(scratch, 'ws');
    const root = path.join(scratch, 'store');
    await fs.mkdir(ws, { recursive: true });
    await fs.mkdir(root, { recursive: true });
    const store = filesystemStore({ root });
    const id = await store.capture(ws);
    expect(id).toMatch(/^sha256-/);
    const list = await store.list(ws);
    expect(list).toHaveLength(1);
  });

  it('S26 workspace containing only ignored dirs captures the same as empty', async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-ign-'));
    live.push({ scratch });
    const wsA = path.join(scratch, 'wsA');
    const wsB = path.join(scratch, 'wsB');
    const root = path.join(scratch, 'store');
    await fs.mkdir(wsA, { recursive: true });
    await fs.mkdir(wsB, { recursive: true });
    await fs.mkdir(path.join(wsB, 'node_modules'), { recursive: true });
    await fs.writeFile(path.join(wsB, 'node_modules', 'noise.txt'), 'x', 'utf8');
    await fs.mkdir(root, { recursive: true });
    const store = filesystemStore({ root });
    const idA = await store.capture(wsA);
    const idB = await store.capture(wsB);
    expect(idA).toBe(idB);
  });

  it('S27 capturing byte-identical workspace twice yields same snapshot id', async () => {
    const f1 = await fixture();
    // Recapture via the same store on the same workspace dir — no content change.
    const id2 = await f1.store.capture(f1.workspace);
    expect(id2).toBe(f1.snapshotId);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 9. Tier projection (R0–R5) (2)
// ─────────────────────────────────────────────────────────────────────────

describe('Tier projection (2)', () => {
  it('S28 R0 tool produces risk:low, no R5 deny rule emitted', async () => {
    const f = await fixture({
      tools: [{ name: 'low-risk-thing', riskLevel: 0, capabilities: [] }],
      soulDenyRules: [],
    });
    const ir = JSON.parse(f.policyIrJson) as PolicyIR;
    expect(ir.tools[0]?.risk).toBe('low');
    expect(ir.denyRules).toHaveLength(0);
  });

  it('S29 R5 via explicit declaredTier produces same denyRule as via riskLevel:5', async () => {
    const fA = await fixture({
      tools: [{ name: 'tool-A', riskLevel: 5, capabilities: [], effectiveTier: 'R5' }],
      soulDenyRules: [],
    });
    const fB = await fixture({
      tools: [{ name: 'tool-A', riskLevel: 1, capabilities: [], declaredTier: 'R5' }],
      soulDenyRules: [],
    });
    const irA = JSON.parse(fA.policyIrJson) as PolicyIR;
    const irB = JSON.parse(fB.policyIrJson) as PolicyIR;
    // declaredTier alone (without effectiveTier) lowers to R5 via lower.ts effectiveTier()
    expect(irA.denyRules.find((r) => r.id === 'r5-tier:tool-A')).toBeDefined();
    expect(irB.denyRules.find((r) => r.id === 'r5-tier:tool-A')).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 10. Path safety (1)
// ─────────────────────────────────────────────────────────────────────────

describe('Path safety (1)', () => {
  it('S30 read with path-traversal `..` does not escape bundle dir', async () => {
    const f = await fixture();
    // Even if we ask for `../../etc/passwd`, we expect either a fail-closed
    // error code or a not-found — never a successful read of a host file.
    let escaped = false;
    try {
      const bytes = await f.store.read(f.snapshotId, '../../../../etc/passwd');
      // If read succeeded, was it a host file?
      const content = TEXT_DECODER.decode(bytes);
      if (content.includes('root:')) escaped = true;
    } catch {
      // Expected — fail-closed of some flavor.
    }
    expect(escaped).toBe(false);
  });
});
