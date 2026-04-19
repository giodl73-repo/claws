/**
 * Default-export interface contracts (4 L0 unit tests per pulse 48).
 *
 * Verifies the 5 supporting types + peer interfaces + ShellExecProvider
 * reference impl are importable from the root specifier and behave as
 * documented in guardrails.md. These tests are type-level + runtime
 * smoke-level so `@bic/openclaw-guardrails` consumers (Gateway, CAP) can
 * rely on the default export as the seam for plugin compilation.
 */

import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  ShellExecProvider,
} from '../src/index.js';
import type {
  AgentIdentity,
  AuditEntrySummary,
  AuditSink,
  AuthorizationDecision,
  FileIngestEvent,
  FileIngestProvider,
  GuardrailProvider,
  HandleBinding,
  HostContext,
  IdentityBridge,
  IngestDecision,
  Logger,
  ProviderLifecycle,
  RiskLevel,
  Sensitivity,
  SnapshotMeta,
  ToolCallEvent,
} from '../src/index.js';

describe('default export — 5 supporting types + interfaces (4 L0)', () => {
  test('5 supporting types are structurally valid values (gateway-eng M1)', () => {
    // 1. AuditSink
    const sink: AuditSink = {
      append: async (e: AuditEntrySummary) => ({ entryHash: `h:${e.action}` }),
      verify: async () => ({ valid: true }),
    };
    expect(typeof sink.append).toBe('function');

    // 2. IdentityBridge
    const bridge: IdentityBridge = {
      verify: async (): Promise<AgentIdentity> => ({
        agentId: 'a', tenantId: 't', principal: 'p', claims: {},
      }),
      exchange: async () => 'obo-token',
      revoke: async () => undefined,
    };
    expect(typeof bridge.verify).toBe('function');

    // 3. HandleBinding
    const binding: HandleBinding = {
      providerId: 'p', contentHash: 'c', sequenceNumber: 1,
      approverPrincipal: 'u', keyId: 'k', ttlSeconds: 60, nonce: 'n',
    };
    expect(binding.providerId).toBe('p');

    // 4. SnapshotMeta
    const meta: SnapshotMeta = {
      id: 's1', policyIrPath: 'oc://snap/1',
      promotedAt: '2026-04-18T00:00:00Z', promotedBy: 'u',
    };
    expect(meta.id).toBe('s1');

    // 5. Logger
    const logs: string[] = [];
    const logger: Logger = {
      debug: (m) => logs.push(`debug:${m}`),
      info: (m) => logs.push(`info:${m}`),
      warn: (m) => logs.push(`warn:${m}`),
      error: (m) => logs.push(`error:${m}`),
    };
    logger.info('hello');
    expect(logs).toEqual(['info:hello']);
  });

  test('HostContext + ProviderLifecycle compose into a wired provider', async () => {
    const sink: AuditSink = {
      append: async () => ({ entryHash: '00' }),
      verify: async () => ({ valid: true }),
    };
    const bridge: IdentityBridge = {
      verify: async () => ({ agentId: 'a', tenantId: 't', principal: 'p', claims: {} }),
      exchange: async () => 'obo',
      revoke: async () => undefined,
    };
    const logger: Logger = {
      debug: () => undefined, info: () => undefined,
      warn: () => undefined, error: () => undefined,
    };
    const ctx: HostContext = {
      auditSink: sink,
      identityBridge: bridge,
      approvalHandleSigner: async (_b: HandleBinding) => 'signed-handle',
      snapshot: null,
      stageMode: 'off',
      logger,
    };
    let initCalled = false;
    let lastMode: 'on' | 'off' | null = null;

    class TestProvider implements GuardrailProvider, ProviderLifecycle {
      readonly name = 'test';
      async init(c: HostContext) { initCalled = c === ctx; }
      async onStageModeChanged(next: 'on' | 'off') { lastMode = next; }
      async preAuthorize(_e: ToolCallEvent): Promise<AuthorizationDecision> {
        return { decision: 'allow', riskLevel: 1 };
      }
      async postAudit() { /* noop */ }
      getCapabilities() {
        return {
          description: 'test', version: '0.0.1',
          riskClassification: true, auditTrail: false,
          externalApproval: false, argumentModification: false,
        };
      }
    }

    const p = new TestProvider();
    await p.init(ctx);
    await p.onStageModeChanged('on');
    expect(initCalled).toBe(true);
    expect(lastMode).toBe('on');

    const decision = await p.preAuthorize({
      server: 's', tool: 't', context: { conversationId: 'c1' },
    });
    expect(decision.decision).toBe('allow');
    if (decision.decision === 'allow') {
      expect(decision.riskLevel).toBe(1);
    }
  });

  test('FileIngestProvider + IngestDecision + Sensitivity + RiskLevel shape check', async () => {
    class IngestImpl implements FileIngestProvider {
      readonly name = 'ingest';
      async beforeIngest(_e: FileIngestEvent): Promise<IngestDecision> {
        return { decision: 'allow', sensitivity: 'CONFIDENTIAL' satisfies Sensitivity };
      }
      async afterIngest() { /* noop */ }
      getCapabilities() {
        return {
          description: 'ingest', version: '0.0.1',
          sensitivityLabeling: true, contentModification: false, externalApproval: false,
        };
      }
    }
    const p = new IngestImpl();
    const decision = await p.beforeIngest({
      path: '/tmp/x', contentHash: 'sha256-aaa', byteLength: 4,
      context: { conversationId: 'c1' },
    });
    expect(decision.decision).toBe('allow');
    if (decision.decision === 'allow') {
      expect(decision.sensitivity).toBe('CONFIDENTIAL');
    }
    const risks: RiskLevel[] = [0, 1, 2, 3, 4, 5];
    expect(risks).toContain(5);
  });

  test('ShellExecProvider reference impl reads exec-approvals.json and fails closed on unknown tools', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gr-'));
    const file = join(dir, 'exec-approvals.json');
    writeFileSync(file, JSON.stringify({
      tools: [
        { tool_name: 'known-safe', requires_approval: false },
        { tool_name: 'known-gated', requires_approval: true },
      ],
    }));

    const p = new ShellExecProvider(file);
    expect(p.name).toBe('exec-approvals');

    const safe = await p.preAuthorize({
      server: 'x', tool: 'known-safe', context: { conversationId: 'c' },
    });
    expect(safe.decision).toBe('allow');
    if (safe.decision === 'allow') expect(safe.requiresExternalApproval).toBe(false);

    const gated = await p.preAuthorize({
      server: 'x', tool: 'known-gated', context: { conversationId: 'c' },
    });
    if (gated.decision === 'allow') expect(gated.requiresExternalApproval).toBe(true);

    const unknown = await p.preAuthorize({
      server: 'x', tool: 'mystery', context: { conversationId: 'c' },
    });
    // fail-closed: external approval required, R5
    if (unknown.decision === 'allow') {
      expect(unknown.requiresExternalApproval).toBe(true);
      expect(unknown.riskLevel).toBe(5);
    }

    // postAudit is a no-op for exec-approvals (reference impl)
    await expect(p.postAudit(
      { server: 'x', tool: 'known-safe', context: { conversationId: 'c' } },
      safe,
    )).resolves.toBeUndefined();

    const caps = p.getCapabilities();
    expect(caps.externalApproval).toBe(true);
    expect(caps.auditTrail).toBe(false);

    // fromMap construction path
    const p2 = ShellExecProvider.fromMap(new Map([['t', false]]));
    expect(p2.name).toBe('exec-approvals');
  });
});
