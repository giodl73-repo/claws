/**
 * L3: SDK acceptance — consumer imports @openclaw/siem-emitter and
 * @openclaw/secret-scanner as standalone packages, emits events in
 * all 4 formats and scans fixture workspace for secrets with masked output.
 *
 * These packages live in the openclaw-governance repo and have zero
 * @craftworks imports. This test validates the consumer integration
 * surface from the claws-sdk perspective.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Dynamic imports from openclaw-governance repo
// ---------------------------------------------------------------------------

const OPENCLAW_ROOT = resolve('C:/src/openclaw-governance');

// We import directly from source since these are standalone packages
// In production, consumers would `npm install @openclaw/siem-emitter`
const siemEmitter = await import(
  resolve(OPENCLAW_ROOT, 'packages/siem-emitter/src/index.js')
);
const secretScanner = await import(
  resolve(OPENCLAW_ROOT, 'packages/secret-scanner/src/index.js')
);

// ---------------------------------------------------------------------------
// Types (re-extracted from imports)
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
  workspaceDir = await mkdtemp(join(tmpdir(), 'sdk-accept-siem-'));

  // Fixture with planted secrets
  await writeFile(
    join(workspaceDir, '.env'),
    [
      'API_KEY=sk_test_FAKE000000000000000000000000000',
      'DB_PASSWORD="SuperSecretDbPass987!"',
    ].join('\n'),
  );

  await mkdir(join(workspaceDir, 'src'), { recursive: true });
  await writeFile(
    join(workspaceDir, 'src', 'deploy.ts'),
    [
      'const token = "ghp_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0";',
      'export default token;',
    ].join('\n'),
  );
});

afterEach(async () => {
  await rm(workspaceDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// L3: SDK acceptance — siem-emitter
// ---------------------------------------------------------------------------

describe('L3 SDK accept: @openclaw/siem-emitter', () => {
  it('emits events in all 4 formats from consumer perspective', () => {
    const event: SiemEvent = {
      id: 'accept-001',
      timestamp: '2026-04-15T10:00:00Z',
      source: 'claws-sdk',
      category: 'governance',
      action: 'policy-check',
      target: '/workspace/CLAUDE.md',
      severity: 'medium',
      message: 'Governance policy check completed',
      actor: 'claws',
    };

    // CEF
    const cef = siemEmitter.emit(event, 'cef');
    expect(cef).toMatch(/^CEF:0\|/);
    expect(cef).toContain('policy-check');

    // NDJSON
    const ndjson = siemEmitter.emit(event, 'ndjson');
    const parsed = JSON.parse(ndjson);
    expect(parsed.id).toBe('accept-001');
    expect(parsed.source).toBe('claws-sdk');

    // Syslog
    const syslog = siemEmitter.emit(event, 'syslog');
    expect(syslog).toMatch(/^<\d+>1 /);
    expect(syslog).toContain('openclaw-siem');

    // SARIF
    const sarif = JSON.parse(siemEmitter.emit(event, 'sarif'));
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].results[0].ruleId).toBe('policy-check');
    expect(sarif.runs[0].results[0].level).toBe('warning');
  });
});

// ---------------------------------------------------------------------------
// L3: SDK acceptance — secret-scanner
// ---------------------------------------------------------------------------

describe('L3 SDK accept: @openclaw/secret-scanner', () => {
  it('scans fixture workspace and returns masked findings', async () => {
    const result = await secretScanner.scanWorkspace(workspaceDir);

    expect(result.filesScanned).toBeGreaterThanOrEqual(2);
    expect(result.findingsCount).toBeGreaterThan(0);

    // All findings must be masked
    for (const finding of result.findings) {
      expect(finding.preview).toMatch(/^.{4}\*{3}$|^\*{4}$/);
      expect(finding.preview).not.toContain('sk_test_FAKE000000000000000000000000000');
      expect(finding.preview).not.toContain('SuperSecretDbPass987!');
      expect(finding.preview).not.toContain('ghp_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0');
    }

    // Pattern types should include at least API keys or tokens
    const types = new Set(result.findings.map((f: { type: string }) => f.type));
    expect(
      types.has('api-key') || types.has('token') || types.has('password'),
    ).toBe(true);
  });

  it('scanContent works for in-memory scanning', () => {
    const findings = secretScanner.scanContent(
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...',
      'test.pem',
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('private-key');
    expect(findings[0].file).toBe('test.pem');
  });
});
