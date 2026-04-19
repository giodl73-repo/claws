/**
 * L1 integration tests for approval-events (CL-12 session-context amendment).
 *
 * Two cases from the pulse plan:
 *  1. approval event round-trips session context through serialize/deserialize
 *  2. approval events from different session types produce distinct display labels
 */

import { describe, expect, it } from 'vitest';

import {
  createApprovalRequest,
  formatApprovalLabel,
  type ApprovalRequestEvent,
  type ApprovalSessionType,
} from '../../src/workspace/approval-events.js';

const TOOL = {
  server: 'outlook',
  tool: 'send-email',
  arguments: { to: 'user@example.com', subject: 'triage' },
} as const;

const RISK = {
  level: 3,
  capability: 'communicate',
  reason: 'send-email crosses R3 communicate boundary',
} as const;

const GOVERNANCE = {
  provider: 'openclaw-governance',
  ruleId: 'R3-communicate-default',
  fleetPolicyApplied: true,
} as const;

describe('approval event round-trip', () => {
  it('survives JSON serialize/deserialize with session context intact', () => {
    const event = createApprovalRequest(TOOL, {
      requestId: 'req-rt-1',
      timestamp: '2026-04-17T14:15:00.000Z',
      risk: RISK,
      governance: GOVERNANCE,
      conversationId: 'conv-rt-1',
      workspaceId: 'ws-rt-1',
      agentId: 'agent-rt-1',
      session: { id: 'cron:daily-triage', type: 'cron', name: 'Daily Triage' },
      extensions: { uiHint: 'inline' },
    });

    const json = JSON.stringify(event);
    const restored = JSON.parse(json) as ApprovalRequestEvent;

    expect(restored).toEqual(event);
    expect(restored.context.sessionId).toBe('cron:daily-triage');
    expect(restored.context.sessionType).toBe('cron');
    expect(restored.context.sessionName).toBe('Daily Triage');
    expect(formatApprovalLabel(restored)).toBe('Daily Triage (cron)');
  });
});

describe('distinct display labels across session types', () => {
  it('produces a unique label for each of main / cron / channel / agent', () => {
    const types: readonly ApprovalSessionType[] = ['main', 'cron', 'channel', 'agent'];
    const labels = types.map((type, idx) =>
      formatApprovalLabel(
        createApprovalRequest(TOOL, {
          requestId: `req-${type}`,
          timestamp: `2026-04-17T14:${String(15 + idx).padStart(2, '0')}:00.000Z`,
          risk: RISK,
          governance: GOVERNANCE,
          conversationId: `conv-${type}`,
          session: { id: `${type}:s1`, type },
        }),
      ),
    );

    expect(new Set(labels).size).toBe(types.length);
    expect(labels).toEqual([
      'Main Session',
      'Cron Session',
      'Channel Session',
      'Agent Session',
    ]);
  });

  it('prefers a named session label over the type-only fallback', () => {
    const named = createApprovalRequest(TOOL, {
      requestId: 'req-named',
      timestamp: '2026-04-17T14:20:00.000Z',
      risk: RISK,
      governance: GOVERNANCE,
      conversationId: 'conv-named',
      session: { id: 'channel:#ops', type: 'channel', name: '#ops-oncall' },
    });
    const unnamed = createApprovalRequest(TOOL, {
      requestId: 'req-unnamed',
      timestamp: '2026-04-17T14:21:00.000Z',
      risk: RISK,
      governance: GOVERNANCE,
      conversationId: 'conv-unnamed',
      session: { id: 'channel:#quiet', type: 'channel' },
    });

    expect(formatApprovalLabel(named)).toBe('#ops-oncall (channel)');
    expect(formatApprovalLabel(unnamed)).toBe('Channel Session');
    expect(formatApprovalLabel(named)).not.toBe(formatApprovalLabel(unnamed));
  });
});
