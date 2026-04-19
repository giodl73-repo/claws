/**
 * L0 unit tests for approval-events (CL-12 session-context amendment).
 *
 * Four cases from the pulse plan:
 *  1. createApprovalRequest includes sessionId and sessionType
 *  2. formatApprovalLabel returns session name with type for cron
 *  3. formatApprovalLabel returns "Main Session" for main type
 *  4. ApprovalRequestEvent validates required session fields
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createApprovalRequest,
  formatApprovalLabel,
  type ApprovalContext,
  type ApprovalGovernance,
  type ApprovalRequestEvent,
  type ApprovalRiskAssessment,
  type ApprovalSessionType,
  type ApprovalToolCall,
  type CreateApprovalRequestOptions,
} from '../../src/workspace/approval-events.js';

const BASE_RISK: ApprovalRiskAssessment = {
  level: 3,
  capability: 'communicate',
  reason: 'send-email crosses R3 boundary',
};
const BASE_GOV: ApprovalGovernance = {
  provider: 'openclaw-governance',
  ruleId: 'rule-42',
  fleetPolicyApplied: true,
};
const TOOL: ApprovalToolCall = {
  server: 'outlook',
  tool: 'send-email',
  arguments: { to: 'user@example.com' },
};

function baseOptions(
  overrides: Partial<CreateApprovalRequestOptions> = {},
): CreateApprovalRequestOptions {
  return {
    requestId: 'req-001',
    timestamp: '2026-04-17T00:00:00.000Z',
    risk: BASE_RISK,
    governance: BASE_GOV,
    conversationId: 'conv-abc',
    ...overrides,
  };
}

describe('createApprovalRequest', () => {
  it('includes sessionId and sessionType when session is provided', () => {
    const event = createApprovalRequest(
      TOOL,
      baseOptions({
        session: { id: 'cron:daily-triage', type: 'cron', name: 'Daily Triage' },
      }),
    );

    expect(event.context.sessionId).toBe('cron:daily-triage');
    expect(event.context.sessionType).toBe('cron');
    expect(event.context.sessionName).toBe('Daily Triage');
    expect(event.schemaVersion).toBe(1);
    expect(event.type).toBe('approval_request');
    expect(event.toolCall).toEqual(TOOL);
  });

  it('omits session fields when session option is missing (backward compatible)', () => {
    const event = createApprovalRequest(TOOL, baseOptions());

    expect(event.context.sessionId).toBeUndefined();
    expect(event.context.sessionType).toBeUndefined();
    expect(event.context.sessionName).toBeUndefined();
    expect(event.context.conversationId).toBe('conv-abc');
  });

  it('propagates extensions and optional context fields when supplied', () => {
    const event = createApprovalRequest(
      TOOL,
      baseOptions({
        workspaceId: 'ws-1',
        agentId: 'agent-7',
        extensions: { hint: 'render-warning' },
      }),
    );

    expect(event.context.workspaceId).toBe('ws-1');
    expect(event.context.agentId).toBe('agent-7');
    expect(event.extensions).toEqual({ hint: 'render-warning' });
  });
});

describe('formatApprovalLabel', () => {
  it('returns "{name} ({type})" for a cron session with a display name', () => {
    const event = createApprovalRequest(
      TOOL,
      baseOptions({
        session: { id: 'cron:triage', type: 'cron', name: 'Daily Triage' },
      }),
    );
    expect(formatApprovalLabel(event)).toBe('Daily Triage (cron)');
  });

  it('returns "Main Session" for a main-type session without a display name', () => {
    const event = createApprovalRequest(
      TOOL,
      baseOptions({ session: { id: 'main', type: 'main' } }),
    );
    expect(formatApprovalLabel(event)).toBe('Main Session');
  });

  it('falls back to "Agent Session" when no session context is present', () => {
    const event = createApprovalRequest(TOOL, baseOptions());
    expect(formatApprovalLabel(event)).toBe('Agent Session');
  });

  it('title-cases every SessionType value', () => {
    const cases: ReadonlyArray<readonly [ApprovalSessionType, string]> = [
      ['main', 'Main Session'],
      ['cron', 'Cron Session'],
      ['channel', 'Channel Session'],
      ['agent', 'Agent Session'],
    ];
    for (const [type, expected] of cases) {
      const event = createApprovalRequest(
        TOOL,
        baseOptions({ session: { id: `${type}-1`, type } }),
      );
      expect(formatApprovalLabel(event)).toBe(expected);
    }
  });

  it('ignores an empty-string sessionName and uses the type fallback', () => {
    const event = createApprovalRequest(
      TOOL,
      baseOptions({ session: { id: 'cron:x', type: 'cron', name: '' } }),
    );
    expect(formatApprovalLabel(event)).toBe('Cron Session');
  });
});

describe('ApprovalRequestEvent type contract', () => {
  it('declares sessionId and sessionType as optional string/enum on context', () => {
    expectTypeOf<ApprovalContext['sessionId']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ApprovalContext['sessionType']>().toEqualTypeOf<
      ApprovalSessionType | undefined
    >();
  });

  it('is constructible with all session fields populated end-to-end', () => {
    const event: ApprovalRequestEvent = {
      schemaVersion: 1,
      type: 'approval_request',
      requestId: 'req-validate',
      timestamp: '2026-04-17T00:00:00.000Z',
      toolCall: { server: 'outlook', tool: 'send-email' },
      risk: BASE_RISK,
      governance: BASE_GOV,
      context: {
        conversationId: 'conv-1',
        sessionId: 'cron:triage',
        sessionType: 'cron',
      },
    };
    expect(event.context.sessionId).toBe('cron:triage');
    expect(event.context.sessionType).toBe('cron');
  });
});
