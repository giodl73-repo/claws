/**
 * test/e2e/harness/sink-conformance — CL-11 §3a ApprovalSink conformance.
 *
 * `runSinkConformance(sink)` is the reusable suite every shipping sink
 * (CP-7: aether, lobster, openclaw-vanilla, claws-service) must pass
 * unchanged. The harness sink and the four shipping sinks all consume the
 * same assertions — if new rules are added, they land here, not in
 * adapter-specific tests.
 *
 * Checks:
 *   1. emit ordering: sequence numbers are strictly monotonic within a sink
 *   2. correlation matching: entries emitted under a correlationId read back
 *      via query() produce that correlationId
 *   3. hash-chain integrity: each entry.prevHash equals the previous
 *      entry.entryHash; the first entry chains from the zero-hash root
 *   4. idempotency: writeApproval for the same correlationId + outcome can
 *      be called twice; the sink must accept both without corrupting the
 *      chain (conformance does not require dedup — only chain integrity)
 *   5. shutdown flush: flush() resolves without throwing after writes
 *
 * @module test/e2e/harness/sink-conformance
 */
import type { ApprovalSink, SinkEntry } from './host-adapter-test-doubles.ts';

const ZERO_HASH = 'sha256:' + '0'.repeat(64);

export async function runSinkConformance(sink: ApprovalSink): Promise<void> {
  if (sink.sinkId.length === 0) {
    throw new Error('sink-conformance: sinkId must be non-empty');
  }

  const correlationA = 'corr-a-' + cheapId();
  const correlationB = 'corr-b-' + cheapId();

  const d1 = await sink.writeDecision({
    adapterId: 'conformance',
    correlationId: correlationA,
    canonicalInvocationHash: 'sha256:' + '1'.repeat(64),
    action: 'allow',
  });

  const a1 = await sink.writeApproval({
    adapterId: 'conformance',
    correlationId: correlationA,
    approverPrincipal: 'conformance-approver',
    outcome: 'approved',
  });

  const d2 = await sink.writeDecision({
    adapterId: 'conformance',
    correlationId: correlationB,
    canonicalInvocationHash: 'sha256:' + '2'.repeat(64),
    action: 'review',
  });

  // idempotent-ish second approval for correlationA
  const a2 = await sink.writeApproval({
    adapterId: 'conformance',
    correlationId: correlationA,
    approverPrincipal: 'conformance-approver',
    outcome: 'approved',
  });

  // Check 1 — emit ordering: sequence strictly monotonic
  const seqs = [d1.sequence, a1.sequence, d2.sequence, a2.sequence];
  for (let i = 1; i < seqs.length; i++) {
    if ((seqs[i] ?? 0) <= (seqs[i - 1] ?? 0)) {
      throw new Error(
        `sink-conformance: sequence not monotonic — got [${seqs.join(',')}]`
      );
    }
  }

  // Check 3 — hash-chain integrity (ordered emission list)
  const emitted: SinkEntry[] = [d1, a1, d2, a2];
  let expectedPrev = ZERO_HASH;
  for (const entry of emitted) {
    if (entry.prevHash !== expectedPrev) {
      throw new Error(
        `sink-conformance: hash-chain break at seq ${entry.sequence} — ` +
          `expected prevHash=${expectedPrev}, got ${entry.prevHash}`
      );
    }
    if (!entry.entryHash.startsWith('sha256:')) {
      throw new Error(
        `sink-conformance: entryHash must be sha256-prefixed, got ${entry.entryHash}`
      );
    }
    expectedPrev = entry.entryHash;
  }

  // Check 2 — correlation matching: query() returns only entries for that id
  const readA: SinkEntry[] = [];
  for await (const e of sink.query({ correlationId: correlationA })) {
    readA.push(e);
  }
  if (readA.length !== 3) {
    throw new Error(
      `sink-conformance: expected 3 entries for correlationA, got ${readA.length}`
    );
  }
  if (!readA.every((e) => e.correlationId === correlationA)) {
    throw new Error('sink-conformance: query() returned foreign correlationId');
  }

  // Check 4 — idempotency: double-write did not corrupt chain.
  // Already validated by the chain check above; here we prove both entries
  // are retrievable and hold the same outcome.
  const approvalsA = readA.filter((e) => e.kind === 'approval');
  if (approvalsA.length !== 2) {
    throw new Error(
      `sink-conformance: expected 2 approvals for correlationA, got ${approvalsA.length}`
    );
  }
  if (!approvalsA.every((e) => e.kind === 'approval' && e.outcome === 'approved')) {
    throw new Error('sink-conformance: idempotent approval outcome mismatch');
  }

  // Check 5 — shutdown flush
  await sink.flush();
}

function cheapId(): string {
  return Math.random().toString(36).slice(2, 10);
}
