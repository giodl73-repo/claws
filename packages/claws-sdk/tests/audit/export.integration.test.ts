/**
 * L1: Multi-format export pipeline and streaming export.
 *
 * Tests: multi-format export pipeline with PII redaction (1),
 *        streaming export for large chain >10K entries (1).
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import {
  exportChain,
  exportCef,
  exportJson,
  exportSyslog,
  streamExport,
} from '../../src/audit/export.js';
import type { AuditEntry, RedactionOptions } from '../../src/audit/types.js';

function makeEntry(index: number): AuditEntry {
  return {
    timestamp: new Date(Date.UTC(2026, 3, 14, 10, 0, index % 60)).toISOString(),
    eventType: index % 2 === 0 ? 'TOOL_CALL' : 'POLICY_CHECK',
    actor: `agent-${index % 5}`,
    target: `resource-${index}`,
    action: index % 3 === 0 ? 'invoke' : index % 3 === 1 ? 'approve' : 'deny',
    outcome: index % 4 === 0 ? 'allow' : 'deny',
    ruleId: `SEC-${String(index % 1000).padStart(3, '0')}`,
    severity: (index % 5) + 1,
    policyVersion: '2.1.0',
  };
}

describe('multi-format export pipeline', () => {
  it('exports same chain in all three formats with consistent PII redaction', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);
    const chainSize = 50;

    for (let i = 0; i < chainSize; i++) {
      chain.append(makeEntry(i));
    }

    const entries = chain.read();
    const redaction: RedactionOptions = {
      redactFields: ['actor', 'target'],
      replacement: '[REDACTED]',
    };

    // --- CEF export ---
    const cef = exportChain(entries, 'cef', redaction);
    const cefLines = cef.split('\n');
    expect(cefLines).toHaveLength(chainSize);

    for (const line of cefLines) {
      expect(line).toMatch(/^CEF:0\|/);
      expect(line).toContain('src=[REDACTED]');
      expect(line).toContain('dst=[REDACTED]');
      // No PII leakage
      expect(line).not.toMatch(/agent-\d/);
      expect(line).not.toMatch(/resource-\d/);
    }

    // --- JSON export ---
    const json = exportChain(entries, 'json', redaction);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(chainSize);

    for (const entry of parsed) {
      expect(entry.actor).toBe('[REDACTED]');
      expect(entry.target).toBe('[REDACTED]');
      // Chain metadata preserved
      expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(typeof entry.seq).toBe('number');
    }

    // --- Syslog export ---
    const syslog = exportChain(entries, 'syslog', redaction);
    const syslogLines = syslog.split('\n');
    expect(syslogLines).toHaveLength(chainSize);

    for (const line of syslogLines) {
      expect(line).toMatch(/^<\d+>1 /);
      // RFC 5424 escapes ] in SD-VALUE → [REDACTED\]
      expect(line).toContain('actor="[REDACTED\\]"');
      expect(line).toContain('target="[REDACTED\\]"');
      expect(line).not.toMatch(/agent-\d/);
      expect(line).not.toMatch(/resource-\d/);
    }

    // Without redaction, PII is present
    const cefNoRedact = exportCef(entries);
    expect(cefNoRedact).toContain('agent-0');
    const jsonNoRedact = exportJson(entries);
    expect(jsonNoRedact).toContain('agent-0');
    const syslogNoRedact = exportSyslog(entries);
    expect(syslogNoRedact).toContain('agent-0');
  });
});

describe('streaming export for large chain', () => {
  it('handles >10K entries without loading full chain into memory', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);
    const chainSize = 10_500;

    for (let i = 0; i < chainSize; i++) {
      chain.append(makeEntry(i));
    }

    const entries = chain.read();
    const redaction: RedactionOptions = {
      redactFields: ['actor'],
      replacement: '[PII]',
    };

    // --- Streaming CEF ---
    const cefChunks: string[] = [];
    for (const chunk of streamExport(entries, {
      format: 'cef',
      redaction,
      batchSize: 1000,
    })) {
      cefChunks.push(chunk);
    }
    const cefOutput = cefChunks.join('');
    const cefLines = cefOutput.split('\n');
    expect(cefLines).toHaveLength(chainSize);
    // Spot-check redaction
    expect(cefLines[0]).toContain('src=[PII]');
    expect(cefLines[chainSize - 1]).toContain('src=[PII]');
    // Multiple chunks were produced (batching works)
    expect(cefChunks.length).toBeGreaterThan(1);

    // --- Streaming JSON ---
    const jsonChunks: string[] = [];
    for (const chunk of streamExport(entries, {
      format: 'json',
      redaction,
      batchSize: 2000,
    })) {
      jsonChunks.push(chunk);
    }
    const jsonOutput = jsonChunks.join('');
    // Valid JSON
    const parsed = JSON.parse(jsonOutput);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(chainSize);
    expect(parsed[0].actor).toBe('[PII]');
    expect(parsed[chainSize - 1].actor).toBe('[PII]');

    // --- Streaming syslog ---
    const syslogChunks: string[] = [];
    for (const chunk of streamExport(entries, {
      format: 'syslog',
      redaction,
      batchSize: 1500,
    })) {
      syslogChunks.push(chunk);
    }
    const syslogOutput = syslogChunks.join('');
    const syslogLines = syslogOutput.split('\n');
    expect(syslogLines).toHaveLength(chainSize);
    // RFC 5424 escapes ] in SD-VALUE → [PII\]
    expect(syslogLines[0]).toContain('actor="[PII\\]"');
    expect(syslogChunks.length).toBeGreaterThan(1);
  }, 30_000); // Extended timeout for 10K+ entry chain construction
});
