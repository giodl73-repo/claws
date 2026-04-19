/**
 * L1 integration tests for session-tool-resolver.
 *
 * The three cases the pulse specifies:
 *  1. Cron session restricts tools to allowlist
 *  2. Agent session inherits delegator permissions minus revoked
 *  3. Main session gets full workspace tools
 *
 * Plus adjacent coverage for the unattended-approval fail-mode override,
 * cycle detection in delegation chains, and the channel/missing-lookup
 * branches so the resolver's per-file gate holds at 95/90/95/95.
 */

import { describe, expect, it } from 'vitest';

import type { RiskClassification } from '@bic/openclaw-workspace/path';
import {
  UNATTENDED_SESSION_TYPES,
  resolveSessionTools,
  resolveUnattendedFailMode,
  type SessionLookup,
} from '../../src/workspace/session-tool-resolver.js';
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

function mainState(id: string): SessionState {
  return {
    id,
    type: 'main',
    status: 'active',
    createdAt: '2026-04-17T00:00:00.000Z',
    lastActiveAt: '2026-04-17T00:01:00.000Z',
  };
}

function cronState(id: string): SessionState {
  return { ...mainState(id), type: 'cron', status: 'idle' };
}

function agentState(id: string): SessionState {
  return { ...mainState(id), type: 'agent' };
}

function channelState(id: string): SessionState {
  return { ...mainState(id), type: 'channel' };
}

const WORKSPACE: readonly ToolDefinition[] = [
  tool('read-file', 1),
  tool('write-file', 2),
  tool('send-email', 3),
  tool('exec-shell', 4),
  tool('transfer-funds', 5),
];

describe('resolveSessionTools — cron', () => {
  it('restricts cron sessions to the R1-R2 default allowlist when no override is set', () => {
    const resolved = resolveSessionTools(WORKSPACE, cronState('cron-1'), { type: 'cron', schedule: '*/5 * * * *' });
    expect(resolved.map((t) => t.name)).toEqual(['read-file', 'write-file']);
  });

  it('narrows to the intersection of R1-R2 defaults and an explicit allowlist', () => {
    const config: SessionConfig = {
      type: 'cron',
      schedule: '0 9 * * 1-5',
      toolAllowlist: ['read-file'],
    };
    const resolved = resolveSessionTools(WORKSPACE, cronState('cron-2'), config);
    expect(resolved.map((t) => t.name)).toEqual(['read-file']);
  });

  it('admits R3+ tools only when explicitly pre-authorized via the allowlist', () => {
    const config: SessionConfig = {
      type: 'cron',
      schedule: '0 9 * * 1-5',
      toolAllowlist: ['read-file', 'send-email'],
    };
    const resolved = resolveSessionTools(WORKSPACE, cronState('cron-3'), config);
    expect(resolved.map((t) => t.name)).toEqual(['read-file', 'send-email']);
  });
});

describe('resolveSessionTools — agent delegation', () => {
  it('inherits the delegator permission set minus revoked tools', () => {
    const delegator = mainState('parent');
    const delegatorConfig: SessionConfig = { type: 'main' };
    const delegate = agentState('child');
    const delegateConfig: SessionConfig = {
      type: 'agent',
      delegatorSessionId: 'parent',
      revokedTools: ['transfer-funds', 'exec-shell'],
    };

    const lookup: SessionLookup = (id) =>
      id === 'parent' ? { state: delegator, config: delegatorConfig } : null;

    const resolved = resolveSessionTools(WORKSPACE, delegate, delegateConfig, { lookup });
    expect(resolved.map((t) => t.name)).toEqual(['read-file', 'write-file', 'send-email']);
  });

  it('walks recursively and respects each level of revocation', () => {
    const grandparent = mainState('gp');
    const parent = agentState('parent');
    const child = agentState('child');

    const gpConfig: SessionConfig = { type: 'main' };
    const parentConfig: SessionConfig = {
      type: 'agent',
      delegatorSessionId: 'gp',
      revokedTools: ['transfer-funds'],
    };
    const childConfig: SessionConfig = {
      type: 'agent',
      delegatorSessionId: 'parent',
      revokedTools: ['exec-shell'],
    };

    const registry: Record<string, { state: SessionState; config: SessionConfig }> = {
      gp: { state: grandparent, config: gpConfig },
      parent: { state: parent, config: parentConfig },
    };
    const lookup: SessionLookup = (id) => registry[id] ?? null;

    const resolved = resolveSessionTools(WORKSPACE, child, childConfig, { lookup });
    expect(resolved.map((t) => t.name)).toEqual(['read-file', 'write-file', 'send-email']);
  });

  it('fails closed when the delegator is unknown', () => {
    const delegate = agentState('orphan');
    const delegateConfig: SessionConfig = {
      type: 'agent',
      delegatorSessionId: 'missing',
    };
    const lookup: SessionLookup = () => null;
    const resolved = resolveSessionTools(WORKSPACE, delegate, delegateConfig, { lookup });
    expect(resolved).toEqual([]);
  });

  it('fails closed on a delegation cycle', () => {
    const a = agentState('a');
    const b = agentState('b');
    const aConfig: SessionConfig = { type: 'agent', delegatorSessionId: 'b' };
    const bConfig: SessionConfig = { type: 'agent', delegatorSessionId: 'a' };
    const registry: Record<string, { state: SessionState; config: SessionConfig }> = {
      a: { state: a, config: aConfig },
      b: { state: b, config: bConfig },
    };
    const lookup: SessionLookup = (id) => registry[id] ?? null;

    const resolved = resolveSessionTools(WORKSPACE, a, aConfig, { lookup });
    expect(resolved).toEqual([]);
  });

  it('throws when an agent session is resolved without a lookup', () => {
    const delegate = agentState('child');
    const delegateConfig: SessionConfig = { type: 'agent', delegatorSessionId: 'parent' };
    expect(() => resolveSessionTools(WORKSPACE, delegate, delegateConfig)).toThrow(
      /requires a SessionLookup/,
    );
  });
});

describe('resolveSessionTools — main & channel', () => {
  it('returns the full workspace tool set for a main session', () => {
    const resolved = resolveSessionTools(WORKSPACE, mainState('m'), { type: 'main' });
    expect(resolved.map((t) => t.name)).toEqual(WORKSPACE.map((t) => t.name));
    // Copy, not the live array — callers may mutate without affecting input.
    expect(resolved).not.toBe(WORKSPACE);
  });

  it('returns the full workspace tool set for a channel session', () => {
    const resolved = resolveSessionTools(WORKSPACE, channelState('c'), {
      type: 'channel',
      channel: 'teams:ops',
    });
    expect(resolved).toHaveLength(WORKSPACE.length);
  });

  it('rejects a state/config type mismatch', () => {
    expect(() =>
      resolveSessionTools(WORKSPACE, mainState('m'), { type: 'cron', schedule: '* * * * *' }),
    ).toThrow(/type=main but config.type=cron/);
  });
});

describe('resolveUnattendedFailMode', () => {
  it('forces deny when a cron session requires external approval', () => {
    expect(resolveUnattendedFailMode('cron', true, 'allow')).toBe('deny');
  });

  it('forces deny when an agent session requires external approval', () => {
    expect(resolveUnattendedFailMode('agent', true, 'allow')).toBe('deny');
  });

  it('passes through the configured fail mode for attended sessions', () => {
    expect(resolveUnattendedFailMode('main', true, 'allow')).toBe('allow');
    expect(resolveUnattendedFailMode('channel', true, 'allow')).toBe('allow');
  });

  it('passes through when the call does not require external approval', () => {
    expect(resolveUnattendedFailMode('cron', false, 'allow')).toBe('allow');
    expect(resolveUnattendedFailMode('agent', false, 'allow')).toBe('allow');
  });

  it('exposes the unattended-session set for external composition', () => {
    expect(UNATTENDED_SESSION_TYPES.has('cron')).toBe(true);
    expect(UNATTENDED_SESSION_TYPES.has('agent')).toBe(true);
    expect(UNATTENDED_SESSION_TYPES.has('main')).toBe(false);
    expect(UNATTENDED_SESSION_TYPES.has('channel')).toBe(false);
  });
});
