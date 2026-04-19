import { describe, it, expect } from 'vitest';
import {
  asHookResult,
  issueHandle,
  matchDenyRules,
  propagatedSensitivity,
  type HostContext,
} from '../src/runtime/index.js';
import { waffles } from './helpers/fixture.js';

describe('Runtime ABI — contract tests (4 tests)', () => {
  it('asHookResult: Decision → HookResult shape matches locked contract', () => {
    expect(asHookResult({ decision: 'allow', riskLevel: 1 })).toEqual({
      status: 'allow',
      riskLevel: 1,
    });
    expect(asHookResult({ decision: 'deny', reason: 'no' })).toEqual({
      status: 'deny',
      reason: 'no',
    });
    expect(
      asHookResult({ decision: 'review', reason: 'review', approvalHandle: 'h1' }),
    ).toEqual({ status: 'review', reason: 'review', approvalHandle: 'h1' });
  });

  it('issueHandle: (HostContext, Event) → Promise<string>, delegates to approvals.issue', async () => {
    let capturedSubject = '';
    const ctx: HostContext = {
      auditSink: { append: () => {} },
      approvals: {
        async issue(subject) {
          capturedSubject = subject;
          return 'handle-abc';
        },
      },
    };
    const handle = await issueHandle(ctx, { toolName: 'post-to-channel' });
    expect(handle).toBe('handle-abc');
    expect(capturedSubject).toBe('post-to-channel');
  });

  it('propagatedSensitivity: lifts to RESTRICTED when any source is memory.RESTRICTED', () => {
    const ir = waffles();
    const sensitivity = propagatedSensitivity(
      { message: ['user_prompt', { memory: 'RESTRICTED' }] },
      ir,
    );
    expect(sensitivity).toBe('RESTRICTED');
  });

  it('matchDenyRules: returns the first matching rule or null', () => {
    const rules = [
      {
        id: 'SOUL-1',
        pattern: '*public*',
        reason: 'no public posting',
        severity: 'review' as const,
      },
    ];
    expect(matchDenyRules({ args: { channel: 'public-announcements' } }, rules)).not.toBeNull();
    expect(matchDenyRules({ args: { channel: 'team' } }, rules)).toBeNull();
  });
});
