/**
 * approval-sink-conformance.integration.test.ts — pulse 61 self-test.
 *
 * Runs the `defineApprovalSinkConformance` suite against two reference
 * sinks:
 *  - InMemoryConformanceSink (skipDurability: true — in-memory)
 *  - JsonlFileConformanceSink (all 6 obligations including durability)
 *
 * Each obligation uses a unique adapterId so sinks with shared backing
 * store (JsonlFile) don't contaminate across obligations.
 *
 * CP-7 pulses 63-66 follow this pattern for each shipping sink.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineApprovalSinkConformance } from '../approval-sink-conformance/suite.js';
import { InMemoryConformanceSink } from '../approval-sink-conformance/sinks/in-memory.js';
import { JsonlFileConformanceSink } from '../approval-sink-conformance/sinks/jsonl-file.js';

// In-memory reference — 5 obligations (durability skipped). The tamper-hook
// mutates the raw entries array directly — the suite asserts the mutation is
// non-silent.
defineApprovalSinkConformance<InMemoryConformanceSink>(
  'InMemoryConformanceSink',
  () => new InMemoryConformanceSink(),
  {
    skipDurability: true,
    tamperHook: async (sink) => {
      const entries = sink._rawEntries();
      if (entries.length > 0) {
        const e = entries[0]!;
        (e as { adapterId: string }).adapterId = 'tampered';
      }
    },
  },
);

// JSONL file reference — all 6 obligations. All obligations share one backing
// file (so obligation 6's re-factory sees the same data). Each obligation uses
// a unique adapterId so reads are scoped. Tamper-hook mutates file content.
const jsonlPath = join(mkdtempSync(join(tmpdir(), 'cp6-sink-conformance-jsonl-')), 'audit.jsonl');
defineApprovalSinkConformance<JsonlFileConformanceSink>(
  'JsonlFileConformanceSink',
  () => new JsonlFileConformanceSink(jsonlPath),
  {
    tamperHook: async (sink) => {
      const path = sink._filePath();
      const { readFileSync, writeFileSync } = await import('node:fs');
      const content = readFileSync(path, 'utf8');
      // Tamper the most recent entry's adapterId.
      const lines = content.trim().split('\n');
      if (lines.length === 0) return;
      const lastIdx = lines.length - 1;
      const lastLine = lines[lastIdx]!;
      const tamperedLine = lastLine.replace(/"adapterId":"[^"]+"/, '"adapterId":"tampered"');
      lines[lastIdx] = tamperedLine;
      writeFileSync(path, lines.join('\n') + '\n', 'utf8');
    },
  },
);
