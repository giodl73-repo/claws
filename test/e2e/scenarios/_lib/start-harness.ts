/**
 * test/e2e/scenarios/_lib/start-harness — scenario-driver façade.
 *
 * Composes the CP-5 harness primitives (fixture-copier, HostMock,
 * InProcessAdapter, LifecycleManager, SnapshotSwitch, AuditChainWriter) into a
 * single `startHarness` entry point that scenarios drive through a small
 * surface: `invokeTool`, `promote`, `getAuditChain`, `verifyAuditChain`,
 * `getCurrentSnapshotId`, `onSnapshotPromotedFanout`, `snap.*`, `shutdown`.
 *
 * Per pulse 45 key-constraints: scenarios never import host-mock, snap-runner,
 * companion-mock, or InProcessAdapter directly — they touch only
 * `startHarness` and `harness.*` methods. That boundary is what the plan H3
 * grep validation checks.
 *
 * Fixtures are documentation-only (SOUL.md / TOOLS.md / AGENTS.md describe
 * the intent); the actual decision logic for each scenario is encoded by
 * picking a scenario-specific provider registered into HostMock here.
 *
 * @module test/e2e/scenarios/_lib/start-harness
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuditChainReader,
  AuditChainWriter,
  HostMock,
  InProcessAdapter,
  LifecycleManager,
  SnapshotSwitch,
  buildHostContext,
  copyFixture,
  modifiedArgsHash as computeModifiedArgsHash,
  startSnap,
  verifyChain,
  type AuditChainEntry,
  type ApprovalEntry,
  type AuditSink,
  type DecisionEntry,
  type IncomingRequest,
  type JsonValue,
  type ProviderDecision,
  type SinkApprovalEntry,
  type SinkDecisionEntry,
  type SnapHandle,
  type VerifyChainResult,
} from '#harness';
import type { AuthorizationContext as AdapterAuthorizationContext } from '#harness/host-adapter-test-doubles.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(HERE, '..', '..', 'fixtures');

export type FixtureId =
  | 'allow-r1-public'
  | 'deny-soul-rule'
  | 'review-r5-restricted'
  | 'modify-arg-redaction';

export interface StartHarnessOptions {
  readonly fixture: FixtureId;
  /** If present, `harness.snap` boots a real `claws snap serve` child. */
  readonly track?: 'local-dir' | 'none';
  /** Scenario id tag used to namespace tmp dirs + audit-chain files. */
  readonly scenarioId?: string;
}

export interface InvokeResult {
  readonly status: 'allowed' | 'denied' | 'review-required' | 'modified';
  readonly action: 'allow' | 'deny' | 'review' | 'modify';
  readonly correlationId: string;
  readonly canonicalInvocationHash: string;
  readonly declaredTier: Tier;
  readonly effectiveTier: Tier;
  readonly modifiedArgs?: JsonValue;
  readonly originalArgsHash?: string;
  readonly modifiedArgsHash?: string;
  readonly approvalHandle?: string;
  readonly response: {
    readonly body: unknown;
    readonly headers: Readonly<Record<string, string>>;
  };
}

export interface Harness {
  /** Fixture copy root (tmp dir, cleaned on shutdown). */
  readonly policyDir: string;
  readonly snap: SnapHandle | null;
  invokeTool(tool: string, args: JsonValue): Promise<InvokeResult>;
  promote(snapshotId: string): Promise<void>;
  getCurrentSnapshotId(): string | null;
  onSnapshotPromotedFanout(): readonly string[];
  getAuditChain(): readonly AuditChainEntry[];
  verifyAuditChain(): VerifyChainResult;
  shutdown(): Promise<void>;
}

type Tier = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

interface FixtureProfile {
  readonly tool: string;
  readonly declaredTier: Tier;
  readonly effectiveTier: Tier;
  readonly decide: (
    args: JsonValue,
  ) => ProviderDecision & {
    readonly audit: 'allow' | 'deny' | 'review' | 'modify';
  };
  readonly defaultArgs: JsonValue;
  /** Correlation of audit `decision` field to merger action. */
  readonly auditActionFor?: (
    merged: 'allow' | 'deny' | 'review' | 'modify',
  ) => 'allow' | 'deny' | 'review' | 'modify';
}

const PROFILES: Readonly<Record<FixtureId, FixtureProfile>> = {
  'allow-r1-public': {
    tool: 'r1-public-read',
    declaredTier: 'R1',
    effectiveTier: 'R1',
    defaultArgs: { path: 'public/doc.txt' },
    decide: (_args): ProviderDecision & { audit: 'allow' } => ({
      action: 'allow',
      audit: 'allow',
    }),
  },
  'deny-soul-rule': {
    tool: 'outbound.post',
    declaredTier: 'R3',
    effectiveTier: 'R3',
    defaultArgs: {
      url: 'https://example.test/ingest',
      apiKey: 'sk-fixture-value',
    },
    decide: (_args): ProviderDecision & { audit: 'deny' } => ({
      action: 'deny',
      reason: 'prohibit-secrets-exfil',
      audit: 'deny',
    }),
  },
  'review-r5-restricted': {
    tool: 'fleet-db.query',
    declaredTier: 'R5',
    effectiveTier: 'R5',
    defaultArgs: { sql: 'SELECT id FROM fleet_units LIMIT 1' },
    decide: (_args): ProviderDecision & { audit: 'review' } => ({
      action: 'review',
      reason: 'r5-restricted-dataset',
      requireApproval: true,
      audit: 'review',
    }),
  },
  'modify-arg-redaction': {
    tool: 'notes.store',
    declaredTier: 'R2',
    effectiveTier: 'R2',
    defaultArgs: {
      title: 'weekly sync',
      body: 'Ping alice@example.test and bob@example.test for Friday.',
    },
    decide: (args): ProviderDecision & { audit: 'modify' } => {
      const next = redactEmails(args);
      return {
        action: 'modify',
        modifiedArgs: next,
        audit: 'modify',
      };
    },
  },
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function redactEmails(value: JsonValue): JsonValue {
  if (typeof value === 'string') {
    return value.replace(EMAIL_RE, '[REDACTED-EMAIL]');
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactEmails(v));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactEmails(v);
    }
    return out;
  }
  return value;
}

/**
 * Compose an `AuditSink` view over the `AuditChainWriter`. The writer persists
 * entries to a JSONL file; the shim here adapts the SinkDecisionEntry /
 * SinkApprovalEntry shape expected by `buildHostContext` into the chain writer
 * input shape. Providers only see the `AuditSink` surface on HostContext; the
 * scenario driver uses the writer directly for promote / approval emissions.
 */
function sinkOverWriter(
  writer: AuditChainWriter,
  adapterId: string,
  sinkId: string,
  policyArtifactSha256: string,
  snapshotId: () => string,
  tool: () => string,
  tierInfo: () => { declared: Tier; effective: Tier },
  clock: () => number,
): AuditSink {
  let hostSeq = 0;
  let prevHostHash = 'sha256:' + '0'.repeat(64);
  return {
    async writeDecision(entry): Promise<SinkDecisionEntry> {
      const tiers = tierInfo();
      const chainEntry = writer.appendDecision({
        correlationId: entry.correlationId,
        snapshotId: snapshotId(),
        policyArtifactSha256,
        tool: tool(),
        decision: entry.action,
        declaredTier: tiers.declared,
        effectiveTier: tiers.effective,
      });
      hostSeq += 1;
      const result: SinkDecisionEntry = {
        kind: 'decision',
        sinkId,
        sequence: hostSeq,
        prevHash: prevHostHash,
        entryHash: chainEntry.hash,
        emittedAt: clock(),
        adapterId: entry.adapterId,
        correlationId: entry.correlationId,
        canonicalInvocationHash: entry.canonicalInvocationHash,
        action: entry.action,
      };
      prevHostHash = chainEntry.hash;
      return result;
    },
    async writeApproval(entry): Promise<SinkApprovalEntry> {
      const chainEntry = writer.appendApproval({
        correlationId: entry.correlationId,
        approver: entry.approverPrincipal,
        outcome: entry.outcome === 'approved' ? 'approve' : 'deny',
        ttl: 300_000,
        nonce: '0'.repeat(24),
        keyId: `${sinkId}-key`,
        sequenceNumber: hostSeq + 1,
        signature: 'sha256:' + '0'.repeat(64),
      });
      hostSeq += 1;
      const result: SinkApprovalEntry = {
        kind: 'approval',
        sinkId,
        sequence: hostSeq,
        prevHash: prevHostHash,
        entryHash: chainEntry.hash,
        emittedAt: clock(),
        adapterId: entry.adapterId,
        correlationId: entry.correlationId,
        approverPrincipal: entry.approverPrincipal,
        outcome: entry.outcome,
      };
      prevHostHash = chainEntry.hash;
      return result;
    },
  };
}

export async function startHarness(
  opts: StartHarnessOptions,
): Promise<Harness> {
  const profile = PROFILES[opts.fixture];
  const scenarioId = opts.scenarioId ?? opts.fixture;

  // --- fixture copy + tmp root -------------------------------------------
  // copyFixture takes (source, scenarioId) and returns the dest tmp path.
  const policyDir = await copyFixture(
    join(FIXTURES_ROOT, opts.fixture),
    scenarioId,
  );
  const rootTmp = mkdtempSync(join(tmpdir(), `harness-${scenarioId}-aux-`));
  const auditPath = join(rootTmp, 'audit.jsonl');

  // --- clock, chain writer, adapter -------------------------------------
  let tick = 1_700_000_000_000;
  const clock = (): number => tick++;

  const adapter = new InProcessAdapter({
    adapterId: 'in-process',
    policyDir,
    clock,
  });

  // Chain state and scenario-facing audit writer.
  const writer = new AuditChainWriter({ filePath: auditPath, clock });

  // Emit a ProducerEntry first so every DecisionEntry the scenario writes
  // has a matching producer (invariant 3 of verifyChain).
  const policyArtifactSha256 =
    'sha256:' +
    'b'.repeat(63) +
    scenarioId.slice(0, 1);
  writer.appendProducer({
    policyArtifactSha256,
    generatedAt: new Date(clock()).toISOString(),
    scope: '@bic/openclaw',
    producerVersion: 'harness-test-v1',
  });

  let currentSnapshotId: string | null = 'snap-001';

  // --- host-mock provider -------------------------------------------------
  const host = new HostMock();
  host.registerProvider({
    id: `provider-${opts.fixture}`,
    hooks: {
      beforeToolCall: (_ctx, args) => {
        const decision = profile.decide(args);
        // strip the audit-only 'audit' tag before returning to HostMock
        const { audit: _audit, ...rest } = decision;
        void _audit;
        return rest as ProviderDecision;
      },
      onSnapshotPromoted: (): Promise<void> => Promise.resolve(),
    },
  });

  // --- lifecycle + snapshot switch ---------------------------------------
  const lifecycle = new LifecycleManager();
  const providerLifecycle = {
    id: `provider-${opts.fixture}`,
    onSnapshotPromoted: async (): Promise<void> => {
      lastPromotedFanout.push(`provider-${opts.fixture}`);
    },
  };
  const lastPromotedFanout: string[] = [];
  lifecycle.register(providerLifecycle);

  const switchSink = {
    async writeDrainWindow(e: {
      readonly from: string | null;
      readonly to: string;
      readonly inflightCount: number;
      readonly openedAt: number;
      readonly closedAt: number;
      readonly outcome: 'drained' | 'timed-out';
    }): Promise<ReturnType<AuditChainWriter['appendDrainWindow']>> {
      return writer.appendDrainWindow(e);
    },
    async writeOnSnapshotPromotedTimeout(e: {
      readonly providerId: string;
      readonly from: string | null;
      readonly snapshotId: string;
      readonly timeoutMs: number;
      readonly reason: 'hook-threw' | 'hook-hung';
      readonly errorMessage?: string;
    }): Promise<ReturnType<AuditChainWriter['appendOnSnapshotPromotedTimeout']>> {
      return writer.appendOnSnapshotPromotedTimeout(e);
    },
  };

  const snapshotSwitch = new SnapshotSwitch({
    lifecycle,
    auditSink: switchSink,
    clock,
    commit: (to): void => {
      currentSnapshotId = to;
    },
    currentId: (): string | null => currentSnapshotId,
  });

  // --- host-context (init providers) -------------------------------------
  const auditSink = sinkOverWriter(
    writer,
    adapter.adapterId,
    `${adapter.adapterId}-sink`,
    policyArtifactSha256,
    () => currentSnapshotId ?? 'snap-001',
    () => profile.tool,
    () => ({
      declared: profile.declaredTier,
      effective: profile.effectiveTier,
    }),
    clock,
  );

  const { context } = buildHostContext({
    adapter,
    auditSink,
    signingKey: {
      keyId: `${scenarioId}-key`,
      key: Buffer.alloc(32),
    },
    clock,
  });
  await lifecycle.init(providerLifecycle, context);

  // --- optional snap child (SC-06) ---------------------------------------
  let snap: SnapHandle | null = null;
  if (opts.track === 'local-dir') {
    snap = await startSnap({ policyDir });
  }

  // --- scenario surface ---------------------------------------------------
  async function invokeTool(
    tool: string,
    args: JsonValue,
  ): Promise<InvokeResult> {
    const incoming: IncomingRequest = {
      tool,
      args,
      headers: {},
      snapshotId: currentSnapshotId ?? 'snap-001',
      rawPrincipal: 'test-user',
    };
    const ctx: AdapterAuthorizationContext = await adapter.extractIdentity(
      incoming,
    );
    await adapter.routePolicy(ctx);

    const merged = await host.beforeToolCall({
      tool,
      args,
      snapshotId: ctx.canonicalInvocationHash.slice(0, 12),
      principal: ctx.callerPrincipal,
    });

    const originalArgsHash = computeModifiedArgsHash(args);
    const modifiedArgs = merged.modifiedArgs;
    const modArgsHash =
      modifiedArgs !== undefined
        ? computeModifiedArgsHash(modifiedArgs)
        : undefined;

    // --- write DecisionEntry via AuditSink (ApprovalSink shape) ---------
    await adapter.getApprovalSink(ctx).writeDecision({
      adapterId: adapter.adapterId,
      correlationId: ctx.correlationId,
      canonicalInvocationHash: ctx.canonicalInvocationHash,
      action: merged.action,
    });

    // The AuditChainWriter-backed AuditSink is what persists the chain
    // entry. writeDecision on the adapter is the sink-conformance seam;
    // writeDecision on AuditSink is the hash-chain seam. Both fire per
    // decision so scenarios can read the chain back.
    const declared = profile.declaredTier;
    const effective = profile.effectiveTier;
    const decisionEntry = writer.appendDecision({
      correlationId: ctx.correlationId,
      snapshotId: currentSnapshotId ?? 'snap-001',
      policyArtifactSha256,
      tool,
      decision: merged.action,
      declaredTier: declared,
      effectiveTier: effective,
      ...(modArgsHash !== undefined ? { modifiedArgsHash: modArgsHash } : {}),
    });

    let approvalHandle: string | undefined;
    if (merged.action === 'review') {
      // Companion approves; emit ApprovalEntry linked by correlationId.
      approvalHandle = `handle:${ctx.correlationId}`;
      writer.appendApproval({
        correlationId: ctx.correlationId,
        approver: 'companion-test',
        outcome: 'approve',
        ttl: 300_000,
        nonce: 'n'.repeat(24),
        keyId: `${scenarioId}-key`,
        sequenceNumber: decisionEntry.seq + 1,
        signature: 'sha256:' + 'a'.repeat(64),
      });
    }

    const response = await adapter.shapeResponse(
      {
        action: merged.action,
        requireApproval: merged.requireApproval,
        ...(merged.modifiedArgs !== undefined
          ? { modifiedArgs: merged.modifiedArgs }
          : {}),
      },
      ctx,
    );

    return {
      status: response.status,
      action: merged.action,
      correlationId: ctx.correlationId,
      canonicalInvocationHash: ctx.canonicalInvocationHash,
      declaredTier: declared,
      effectiveTier: effective,
      ...(modifiedArgs !== undefined ? { modifiedArgs } : {}),
      originalArgsHash,
      ...(modArgsHash !== undefined ? { modifiedArgsHash: modArgsHash } : {}),
      ...(approvalHandle !== undefined ? { approvalHandle } : {}),
      response: { body: response.body, headers: response.headers },
    };
  }

  async function promote(snapshotId: string): Promise<void> {
    await snapshotSwitch.promote(snapshotId);
  }

  function getAuditChain(): readonly AuditChainEntry[] {
    const reader = new AuditChainReader({ filePath: auditPath });
    return reader.all();
  }

  function verifyAuditChain(): VerifyChainResult {
    return verifyChain(getAuditChain());
  }

  async function shutdown(): Promise<void> {
    if (snap !== null) {
      try {
        await snap.kill();
      } catch {
        // best-effort teardown
      }
    }
    for (const dir of [rootTmp, policyDir]) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort teardown
      }
    }
  }

  return {
    policyDir,
    snap,
    invokeTool,
    promote,
    getCurrentSnapshotId: (): string | null => currentSnapshotId,
    onSnapshotPromotedFanout: (): readonly string[] => lastPromotedFanout,
    getAuditChain,
    verifyAuditChain,
    shutdown,
  };
}

// Re-export DecisionEntry / ApprovalEntry narrowers for scenario assertions.
export type { AuditChainEntry, DecisionEntry, ApprovalEntry, VerifyChainResult };
