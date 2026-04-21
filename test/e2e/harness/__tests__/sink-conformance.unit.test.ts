import { describe, it, expect } from 'vitest';
import {
  InProcessAdapter,
  StubFailingAdapter,
  type ApprovalSink,
  type SinkEntry,
  type AuditFilter,
} from '#harness/host-adapter-test-doubles.ts';
import { runSinkConformance } from '#harness/sink-conformance.ts';

describe('runSinkConformance (CL-11 §3a)', () => {
  it('passes against the InProcessAdapter sink', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/p', adapterId: 'conf-a' });
    const ctx = await adapter.extractIdentity({
      tool: 't',
      args: {},
      headers: {},
      snapshotId: 's',
      rawPrincipal: 'u',
    });
    await expect(runSinkConformance(adapter.getApprovalSink(ctx))).resolves.toBeUndefined();
  });

  it('passes against the StubFailingAdapter default sink', async () => {
    const adapter = new StubFailingAdapter({ adapterId: 'conf-b' });
    const ctx = await adapter.extractIdentity({
      tool: 't',
      args: {},
      headers: {},
      snapshotId: 's',
      rawPrincipal: 'u',
    });
    await expect(runSinkConformance(adapter.getApprovalSink(ctx))).resolves.toBeUndefined();
  });

  it('rejects a sink with empty sinkId', async () => {
    const bad: ApprovalSink = {
      sinkId: '',
      writeDecision: async () => { throw new Error('unreached'); },
      writeApproval: async () => { throw new Error('unreached'); },
      query: async function* () {},
      flush: async () => {},
    };
    await expect(runSinkConformance(bad)).rejects.toThrow(/sinkId/);
  });

  it('rejects a sink that breaks the hash chain', async () => {
    const entries: SinkEntry[] = [];
    let seq = 0;
    const bad: ApprovalSink = {
      sinkId: 'broken-chain',
      writeDecision: async (e) => {
        seq += 1;
        // Deliberate chain break: prevHash always set to zero regardless of prior entry.
        const full = {
          kind: 'decision' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          canonicalInvocationHash: e.canonicalInvocationHash,
          action: e.action,
          sinkId: 'broken-chain',
          sequence: seq,
          prevHash: 'sha256:' + '0'.repeat(64),
          entryHash: 'sha256:' + 'a'.repeat(64),
          emittedAt: seq,
        };
        entries.push(full);
        return full;
      },
      writeApproval: async (e) => {
        seq += 1;
        const full = {
          kind: 'approval' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          approverPrincipal: e.approverPrincipal,
          outcome: e.outcome,
          sinkId: 'broken-chain',
          sequence: seq,
          prevHash: 'sha256:' + '0'.repeat(64),
          entryHash: 'sha256:' + 'b'.repeat(64),
          emittedAt: seq,
        };
        entries.push(full);
        return full;
      },
      query: async function* (f: AuditFilter) {
        for (const e of entries) {
          if (f.correlationId !== undefined && e.correlationId !== f.correlationId) continue;
          yield e;
        }
      },
      flush: async () => {},
    };
    await expect(runSinkConformance(bad)).rejects.toThrow(/hash-chain break/);
  });

  it('rejects a sink that returns an entryHash without sha256: prefix', async () => {
    const entries: SinkEntry[] = [];
    let seq = 0;
    let prev = 'sha256:' + '0'.repeat(64);
    const bad: ApprovalSink = {
      sinkId: 'bad-hash',
      writeDecision: async (e) => {
        seq += 1;
        const hash = 'md5:' + 'a'.repeat(32); // WRONG prefix
        const full = {
          kind: 'decision' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          canonicalInvocationHash: e.canonicalInvocationHash,
          action: e.action,
          sinkId: 'bad-hash',
          sequence: seq,
          prevHash: prev,
          entryHash: hash,
          emittedAt: seq,
        };
        prev = hash;
        entries.push(full);
        return full;
      },
      writeApproval: async (e) => {
        seq += 1;
        const hash = 'md5:' + 'b'.repeat(32);
        const full = {
          kind: 'approval' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          approverPrincipal: e.approverPrincipal,
          outcome: e.outcome,
          sinkId: 'bad-hash',
          sequence: seq,
          prevHash: prev,
          entryHash: hash,
          emittedAt: seq,
        };
        prev = hash;
        entries.push(full);
        return full;
      },
      query: async function* () {
        for (const e of entries) yield e;
      },
      flush: async () => {},
    };
    await expect(runSinkConformance(bad)).rejects.toThrow(/sha256-prefixed/);
  });

  it('rejects a sink whose query() returns too few entries for the correlationId', async () => {
    let seq = 0;
    let prev = 'sha256:' + '0'.repeat(64);
    const entries: SinkEntry[] = [];
    const bad: ApprovalSink = {
      sinkId: 'short-query',
      writeDecision: async (e) => {
        seq += 1;
        const entryHash = 'sha256:' + seq.toString().padStart(64, '0');
        const full = {
          kind: 'decision' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          canonicalInvocationHash: e.canonicalInvocationHash,
          action: e.action,
          sinkId: 'short-query',
          sequence: seq,
          prevHash: prev,
          entryHash,
          emittedAt: seq,
        };
        prev = entryHash;
        entries.push(full);
        return full;
      },
      writeApproval: async (e) => {
        seq += 1;
        const entryHash = 'sha256:' + seq.toString().padStart(64, '0');
        const full = {
          kind: 'approval' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          approverPrincipal: e.approverPrincipal,
          outcome: e.outcome,
          sinkId: 'short-query',
          sequence: seq,
          prevHash: prev,
          entryHash,
          emittedAt: seq,
        };
        prev = entryHash;
        entries.push(full);
        return full;
      },
      query: async function* () {
        // Broken: yield only the first entry regardless of filter
        if (entries[0]) yield entries[0];
      },
      flush: async () => {},
    };
    await expect(runSinkConformance(bad)).rejects.toThrow(/expected 3 entries/);
  });

  it('rejects a sink whose query() returns foreign correlationId', async () => {
    let seq = 0;
    let prev = 'sha256:' + '0'.repeat(64);
    const entries: SinkEntry[] = [];
    const bad: ApprovalSink = {
      sinkId: 'foreign-corr',
      writeDecision: async (e) => {
        seq += 1;
        const entryHash = 'sha256:' + seq.toString().padStart(64, 'a');
        const full = {
          kind: 'decision' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          canonicalInvocationHash: e.canonicalInvocationHash,
          action: e.action,
          sinkId: 'foreign-corr',
          sequence: seq,
          prevHash: prev,
          entryHash,
          emittedAt: seq,
        };
        prev = entryHash;
        entries.push(full);
        return full;
      },
      writeApproval: async (e) => {
        seq += 1;
        const entryHash = 'sha256:' + seq.toString().padStart(64, 'b');
        const full = {
          kind: 'approval' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          approverPrincipal: e.approverPrincipal,
          outcome: e.outcome,
          sinkId: 'foreign-corr',
          sequence: seq,
          prevHash: prev,
          entryHash,
          emittedAt: seq,
        };
        prev = entryHash;
        entries.push(full);
        return full;
      },
      query: async function* () {
        // Broken: always yield 3 entries but corrupt the last one's correlationId.
        const list = entries.slice(0, 3);
        for (let i = 0; i < list.length; i++) {
          const e = list[i]!;
          if (i === 2) {
            yield { ...e, correlationId: 'FOREIGN' };
          } else {
            yield e;
          }
        }
      },
      flush: async () => {},
    };
    await expect(runSinkConformance(bad)).rejects.toThrow(/foreign correlationId/);
  });

  it('rejects a sink whose query() drops one of the two approvals for correlationA', async () => {
    let seq = 0;
    let prev = 'sha256:' + '0'.repeat(64);
    const entries: SinkEntry[] = [];
    let approvalsSeen = 0;
    const bad: ApprovalSink = {
      sinkId: 'drop-approval',
      writeDecision: async (e) => {
        seq += 1;
        const entryHash = 'sha256:' + seq.toString().padStart(64, 'c');
        const full = {
          kind: 'decision' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          canonicalInvocationHash: e.canonicalInvocationHash,
          action: e.action,
          sinkId: 'drop-approval',
          sequence: seq,
          prevHash: prev,
          entryHash,
          emittedAt: seq,
        };
        prev = entryHash;
        entries.push(full);
        return full;
      },
      writeApproval: async (e) => {
        seq += 1;
        const entryHash = 'sha256:' + seq.toString().padStart(64, 'd');
        const full = {
          kind: 'approval' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          approverPrincipal: e.approverPrincipal,
          outcome: e.outcome,
          sinkId: 'drop-approval',
          sequence: seq,
          prevHash: prev,
          entryHash,
          emittedAt: seq,
        };
        prev = entryHash;
        entries.push(full);
        return full;
      },
      query: async function* (f) {
        // Yield 3 entries total for correlationA, but swap the second approval
        // to become a decision so approvalsA.length !== 2.
        if (f.correlationId === undefined) return;
        let out = 0;
        for (const e of entries) {
          if (e.correlationId !== f.correlationId) continue;
          if (out >= 3) break;
          if (e.kind === 'approval') {
            approvalsSeen += 1;
            if (approvalsSeen === 2) {
              // corrupt: yield as decision instead
              yield {
                kind: 'decision',
                adapterId: e.adapterId,
                correlationId: e.correlationId,
                canonicalInvocationHash: 'sha256:' + '0'.repeat(64),
                action: 'allow',
                sinkId: e.sinkId,
                sequence: e.sequence,
                prevHash: e.prevHash,
                entryHash: e.entryHash,
                emittedAt: e.emittedAt,
              };
              out += 1;
              continue;
            }
          }
          yield e;
          out += 1;
        }
      },
      flush: async () => {},
    };
    await expect(runSinkConformance(bad)).rejects.toThrow(/expected 2 approvals/);
  });

  it('rejects a sink whose idempotent-approval outcome mismatches', async () => {
    let seq = 0;
    let prev = 'sha256:' + '0'.repeat(64);
    const entries: SinkEntry[] = [];
    let approvalsWritten = 0;
    const bad: ApprovalSink = {
      sinkId: 'outcome-mismatch',
      writeDecision: async (e) => {
        seq += 1;
        const entryHash = 'sha256:' + seq.toString().padStart(64, 'e');
        const full = {
          kind: 'decision' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          canonicalInvocationHash: e.canonicalInvocationHash,
          action: e.action,
          sinkId: 'outcome-mismatch',
          sequence: seq,
          prevHash: prev,
          entryHash,
          emittedAt: seq,
        };
        prev = entryHash;
        entries.push(full);
        return full;
      },
      writeApproval: async (e) => {
        approvalsWritten += 1;
        seq += 1;
        const entryHash = 'sha256:' + seq.toString().padStart(64, 'f');
        // Corrupt second approval's stored outcome to 'denied'
        const outcome = approvalsWritten === 2 ? 'denied' : e.outcome;
        const full = {
          kind: 'approval' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          approverPrincipal: e.approverPrincipal,
          outcome: outcome as 'approved' | 'denied',
          sinkId: 'outcome-mismatch',
          sequence: seq,
          prevHash: prev,
          entryHash,
          emittedAt: seq,
        };
        prev = entryHash;
        entries.push(full);
        return full;
      },
      query: async function* (f) {
        for (const e of entries) {
          if (f.correlationId !== undefined && e.correlationId !== f.correlationId) continue;
          yield e;
        }
      },
      flush: async () => {},
    };
    await expect(runSinkConformance(bad)).rejects.toThrow(/outcome mismatch/);
  });

  it('rejects a sink whose sequence is non-monotonic', async () => {
    const entries: SinkEntry[] = [];
    let seq = 100;
    const bad: ApprovalSink = {
      sinkId: 'non-mono',
      writeDecision: async (e) => {
        seq -= 1; // monotonically decreasing
        const full = {
          kind: 'decision' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          canonicalInvocationHash: e.canonicalInvocationHash,
          action: e.action,
          sinkId: 'non-mono',
          sequence: seq,
          prevHash: 'sha256:' + '0'.repeat(64),
          entryHash: 'sha256:' + '0'.repeat(64),
          emittedAt: seq,
        };
        entries.push(full);
        return full;
      },
      writeApproval: async (e) => {
        seq -= 1;
        const full = {
          kind: 'approval' as const,
          adapterId: e.adapterId,
          correlationId: e.correlationId,
          approverPrincipal: e.approverPrincipal,
          outcome: e.outcome,
          sinkId: 'non-mono',
          sequence: seq,
          prevHash: 'sha256:' + '0'.repeat(64),
          entryHash: 'sha256:' + '0'.repeat(64),
          emittedAt: seq,
        };
        entries.push(full);
        return full;
      },
      query: async function* () {
        for (const e of entries) yield e;
      },
      flush: async () => {},
    };
    await expect(runSinkConformance(bad)).rejects.toThrow(/sequence not monotonic/);
  });
});
