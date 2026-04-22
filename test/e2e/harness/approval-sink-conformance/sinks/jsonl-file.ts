/**
 * JsonlFileConformanceSink — persistent JSONL reference sink for the
 * durability obligation (CL-11 §3a obligation 6).
 *
 * Writes each entry as one JSON line to a file, reads back via stream.
 * Durability: after close(), a new instance over the same path reads back
 * the same entries.
 *
 * @module test/e2e/harness/approval-sink-conformance/sinks/jsonl-file
 */

import { appendFileSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
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

export class JsonlFileConformanceSink implements ApprovalSink {
  readonly sinkId: string;
  private readonly filePath: string;
  private seq = 0;
  private prevHash: string = ZERO_HASH;

  constructor(filePath: string, sinkId: string = 'jsonl-file-conformance') {
    this.filePath = filePath;
    this.sinkId = sinkId;
    // If the file already exists, resume by reading its last entry.
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8').trim();
      if (content.length > 0) {
        const lines = content.split('\n');
        const last = JSON.parse(lines[lines.length - 1]!) as SinkEntry;
        this.seq = last.sequence;
        this.prevHash = last.entryHash;
      }
    } else {
      // Ensure the file exists (empty).
      writeFileSync(filePath, '', 'utf8');
    }
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
    appendFileSync(this.filePath, JSON.stringify(full) + '\n', 'utf8');
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
    appendFileSync(this.filePath, JSON.stringify(full) + '\n', 'utf8');
    this.prevHash = entryHash;
    return full;
  }

  async *query(filter: AuditFilter): AsyncIterable<SinkEntry> {
    if (!existsSync(this.filePath)) return;
    const content = readFileSync(this.filePath, 'utf8').trim();
    if (content.length === 0) return;
    for (const line of content.split('\n')) {
      const e = JSON.parse(line) as SinkEntry;
      if (filter.correlationId !== undefined && e.correlationId !== filter.correlationId) continue;
      if (filter.adapterId !== undefined && e.adapterId !== filter.adapterId) continue;
      if (filter.kind !== undefined && e.kind !== filter.kind) continue;
      yield e;
    }
  }

  async flush(): Promise<void> {
    // appendFileSync is synchronous; no buffer to flush.
  }

  async close(): Promise<void> {
    // No-op: file descriptor is not held open between writes.
  }

  /** Test-only: path for tamper hooks. */
  _filePath(): string {
    return this.filePath;
  }
}
