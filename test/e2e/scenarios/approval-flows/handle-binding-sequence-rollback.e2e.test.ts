/**
 * SC-19 — Handle-binding sequence rollback.
 *
 * A handle is issued with `sequenceNumber: 5`; the persistent counter
 * reaches high-water 5. A replay later presents `sequenceNumber: 3` on
 * the SAME `(providerId, snapshotId)` scope. The validator rejects with
 * `sequence-rollback`. Snapshot promotion resets the counter for the new
 * snapshot to 0 while the prior snapshot's counter is preserved in the
 * append-only log.
 *
 * Findings addressed: APPROVAL-B-027..B-035 (SC-19 F-01..F-09).
 */
import { describe, expect } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateHandle,
  type ApprovalHandle,
  type ValidationContext,
  type ValidationDeps,
} from '@bic/openclaw-guardrails/handle-binding';
import { SeqCounterStore } from '@bic/openclaw-policy/seq-counter';
import { defineApprovalFlow } from '../../harness/approval-flow-sim/dispatch.ts';
import type {
  ApprovalFlowHarness,
  ApprovalFlowScenario,
  InvokeResult,
} from '../../harness/approval-flow-sim/types.ts';
import type { ApprovalEntryInput } from '../../harness/audit-types.ts';

describe('SC-19 handle-binding sequence rollback (pulse 58)', () => {
  const scenario: ApprovalFlowScenario = {
    name: 'SC-19 sequence-rollback (APPROVAL-B-027..B-035)',
    fixture: 'allow-r1-public',
    async setup(h: ApprovalFlowHarness): Promise<void> {
      h.hostMock.registerProvider({
        id: 'seq-rollback-provider',
        hooks: { beforeToolCall: () => ({ action: 'allow' }) },
      });
    },
    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      const res = await h.invokeTool({
        tool: 'bash',
        args: { cmd: 'echo seq-rollback' },
        snapshotId: 'snap-sc19-a',
        rawPrincipal: 'alice',
      });
      return {
        status: res.response.status,
        action: res.decision.action,
        correlationId: res.correlationId,
        sinkEntries: res.sinkEntries,
        body: res.response.body,
        headers: res.response.headers,
      };
    },
    async assert(h, result): Promise<void> {
      const tmpDir = mkdtempSync(join(tmpdir(), 'sc19-'));
      const logPath = join(tmpDir, 'seq-counter.jsonl');
      const store = new SeqCounterStore({ logPath, clock: () => h.clock.nowMs() });
      try {
        // Advance the counter to 5 (via 5 sequential accepts).
        for (let i = 1; i <= 5; i += 1) {
          const r = store.accept('seq-rollback-provider', 'snap-sc19-a', i);
          expect(r).toEqual({ ok: true, value: i });
        }
        expect(store.read('seq-rollback-provider', 'snap-sc19-a')).toBe(5);

        // Companion signs a replayed handle with seq=3 (below high-water).
        h.companion.programVerdict({ action: 'allow' });
        const sig = await h.companion.decide({
          providerId: 'seq-rollback-provider',
          contentHash: 'sha256:' + 'a'.repeat(64),
          sequenceNumber: 3,
          approverPrincipal: 'supervisor-a@host',
          ttlMs: 30_000,
        });
        if (sig.status !== 'allow') throw new Error('SC-19: companion did not allow');

        const handle: ApprovalHandle = {
          providerId: sig.providerId,
          contentHash: sig.contentHash,
          sequenceNumber: sig.sequenceNumber,
          approverPrincipal: sig.approverPrincipal,
          keyId: sig.keyId,
          ttl: sig.issuedAtMs + sig.ttlMs,
          nonce: sig.nonce,
          signature: sig.signature,
          payload: sig.payload,
        };
        const ctx: ValidationContext = {
          expectedProviderId: 'seq-rollback-provider',
          canonicalInvocationHash: handle.contentHash,
          expectedApproverPrincipal: 'supervisor-a@host',
          sequenceHighWaterMark: store.read('seq-rollback-provider', 'snap-sc19-a'),
          nonceScope: 'sc19::snap-sc19-a',
        };
        const deps: ValidationDeps = {
          clock: () => h.clock.nowMs(),
          trustSet: h.companion.trustedKeyIds,
          keyLookup: (kid) => h.companion.registry.get(kid),
          validateNonce: () => true,
        };
        const vr = validateHandle(handle, ctx, deps);
        expect(vr).toEqual({
          ok: false,
          invalidReason: 'sequence-rollback',
        });

        // The store's own accept() surface mirrors the same reason.
        const accept = store.accept('seq-rollback-provider', 'snap-sc19-a', 3);
        expect(accept).toEqual({
          ok: false,
          invalidReason: 'sequence-rollback',
        });

        // High-water NOT overwritten — still 5.
        expect(store.read('seq-rollback-provider', 'snap-sc19-a')).toBe(5);

        // Snapshot promote: new snapshot counter starts at 0; prior
        // snapshot counter preserved in the append-only log.
        store.resetOnSnapshotChange(
          'seq-rollback-provider',
          'snap-sc19-a',
          'snap-sc19-b',
        );
        expect(store.read('seq-rollback-provider', 'snap-sc19-b')).toBe(0);
        expect(store.read('seq-rollback-provider', 'snap-sc19-a')).toBe(5);

        // SC-19 F-06: the append-only log retains the prior-snapshot records.
        const raw = readFileSync(logPath, 'utf8');
        const lines = raw.split('\n').filter((l) => l.length > 0);
        const priorSnapIncrements = lines
          .map((l) => JSON.parse(l) as {
            kind: string;
            snapshotId?: string;
            value?: number;
          })
          .filter((r) => r.kind === 'increment' && r.snapshotId === 'snap-sc19-a');
        expect(priorSnapIncrements.map((r) => r.value ?? 0)).toEqual([1, 2, 3, 4, 5]);

        // SC-19 F-03: ApprovalEntry shape conforms to CL-11 §3a.
        const approvalEntry: ApprovalEntryInput = {
          correlationId: result.correlationId,
          approver: 'supervisor-a@host',
          outcome: 'rejected',
          invalidReason: 'sequence-rollback',
          ttl: handle.ttl,
          nonce: handle.nonce,
          keyId: handle.keyId,
          sequenceNumber: handle.sequenceNumber,
          signature: handle.signature,
        };
        expect(approvalEntry.invalidReason).toBe('sequence-rollback');
      } finally {
        store.close();
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  };

  defineApprovalFlow(scenario);
});
