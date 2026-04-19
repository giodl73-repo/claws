import { describe, it, expect } from 'vitest';
import {
  check,
  diff,
  finalizeIR,
  generate,
  generateInMemory,
  watch,
} from '../src/generator.js';
import { waffles } from './helpers/fixture.js';

describe('generator top-level surface', () => {
  it('finalizeIR assigns a policyId and defaults the version', () => {
    const ir = finalizeIR({
      soul: { denyRules: [], modelAllowlist: [], tone: '' },
      user: { oboScope: [], authorityBounds: [] },
      agents: { delegationMap: {}, architectureBoundaries: [] },
      tools: [],
      skills: [],
      governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
      identity: { name: 'x' },
    });
    expect(ir.version).toBe('0.1.0');
    expect(ir.policyId).toMatch(/^sha256-/);
  });

  it('generateInMemory composes all three artifacts from a draft', () => {
    const out = generateInMemory({
      workspaceRoot: '.',
      draft: draftFrom(waffles()),
    });
    expect(out.policyIr).toContain('"identity"');
    expect(out.gatewayPlugin).toContain('registration');
    expect(out.auditManifest).toContain('tool_call');
  });

  it('generate (filesystem entry) returns info diagnostic until P52', async () => {
    const res = await generate({ workspaceRoot: '/tmp/nonexistent' });
    expect(res.writtenFiles).toEqual([]);
    expect(res.diagnostics[0]?.code).toBe('OC-POLICY-I001');
  });

  it('check wraps analyze() into CheckResult', () => {
    const ok = check(waffles());
    expect(ok.ok).toBe(true);
  });

  it('watch returns a no-op close handle', async () => {
    const h = watch({ workspaceRoot: '.' });
    await h.close();
    expect(h.close).toBeTypeOf('function');
  });

  it('diff reports added, removed, and modified tools', () => {
    const a = waffles();
    const b = waffles({
      tools: [
        ...a.tools.slice(0, 2),
        { name: 'new-tool', riskLevel: 1, capabilities: ['READ'] },
      ],
    });
    const d = diff(a, b);
    expect(d.changed).toBe(true);
    expect(d.added).toContain('new-tool');
    expect(d.removed).toContain('vibe-check');
    const c = waffles();
    const unchanged = diff(a, c);
    expect(unchanged.changed).toBe(false);
    const modified = waffles({
      tools: [{ name: 'draft-reply', riskLevel: 2, capabilities: ['READ'] }, ...a.tools.filter((t) => t.name !== 'draft-reply')],
    });
    const dm = diff(a, modified);
    expect(dm.modified).toContain('draft-reply');
  });
});

function draftFrom(ir: ReturnType<typeof finalizeIR>) {
  const { policyId: _p, canonicalizerVersion: _v, version, ...rest } = ir;
  return { ...rest, version };
}
