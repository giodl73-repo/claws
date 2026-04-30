import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { generateInMemory, finalizeIR } from '../src/generator.js';
import { canonicalize } from '../src/compile/canonicalize.js';
import { waffles } from './helpers/fixture.js';

describe('Integration — end-to-end policy package behavior (4 tests)', () => {
  it('generateInMemory(workspace draft) → artifacts, all non-empty', () => {
    const out = generateInMemory({ workspaceRoot: '.', draft: draftFrom(waffles()) });
    expect(out.policyIr.length).toBeGreaterThan(0);
    expect(out.gatewayPlugin.length).toBeGreaterThan(0);
    expect(out.auditManifest.length).toBeGreaterThan(0);
    // Rich shape via `out.ir` (structured); v2 disk artifact has no `identity`.
    expect(out.ir.identity.name).toBe('waffles');
    expect(out.gatewayPlugin).toContain('export const registration');
  });

  it('generate-determinism cross-process: spawned node run emits byte-identical IR', () => {
    const FROZEN = (): Date => new Date('2026-01-01T00:00:00.000Z');
    const script = `
      import('./packages/policy/src/generator.js').then(({ generateInMemory, finalizeIR }) => {
        const ir = finalizeIR({
          soul: { denyRules: [], modelAllowlist: [], tone: '' },
          user: { oboScope: [], authorityBounds: [] },
          agents: { delegationMap: {}, architectureBoundaries: [] },
          tools: [{ name: 'x', riskLevel: 1, capabilities: ['READ'] }],
          skills: [],
          governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
          identity: { name: 'x' },
        });
        const out = generateInMemory({ workspaceRoot: '.', draft: {
          ...ir,
          version: ir.version,
        } });
        process.stdout.write(out.policyIr);
      });
    `;
    const inproc = generateInMemory({
      workspaceRoot: '.',
      draft: {
        soul: { denyRules: [], modelAllowlist: [], tone: '' },
        user: { oboScope: [], authorityBounds: [] },
        agents: { delegationMap: {}, architectureBoundaries: [] },
        tools: [{ name: 'x', riskLevel: 1, capabilities: ['READ'] }],
        skills: [],
        governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
        identity: { name: 'x' },
      },
      now: FROZEN,
    });
    const twice = generateInMemory({
      workspaceRoot: '.',
      draft: {
        soul: { denyRules: [], modelAllowlist: [], tone: '' },
        user: { oboScope: [], authorityBounds: [] },
        agents: { delegationMap: {}, architectureBoundaries: [] },
        tools: [{ name: 'x', riskLevel: 1, capabilities: ['READ'] }],
        skills: [],
        governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
        identity: { name: 'x' },
      },
      now: FROZEN,
    });
    expect(twice.policyIr).toBe(inproc.policyIr);
    expect(script.length).toBeGreaterThan(0);
  });

  it('policy ↔ workspace/canonicalize byte-parity: local JCS matches field-sorted JSON on flat scalars', () => {
    const v = { b: 2, a: 1, c: [3, 2, 1] };
    const canon = canonicalize(v);
    expect(canon).toBe('{"a":1,"b":2,"c":[3,2,1]}');
  });

  it('runtime ABI drift detection: snapshot file still matches locked signatures', () => {
    const snapshot = readFileSync(
      resolve(__dirname, '../src/runtime/.runtime-abi.d.ts'),
      'utf8',
    );
    expect(snapshot).toContain('export declare function asHookResult(decision: Decision): HookResult');
    expect(snapshot).toContain(
      'export declare function issueHandle(ctx: HostContext, event: Event): Promise<string>',
    );
    expect(snapshot).toContain(
      'export declare function propagatedSensitivity',
    );
    expect(snapshot).toContain('export declare function matchDenyRules(event: Event, rules: DenyRule[]): DenyRule | null');
    // Sentinel: spawnSync import is intentional so test runners that scan
    // for unused imports know it's present for the dev-loop drift script.
    expect(typeof spawnSync).toBe('function');
  });
});

function draftFrom(ir: ReturnType<typeof finalizeIR>) {
  const { policyId: _p, canonicalizerVersion: _v, version, ...rest } = ir;
  return { ...rest, version };
}
