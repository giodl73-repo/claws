/**
 * CP-11 R1 review-panel regression tests.
 *
 * Covers:
 *   - gw-r1 M1: emitted imports use hyphen-form for @bic/openclaw scope
 *   - gw-r1 M2: emitted providers carry required `name`, correct-arity postAudit,
 *               and full GuardrailCapabilities/FileIngestCapabilities shape
 *   - gw-r1 M3: emitted postAudit/afterIngest build complete AuditEntrySummary
 *   - arch-r1 M1: emitted beforeIngest preserves sensitivity on the decision
 *   - sec-r1 M2: ir.identity.name is validated + safely escaped
 */

import { describe, it, expect } from 'vitest';
import { emitPluginCode, assertValidIdentityName } from '../src/emit/emit-plugin.js';
import { waffles } from './helpers/fixture.js';

describe('emit-plugin R1 — import-shape parity (gw-r1 M1)', () => {
  it('@bic/openclaw scope emits hyphen-form flat package names', () => {
    const src = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-AAAA',
      scopePrefix: '@bic/openclaw',
    });
    expect(src).toContain("from '@bic/openclaw-policy/runtime'");
    expect(src).toContain("from '@bic/openclaw-guardrails'");
    expect(src).toContain("from '@bic/openclaw-workspace/path'");
    // No slash-form @bic/openclaw/* paths (those packages do not exist).
    expect(src).not.toMatch(/@bic\/openclaw\/policy/);
    expect(src).not.toMatch(/@bic\/openclaw\/guardrails/);
    expect(src).not.toMatch(/@bic\/openclaw\/workspace/);
  });

  it('@openclaw scope keeps slash-form subpath imports', () => {
    const src = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-AAAA',
      scopePrefix: '@openclaw',
    });
    expect(src).toContain("from '@openclaw/policy/runtime'");
    expect(src).toContain("from '@openclaw/guardrails'");
    expect(src).toContain("from '@openclaw/workspace/path'");
  });
});

describe('emit-plugin R1 — provider contract (gw-r1 M2)', () => {
  it('emitted guardrail provider carries required `name` field', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    expect(src).toMatch(/const guardrail: GuardrailProvider & ProviderLifecycle = \{\s*\n\s*name: PROVIDER_NAME,/);
  });

  it('emitted fileIngest provider carries required `name` field', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    expect(src).toMatch(/const fileIngest: FileIngestProvider & ProviderLifecycle = \{\s*\n\s*name: PROVIDER_NAME,/);
  });

  it('emitted postAudit takes (event, decision) — not arity-1', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    expect(src).toContain('async postAudit(e, decision)');
  });

  it('emitted afterIngest takes (event, decision) — not arity-1', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    expect(src).toContain('async afterIngest(e, decision)');
  });

  it('emitted getCapabilities returns GuardrailCapabilities fields (description, version, flags)', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    expect(src).toContain('riskClassification: true');
    expect(src).toContain('auditTrail: true');
    expect(src).toContain('externalApproval: true');
    expect(src).toContain('argumentModification: false');
    expect(src).toContain('version: POLICY_IR.version');
  });

  it('emitted getCapabilities returns FileIngestCapabilities fields', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    expect(src).toContain('sensitivityLabeling: true');
    expect(src).toContain('contentModification: false');
  });
});

describe('emit-plugin R1 — AuditEntrySummary completeness (gw-r1 M3)', () => {
  it('emitted postAudit constructs a complete AuditEntrySummary', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    // Find the postAudit block and assert every required field is there.
    const postAuditBlock = src.slice(src.indexOf('postAudit(e, decision)'));
    expect(postAuditBlock).toContain('timestamp: new Date().toISOString()');
    expect(postAuditBlock).toContain('source: PROVIDER_NAME');
    expect(postAuditBlock).toContain("action: 'tool_call'");
    expect(postAuditBlock).toContain('target: formatOcPath(');
    expect(postAuditBlock).toContain("scope: 'policy:' + SNAPSHOT");
    expect(postAuditBlock).toMatch(/outcome: decision\.decision === 'deny' \? 'failed' : 'success'/);
  });

  it('emitted afterIngest constructs a complete AuditEntrySummary', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    const afterIngestBlock = src.slice(src.indexOf('afterIngest(e, decision)'));
    expect(afterIngestBlock).toContain('timestamp: new Date().toISOString()');
    expect(afterIngestBlock).toContain('source: PROVIDER_NAME');
    expect(afterIngestBlock).toContain("action: 'file_ingest'");
    expect(afterIngestBlock).toContain('target: formatOcPath(');
    expect(afterIngestBlock).toContain("scope: 'policy:' + SNAPSHOT");
    expect(afterIngestBlock).toMatch(/outcome: decision\.decision === 'deny' \? 'failed' : 'success'/);
  });
});

describe('emit-plugin R1 — beforeIngest preserves sensitivity (arch-r1 M1)', () => {
  it('emitted beforeIngest returns decision with sensitivity from POLICY_IR.files', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    const beforeIngestBlock = src.slice(src.indexOf('async beforeIngest(e)'));
    expect(beforeIngestBlock).toContain('POLICY_IR.files?.[e.path]?.sensitivity');
    expect(beforeIngestBlock).toContain("decision: 'allow', sensitivity: label");
  });
});

describe('emit-plugin R1 — identity.name injection defense (sec-r1 M2)', () => {
  it('rejects identity.name with quotes/semicolons/HTML', () => {
    expect(() => assertValidIdentityName("waffles'; import x from 'https://evil'; //")).toThrow(/identity\.name/);
    expect(() => assertValidIdentityName('has spaces')).toThrow(/identity\.name/);
    expect(() => assertValidIdentityName('backticks`')).toThrow(/identity\.name/);
    expect(() => assertValidIdentityName('slash/segment')).toThrow(/identity\.name/);
    expect(() => assertValidIdentityName('')).toThrow(/identity\.name/);
    expect(() => assertValidIdentityName('x'.repeat(65))).toThrow(/identity\.name/);
  });

  it('accepts conforming identity names', () => {
    expect(() => assertValidIdentityName('waffles')).not.toThrow();
    expect(() => assertValidIdentityName('my-org_v2')).not.toThrow();
    expect(() => assertValidIdentityName('a')).not.toThrow();
    expect(() => assertValidIdentityName('x'.repeat(64))).not.toThrow();
  });

  it('emitPluginCode refuses to emit when identity.name violates the regex', () => {
    const malicious = waffles({ identity: { name: "waffles'; evil(); //" } });
    expect(() =>
      emitPluginCode({ ir: malicious, snapshotId: 'sha256-AAAA' }),
    ).toThrow(/identity\.name/);
  });

  it('identity.name is JSON-quoted in string-literal contexts (defense-in-depth)', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    // PROVIDER_NAME is declared via JSON.stringify, so we see a proper "quoted" form.
    expect(src).toContain('const PROVIDER_NAME = "waffles";');
  });
});
