import { describe, it, expect } from 'vitest';
import {
  emitPluginCode,
  verifyNoForbiddenImports,
} from '../src/emit/emit-plugin.js';
import { emitPolicyIR } from '../src/emit/emit-policy-ir.js';
import { emitAuditManifest } from '../src/emit/emit-audit-manifest.js';
import { generateInMemory } from '../src/generator.js';
import { waffles } from './helpers/fixture.js';

describe('Emit — three artifacts (6 tests)', () => {
  it('gateway-plugin.ts shape: imports runtime ABI and exports registration[]', () => {
    const src = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-AAAA',
      scopePrefix: '@openclaw',
    });
    expect(src).toContain("from '@openclaw/policy/runtime'");
    expect(src).toContain('export const registration');
    expect(src).toContain("'before_tool_call'");
    expect(src).toContain("'before_workspace_file_ingest'");
  });

  it('policy-ir.json: canonical JSON round-trips through JSON.parse', () => {
    const canon = emitPolicyIR(waffles());
    const parsed = JSON.parse(canon);
    expect(parsed.identity.name).toBe('waffles');
    expect(typeof parsed.policyId).toBe('string');
    expect(parsed.policyId.startsWith('sha256-')).toBe(true);
  });

  it('audit-manifest.json: lists the five OC-5 event categories', () => {
    const canon = emitAuditManifest(waffles(), 'sha256-AAAA');
    const parsed = JSON.parse(canon);
    expect(parsed.events.map((e: { event: string }) => e.event)).toEqual([
      'tool_call',
      'tool_call_reviewed',
      'tool_call_denied',
      'file_ingest',
      'file_ingest_denied',
    ]);
  });

  it('scope-prefix toggle: @openclaw emits slash form (subpath exports)', () => {
    const up = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-AAAA',
      scopePrefix: '@openclaw',
    });
    expect(up).toContain("from '@openclaw/policy/runtime'");
    expect(up).toContain("from '@openclaw/guardrails'");
  });

  it('scope-prefix toggle: @bic/openclaw emits hyphen form (flat package names)', () => {
    const bic = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-AAAA',
      scopePrefix: '@bic/openclaw',
    });
    expect(bic).toContain("from '@bic/openclaw-policy/runtime'");
    expect(bic).toContain("from '@bic/openclaw-guardrails'");
    expect(bic).toContain("from '@bic/openclaw-workspace/path'");
    expect(bic).not.toContain('@bic/openclaw/policy');
    expect(bic).not.toContain('@bic/openclaw/guardrails');
    expect(bic).not.toContain('@bic/openclaw/workspace');
  });

  it('idempotency: generateInMemory twice produces byte-identical artifacts', () => {
    const FROZEN = (): Date => new Date('2026-01-01T00:00:00.000Z');
    const a = generateInMemory({ workspaceRoot: '.', draft: base(), now: FROZEN });
    const b = generateInMemory({ workspaceRoot: '.', draft: base(), now: FROZEN });
    expect(a.policyIr).toBe(b.policyIr);
    expect(a.gatewayPlugin).toBe(b.gatewayPlugin);
    expect(a.auditManifest).toBe(b.auditManifest);
  });

  it('determinism + forbidden-import scan: emitted source has zero @craftworks refs', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-AAAA' });
    expect(() => verifyNoForbiddenImports(src, '@bic/openclaw')).not.toThrow();
    expect(src).not.toMatch(/@craftworks\//);
  });
});

function base() {
  return {
    soul: { denyRules: [], modelAllowlist: [], tone: '' },
    user: { oboScope: [], authorityBounds: [] },
    agents: { delegationMap: {}, architectureBoundaries: [] },
    tools: [],
    skills: [],
    governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
    identity: { name: 'test' },
  };
}
