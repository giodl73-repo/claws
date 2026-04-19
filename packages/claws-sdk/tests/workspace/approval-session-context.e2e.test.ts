/**
 * L2 e2e test for approval-events (CL-12 session-context amendment).
 *
 * One case from the pulse plan:
 *  1. end-to-end approval event with session context through full event pipeline
 *
 * The pipeline under test:
 *   1. Guardrail provider determines requiresExternalApproval=true for a cron
 *      send-email call.
 *   2. Serve layer calls createApprovalRequest with session context from the
 *      originating cron session.
 *   3. The event is JSON-serialized onto an SSE channel (emulated here as an
 *      in-memory broadcaster).
 *   4. The approval UX consumer deserializes the event and renders a label
 *      via formatApprovalLabel.
 *   5. The rendered label identifies the originating session by name + type
 *      so the approver sees "Daily Triage (cron)" instead of the generic
 *      "Agent Session" fallback.
 */

import { describe, expect, it } from 'vitest';

import {
  createApprovalRequest,
  formatApprovalLabel,
  type ApprovalRequestEvent,
  type ApprovalSessionDescriptor,
} from '../../src/workspace/approval-events.js';

interface SseFrame {
  readonly event: 'ta';
  readonly data: string;
}

function emit(request: ApprovalRequestEvent): SseFrame {
  return { event: 'ta', data: JSON.stringify(request) };
}

function consume(frame: SseFrame): ApprovalRequestEvent {
  if (frame.event !== 'ta') throw new Error(`unexpected event type: ${frame.event}`);
  return JSON.parse(frame.data) as ApprovalRequestEvent;
}

describe('approval event e2e with session context', () => {
  it('routes session context through the full emit/consume pipeline', () => {
    const session: ApprovalSessionDescriptor = {
      id: 'cron:daily-triage',
      type: 'cron',
      name: 'Daily Triage',
    };

    const request = createApprovalRequest(
      {
        server: 'outlook',
        tool: 'send-email',
        arguments: { to: 'team@example.com', subject: 'Triage summary' },
      },
      {
        requestId: 'req-e2e-001',
        timestamp: '2026-04-17T09:00:00.000Z',
        risk: {
          level: 3,
          capability: 'communicate',
          reason: 'send-email requires R3 external approval in cron sessions',
        },
        governance: {
          provider: 'openclaw-governance',
          ruleId: 'R3-communicate-default',
          fleetPolicyApplied: true,
        },
        conversationId: 'conv-e2e-001',
        workspaceId: 'ws-enterprise-1',
        agentId: 'agent-triage',
        session,
        extensions: { transport: 'sse', channel: 'approvals' },
      },
    );

    const frame = emit(request);
    expect(frame.event).toBe('ta');
    expect(typeof frame.data).toBe('string');

    const received = consume(frame);
    expect(received.context.sessionId).toBe(session.id);
    expect(received.context.sessionType).toBe(session.type);
    expect(received.context.sessionName).toBe(session.name);
    expect(received.context.conversationId).toBe('conv-e2e-001');
    expect(received.context.workspaceId).toBe('ws-enterprise-1');
    expect(received.context.agentId).toBe('agent-triage');
    expect(received.risk.level).toBe(3);
    expect(received.risk.capability).toBe('communicate');
    expect(received.governance.provider).toBe('openclaw-governance');

    const label = formatApprovalLabel(received);
    expect(label).toBe('Daily Triage (cron)');
    expect(label).not.toBe('Agent Session');
  });
});
