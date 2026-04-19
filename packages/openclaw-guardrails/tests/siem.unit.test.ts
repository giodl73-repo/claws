/**
 * /siem — per-entry toCef / toNdjson / toSyslog over AuditEntry, per
 * guardrails.md §/siem.
 */

import { describe, expect, test } from 'vitest';
import { emit, emitBatch, toCef, toNdjson, toSyslog } from '../src/siem/index.js';
import type { AuditEntry } from '../src/audit/index.js';

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'ev-1',
    timestamp: '2026-04-18T00:00:00Z',
    source: 'audit-chain',
    actor: 'alice@example.com',
    action: 'snapshot.promote',
    target: 'oc://workspace/snap-42',
    scope: 'prod',
    outcome: 'success',
    hash: '0'.repeat(64),
    previousHash: '0'.repeat(64),
    ...overrides,
  };
}

describe('/siem — canonical per-entry formatters (spec shape)', () => {
  test('toCef produces CEF:0 header with product "guardrails-audit"', () => {
    const cef = toCef(entry({ action: 'tool|call', outcome: 'failed' }));
    expect(cef).toMatch(/^CEF:0\|OpenClaw\|guardrails-audit\|0\.1\.0\|tool\\\|call\|/);
    expect(cef).toContain('src=audit-chain');
    expect(cef).toContain('cs1=prod');
    expect(cef).toContain('cs3=ev-1');
    expect(cef).toContain('suser=alice@example.com');
  });

  test('toNdjson round-trips through JSON.parse back to the entry', () => {
    const e = entry();
    const line = toNdjson(e);
    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toEqual(e);
  });

  test('toSyslog emits RFC 5424 shape with priority + structured-data', () => {
    const out = toSyslog(entry({ outcome: 'failed' }));
    expect(out).toMatch(/^<\d+>1 /);
    expect(out).toContain('[audit@0 ');
    expect(out).toContain('id="ev-1"');
    expect(out).toContain('outcome="failed"');
  });

  test('toSyslog honors hostname + appName from opts', () => {
    const out = toSyslog(entry(), { hostname: 'host1', appName: 'gatekeeper' });
    expect(out).toContain(' host1 gatekeeper ');
  });

  test('emit dispatches across three spec formats', () => {
    const e = entry();
    expect(emit(e, 'cef')).toContain('CEF:0');
    expect(emit(e, 'ndjson')).toContain('ev-1');
    expect(emit(e, 'syslog')).toMatch(/^<\d+>1 /);
  });

  test('emitBatch produces one line per entry for each format', () => {
    const e = entry();
    expect(emitBatch([e, e], 'ndjson').split('\n')).toHaveLength(2);
    expect(emitBatch([e, e], 'cef').split('\n')).toHaveLength(2);
    expect(emitBatch([e, e], 'syslog').split('\n')).toHaveLength(2);
  });
});

describe('/siem — formatter coverage fill', () => {
  test('toCef handles entries with no actor / no reason', () => {
    const cef = toCef(entry({ actor: undefined, reason: undefined }));
    expect(cef).not.toContain('suser=');
    expect(cef).not.toContain('msg=');
    expect(cef).toContain('cs3=ev-1');
  });

  test('toCef includes reason as msg= when present', () => {
    const cef = toCef(entry({ reason: 'policy override' }));
    expect(cef).toContain('msg=policy override');
  });

  test('toSyslog maps outcomes to distinct priorities', () => {
    const priorities = (['success', 'pending', 'failed'] as const).map((o) =>
      toSyslog(entry({ outcome: o })).split(' ')[0],
    );
    expect(new Set(priorities).size).toBe(3);
  });
});
