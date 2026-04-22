/**
 * InMemoryConformanceSink — the canonical conformance-suite reference
 * implementation. Stores entries in a JS array with a hash chain.
 *
 * Used by `approval-sink-conformance.integration.test.ts` as a self-test
 * target. CP-7's shipping sinks wrap their own implementations with
 * `defineApprovalSinkConformance`.
 *
 * @module test/e2e/harness/approval-sink-conformance/sinks/in-memory
 */

import { createHash } from 'node:crypto';
import type {
  ApprovalSink,
  AuditFilter,
  SinkApprovalEntry,
  SinkDecisionEntry,
  SinkEntry,
} from '../../host-adapter-test-doubles.js';

const ZERO_HASH = 'sha256:' + '0'.repeat(64);

function computeHash(entry: Omit<SinkEntry, 'entryHash'>): string {
  const canonical = JSON.stringify(entry, Object.keys(entry).sort());
  return 'sha256:' + createHash('sha256').update(canonical).digest('hex');
}

export class InMemoryConformanceSink implements ApprovalSink {
  readonly sinkId: string;
  private readonly entries: SinkEntry[] = [];
  private seq = 0;
  private prevHash: string = ZERO_HASH;

  constructor(sinkId: string = 'in-memory-conformance') {
    this.sinkId = sinkId;
  }

  async writeDecision(
    entry: Omit<SinkDecisionEntry, 'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'>,
  ): Promise<SinkDecisionEntry> {
    this.seq += 1;
    const emittedAt = Date.now();
    const base: Omit<SinkDecisionEntry, 'entryHash'> = {
      kind: 'decision',
      sinkId: this.sinkId,
      sequence: this.seq,
      prevHash: this.prevHash,
      emittedAt,
      ...entry,
    };
    const entryHash = computeHash(base);
    const full: SinkDecisionEntry = { ...base, entryHash };
    this.entries.push(full);
    this.prevHash = entryHash;
    return full;
  }

  async writeApproval(
    entry: Omit<SinkApprovalEntry, 'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'>,
  ): Promise<SinkApprovalEntry> {
    this.seq += 1;
    const emittedAt = Date.now();
    const base: Omit<SinkApprovalEntry, 'entryHash'> = {
      kind: 'approval',
      sinkId: this.sinkId,
      sequence: this.seq,
      prevHash: this.prevHash,
      emittedAt,
      ...entry,
    };
    const entryHash = computeHash(base);
    const full: SinkApprovalEntry = { ...base, entryHash };
    this.entries.push(full);
    this.prevHash = entryHash;
    return full;
  }

  async *query(filter: AuditFilter): AsyncIterable<SinkEntry> {
    for (const e of this.entries) {
      if (filter.correlationId !== undefined && e.correlationId !== filter.correlationId) continue;
      if (filter.adapterId !== undefined && e.adapterId !== filter.adapterId) continue;
      if (filter.kind !== undefined && e.kind !== filter.kind) continue;
      yield e;
    }
  }

  async flush(): Promise<void> {
    // No-op: in-memory is synchronous.
  }

  /** Test-only: expose entries for tamper hooks. */
  _rawEntries(): SinkEntry[] {
    return this.entries;
  }
}
