/**
 * oc-path.e2e.test.ts — L2 end-to-end test.
 *
 * Simulates a governance-emission trip: a path appears in an error,
 * an audit event, and a warning — all three surfaces must carry the
 * same canonical string and round-trip losslessly. If the currency
 * breaks at any hop, operators get mismatched correlation IDs and
 * cannot reason about the incident. This test locks the contract.
 */

import { describe, it, expect } from 'vitest';
import { formatOcPath, parseOcPath, type OcPath } from '../../src/path/index.js';

class FakePatchError extends Error {
  readonly subject: string;
  constructor(subject: string, reason: string) {
    super(`patch rejected at ${subject}: ${reason}`);
    this.name = 'PatchError';
    this.subject = subject;
  }
}

interface AuditEvent {
  readonly type: string;
  readonly subject: string;
  readonly outcome: 'allow' | 'deny';
  readonly ts: string;
}

interface GovernanceWarning {
  readonly severity: 'warn' | 'error';
  readonly subject: string;
  readonly message: string;
}

describe('oc-path L2 e2e — path flows through error + audit + warning surfaces', () => {
  it('emits a single oc:// path used identically across all surfaces', () => {
    const target: OcPath = {
      file: 'TOOLS.md',
      section: 'Tools',
      item: 'send-email',
      field: 'risk',
      session: 'cron:daily-triage',
    };
    const subject = formatOcPath(target);
    expect(subject).toBe(
      'oc://TOOLS.md/Tools/send-email/risk?session=cron:daily-triage'
    );

    const patchError = new FakePatchError(subject, 'risk field below policy floor');
    const auditEvent: AuditEvent = {
      type: 'governance.patch.rejected',
      subject,
      outcome: 'deny',
      ts: '2026-04-17T12:00:00.000Z',
    };
    const warning: GovernanceWarning = {
      severity: 'error',
      subject,
      message: `tool risk setting blocked by deny rule at ${subject}`,
    };

    expect(patchError.subject).toBe(subject);
    expect(auditEvent.subject).toBe(subject);
    expect(warning.subject).toBe(subject);
    expect(patchError.message).toContain(subject);
    expect(warning.message).toContain(subject);

    for (const s of [patchError.subject, auditEvent.subject, warning.subject]) {
      const parsed = parseOcPath(s);
      expect(parsed).toEqual(target);
      expect(formatOcPath(parsed)).toBe(subject);
    }
  });

  it('downstream consumer can reconstruct target from any surface', () => {
    const target: OcPath = {
      file: 'SOUL.md',
      section: 'Boundaries',
      item: 'deny-rule-1',
      session: 'abc123',
    };
    const subject = formatOcPath(target);

    const surfaces = {
      sseEvent: { type: 'governance.deny', subject },
      apiError: { code: 'GOV_DENY', subject, status: 400 },
      tuiBanner: `deny-rule-1 fired at ${subject}`,
    };

    const fromSse = parseOcPath(surfaces.sseEvent.subject);
    const fromApi = parseOcPath(surfaces.apiError.subject);
    const bannerSubject = surfaces.tuiBanner.split(' ').pop()!;
    const fromTui = parseOcPath(bannerSubject);

    expect(fromSse).toEqual(target);
    expect(fromApi).toEqual(target);
    expect(fromTui).toEqual(target);
  });
});
