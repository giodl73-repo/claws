import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it('generateInMemory composes all artifacts from a draft', () => {
    const out = generateInMemory({
      workspaceRoot: '.',
      draft: draftFrom(waffles()),
    });
    // v2 (upstream-shaped) PolicyIR has tools + denyRules + generatedFrom
    expect(out.policyIr).toContain('"tools"');
    expect(out.policyIr).toContain('"denyRules"');
    expect(out.policyIr).toContain('"generatedFrom"');
    // The rich shape is preserved alongside for claws-side tooling.
    expect(out.policyIrRich).toContain('"identity"');
    expect(out.gatewayPlugin).toContain('registration');
    expect(out.auditManifest).toContain('tool_call');
  });

  it('generate (filesystem entry) emits the three artifacts to disk', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-generate-'));
    try {
      const res = await generate({ workspaceRoot: ws });
      expect(res.writtenFiles).toHaveLength(3);
      const names = res.writtenFiles.map((p) => p.split(/[\\/]/).pop());
      expect(names).toContain('policy-ir.json');
      expect(names).toContain('gateway-plugin.ts');
      expect(names).toContain('audit-manifest.json');
      expect(res.workspaceRoot).toBe(ws);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('check wraps analyze() into CheckResult', () => {
    const ok = check(waffles());
    expect(ok.ok).toBe(true);
  });

  it('watch returns a handle whose close releases resources', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-watch-'));
    try {
      let closed = false;
      const h = watch({
        workspaceRoot: ws,
        watcherFactory: (_path, _listener) => ({
          close: () => {
            closed = true;
          },
        }),
      });
      await h.close();
      expect(closed).toBe(true);
      expect(h.close).toBeTypeOf('function');
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
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
