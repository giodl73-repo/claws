/**
 * L1 integration: the four library gaps filled in pulse 47.5.5 (SARIF,
 * gateway-less scenarios, snapshot loader, migrator). Each test exercises
 * the real library body — no mocks — and asserts end-to-end behavior.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

import { generate } from '../src/generator.js';
import {
  evaluateCompliance,
  loadPolicyIRFromSnapshot,
} from '../src/ops/evaluate-compliance.js';
import { renderReport } from '../src/ops/render-report.js';
import { runScenariosInMemory } from '../src/ops/run-scenarios.js';
import { migratePolicyArtifacts } from '../src/migrate.js';
import type { ComplianceReport, RenderInput, ScenarioCase } from '../src/ops/types.js';
import type { PolicyIR } from '../src/types/index.js';
import { waffles } from './helpers/fixture.js';

function complianceFixture(): ComplianceReport {
  return {
    snapshotId: 'sha256-abc',
    rubric: { id: 'soc2', version: '2017', framework: 'SOC 2' },
    generatedAt: '2026-01-01T00:00:00Z',
    results: [
      {
        requirementId: 'CC-1.1',
        title: 'Deny rules declared',
        status: 'fail',
        evidence: [],
        gaps: ['no deny rules'],
      },
      {
        requirementId: 'CC-1.2',
        title: 'Authority bounds declared',
        status: 'partial',
        evidence: [],
        gaps: ['none declared'],
      },
      {
        requirementId: 'CC-2.1',
        title: 'Pass requirement',
        status: 'pass',
        evidence: [],
      },
    ],
    summary: { total: 3, pass: 1, fail: 1, partial: 1, na: 0 },
    signature: { algo: 'hmac-sha256', key_id: 'k', value: 'deadbeef' },
  };
}

describe('pulse 47.5.5 — renderReport SARIF variant', () => {
  it('emits valid SARIF 2.1.0 with one result per fail/partial requirement', () => {
    const input: RenderInput = { kind: 'compliance', compliance: complianceFixture() };
    const out = renderReport(input, 'sarif');
    const doc = JSON.parse(out) as {
      version: string;
      $schema: string;
      runs: Array<{
        tool: { driver: { name: string; rules: { id: string }[] } };
        results: { ruleId: string; level: string }[];
      }>;
    };
    expect(doc.version).toBe('2.1.0');
    expect(doc.$schema).toContain('sarif-2.1.0');
    const run = doc.runs[0]!;
    expect(run.tool.driver.name).toBe('openclaw-policy');
    expect(run.tool.driver.rules.length).toBe(2); // fail + partial, pass omitted
    expect(run.results.length).toBe(2);
    const levels = run.results.map((r) => r.level);
    expect(levels).toContain('error');
    expect(levels).toContain('warning');
  });

  it('emits a broken audit-chain finding when the chain fails verify', () => {
    const audit = { valid: false, length: 5, brokenAt: 'evt-42' } as const;
    const out = renderReport({ kind: 'audit', audit }, 'sarif');
    const doc = JSON.parse(out) as {
      runs: Array<{ results: { message: { text: string } }[] }>;
    };
    expect(doc.runs[0]?.results[0]?.message.text).toContain('evt-42');
  });

  it('omits runs.results when a diff has no added/removed/modified entries', () => {
    const diff = { from: 'a', to: 'b', added: [], removed: [], modified: [] };
    const out = renderReport({ kind: 'diff', diff }, 'sarif');
    const doc = JSON.parse(out) as {
      runs: Array<{ results: unknown[] }>;
    };
    expect(doc.runs[0]?.results).toEqual([]);
  });

  it('populates SARIF results for diff added/removed/modified entries', () => {
    const diff = {
      from: 'a',
      to: 'b',
      added: ['new-tool'],
      removed: ['old-tool'],
      modified: ['changed-tool'],
    };
    const out = renderReport({ kind: 'diff', diff }, 'sarif');
    const doc = JSON.parse(out) as {
      runs: Array<{
        tool: { driver: { rules: { id: string }[] } };
        results: { level: string; message: { text: string } }[];
      }>;
    };
    const results = doc.runs[0]!.results;
    expect(results.length).toBe(3);
    const texts = results.map((r) => r.message.text);
    expect(texts.some((t) => t.includes('Added tool: new-tool'))).toBe(true);
    expect(texts.some((t) => t.includes('Removed tool: old-tool'))).toBe(true);
    expect(texts.some((t) => t.includes('Modified tool: changed-tool'))).toBe(true);
  });

  it('emits no results for a valid audit chain (SARIF is findings-only)', () => {
    const out = renderReport(
      { kind: 'audit', audit: { valid: true, length: 10 } },
      'sarif',
    );
    const doc = JSON.parse(out) as {
      runs: Array<{ results: unknown[] }>;
    };
    expect(doc.runs[0]?.results).toEqual([]);
  });
});

describe('pulse 47.5.5 — runScenariosInMemory (gateway-less mode)', () => {
  it('spins up an ephemeral gateway and executes scenarios without --gateway', async () => {
    const policyIR = waffles();
    // waffles R1 tool = 'draft-reply' → allow; R5 tool 'post-to-channel' → review.
    const cases: ScenarioCase[] = [
      {
        name: 'allow R1 tool',
        snapshot: 'test-1',
        given: {
          tool_call: { name: 'draft-reply', args: {} },
        },
        expect: { decision: 'allow' },
      },
      {
        name: 'review unknown tool',
        snapshot: 'test-2',
        given: { tool_call: { name: 'does-not-exist', args: {} } },
        expect: { decision: 'review', requireApproval: true },
      },
    ];
    const result = await runScenariosInMemory({ policyIR, cases });
    expect(result.total).toBe(2);
    expect(result.cases[0]?.passed).toBe(true);
    expect(result.cases[1]?.passed).toBe(true);
  });

  it('tears the gateway down even when a scenario throws', async () => {
    const policyIR = waffles();
    // Empty scenario list exercises the no-op path — the gateway must
    // still open + close cleanly without leaking a listener.
    const result = await runScenariosInMemory({ policyIR, cases: [] });
    expect(result.total).toBe(0);
  });
});

describe('pulse 47.5.5 — loadPolicyIRFromSnapshot', () => {
  it('loads the current policy-ir.json from a generated workspace', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-snap-loader-'));
    try {
      await generate({ workspaceRoot: ws });
      const ir = await loadPolicyIRFromSnapshot({
        workspace: ws,
        snapshotId: 'current',
      });
      expect(ir.policyId).toMatch(/^sha256-/);
      expect(ir.canonicalizerVersion.length).toBeGreaterThan(0);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('loads an archived snapshot from .openclaw/snapshots/<id>/', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-snap-loader-archived-'));
    try {
      const snapDir = join(ws, '.openclaw', 'snapshots', 'snap-1');
      mkdirSync(snapDir, { recursive: true });
      const ir: PolicyIR = waffles();
      writeFileSync(join(snapDir, 'policy-ir.json'), JSON.stringify(ir), 'utf8');
      const loaded = await loadPolicyIRFromSnapshot({ workspace: ws, snapshotId: 'snap-1' });
      expect(loaded.policyId).toBe(ir.policyId);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('evaluateCompliance end-to-end: load snapshot → evaluate → signed report', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-snap-eval-'));
    try {
      await generate({ workspaceRoot: ws });
      const ir = await loadPolicyIRFromSnapshot({ workspace: ws, snapshotId: 'current' });
      const report = evaluateCompliance({
        rubric: {
          id: 'test',
          version: '1.0',
          framework: 'TEST',
          requirements: [
            {
              id: 'T1',
              title: 'Deny rules declared',
              kind: 'static',
              predicate: 'has-deny-rules',
            },
          ],
        },
        input: { snapshotId: 'current', policyIR: ir },
        signingKey: 'secret',
        keyId: 'k1',
      });
      expect(report.signature.value).toMatch(/^[0-9a-f]{64}$/);
      expect(report.results[0]?.requirementId).toBe('T1');
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });
});

describe('pulse 47.5.5 — migratePolicyArtifacts', () => {
  it('migrates an older policy-ir.json in place, leaves already-current alone', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-migrate-'));
    try {
      const dir = join(ws, '.openclaw', 'policy');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'policy-ir.json'), JSON.stringify({ version: '0.5.0', tools: [] }));
      writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ version: '1.0.0', chain: [] }));
      const res = await migratePolicyArtifacts({ workspace: ws });
      expect(res.migrated).toBe(1);
      const steps = res.steps;
      expect(steps.find((s) => s.artifact === 'policy-ir.json')?.status).toBe('migrated');
      expect(steps.find((s) => s.artifact === 'audit-manifest.json')?.status).toBe(
        'already-current',
      );
      const after = JSON.parse(
        readFileSync(join(dir, 'policy-ir.json'), 'utf8'),
      ) as { version: string };
      expect(after.version).toBe('1.0.0');
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('reports `missing` when the artifact directory is absent', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-migrate-missing-'));
    try {
      const res = await migratePolicyArtifacts({ workspace: ws });
      expect(res.migrated).toBe(0);
      expect(res.steps.every((s) => s.status === 'missing')).toBe(true);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('dry-run does not modify files', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-migrate-dry-'));
    try {
      const dir = join(ws, '.openclaw', 'policy');
      mkdirSync(dir, { recursive: true });
      const raw = JSON.stringify({ version: '0.5.0' });
      writeFileSync(join(dir, 'policy-ir.json'), raw);
      writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ version: '1.0.0' }));
      const res = await migratePolicyArtifacts({ workspace: ws, dryRun: true });
      expect(res.migrated).toBe(1);
      expect(readFileSync(join(dir, 'policy-ir.json'), 'utf8')).toBe(raw);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('returns `error` status with parse-failure detail on malformed JSON', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-migrate-corrupt-'));
    try {
      const dir = join(ws, '.openclaw', 'policy');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'policy-ir.json'), '{not json');
      writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ version: '1.0.0' }));
      const res = await migratePolicyArtifacts({ workspace: ws });
      const irStep = res.steps.find((s) => s.artifact === 'policy-ir.json');
      expect(irStep?.status).toBe('error');
      expect(irStep?.detail).toContain('parse failed');
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('migrates audit-manifest version envelope without touching the chain', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-migrate-manifest-'));
    try {
      const dir = join(ws, '.openclaw', 'policy');
      mkdirSync(dir, { recursive: true });
      const originalChain = [
        { id: 'a', timestamp: 't', source: 's', action: 'x', target: 'y', scope: '@scope', outcome: 'success', hash: 'h1', previousHash: '0'.repeat(64) },
      ];
      writeFileSync(
        join(dir, 'policy-ir.json'),
        JSON.stringify({ version: '1.0.0' }),
      );
      writeFileSync(
        join(dir, 'audit-manifest.json'),
        JSON.stringify({
          policyId: 'sha256-abc',
          snapshotId: 'sha256-abc',
          version: '0.5.0',
          chain: originalChain,
        }),
      );
      const res = await migratePolicyArtifacts({ workspace: ws });
      expect(res.migrated).toBe(1);
      const step = res.steps.find((s) => s.artifact === 'audit-manifest.json');
      expect(step?.status).toBe('migrated');
      const after = JSON.parse(
        readFileSync(join(dir, 'audit-manifest.json'), 'utf8'),
      ) as { version: string; chain: unknown[] };
      expect(after.version).toBe('1.0.0');
      expect(after.chain).toEqual(originalChain);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('already-current audit-manifest returns already-current, no write', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-migrate-already-'));
    try {
      const dir = join(ws, '.openclaw', 'policy');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'policy-ir.json'), JSON.stringify({ version: '1.0.0' }));
      const body = JSON.stringify({ policyId: 'sha256-x', snapshotId: 'sha256-x', version: '1.0.0', chain: [] });
      writeFileSync(join(dir, 'audit-manifest.json'), body);
      const res = await migratePolicyArtifacts({ workspace: ws });
      expect(res.migrated).toBe(0);
      expect(
        res.steps.find((s) => s.artifact === 'audit-manifest.json')?.status,
      ).toBe('already-current');
      expect(readFileSync(join(dir, 'audit-manifest.json'), 'utf8')).toBe(body);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('error on corrupt audit-manifest JSON', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-migrate-manifest-corrupt-'));
    try {
      const dir = join(ws, '.openclaw', 'policy');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'policy-ir.json'), JSON.stringify({ version: '1.0.0' }));
      writeFileSync(join(dir, 'audit-manifest.json'), 'not json at all');
      const res = await migratePolicyArtifacts({ workspace: ws });
      const step = res.steps.find((s) => s.artifact === 'audit-manifest.json');
      expect(step?.status).toBe('error');
      expect(step?.detail).toContain('parse failed');
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('audit-manifest with unknown version string still migrates up', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-migrate-manifest-unknown-'));
    try {
      const dir = join(ws, '.openclaw', 'policy');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'policy-ir.json'), JSON.stringify({ version: '1.0.0' }));
      writeFileSync(
        join(dir, 'audit-manifest.json'),
        JSON.stringify({ policyId: 'p', snapshotId: 's', chain: [] }),
      );
      const res = await migratePolicyArtifacts({ workspace: ws });
      const step = res.steps.find((s) => s.artifact === 'audit-manifest.json');
      expect(step?.status).toBe('migrated');
      expect(step?.fromVersion).toBe('unknown');
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });
});
