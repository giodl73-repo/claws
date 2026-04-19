/**
 * L0 unit tests for session-types.
 *
 * The six cases the pulse specifies:
 *  1. SessionType discriminates four kinds
 *  2. SessionState requires all mandatory fields
 *  3. SessionSummary includes runCount
 *  4. SessionConfig validates cron schedule format
 *  5. ToolCall.context includes sessionId and sessionType
 *  6. session-types barrel exports all public types
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  isValidCronSchedule,
  type ApprovalTimeoutFailMode,
  type SessionConfig,
  type SessionRunStatus,
  type SessionState,
  type SessionStatus,
  type SessionSummary,
  type SessionType,
  type ToolCall,
  type ToolCallContext,
  type ToolDefinition,
} from '../../src/workspace/session-types.js';
import * as workspaceBarrel from '../../src/workspace/index.js';

describe('SessionType', () => {
  it('discriminates exactly four kinds: main, cron, channel, agent', () => {
    const kinds: SessionType[] = ['main', 'cron', 'channel', 'agent'];
    expect(kinds).toHaveLength(4);

    // Exhaustiveness: narrowing on SessionType must cover all four. If a new
    // kind is added to the union, this switch falls through to the `never`
    // branch and fails to compile — the static guardrail for the "exactly
    // four kinds" acceptance criterion.
    function label(t: SessionType): string {
      switch (t) {
        case 'main':
          return 'interactive';
        case 'cron':
          return 'scheduled';
        case 'channel':
          return 'channel-bound';
        case 'agent':
          return 'delegated';
        default: {
          const _exhaustive: never = t;
          return _exhaustive;
        }
      }
    }
    expect(label('main')).toBe('interactive');
    expect(label('cron')).toBe('scheduled');
    expect(label('channel')).toBe('channel-bound');
    expect(label('agent')).toBe('delegated');
  });
});

describe('SessionState', () => {
  it('requires id, type, status, createdAt, lastActiveAt and permits optional metadata', () => {
    const state: SessionState = {
      id: 'sess-1',
      type: 'main',
      status: 'active',
      createdAt: '2026-04-17T00:00:00.000Z',
      lastActiveAt: '2026-04-17T00:05:00.000Z',
    };
    expect(state.id).toBe('sess-1');
    expect(state.type).toBe('main');

    // Status variants are typed.
    const statuses: SessionStatus[] = ['active', 'idle', 'terminated'];
    expect(statuses).toHaveLength(3);

    const withMetadata: SessionState = {
      ...state,
      metadata: { origin: 'cap', fleet: 'eu-west' },
    };
    expect(withMetadata.metadata?.origin).toBe('cap');

    // Every mandatory field is required at the type level: a state literal
    // missing one should fail to compile. Verified via expectTypeOf.
    expectTypeOf<SessionState>().toHaveProperty('id').toEqualTypeOf<string>();
    expectTypeOf<SessionState>().toHaveProperty('type').toEqualTypeOf<SessionType>();
    expectTypeOf<SessionState>().toHaveProperty('createdAt').toEqualTypeOf<string>();
    expectTypeOf<SessionState>().toHaveProperty('lastActiveAt').toEqualTypeOf<string>();
  });
});

describe('SessionSummary', () => {
  it('includes runCount and optional lastRunAt/lastRunStatus', () => {
    const summary: SessionSummary = {
      id: 'sess-2',
      type: 'cron',
      status: 'idle',
      runCount: 17,
      lastRunAt: '2026-04-17T00:10:00.000Z',
      lastRunStatus: 'success',
    };
    expect(summary.runCount).toBe(17);
    expect(summary.lastRunStatus).toBe('success');

    // All three lastRunStatus values must be representable.
    const outcomes: SessionRunStatus[] = ['success', 'error', 'timeout'];
    expect(outcomes).toHaveLength(3);

    // runCount is required — a summary without it should not compile.
    expectTypeOf<SessionSummary>().toHaveProperty('runCount').toEqualTypeOf<number>();
  });
});

describe('SessionConfig cron schedule validation', () => {
  it('accepts standard cron expressions and rejects malformed ones', () => {
    // Valid: 5-field, all-stars, step, range, list, numeric.
    expect(isValidCronSchedule('* * * * *')).toBe(true);
    expect(isValidCronSchedule('0 9 * * 1-5')).toBe(true);
    expect(isValidCronSchedule('*/15 * * * *')).toBe(true);
    expect(isValidCronSchedule('0,30 9-17 * * 1,3,5')).toBe(true);

    // Invalid: wrong field count.
    expect(isValidCronSchedule('* * *')).toBe(false);
    expect(isValidCronSchedule('* * * * * *')).toBe(false);

    // Invalid: out-of-range numeric.
    expect(isValidCronSchedule('60 * * * *')).toBe(false);
    expect(isValidCronSchedule('* 24 * * *')).toBe(false);
    expect(isValidCronSchedule('* * 32 * *')).toBe(false);
    expect(isValidCronSchedule('* * * 13 *')).toBe(false);
    expect(isValidCronSchedule('* * * * 7')).toBe(false);

    // Invalid: reversed range.
    expect(isValidCronSchedule('5-1 * * * *')).toBe(false);

    // Invalid: non-numeric / named tokens rejected (stricter than some
    // cron dialects — see session-types.ts docstring).
    expect(isValidCronSchedule('0 9 * * MON-FRI')).toBe(false);
    expect(isValidCronSchedule('@daily')).toBe(false);

    // Invalid: empty / whitespace.
    expect(isValidCronSchedule('')).toBe(false);
    expect(isValidCronSchedule('   ')).toBe(false);

    // A CronSessionConfig with a valid schedule is the happy path.
    const config: SessionConfig = {
      type: 'cron',
      schedule: '0 9 * * 1-5',
      toolAllowlist: ['send-email'],
    };
    expect(config.type).toBe('cron');
    expect(isValidCronSchedule(config.schedule)).toBe(true);
  });
});

describe('ToolCall.context', () => {
  it('includes sessionId and sessionType per CL-11', () => {
    const call: ToolCall = {
      server: 'outlook',
      tool: 'send-email',
      arguments: { to: 'alice@example.com', subject: 'hi' },
      context: {
        conversationId: 'conv-1',
        sessionId: 'cron:daily-triage',
        sessionType: 'cron',
      },
    };
    expect(call.context.sessionId).toBe('cron:daily-triage');
    expect(call.context.sessionType).toBe('cron');

    // CL-11 says both fields are OPTIONAL at the type level — external
    // providers may supply a ToolCall without session context. A call
    // lacking them must still be assignable to ToolCall.
    const unscoped: ToolCall = {
      server: 'sharepoint',
      tool: 'list-files',
      arguments: {},
      context: { conversationId: 'conv-2' },
    };
    expect(unscoped.context.sessionId).toBeUndefined();
    expect(unscoped.context.sessionType).toBeUndefined();

    // Type-level: sessionId and sessionType live on ToolCallContext.
    expectTypeOf<ToolCallContext>().toHaveProperty('sessionId').toEqualTypeOf<string | undefined>();
    expectTypeOf<ToolCallContext>()
      .toHaveProperty('sessionType')
      .toEqualTypeOf<SessionType | undefined>();
  });
});

describe('workspace barrel', () => {
  it('re-exports every public session-types symbol', () => {
    // Runtime exports (value-space).
    expect(typeof workspaceBarrel.isValidCronSchedule).toBe('function');

    // Type-space re-exports are erased at runtime; assert through the type
    // system that each alias points at the session-types definition so a
    // future rename without a barrel update fails the build.
    expectTypeOf<workspaceBarrel.SessionType>().toEqualTypeOf<SessionType>();
    expectTypeOf<workspaceBarrel.SessionStatus>().toEqualTypeOf<SessionStatus>();
    expectTypeOf<workspaceBarrel.SessionRunStatus>().toEqualTypeOf<SessionRunStatus>();
    expectTypeOf<workspaceBarrel.SessionState>().toEqualTypeOf<SessionState>();
    expectTypeOf<workspaceBarrel.SessionSummary>().toEqualTypeOf<SessionSummary>();
    expectTypeOf<workspaceBarrel.SessionConfig>().toEqualTypeOf<SessionConfig>();
    expectTypeOf<workspaceBarrel.ToolCall>().toEqualTypeOf<ToolCall>();
    expectTypeOf<workspaceBarrel.ToolDefinition>().toEqualTypeOf<ToolDefinition>();
    expectTypeOf<workspaceBarrel.ApprovalTimeoutFailMode>()
      .toEqualTypeOf<ApprovalTimeoutFailMode>();
  });
});
