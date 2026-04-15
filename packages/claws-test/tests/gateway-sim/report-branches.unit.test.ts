/**
 * L0: SimReport — branch coverage for toString(), toJSON(), diff(),
 * getEntries(), timing baselines, and diffSeverity edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  SimReport,
  hasRegressions,
  diffSeverity,
} from '@bic/claws-test/gateway-sim/report';

// ── toString ───────────────────────────────────────────────────────────

describe('SimReport — toString', () => {
  it('returns "No enforcement entries." when empty', () => {
    const report = new SimReport();
    expect(report.toString()).toBe('No enforcement entries.');
  });

  it('includes timing baselines when present', () => {
    const report = new SimReport();
    report.addEntry({
      toolName: 'tool-a',
      outcome: 'ALLOWED',
      ruleId: 'default',
      riskLevel: 1,
      timingMs: 2.5,
      reason: '',
      actor: 'system',
      timestamp: '2026-04-13T00:00:00.000Z',
    });
    report.setTimingBaselines([
      { hookName: 'beforeToolCall', p50: 1.5, p95: 3.2, p99: 4.1, count: 10 },
    ]);

    const text = report.toString();
    expect(text).toContain('tool-a: ALLOWED');
    expect(text).toContain('Timing baselines:');
    expect(text).toContain('beforeToolCall:');
    expect(text).toContain('p50=');
    expect(text).toContain('p95=');
    expect(text).toContain('p99=');
    expect(text).toContain('n=10');
  });

  it('includes reason with em dash when present', () => {
    const report = new SimReport();
    report.addEntry({
      toolName: 'tool-a',
      outcome: 'BLOCKED',
      ruleId: 'G-OBO-GATE',
      riskLevel: 5,
      timingMs: 1.0,
      reason: 'OBO blocked',
      actor: 'sarah',
      timestamp: '2026-04-13T00:00:00.000Z',
    });

    const text = report.toString();
    expect(text).toContain('OBO blocked');
  });

  it('omits reason portion when empty', () => {
    const report = new SimReport();
    report.addEntry({
      toolName: 'tool-a',
      outcome: 'ALLOWED',
      ruleId: 'default',
      riskLevel: 1,
      timingMs: 1.0,
      reason: '',
      actor: 'system',
      timestamp: '2026-04-13T00:00:00.000Z',
    });

    const text = report.toString();
    // Should NOT contain em dash when reason is empty
    expect(text).not.toContain('\u2014');
  });

  it('counts all 4 outcome types in stats', () => {
    const report = new SimReport();
    const outcomes: Array<'BLOCKED' | 'ALLOWED' | 'ELICITED' | 'ERROR'> = [
      'BLOCKED', 'ALLOWED', 'ELICITED', 'ERROR',
    ];
    for (const outcome of outcomes) {
      report.addEntry({
        toolName: `tool-${outcome}`,
        outcome,
        ruleId: 'test',
        riskLevel: 3,
        timingMs: 1.0,
        reason: '',
        actor: 'system',
        timestamp: '2026-04-13T00:00:00.000Z',
      });
    }

    const text = report.toString();
    expect(text).toContain('Total: 4');
    expect(text).toContain('Blocked: 1');
    expect(text).toContain('Allowed: 1');
    expect(text).toContain('Elicited: 1');
    expect(text).toContain('Errors: 1');
  });
});

// ── toJSON ──────────────────────────────────────────────────────────────

describe('SimReport — toJSON', () => {
  it('uses default workspace metadata when not provided', () => {
    const report = new SimReport();
    const json = report.toJSON();

    expect(json.workspace.workspacePath).toBe('');
    expect(json.workspace.workspaceId).toBe('');
    expect(json.workspace.policyVersion).toBe('0.0.0');
    expect(json.workspace.clawsVersion).toBe('0.36.0');
    expect(json.entries).toHaveLength(0);
    expect(json.stats.total).toBe(0);
  });

  it('maps all entries to SIEM format', () => {
    const report = new SimReport({ workspacePath: '/ws' });
    report.addEntry({
      toolName: 'send-email',
      outcome: 'BLOCKED',
      ruleId: 'G-OBO-GATE',
      riskLevel: 5,
      timingMs: 2.0,
      reason: 'blocked',
      actor: 'sarah',
      timestamp: '2026-04-13T00:00:00.000Z',
    });
    report.addEntry({
      toolName: 'read-file',
      outcome: 'ALLOWED',
      ruleId: 'default',
      riskLevel: 1,
      timingMs: 1.0,
      reason: '',
      actor: 'system',
      timestamp: '2026-04-13T00:00:01.000Z',
    });

    const json = report.toJSON();
    expect(json.entries).toHaveLength(2);
    expect(json.entries[0]!.source).toBe('claws-gateway-sim');
    expect(json.entries[0]!.action).toBe('tool-call:send-email');
    expect(json.stats.blocked).toBe(1);
    expect(json.stats.allowed).toBe(1);
  });
});

// ── getEntries ─────────────────────────────────────────────────────────

describe('SimReport — getEntries', () => {
  it('returns a copy of entries', () => {
    const report = new SimReport();
    report.addEntry({
      toolName: 'a',
      outcome: 'ALLOWED',
      ruleId: 'default',
      riskLevel: 1,
      timingMs: 1,
      reason: '',
      actor: 'system',
      timestamp: '2026-04-13T00:00:00.000Z',
    });

    const e1 = report.getEntries();
    const e2 = report.getEntries();
    expect(e1).not.toBe(e2);
    expect(e1).toEqual(e2);
  });
});

// ── diff ───────────────────────────────────────────────────────────────

describe('SimReport.diff', () => {
  it('detects unchanged tools', () => {
    const a = new SimReport();
    const b = new SimReport();
    a.addEntry({ toolName: 'tool', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 1, timingMs: 1, reason: '', actor: 's', timestamp: 't' });
    b.addEntry({ toolName: 'tool', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 1, timingMs: 1, reason: '', actor: 's', timestamp: 't' });

    const diff = SimReport.diff(a, b);
    expect(diff.unchanged).toEqual(['tool']);
    expect(diff.regressions).toHaveLength(0);
    expect(diff.improvements).toHaveLength(0);
  });

  it('skips tools only in one report', () => {
    const a = new SimReport();
    const b = new SimReport();
    a.addEntry({ toolName: 'only-a', outcome: 'BLOCKED', ruleId: 'x', riskLevel: 5, timingMs: 1, reason: '', actor: 's', timestamp: 't' });
    b.addEntry({ toolName: 'only-b', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 1, timingMs: 1, reason: '', actor: 's', timestamp: 't' });

    const diff = SimReport.diff(a, b);
    expect(diff.unchanged).toHaveLength(0);
    expect(diff.regressions).toHaveLength(0);
    expect(diff.improvements).toHaveLength(0);
  });

  it('uses latest entry per tool when multiple entries exist', () => {
    const a = new SimReport();
    const b = new SimReport();
    // Two entries for same tool in 'a': latest is ALLOWED
    a.addEntry({ toolName: 'tool', outcome: 'BLOCKED', ruleId: 'x', riskLevel: 5, timingMs: 1, reason: '', actor: 's', timestamp: 't1' });
    a.addEntry({ toolName: 'tool', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 5, timingMs: 1, reason: '', actor: 's', timestamp: 't2' });
    b.addEntry({ toolName: 'tool', outcome: 'BLOCKED', ruleId: 'x', riskLevel: 5, timingMs: 1, reason: '', actor: 's', timestamp: 't' });

    const diff = SimReport.diff(a, b);
    // ALLOWED -> BLOCKED is improvement (tighter)
    expect(diff.improvements).toHaveLength(1);
    expect(diff.improvements[0]!.before).toBe('ALLOWED');
    expect(diff.improvements[0]!.after).toBe('BLOCKED');
  });
});

// ── diffSeverity edge cases ────────────────────────────────────────────

describe('diffSeverity', () => {
  it('returns "clean" when no regressions', () => {
    const diff = { regressions: [], improvements: [], unchanged: ['a'] };
    expect(diffSeverity(diff)).toBe('clean');
  });

  it('returns "critical" for R5 regression', () => {
    const diff = {
      regressions: [{ toolName: 'x', before: 'BLOCKED' as const, after: 'ALLOWED' as const, riskLevel: 5 }],
      improvements: [],
      unchanged: [],
    };
    expect(diffSeverity(diff)).toBe('critical');
  });

  it('returns "warning" for R3-R4 regression (below R5)', () => {
    const diff = {
      regressions: [{ toolName: 'x', before: 'BLOCKED' as const, after: 'ALLOWED' as const, riskLevel: 4 }],
      improvements: [],
      unchanged: [],
    };
    expect(diffSeverity(diff)).toBe('warning');
  });

  it('returns "warning" for R3 regression', () => {
    const diff = {
      regressions: [{ toolName: 'x', before: 'BLOCKED' as const, after: 'ALLOWED' as const, riskLevel: 3 }],
      improvements: [],
      unchanged: [],
    };
    expect(diffSeverity(diff)).toBe('warning');
  });

  it('returns "clean" for R1-R2 regressions (below warning threshold)', () => {
    const diff = {
      regressions: [{ toolName: 'x', before: 'BLOCKED' as const, after: 'ALLOWED' as const, riskLevel: 2 }],
      improvements: [],
      unchanged: [],
    };
    expect(diffSeverity(diff)).toBe('clean');
  });
});

// ── hasRegressions ─────────────────────────────────────────────────────

describe('hasRegressions', () => {
  it('returns false when regressions array is empty', () => {
    expect(hasRegressions({ regressions: [], improvements: [], unchanged: [] })).toBe(false);
  });

  it('returns true when regressions exist', () => {
    expect(hasRegressions({
      regressions: [{ toolName: 'x', before: 'BLOCKED' as const, after: 'ALLOWED' as const, riskLevel: 5 }],
      improvements: [],
      unchanged: [],
    })).toBe(true);
  });
});

// ── timingBaseline accessor ────────────────────────────────────────────

describe('SimReport — timingBaseline', () => {
  it('returns empty array by default', () => {
    const report = new SimReport();
    expect(report.timingBaseline()).toEqual([]);
  });

  it('returns set baselines', () => {
    const report = new SimReport();
    const baselines = [
      { hookName: 'beforeToolCall', p50: 1, p95: 2, p99: 3, count: 5 },
    ];
    report.setTimingBaselines(baselines);
    expect(report.timingBaseline()).toEqual(baselines);
  });
});
