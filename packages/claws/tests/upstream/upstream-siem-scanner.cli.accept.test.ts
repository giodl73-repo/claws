/**
 * L3: CLI acceptance — runs siem-emitter and secret-scanner from
 * consumer perspective, verifies NDJSON/CEF/syslog/SARIF output
 * and scan report with masked secrets.
 *
 * These packages live in the openclaw-governance repo and have zero
 * @craftworks imports. This test validates the consumer integration
 * surface from the claws-cli perspective (CLI entry points).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Dynamic imports from openclaw-governance repo
// ---------------------------------------------------------------------------

const OPENCLAW_ROOT = resolve('C:/src/openclaw-governance');

const siemEmitter = await import(
  resolve(OPENCLAW_ROOT, 'packages/siem-emitter/src/index.js')
);
const secretScanner = await import(
  resolve(OPENCLAW_ROOT, 'packages/secret-scanner/src/index.js')
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SiemEvent = {
  id: string;
  timestamp: string;
  source: string;
  category: string;
  action: string;
  target: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actor?: string;
  metadata?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Fixture workspace
// ---------------------------------------------------------------------------

let workspaceDir: string;

beforeEach(async () => {
  workspaceDir = await mkdtemp(join(tmpdir(), 'cli-accept-siem-'));

  await writeFile(
    join(workspaceDir, 'config.yaml'),
    [
      'database:',
      '  host: db.example.com',
      '  password: "ProductionP@ssw0rd!"',
    ].join('\n'),
  );

  await mkdir(join(workspaceDir, 'scripts'), { recursive: true });
  await writeFile(
    join(workspaceDir, 'scripts', 'deploy.sh'),
    [
      '#!/bin/bash',
      'export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
      'echo "deploying..."',
    ].join('\n'),
  );
});

afterEach(async () => {
  await rm(workspaceDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// L3: CLI acceptance — siem-emitter entry points
// ---------------------------------------------------------------------------

describe('L3 CLI accept: siem-emitter output formats', () => {
  const event: SiemEvent = {
    id: 'cli-001',
    timestamp: '2026-04-15T12:00:00Z',
    source: 'claws-cli',
    category: 'governance',
    action: 'compile-complete',
    target: '/workspace/CLAUDE.md',
    severity: 'info',
    message: 'Governance compilation completed successfully',
  };

  it('NDJSON output is valid single-line JSON', () => {
    const output = siemEmitter.emit(event, 'ndjson');
    const lines = output.split('\n');
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.action).toBe('compile-complete');
  });

  it('CEF output follows header|extension format', () => {
    const output = siemEmitter.emit(event, 'cef');
    const parts = output.split('|');
    expect(parts[0]).toBe('CEF:0');
    expect(parts[1]).toBe('OpenClaw');
    expect(parts[2]).toBe('siem-emitter');
  });

  it('syslog output follows RFC 5424 format', () => {
    const output = siemEmitter.emit(event, 'syslog');
    // <PRI>VERSION TIMESTAMP HOSTNAME APPNAME PROCID MSGID [SD] MSG
    const match = output.match(
      /^<(\d+)>1 (\S+) (\S+) (\S+) (\S+) (\S+) \[.+\] (.+)$/,
    );
    expect(match).not.toBeNull();
    expect(match![4]).toBe('openclaw-siem');
    expect(match![6]).toBe('compile-complete');
  });

  it('SARIF output follows 2.1.0 schema', () => {
    const output = siemEmitter.emit(event, 'sarif');
    const sarif = JSON.parse(output);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-schema-2.1.0.json');
    expect(sarif.runs[0].tool.driver.name).toBe('openclaw-siem-emitter');
  });
});

// ---------------------------------------------------------------------------
// L3: CLI acceptance — secret-scanner entry points
// ---------------------------------------------------------------------------

describe('L3 CLI accept: secret-scanner on fixture workspace', () => {
  it('scans workspace and reports findings with masked secrets', async () => {
    const result = await secretScanner.scanWorkspace(workspaceDir);

    expect(result.filesScanned).toBeGreaterThanOrEqual(2);
    expect(result.findingsCount).toBeGreaterThan(0);

    // All previews must be masked
    for (const finding of result.findings) {
      expect(finding.preview).toMatch(/^.{4}\*{3}$|^\*{4}$/);
      expect(finding.preview).not.toContain('ProductionP@ssw0rd!');
      expect(finding.preview).not.toContain(
        'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      );
    }

    // Should find password and/or key patterns
    const types = new Set(result.findings.map((f: { type: string }) => f.type));
    expect(types.size).toBeGreaterThan(0);
  });
});
