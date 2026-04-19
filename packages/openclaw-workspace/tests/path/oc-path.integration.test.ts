/**
 * oc-path.integration.test.ts — L1 integration tests.
 *
 * Exercises OcPath as a string currency across representative consumer
 * shapes: error-message embedding, audit event context, and governance
 * warning messages. The oc-path module is pure, so these integrations
 * use plain shapes — the contract under test is that formatOcPath
 * produces a stable, canonical string every consumer can embed verbatim.
 */

import { describe, it, expect } from 'vitest';
import { formatOcPath, parseOcPath, type OcPath } from '../../src/path/index.js';

describe('oc-path L1 — error-message embedding', () => {
  it('formats a path usable in an error-style message', () => {
    const target: OcPath = {
      file: 'TOOLS.md',
      section: 'Tools',
      item: 'send-email',
      field: 'risk',
    };
    const path = formatOcPath(target);
    const err = new Error(`patch rejected at ${path}: value drifted from governance IR`);
    expect(err.message).toContain('oc://TOOLS.md/Tools/send-email/risk');
    expect(parseOcPath(path)).toEqual(target);
  });
});

describe('oc-path L1 — audit event context', () => {
  it('embeds oc:// path as a stable subject field on an audit event', () => {
    const subject = formatOcPath({
      file: 'SOUL.md',
      section: 'Boundaries',
      item: 'deny-rule-1',
      session: 'cron:daily-triage',
    });
    const event = {
      type: 'governance.deny.applied',
      ts: '2026-04-17T00:00:00.000Z',
      subject,
      outcome: 'deny' as const,
    };
    expect(event.subject).toBe(
      'oc://SOUL.md/Boundaries/deny-rule-1?session=cron:daily-triage'
    );
    const parsed = parseOcPath(event.subject);
    expect(parsed.session).toBe('cron:daily-triage');
    expect(parsed.item).toBe('deny-rule-1');
  });
});

describe('oc-path L1 — governance warning messages', () => {
  it('produces warning messages with canonical paths for every OC file', () => {
    const fileSubjects: Array<{ file: string; section: string; item: string }> = [
      { file: 'SOUL.md', section: 'Boundaries', item: 'deny-rule-1' },
      { file: 'MEMORY.md', section: 'Knowledge', item: 'email' },
      { file: 'IDENTITY.md', section: 'Identity', item: 'name' },
      { file: 'TOOLS.md', section: 'Tools', item: 'send-email' },
      { file: 'AGENTS.md', section: 'Delegation', item: 'scout' },
      { file: 'HEARTBEAT.md', section: 'Schedule', item: 'daily-triage' },
      { file: 'DENY.md', section: 'Rules', item: 'no-external-email' },
      { file: 'KNOWLEDGE.md', section: 'Sources', item: 'eng-wiki' },
      { file: 'ENTITLEMENTS.md', section: 'PreAuthorizations', item: 'send-email' },
    ];

    const warnings = fileSubjects.map((s) => {
      const path = formatOcPath(s);
      return { severity: 'warn' as const, message: `governance gap at ${path}`, subject: path };
    });

    expect(warnings).toHaveLength(9);
    for (const w of warnings) {
      expect(w.subject.startsWith('oc://')).toBe(true);
      expect(formatOcPath(parseOcPath(w.subject))).toBe(w.subject);
    }
  });
});
