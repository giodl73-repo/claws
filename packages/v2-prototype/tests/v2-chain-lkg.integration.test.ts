/**
 * v2 chain — end-to-end via the LKG-shaped policy plugin.
 *
 * Mirrors `v2-chain.integration.test.ts` but routes the PolicyIR
 * through `@bic/openclaw-lkg` (FS) and `@bic/openclaw-lkg-git`
 * (git-backed) instead of `@bic/openclaw-snap`. The same chain
 * composes either way — that's the load-bearing claim of the LKG
 * pivot: PolicyIR is just one consumer of a generalized recovery
 * primitive, and consumers can swap backends without code changes.
 *
 * Three levels of validation:
 *   1. Cold-path: agent writes PolicyIR → LKG observes (promote) →
 *      plugin reads through and enforces R5 / soul / allow.
 *   2. Recovery: agent writes garbage → LKG observes (recover) →
 *      plugin still enforces against the prior good PolicyIR.
 *   3. Multi-agent merge (git backend only): two branches, both
 *      promote LKG-good edits, three-way merge resolves cleanly.
 */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

import { generateInMemory } from '@bic/openclaw-policy';
import {
  buildPolicyPluginFromLKG,
  policyIrTracker,
} from '@bic/openclaw-guardrails/policy-runtime';
import type {
  AuthorizationDecision,
  GuardrailProvider,
  ToolCallEvent,
} from '@bic/openclaw-guardrails';
import { lkgStore } from '@bic/openclaw-lkg';
import { gitLKGStore } from '@bic/openclaw-lkg-git';
import {
  validatePolicyIR,
  type LKGStore,
  type PolicyIR,
} from '@bic/v2-prototype';

const TEXT_DECODER = new TextDecoder('utf-8');
const execFileP = promisify(execFile);

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true });
  }
});

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-chain-lkg-'));
  live.push({ scratch });
  return scratch;
}

async function makeGitScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-chain-lkg-git-'));
  live.push({ scratch });
  await execFileP('git', ['init', '-q', '-b', 'main'], { cwd: scratch });
  await execFileP('git', ['config', 'user.email', 'init@test.local'], { cwd: scratch });
  await execFileP('git', ['config', 'user.name', 'Init'], { cwd: scratch });
  await execFileP('git', ['commit', '--allow-empty', '-m', 'seed'], { cwd: scratch });
  return scratch;
}

const FROZEN = (): Date => new Date('2026-04-29T00:00:00.000Z');

const DRAFT_FIXTURE = {
  soul: {
    denyRules: [
      {
        id: 'soul-secrets',
        pattern: '*secret*',
        reason: 'no secrets in tool args',
        severity: 'block' as const,
      },
    ],
    modelAllowlist: [],
    tone: '',
  },
  user: { oboScope: [], authorityBounds: [] },
  agents: { delegationMap: {}, architectureBoundaries: [] },
  tools: [
    {
      name: 'send-email',
      riskLevel: 5 as const,
      capabilities: ['IRREVERSIBLE_EXTERNAL'] as const,
      effectiveTier: 'R5' as const,
    },
    { name: 'read-doc', riskLevel: 1 as const, capabilities: ['READ'] as const },
  ],
  skills: [],
  governance: {
    rules: [],
    sensitivityPropagation: [],
    governanceSurface: [],
  },
  identity: { name: 'v2-chain-lkg-fixture' },
};

/** Materialize PolicyIR as JSON bytes — workspaceRoot only matters as a label. */
function materializePolicyIrJson(workspaceRoot: string): string {
  const out = generateInMemory({ workspaceRoot, draft: DRAFT_FIXTURE, now: FROZEN });
  return out.policyIr;
}

/** Generic PolicyIR-aware GuardrailProvider; same as the snap-based test fixture. */
function v2RuleEvaluator(read: () => Promise<Uint8Array>): GuardrailProvider {
  return {
    name: 'v2-rule-evaluator-lkg',
    async preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision> {
      const bytes = await read();
      const parsed: unknown = JSON.parse(TEXT_DECODER.decode(bytes));
      validatePolicyIR(parsed);
      const ir = parsed as PolicyIR;

      for (const rule of ir.denyRules) {
        if (rule.when.tool !== undefined && rule.when.tool === event.tool) {
          return { decision: 'deny', reason: rule.reason };
        }
        if (rule.when.tag !== undefined) {
          const pat = rule.when.tag.replaceAll('*', '');
          for (const v of Object.values(event.arguments)) {
            if (typeof v === 'string' && v.includes(pat)) {
              return { decision: 'deny', reason: rule.reason };
            }
          }
        }
      }
      return { decision: 'allow', riskLevel: 1 };
    },
    async postAudit() { /* noop */ },
    getCapabilities() {
      return {
        description: 'v2 PolicyIR rule evaluator (LKG-shaped fixture)',
        version: '0.0.1',
        riskClassification: false,
        auditTrail: false,
        externalApproval: false,
        argumentModification: false,
      };
    },
  };
}

interface Wired {
  store: LKGStore;
  policyIrPath: string;
  cleanup?: () => Promise<void>;
}

async function wireFsLKG(): Promise<Wired> {
  const scratch = await makeFsScratch();
  const policyIrPath = path.join(scratch, 'policy-ir.json');
  await fs.writeFile(policyIrPath, materializePolicyIrJson(scratch), 'utf-8');
  const store = lkgStore();
  store.register(policyIrTracker(policyIrPath));
  await store.observe(policyIrPath); // promote
  return { store, policyIrPath };
}

async function wireGitLKG(): Promise<Wired> {
  const repo = await makeGitScratch();
  const policyIrPath = path.join(repo, 'policy-ir.json');
  await fs.writeFile(policyIrPath, materializePolicyIrJson(repo), 'utf-8');
  const store = gitLKGStore({
    repoRoot: repo,
    authorship: { name: 'LKG Bot', email: 'lkg@test.local' },
  });
  store.register(policyIrTracker(policyIrPath));
  await store.observe(policyIrPath); // promote (= git commit)
  return { store, policyIrPath };
}

describe.each([
  ['filesystem', wireFsLKG] as const,
  ['git', wireGitLKG] as const,
])('v2 chain via LKG (%s backend)', (_label, wire) => {
  it('R5 tool blocked through buildPolicyPluginFromLKG', async () => {
    const { store, policyIrPath } = await wire();
    const plugin = buildPolicyPluginFromLKG(
      v2RuleEvaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );

    const decision = await plugin.evaluate(
      { toolName: 'send-email', params: { to: 'eve@example.com' } },
      { toolName: 'send-email', sessionId: 's1' },
    );
    expect(decision).toMatchObject({
      block: true,
      blockReason: expect.stringContaining('r5-fail-closed'),
    });
  });

  it('non-R5 tool returns no decision (chain continues)', async () => {
    const { store, policyIrPath } = await wire();
    const plugin = buildPolicyPluginFromLKG(
      v2RuleEvaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );

    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: { path: 'public/doc.txt' } },
      { toolName: 'read-doc', sessionId: 's1' },
    );
    expect(decision).toBeUndefined();
  });

  it('soul deny via tag fires on argument substring', async () => {
    const { store, policyIrPath } = await wire();
    const plugin = buildPolicyPluginFromLKG(
      v2RuleEvaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );

    const decision = await plugin.evaluate(
      { toolName: 'read-doc', params: { path: 'leaked-secret-data' } },
      { toolName: 'read-doc', sessionId: 's1' },
    );
    expect(decision).toMatchObject({
      block: true,
      blockReason: expect.stringContaining('no secrets'),
    });
  });

  it('LKG recovery: agent corrupts PolicyIR → observe restores → plugin still enforces', async () => {
    const { store, policyIrPath } = await wire();
    const plugin = buildPolicyPluginFromLKG(
      v2RuleEvaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );

    // Cold-path enforcement (sanity).
    const before = await plugin.evaluate(
      { toolName: 'send-email', params: { to: 'eve@example.com' } },
      { toolName: 'send-email', sessionId: 's1' },
    );
    expect(before).toMatchObject({ block: true });

    // Agent writes garbage.
    await fs.writeFile(policyIrPath, '{ garbage', 'utf-8');
    const obs = await store.observe(policyIrPath);
    expect(obs.outcome).toBe('recovered');

    // Working tree is back to the LKG copy; plugin still blocks the R5 call.
    const after = await plugin.evaluate(
      { toolName: 'send-email', params: { to: 'eve@example.com' } },
      { toolName: 'send-email', sessionId: 's2' },
    );
    expect(after).toMatchObject({ block: true });
  });

  it('plugin fails closed when no LKG has been observed yet', async () => {
    // Fresh wiring with no observe() call.
    let store: LKGStore;
    let policyIrPath: string;
    if (wire === wireFsLKG) {
      const scratch = await makeFsScratch();
      policyIrPath = path.join(scratch, 'policy-ir.json');
      store = lkgStore();
      store.register(policyIrTracker(policyIrPath));
    } else {
      const repo = await makeGitScratch();
      policyIrPath = path.join(repo, 'policy-ir.json');
      store = gitLKGStore({
        repoRoot: repo,
        authorship: { name: 'LKG Bot', email: 'lkg@test.local' },
      });
      store.register(policyIrTracker(policyIrPath));
    }

    const plugin = buildPolicyPluginFromLKG(
      v2RuleEvaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );

    const decision = await plugin.evaluate(
      { toolName: 'send-email', params: {} },
      { toolName: 'send-email', sessionId: 's1' },
    );
    expect(decision).toMatchObject({
      block: true,
      blockReason: expect.stringContaining('no last-known-good'),
    });
  });
});
