/**
 * L0 unit tests for session-config-editor (pulse 65).
 *
 * Six core cases the pulse specifies, plus adjacent coverage to hold the
 * module at the 95/90/95/95 per-file gate:
 *   1. Add R1 tool to cron session (defaults path)           — ok
 *   2. Add R5 tool to cron session                           — R5_LOCKED
 *   3. Schedule-set on a cron session                        — ok
 *   4. Tool-remove from a cron session                       — ok
 *   5. Fleet-locked tool rejection                           — FLEET_LOCKED
 *   6. Invalid session type (channel)                        — SESSION_TYPE_UNSUPPORTED
 * Plus: agent tool add/remove/revoke-set, R3 pre-auth gate, unknown tool,
 * invalid schedule, and cross-type deltas so every branch is exercised.
 */

import { describe, expect, it } from 'vitest';
import type { RiskClassification } from '@bic/openclaw-workspace/path';
import {
  editSessionConfig,
  SESSION_CONFIG_LOG_HEADING,
  type SessionConfigEditContext,
  type SessionConfigEditTarget,
} from '../../src/workspace/session-config-editor.js';
import type {
  AuditChainSink,
  AuditEventInput,
} from '../../src/compliance/audit-chain.js';
import type {
  SessionConfig,
  SessionState,
  ToolDefinition,
} from '../../src/workspace/session-types.js';

function risk(level: 1 | 2 | 3 | 4 | 5): RiskClassification {
  switch (level) {
    case 1:
      return { level: 1, capability: 'read' };
    case 2:
      return { level: 2, capability: 'write' };
    case 3:
      return { level: 3, capability: 'communicate' };
    case 4:
      return { level: 4, capability: 'execute' };
    case 5:
      return { level: 5, capability: 'transact' };
  }
}

function tool(name: string, level: 1 | 2 | 3 | 4 | 5): ToolDefinition {
  return { name, risk: risk(level) };
}

const WORKSPACE: readonly ToolDefinition[] = [
  tool('read-file', 1),
  tool('write-file', 2),
  tool('send-email', 3),
  tool('exec-shell', 4),
  tool('transfer-funds', 5),
];

function cronTarget(
  id: string,
  config: Partial<Extract<SessionConfig, { type: 'cron' }>> = {},
): SessionConfigEditTarget {
  const state: SessionState = {
    id,
    type: 'cron',
    status: 'idle',
    createdAt: '2026-04-17T00:00:00.000Z',
    lastActiveAt: '2026-04-17T00:01:00.000Z',
  };
  return {
    state,
    config: { type: 'cron', schedule: '*/5 * * * *', ...config },
  };
}

function agentTarget(
  id: string,
  config: Partial<Extract<SessionConfig, { type: 'agent' }>> = {},
): SessionConfigEditTarget {
  const state: SessionState = {
    id,
    type: 'agent',
    status: 'active',
    createdAt: '2026-04-17T00:00:00.000Z',
    lastActiveAt: '2026-04-17T00:01:00.000Z',
  };
  return {
    state,
    config: { type: 'agent', delegatorSessionId: 'main', ...config },
  };
}

function ctx(
  overrides: Partial<SessionConfigEditContext> = {},
): SessionConfigEditContext {
  return {
    workspaceTools: overrides.workspaceTools ?? WORKSPACE,
    fleetLockedTools: overrides.fleetLockedTools ?? new Set<string>(),
    ...(overrides.cronPreAuth !== undefined ? { cronPreAuth: overrides.cronPreAuth } : {}),
  };
}

describe('editSessionConfig — cron', () => {
  it('adds an R1/R2 tool to the allowlist without pre-auth', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.targetFile).toBe('HEARTBEAT.md');
    expect(result.plan.logLine).toBe('- session:cron-1 tool:read-file');
    const next = result.plan.nextConfig;
    if (next.type !== 'cron') throw new Error('expected cron');
    expect(next.toolAllowlist).toEqual(['read-file']);
    expect(next.schedule).toBe('*/5 * * * *');
  });

  it('rejects an R5 tool with R5_LOCKED', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'transfer-funds' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('R5_LOCKED');
    expect(result.error.tool).toBe('transfer-funds');
    expect(result.error.sessionId).toBe('cron-1');
  });

  it('accepts a schedule change for a cron session and carries an allowlist through', () => {
    const result = editSessionConfig(
      cronTarget('cron-1', { toolAllowlist: ['read-file'] }),
      { kind: 'schedule-set', schedule: '0 9 * * 1-5' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'cron') throw new Error('expected cron');
    expect(next.schedule).toBe('0 9 * * 1-5');
    expect(next.toolAllowlist).toEqual(['read-file']);
    expect(result.plan.logLine).toBe('- session:cron-1 schedule:0 9 * * 1-5');
  });

  it('drops a tool from the allowlist on tool-remove and collapses to undefined when empty', () => {
    const result = editSessionConfig(
      cronTarget('cron-1', { toolAllowlist: ['read-file'] }),
      { kind: 'tool-remove', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'cron') throw new Error('expected cron');
    expect(next.toolAllowlist).toBeUndefined();
    expect(result.plan.logLine).toBe('- session:cron-1 tool:read-file removed');
  });

  it('rejects a fleet-locked tool with FLEET_LOCKED', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'write-file' },
      ctx({ fleetLockedTools: new Set(['write-file']) }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('FLEET_LOCKED');
  });
});

describe('editSessionConfig — unsupported types', () => {
  it('rejects every edit on a channel session with SESSION_TYPE_UNSUPPORTED', () => {
    const state: SessionState = {
      id: 'channel-1',
      type: 'channel',
      status: 'active',
      createdAt: '2026-04-17T00:00:00.000Z',
      lastActiveAt: '2026-04-17T00:01:00.000Z',
    };
    const target: SessionConfigEditTarget = {
      state,
      config: { type: 'channel', channel: 'teams:abc' },
    };
    const result = editSessionConfig(
      target,
      { kind: 'tool-add', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_TYPE_UNSUPPORTED');
  });

  it('rejects edits on main sessions', () => {
    const state: SessionState = {
      id: 'main',
      type: 'main',
      status: 'active',
      createdAt: '2026-04-17T00:00:00.000Z',
      lastActiveAt: '2026-04-17T00:01:00.000Z',
    };
    const target: SessionConfigEditTarget = {
      state,
      config: { type: 'main' },
    };
    const result = editSessionConfig(
      target,
      { kind: 'tool-add', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_TYPE_UNSUPPORTED');
  });

  it('rejects when state.type and config.type diverge', () => {
    const state: SessionState = {
      id: 'cron-1',
      type: 'cron',
      status: 'idle',
      createdAt: '2026-04-17T00:00:00.000Z',
      lastActiveAt: '2026-04-17T00:01:00.000Z',
    };
    const target: SessionConfigEditTarget = {
      state,
      config: { type: 'main' },
    };
    const result = editSessionConfig(
      target,
      { kind: 'tool-add', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_TYPE_UNSUPPORTED');
  });
});

describe('editSessionConfig — cron R3+ pre-auth gate', () => {
  it('rejects R3 tool add without pre-auth', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'send-email' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PRE_AUTH_REQUIRED');
  });

  it('accepts R3 tool add when HEARTBEAT.md pre-auth contains the tool', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'send-email' },
      ctx({ cronPreAuth: new Set(['send-email']) }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'cron') throw new Error('expected cron');
    expect(next.toolAllowlist).toEqual(['send-email']);
  });

  it('appends a new tool to an existing allowlist preserving order', () => {
    const result = editSessionConfig(
      cronTarget('cron-1', { toolAllowlist: ['read-file'] }),
      { kind: 'tool-add', tool: 'write-file' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'cron') throw new Error('expected cron');
    expect(next.toolAllowlist).toEqual(['read-file', 'write-file']);
  });

  it('keeps toolAllowlist order and de-dups repeated adds', () => {
    const result = editSessionConfig(
      cronTarget('cron-1', { toolAllowlist: ['read-file'] }),
      { kind: 'tool-add', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'cron') throw new Error('expected cron');
    expect(next.toolAllowlist).toEqual(['read-file']);
  });

  it('tool-remove on an empty allowlist is a no-op', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-remove', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'cron') throw new Error('expected cron');
    expect(next.toolAllowlist).toBeUndefined();
  });

  it('rejects an unknown tool name with TOOL_UNKNOWN', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'nonexistent' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TOOL_UNKNOWN');
    expect(result.error.tool).toBe('nonexistent');
  });

  it('rejects malformed cron expressions with INVALID_SCHEDULE', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'schedule-set', schedule: 'not a cron' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SCHEDULE');
  });

  it('rejects revoke-set on cron sessions', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'revoke-set', revokedTools: ['read-file'] },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_TYPE_UNSUPPORTED');
  });
});

describe('editSessionConfig — agent', () => {
  it('adds a tool (drops it from revokedTools) and writes to AGENTS.md', () => {
    const result = editSessionConfig(
      agentTarget('agent-1', { revokedTools: ['read-file', 'write-file'] }),
      { kind: 'tool-add', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.targetFile).toBe('AGENTS.md');
    const next = result.plan.nextConfig;
    if (next.type !== 'agent') throw new Error('expected agent');
    expect(next.revokedTools).toEqual(['write-file']);
  });

  it('removes a tool (adds it to revokedTools)', () => {
    const result = editSessionConfig(
      agentTarget('agent-1'),
      { kind: 'tool-remove', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'agent') throw new Error('expected agent');
    expect(next.revokedTools).toEqual(['read-file']);
    expect(result.plan.logLine).toBe('- session:agent-1 tool:read-file removed');
  });

  it('replaces the revoked set via revoke-set and de-dups entries', () => {
    const result = editSessionConfig(
      agentTarget('agent-1'),
      {
        kind: 'revoke-set',
        revokedTools: ['read-file', 'write-file', 'read-file'],
      },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'agent') throw new Error('expected agent');
    expect(next.revokedTools).toEqual(['read-file', 'write-file']);
    expect(result.plan.logLine).toBe(
      '- session:agent-1 revoked:read-file,write-file',
    );
  });

  it('revoke-set with an empty list clears revokedTools', () => {
    const result = editSessionConfig(
      agentTarget('agent-1', { revokedTools: ['read-file'] }),
      { kind: 'revoke-set', revokedTools: [] },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'agent') throw new Error('expected agent');
    expect(next.revokedTools).toBeUndefined();
  });

  it('revoke-set rejects unknown tools', () => {
    const result = editSessionConfig(
      agentTarget('agent-1'),
      { kind: 'revoke-set', revokedTools: ['nonexistent'] },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TOOL_UNKNOWN');
  });

  it('blocks R5 tool add on agent sessions', () => {
    const result = editSessionConfig(
      agentTarget('agent-1', { revokedTools: ['transfer-funds'] }),
      { kind: 'tool-add', tool: 'transfer-funds' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('R5_LOCKED');
  });

  it('blocks fleet-locked tool-add on agent sessions', () => {
    const result = editSessionConfig(
      agentTarget('agent-1', { revokedTools: ['write-file'] }),
      { kind: 'tool-add', tool: 'write-file' },
      ctx({ fleetLockedTools: new Set(['write-file']) }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('FLEET_LOCKED');
  });

  it('rejects tool-add with an unknown tool name', () => {
    const result = editSessionConfig(
      agentTarget('agent-1'),
      { kind: 'tool-add', tool: 'nonexistent' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TOOL_UNKNOWN');
  });

  it('rejects schedule-set on agent sessions', () => {
    const result = editSessionConfig(
      agentTarget('agent-1'),
      { kind: 'schedule-set', schedule: '*/5 * * * *' },
      ctx(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_TYPE_UNSUPPORTED');
  });

  it('tool-add drops the single revoked entry and collapses to undefined', () => {
    const result = editSessionConfig(
      agentTarget('agent-1', { revokedTools: ['read-file'] }),
      { kind: 'tool-add', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'agent') throw new Error('expected agent');
    expect(next.revokedTools).toBeUndefined();
  });

  it('tool-add on already-allowed agent (no existing revokedTools) is a no-op but recorded', () => {
    const result = editSessionConfig(
      agentTarget('agent-1'),
      { kind: 'tool-add', tool: 'read-file' },
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.plan.nextConfig;
    if (next.type !== 'agent') throw new Error('expected agent');
    expect(next.revokedTools).toBeUndefined();
    expect(result.plan.logLine).toBe('- session:agent-1 tool:read-file');
  });
});

describe('session config log heading', () => {
  it('exports the canonical log section heading', () => {
    expect(SESSION_CONFIG_LOG_HEADING).toBe('Session Config Log');
  });
});

function capturingSink(): { readonly sink: AuditChainSink; readonly events: AuditEventInput[] } {
  const events: AuditEventInput[] = [];
  return {
    events,
    sink: { emit: (event) => { events.push(event); } },
  };
}

describe('editSessionConfig — actor threading (CP-7 R1)', () => {
  it('appends actor suffix to the log line when actor is supplied', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'read-file' },
      { ...ctx(), actor: 'alice@contoso' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.logLine).toBe(
      '- session:cron-1 tool:read-file actor:alice@contoso',
    );
  });

  it('omits actor suffix when actor is an empty string (defensive)', () => {
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'read-file' },
      { ...ctx(), actor: '' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.logLine).toBe('- session:cron-1 tool:read-file');
  });

  it('threads actor through schedule-set, tool-remove, revoke-set log lines', () => {
    const schedule = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'schedule-set', schedule: '0 9 * * 1-5' },
      { ...ctx(), actor: 'bob' },
    );
    expect(schedule.ok).toBe(true);
    if (!schedule.ok) return;
    expect(schedule.plan.logLine).toBe(
      '- session:cron-1 schedule:0 9 * * 1-5 actor:bob',
    );

    const remove = editSessionConfig(
      cronTarget('cron-1', { toolAllowlist: ['read-file'] }),
      { kind: 'tool-remove', tool: 'read-file' },
      { ...ctx(), actor: 'bob' },
    );
    expect(remove.ok).toBe(true);
    if (!remove.ok) return;
    expect(remove.plan.logLine).toBe(
      '- session:cron-1 tool:read-file removed actor:bob',
    );

    const revoke = editSessionConfig(
      agentTarget('agent-1'),
      { kind: 'revoke-set', revokedTools: ['read-file'] },
      { ...ctx(), actor: 'bob' },
    );
    expect(revoke.ok).toBe(true);
    if (!revoke.ok) return;
    expect(revoke.plan.logLine).toBe(
      '- session:agent-1 revoked:read-file actor:bob',
    );

    const agentRemove = editSessionConfig(
      agentTarget('agent-1'),
      { kind: 'tool-remove', tool: 'read-file' },
      { ...ctx(), actor: 'bob' },
    );
    expect(agentRemove.ok).toBe(true);
    if (!agentRemove.ok) return;
    expect(agentRemove.plan.logLine).toBe(
      '- session:agent-1 tool:read-file removed actor:bob',
    );

    const agentAdd = editSessionConfig(
      agentTarget('agent-1', { revokedTools: ['read-file'] }),
      { kind: 'tool-add', tool: 'read-file' },
      { ...ctx(), actor: 'bob' },
    );
    expect(agentAdd.ok).toBe(true);
    if (!agentAdd.ok) return;
    expect(agentAdd.plan.logLine).toBe(
      '- session:agent-1 tool:read-file actor:bob',
    );
  });
});

describe('editSessionConfig — audit sink emission (CP-7 R1 ciso M2)', () => {
  it('emits one SESSION_CONFIG_EDIT entry for a successful tool-add on cron', () => {
    const { sink, events } = capturingSink();
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'read-file' },
      { ...ctx(), auditSink: sink, actor: 'alice', policyVersion: 'v42' },
    );
    expect(result.ok).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      eventType: 'SESSION_CONFIG_EDIT',
      actor: 'alice',
      target: 'session:cron-1 tool:read-file',
      action: 'tool-add',
      outcome: 'HEARTBEAT.md',
      ruleId: 'SESSION_CONFIG_EDIT',
      severity: 3,
      policyVersion: 'v42',
    });
  });

  it('defaults actor to "anonymous" and policyVersion to "unknown" when absent', () => {
    const { sink, events } = capturingSink();
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'read-file' },
      { ...ctx(), auditSink: sink },
    );
    expect(result.ok).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]?.actor).toBe('anonymous');
    expect(events[0]?.policyVersion).toBe('unknown');
  });

  it('emits schedule-set entries with target of only session id', () => {
    const { sink, events } = capturingSink();
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'schedule-set', schedule: '0 9 * * 1-5' },
      { ...ctx(), auditSink: sink },
    );
    expect(result.ok).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe('schedule-set');
    expect(events[0]?.target).toBe('session:cron-1');
    expect(events[0]?.outcome).toBe('HEARTBEAT.md');
  });

  it('emits tool-remove entries with tool subject', () => {
    const { sink, events } = capturingSink();
    const result = editSessionConfig(
      cronTarget('cron-1', { toolAllowlist: ['read-file'] }),
      { kind: 'tool-remove', tool: 'read-file' },
      { ...ctx(), auditSink: sink },
    );
    expect(result.ok).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe('tool-remove');
    expect(events[0]?.target).toBe('session:cron-1 tool:read-file');
  });

  it('emits revoke-set entries with comma-joined tool list and AGENTS.md outcome', () => {
    const { sink, events } = capturingSink();
    const result = editSessionConfig(
      agentTarget('agent-1'),
      { kind: 'revoke-set', revokedTools: ['read-file', 'write-file'] },
      { ...ctx(), auditSink: sink },
    );
    expect(result.ok).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe('revoke-set');
    expect(events[0]?.target).toBe('session:agent-1 revoked:read-file,write-file');
    expect(events[0]?.outcome).toBe('AGENTS.md');
  });

  it('does NOT emit when the edit fails (R5_LOCKED)', () => {
    const { sink, events } = capturingSink();
    const result = editSessionConfig(
      cronTarget('cron-1'),
      { kind: 'tool-add', tool: 'transfer-funds' },
      { ...ctx(), auditSink: sink },
    );
    expect(result.ok).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('does NOT emit when the session type is unsupported', () => {
    const { sink, events } = capturingSink();
    const state: SessionState = {
      id: 'main',
      type: 'main',
      status: 'active',
      createdAt: '2026-04-17T00:00:00.000Z',
      lastActiveAt: '2026-04-17T00:01:00.000Z',
    };
    const target: SessionConfigEditTarget = {
      state,
      config: { type: 'main' },
    };
    const result = editSessionConfig(
      target,
      { kind: 'tool-add', tool: 'read-file' },
      { ...ctx(), auditSink: sink },
    );
    expect(result.ok).toBe(false);
    expect(events).toHaveLength(0);
  });
});
