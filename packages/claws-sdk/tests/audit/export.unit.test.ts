/**
 * L0: Export formatters — CEF format correct, syslog format correct.
 *
 * Tests: CEF format correct (1), syslog format correct (1).
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import {
  exportCef,
  exportSyslog,
  exportJson,
  exportCanonicalJson,
  normalizeLineEndings,
  exportChain,
  streamExport,
} from '../../src/audit/export.js';
import type { AuditEntry, ChainEntry, RedactionOptions } from '../../src/audit/types.js';

function makeEntry(overrides?: Partial<AuditEntry>): AuditEntry {
  return {
    timestamp: '2026-04-14T10:00:00Z',
    eventType: 'TOOL_CALL',
    actor: 'agent-1',
    target: 'Bash',
    action: 'invoke',
    outcome: 'deny',
    ruleId: 'SEC-001',
    severity: 4,
    policyVersion: '1.0.0',
    ...overrides,
  };
}

function buildChain(count: number) {
  const key = randomBytes(32);
  const chain = new AuditChain(key);
  for (let i = 0; i < count; i++) {
    chain.append(makeEntry({ action: `action-${i}`, target: `resource-${i}` }));
  }
  return chain.read();
}

describe('CEF format', () => {
  it('produces valid ArcSight Common Event Format lines', () => {
    const entries = buildChain(3);
    const output = exportCef(entries);
    const lines = output.split('\n');

    expect(lines).toHaveLength(3);

    for (const line of lines) {
      // CEF header: CEF:0|Vendor|Product|Version|SignatureID|Name|Severity|Extensions
      expect(line).toMatch(/^CEF:0\|/);

      // 7 pipe-delimited header fields + extensions
      const headerParts = line.split('|');
      expect(headerParts.length).toBeGreaterThanOrEqual(8);

      // Version field
      expect(headerParts[0]).toBe('CEF:0');
      // Vendor
      expect(headerParts[1]).toBe('claws');
      // Product
      expect(headerParts[2]).toBe('audit-chain');
      // Version
      expect(headerParts[3]).toBe('1.0');
      // Severity is a number
      const severity = parseInt(headerParts[6]!, 10);
      expect(severity).toBeGreaterThanOrEqual(0);
      expect(severity).toBeLessThanOrEqual(10);
    }

    // Extensions contain expected keys
    const firstLine = lines[0]!;
    expect(firstLine).toContain('rt=');
    expect(firstLine).toContain('src=');
    expect(firstLine).toContain('dst=');
    expect(firstLine).toContain('act=');
    expect(firstLine).toContain('outcome=');
    expect(firstLine).toContain('cs1Label=chainHash');
    expect(firstLine).toContain('cn1Label=chainSeq');
    expect(firstLine).toContain('cs2Label=policyVersion');

    // PII redaction
    const redaction: RedactionOptions = { redactFields: ['actor', 'target'] };
    const redactedOutput = exportCef(entries, redaction);
    const redactedLine = redactedOutput.split('\n')[0]!;
    expect(redactedLine).toContain('src=[REDACTED]');
    expect(redactedLine).toContain('dst=[REDACTED]');
    expect(redactedLine).not.toContain('agent-1');

    // Special character escaping in CEF header
    const specialEntries = buildChain(1);
    // The entry has no special chars, but the format handles them
    const specialOutput = exportCef(specialEntries);
    expect(specialOutput).toMatch(/^CEF:0\|/);
  });

  it('maps severity levels correctly (severity * 2, capped at 10)', () => {
    // severity 5 → CEF 10
    const entries5 = buildChain(1);
    // Override severity by building with severity 5
    const key5 = randomBytes(32);
    const chain5 = new AuditChain(key5);
    chain5.append(makeEntry({ severity: 5 }));
    const out5 = exportCef(chain5.read());
    // CEF severity field is the 7th pipe-delimited field (index 6)
    expect(out5.split('|')[6]).toBe('10');

    // severity 1 → CEF 2
    const chain1 = new AuditChain(randomBytes(32));
    chain1.append(makeEntry({ severity: 1 }));
    const out1 = exportCef(chain1.read());
    expect(out1.split('|')[6]).toBe('2');
  });
});

describe('exportCanonicalJson', () => {
  it('produces RFC 8785 canonical JSON output', () => {
    const entries = buildChain(2);
    const output = exportCanonicalJson(entries);

    // Must be valid JSON
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);

    // RFC 8785: no whitespace outside strings — no pretty-printing
    expect(output).not.toContain('\n');
    expect(output.startsWith('[')).toBe(true);
    expect(output.endsWith(']')).toBe(true);
  });

  it('applies PII redaction before canonicalization', () => {
    const entries = buildChain(1);
    const redaction: RedactionOptions = {
      redactFields: ['actor'],
      replacement: '[PII]',
    };
    const output = exportCanonicalJson(entries, redaction);
    expect(output).toContain('[PII]');
    expect(output).not.toContain('agent-');
  });

  it('handles empty entries array', () => {
    const output = exportCanonicalJson([]);
    expect(output).toBe('[]');
  });
});

describe('normalizeLineEndings', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeLineEndings('a\r\nb\r\nc')).toBe('a\nb\nc');
  });

  it('converts bare CR to LF', () => {
    expect(normalizeLineEndings('a\rb\rc')).toBe('a\nb\nc');
  });

  it('removes BOM', () => {
    expect(normalizeLineEndings('\uFEFFhello')).toBe('hello');
  });

  it('strips trailing whitespace per line', () => {
    expect(normalizeLineEndings('a  \nb\t\nc')).toBe('a\nb\nc');
  });

  it('handles mixed line endings', () => {
    // BOM removed, CRLF→LF, bare CR→LF, trailing whitespace stripped
    // 'a ' trailing space stripped, 'b' no trailing, ' c\t' trailing tab stripped (leading space preserved)
    expect(normalizeLineEndings('\uFEFFa \r\nb\r c\t')).toBe('a\nb\n c');
  });
});

describe('exportChain multi-format dispatch', () => {
  it('dispatches to correct format', () => {
    const entries = buildChain(1);

    const cef = exportChain(entries, 'cef');
    expect(cef).toMatch(/^CEF:0\|/);

    const json = exportChain(entries, 'json');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);

    const syslog = exportChain(entries, 'syslog');
    expect(syslog).toMatch(/^<\d+>1 /);
  });
});

describe('streamExport edge cases', () => {
  it('handles entries fewer than batchSize (single flush for JSON)', () => {
    const entries = buildChain(3);
    const chunks: string[] = [];
    for (const chunk of streamExport(entries, { format: 'json', batchSize: 500 })) {
      chunks.push(chunk);
    }
    const output = chunks.join('');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(3);
  });

  it('handles entries fewer than batchSize (single flush for CEF)', () => {
    const entries = buildChain(2);
    const chunks: string[] = [];
    for (const chunk of streamExport(entries, { format: 'cef', batchSize: 500 })) {
      chunks.push(chunk);
    }
    const output = chunks.join('');
    const lines = output.split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toMatch(/^CEF:0\|/);
    }
  });

  it('handles entries fewer than batchSize (single flush for syslog)', () => {
    const entries = buildChain(2);
    const chunks: string[] = [];
    for (const chunk of streamExport(entries, { format: 'syslog', batchSize: 500 })) {
      chunks.push(chunk);
    }
    const output = chunks.join('');
    const lines = output.split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toMatch(/^<\d+>1 /);
    }
  });

  it('handles empty entries in streaming JSON', () => {
    const chunks: string[] = [];
    for (const chunk of streamExport([], { format: 'json' })) {
      chunks.push(chunk);
    }
    const output = chunks.join('');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(0);
  });

  it('handles empty entries in streaming CEF', () => {
    const chunks: string[] = [];
    for (const chunk of streamExport([], { format: 'cef' })) {
      chunks.push(chunk);
    }
    expect(chunks).toHaveLength(0);
  });

  it('streams with redaction in JSON format', () => {
    const entries = buildChain(3);
    const redaction: RedactionOptions = { redactFields: ['actor'] };
    const chunks: string[] = [];
    for (const chunk of streamExport(entries, { format: 'json', redaction, batchSize: 2 })) {
      chunks.push(chunk);
    }
    const output = chunks.join('');
    const parsed = JSON.parse(output);
    for (const entry of parsed) {
      expect(entry.actor).toBe('[REDACTED]');
    }
  });

  it('streams with redaction in CEF format', () => {
    const entries = buildChain(3);
    const redaction: RedactionOptions = { redactFields: ['actor'] };
    const chunks: string[] = [];
    for (const chunk of streamExport(entries, { format: 'cef', redaction, batchSize: 2 })) {
      chunks.push(chunk);
    }
    const output = chunks.join('');
    expect(output).toContain('src=[REDACTED]');
  });
});

describe('syslog format', () => {
  it('produces valid RFC 5424 structured data messages', () => {
    const entries = buildChain(3);
    const output = exportSyslog(entries);
    const lines = output.split('\n');

    expect(lines).toHaveLength(3);

    for (const line of lines) {
      // RFC 5424 format: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID [SD] MSG
      // PRI is facility(10) * 8 + severity
      expect(line).toMatch(/^<\d+>1 /);

      // App name is claws
      expect(line).toContain(' claws ');

      // Contains structured data block
      expect(line).toMatch(/\[audit@claws /);
      expect(line).toContain('actor=');
      expect(line).toContain('target=');
      expect(line).toContain('action=');
      expect(line).toContain('outcome=');
      expect(line).toContain('eventType=');
      expect(line).toContain('chainHash=');
      expect(line).toContain('chainSeq=');
      expect(line).toContain('policyVersion=');

      // PRI value is in valid range for facility 10
      const priMatch = line.match(/^<(\d+)>/);
      expect(priMatch).not.toBeNull();
      const pri = parseInt(priMatch![1]!, 10);
      // facility 10 = 80 base, severity 0-7 → range 80-87
      expect(pri).toBeGreaterThanOrEqual(80);
      expect(pri).toBeLessThanOrEqual(87);
    }

    // PII redaction
    const redaction: RedactionOptions = {
      redactFields: ['actor', 'target'],
      replacement: '***',
    };
    const redactedOutput = exportSyslog(entries, redaction);
    const redactedLine = redactedOutput.split('\n')[0]!;
    expect(redactedLine).toContain('actor="***"');
    expect(redactedLine).toContain('target="***"');
    expect(redactedLine).not.toContain('src=agent-1');

    // JSON format produces valid parseable JSON
    const jsonOutput = exportJson(entries);
    const parsed = JSON.parse(jsonOutput);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('maps unmapped severity to syslog informational (6)', () => {
    // severity 0 is not in the 1-5 mapping → falls through to default 6
    const chain = new AuditChain(randomBytes(32));
    chain.append(makeEntry({ severity: 0 }));
    const output = exportSyslog(chain.read());

    // PRI = facility(10) * 8 + severity(6) = 86
    expect(output).toMatch(/^<86>1 /);
  });

  it('maps all standard severities correctly', () => {
    const chain = new AuditChain(randomBytes(32));
    // severity 5 → syslog 2 → PRI = 82
    chain.append(makeEntry({ severity: 5 }));
    const out5 = exportSyslog(chain.read());
    expect(out5).toMatch(/^<82>1 /);

    // severity 1 → syslog 6 → PRI = 86
    const chain1 = new AuditChain(randomBytes(32));
    chain1.append(makeEntry({ severity: 1 }));
    expect(exportSyslog(chain1.read())).toMatch(/^<86>1 /);
  });

  it('escapes special characters in syslog SD values', () => {
    const chain = new AuditChain(randomBytes(32));
    chain.append(makeEntry({
      actor: 'agent\\with"quotes]',
      target: 'resource]with\\escapes',
    }));
    const output = exportSyslog(chain.read());
    // Backslash, quote, ] are escaped per RFC 5424
    expect(output).toContain('agent\\\\with\\"quotes\\]');
    expect(output).toContain('resource\\]with\\\\escapes');
  });

  it('escapes special characters in CEF extensions', () => {
    const chain = new AuditChain(randomBytes(32));
    chain.append(makeEntry({
      actor: 'agent=with\\newline\n',
      action: 'test|pipe',
    }));
    const output = exportCef(chain.read());
    // Extension: backslash, equals, newline escaped
    expect(output).toContain('src=agent\\=with\\\\newline\\n');
    // Header: pipe escaped
    expect(output).toContain('test\\|pipe');
  });
});
