/**
 * L0: MockGovernanceHost — all 6 governance facets, config overrides,
 * audit event recording, diagnostic reporting, and reset.
 */

import { describe, it, expect } from 'vitest';
import {
  MockGovernanceHost,
  type MockGovernanceHostConfig,
} from '@bic/claws-test/gateway-sim/mock-governance-host';

// ── Constructor defaults ───────────────────────────────────────────────

describe('MockGovernanceHost — defaults', () => {
  it('constructs with no config, all defaults', async () => {
    const host = new MockGovernanceHost();

    // evaluatePolicy: default allowed
    const policy = await host.evaluatePolicy('read-file', {});
    expect(policy.allowed).toBe(true);
    expect(policy.blockReason).toBeNull();

    // resolveToolRisk: default R1 fail-open
    const risk = host.resolveToolRisk('read-file');
    expect(risk.riskLevel).toBe(1);
    expect(risk.failMode).toBe('open');

    // checkElicitation: default true
    const elicit = await host.checkElicitation('read-file', 'user');
    expect(elicit).toBe(true);

    // getConfig: default undefined
    expect(host.getConfig('any-key')).toBeUndefined();
  });
});

// ── evaluatePolicy ─────────────────────────────────────────────────────

describe('MockGovernanceHost — evaluatePolicy', () => {
  it('returns per-tool policy override when set', async () => {
    const host = new MockGovernanceHost({
      toolPolicies: {
        'send-email': { allowed: false, blockReason: 'G-OBO-GATE: blocked' },
      },
      defaultPolicy: { allowed: true, blockReason: null },
    });

    const blocked = await host.evaluatePolicy('send-email', {});
    expect(blocked.allowed).toBe(false);
    expect(blocked.blockReason).toBe('G-OBO-GATE: blocked');

    const allowed = await host.evaluatePolicy('read-file', {});
    expect(allowed.allowed).toBe(true);
  });

  it('falls back to defaultPolicy when no tool override', async () => {
    const host = new MockGovernanceHost({
      defaultPolicy: { allowed: false, blockReason: 'default-block' },
    });

    const result = await host.evaluatePolicy('unknown-tool', {});
    expect(result.allowed).toBe(false);
    expect(result.blockReason).toBe('default-block');
  });
});

// ── resolveToolRisk ────────────────────────────────────────────────────

describe('MockGovernanceHost — resolveToolRisk', () => {
  it('returns per-tool risk override', () => {
    const host = new MockGovernanceHost({
      toolRisks: {
        'send-email': { riskLevel: 5, failMode: 'closed' },
      },
    });

    const risk = host.resolveToolRisk('send-email');
    expect(risk.riskLevel).toBe(5);
    expect(risk.failMode).toBe('closed');
  });

  it('falls back to defaultRisk', () => {
    const host = new MockGovernanceHost({
      defaultRisk: { riskLevel: 3, failMode: 'closed' },
    });

    const risk = host.resolveToolRisk('any-tool');
    expect(risk.riskLevel).toBe(3);
    expect(risk.failMode).toBe('closed');
  });

  it('uses hardcoded default when no config', () => {
    const host = new MockGovernanceHost();
    const risk = host.resolveToolRisk('any-tool');
    expect(risk.riskLevel).toBe(1);
    expect(risk.failMode).toBe('open');
  });
});

// ── checkElicitation ───────────────────────────────────────────────────

describe('MockGovernanceHost — checkElicitation', () => {
  it('returns per-tool elicitation override', async () => {
    const host = new MockGovernanceHost({
      toolElicitations: {
        'send-email': false,
      },
    });

    const result = await host.checkElicitation('send-email', 'sarah');
    expect(result).toBe(false);
  });

  it('falls back to defaultElicitation', async () => {
    const host = new MockGovernanceHost({
      defaultElicitation: false,
    });

    const result = await host.checkElicitation('read-file', 'user');
    expect(result).toBe(false);
  });

  it('uses hardcoded default true when no config', async () => {
    const host = new MockGovernanceHost();
    const result = await host.checkElicitation('read-file', 'user');
    expect(result).toBe(true);
  });
});

// ── getConfig ──────────────────────────────────────────────────────────

describe('MockGovernanceHost — getConfig', () => {
  it('returns config values when set', () => {
    const host = new MockGovernanceHost({
      configValues: {
        'max-retries': 3,
        'timeout-ms': 5000,
        'debug': true,
      },
    });

    expect(host.getConfig('max-retries')).toBe(3);
    expect(host.getConfig('timeout-ms')).toBe(5000);
    expect(host.getConfig('debug')).toBe(true);
  });

  it('returns undefined for missing keys', () => {
    const host = new MockGovernanceHost({
      configValues: { existing: 'value' },
    });

    expect(host.getConfig('nonexistent')).toBeUndefined();
  });
});

// ── emitAuditEvent / getAuditEvents ────────────────────────────────────

describe('MockGovernanceHost — audit events', () => {
  it('records emitted audit events with timestamps', () => {
    const host = new MockGovernanceHost();

    host.emitAuditEvent({ event: 'policy-eval', toolName: 'read-file', allowed: true });
    host.emitAuditEvent({ event: 'after-call', toolName: 'read-file' });

    const events = host.getAuditEvents();
    expect(events).toHaveLength(2);
    expect(events[0]!.event).toBe('policy-eval');
    expect(events[0]!.toolName).toBe('read-file');
    expect(events[0]!.timestamp).toBeDefined();
    expect(events[1]!.event).toBe('after-call');
  });

  it('returns a copy, not the internal array', () => {
    const host = new MockGovernanceHost();
    host.emitAuditEvent({ event: 'test' });

    const events1 = host.getAuditEvents();
    const events2 = host.getAuditEvents();
    expect(events1).not.toBe(events2); // different array references
    expect(events1).toEqual(events2);  // same content
  });
});

// ── reportDiagnostic / getDiagnostics ──────────────────────────────────

describe('MockGovernanceHost — diagnostics', () => {
  it('records diagnostics of all severity levels', () => {
    const host = new MockGovernanceHost();

    host.reportDiagnostic({ code: 'G-001', message: 'Warning message', severity: 'warning' });
    host.reportDiagnostic({ code: 'G-002', message: 'Error message', severity: 'error' });
    host.reportDiagnostic({ code: 'G-003', message: 'Info message', severity: 'info' });

    const diagnostics = host.getDiagnostics();
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics[0]!.severity).toBe('warning');
    expect(diagnostics[1]!.severity).toBe('error');
    expect(diagnostics[2]!.severity).toBe('info');
  });

  it('returns a copy, not the internal array', () => {
    const host = new MockGovernanceHost();
    host.reportDiagnostic({ code: 'X', message: 'test', severity: 'info' });

    const d1 = host.getDiagnostics();
    const d2 = host.getDiagnostics();
    expect(d1).not.toBe(d2);
    expect(d1).toEqual(d2);
  });
});

// ── reset ──────────────────────────────────────────────────────────────

describe('MockGovernanceHost — reset', () => {
  it('clears both audit events and diagnostics', () => {
    const host = new MockGovernanceHost();

    host.emitAuditEvent({ event: 'test' });
    host.emitAuditEvent({ event: 'test2' });
    host.reportDiagnostic({ code: 'X', message: 'msg', severity: 'info' });

    expect(host.getAuditEvents()).toHaveLength(2);
    expect(host.getDiagnostics()).toHaveLength(1);

    host.reset();

    expect(host.getAuditEvents()).toHaveLength(0);
    expect(host.getDiagnostics()).toHaveLength(0);
  });

  it('does not affect config after reset', async () => {
    const host = new MockGovernanceHost({
      defaultPolicy: { allowed: false, blockReason: 'blocked' },
      configValues: { key: 'value' },
    });

    host.reset();

    // Config still works
    const policy = await host.evaluatePolicy('tool', {});
    expect(policy.allowed).toBe(false);
    expect(host.getConfig('key')).toBe('value');
  });
});
