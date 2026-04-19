/**
 * oc-path.unit.test.ts — L0 unit tests for the oc:// path parser/formatter.
 *
 * Covers:
 *   1. parse file-only / file+section / file+section+item+field
 *   2. parse session-scoped (?session=...)
 *   3. format canonical output
 *   4. round-trip parse→format for every shape + session + query-params
 *   5. malformed input rejection (all typed error codes)
 *   6. edge cases (special characters, unknown query params, structural nesting)
 */

import { describe, it, expect } from 'vitest';
import {
  parseOcPath,
  formatOcPath,
  isValidOcPath,
  OcPathError,
  type OcPath,
} from '../../src/path/index.js';

describe('parseOcPath — file-only paths', () => {
  it('parses a bare file reference', () => {
    const result = parseOcPath('oc://SOUL.md');
    expect(result).toEqual({ file: 'SOUL.md' });
    expect(result.section).toBeUndefined();
    expect(result.item).toBeUndefined();
    expect(result.field).toBeUndefined();
    expect(result.session).toBeUndefined();
  });

  it('parses skills/ and lobster.yaml virtual roots as files', () => {
    expect(parseOcPath('oc://skills/email-drafter')).toEqual({
      file: 'skills',
      section: 'email-drafter',
    });
    expect(parseOcPath('oc://lobster.yaml')).toEqual({ file: 'lobster.yaml' });
  });
});

describe('parseOcPath — file+section paths', () => {
  it('parses file+section', () => {
    expect(parseOcPath('oc://SOUL.md/Boundaries')).toEqual({
      file: 'SOUL.md',
      section: 'Boundaries',
    });
  });

  it('parses lowercase sections', () => {
    expect(parseOcPath('oc://SOUL.md/identity')).toEqual({
      file: 'SOUL.md',
      section: 'identity',
    });
  });
});

describe('parseOcPath — file+section+item+field paths', () => {
  it('parses file+section+item', () => {
    expect(parseOcPath('oc://SOUL.md/Boundaries/deny-rule-1')).toEqual({
      file: 'SOUL.md',
      section: 'Boundaries',
      item: 'deny-rule-1',
    });
  });

  it('parses file+section+item+field', () => {
    expect(parseOcPath('oc://TOOLS.md/Tools/send-email/risk')).toEqual({
      file: 'TOOLS.md',
      section: 'Tools',
      item: 'send-email',
      field: 'risk',
    });
  });

  it('parses deep CONNECTIONS.md example from spec', () => {
    expect(parseOcPath('oc://CONNECTIONS.md/people/alice/trust-level')).toEqual({
      file: 'CONNECTIONS.md',
      section: 'people',
      item: 'alice',
      field: 'trust-level',
    });
  });
});

describe('parseOcPath — session-scoped paths', () => {
  it('parses ?session= on file-only', () => {
    expect(parseOcPath('oc://SOUL.md?session=abc123')).toEqual({
      file: 'SOUL.md',
      session: 'abc123',
    });
  });

  it('parses ?session= on deep path', () => {
    expect(parseOcPath('oc://TOOLS.md/Tools/send-email?session=cron:daily')).toEqual({
      file: 'TOOLS.md',
      section: 'Tools',
      item: 'send-email',
      session: 'cron:daily',
    });
  });

  it('parses session with colons and dashes (e.g. cron:daily-triage)', () => {
    expect(parseOcPath('oc://sessions/cron:daily-triage')).toEqual({
      file: 'sessions',
      section: 'cron:daily-triage',
    });
  });

  it('ignores unknown query params (F-04 — ?at=, ?dryRun= are request params)', () => {
    expect(parseOcPath('oc://SOUL.md?at=HEAD&dryRun=true')).toEqual({
      file: 'SOUL.md',
    });
    expect(parseOcPath('oc://SOUL.md?session=s1&at=HEAD&dryRun=true')).toEqual({
      file: 'SOUL.md',
      session: 's1',
    });
  });

  it('ignores empty session= value', () => {
    expect(parseOcPath('oc://SOUL.md?session=')).toEqual({ file: 'SOUL.md' });
  });

  it('ignores query pairs without =', () => {
    expect(parseOcPath('oc://SOUL.md?orphan')).toEqual({ file: 'SOUL.md' });
  });

  it('ignores query with multiple params, extracts only session', () => {
    const p = parseOcPath('oc://SOUL.md?at=snap1&session=cron:daily');
    expect(p.session).toBe('cron:daily');
  });
});

describe('formatOcPath — canonical output', () => {
  it('formats file-only', () => {
    expect(formatOcPath({ file: 'SOUL.md' })).toBe('oc://SOUL.md');
  });

  it('formats file+section', () => {
    expect(formatOcPath({ file: 'SOUL.md', section: 'Boundaries' })).toBe(
      'oc://SOUL.md/Boundaries'
    );
  });

  it('formats file+section+item+field', () => {
    expect(
      formatOcPath({ file: 'TOOLS.md', section: 'Tools', item: 'send-email', field: 'risk' })
    ).toBe('oc://TOOLS.md/Tools/send-email/risk');
  });

  it('formats with session suffix', () => {
    expect(
      formatOcPath({ file: 'TOOLS.md', section: 'Tools', item: 'send-email', session: 'cron:daily' })
    ).toBe('oc://TOOLS.md/Tools/send-email?session=cron:daily');
  });

  it('url-encodes sections with spaces', () => {
    const s = 'oc://TOOLS.md/Tool%20Guidance';
    expect(formatOcPath(parseOcPath(s))).toBe(s);
  });
});

describe('formatOcPath — structural nesting violations (F-03)', () => {
  it('rejects field without item', () => {
    expect(() =>
      formatOcPath({ file: 'TOOLS.md', section: 'Tools', field: 'risk' } as OcPath)
    ).toThrow(OcPathError);
    try {
      formatOcPath({ file: 'TOOLS.md', section: 'Tools', field: 'risk' } as OcPath);
    } catch (err) {
      expect(err).toBeInstanceOf(OcPathError);
      expect((err as OcPathError).code).toBe('OC_PATH_NESTING');
      expect((err as OcPathError).message).toContain('field requires item');
    }
  });

  it('rejects item without section', () => {
    expect(() =>
      formatOcPath({ file: 'TOOLS.md', item: 'send-email' } as OcPath)
    ).toThrow(/item requires section/);
  });

  it('rejects field without item even when section present (spec example)', () => {
    expect(() =>
      formatOcPath({ file: 'TOOLS.md', field: 'risk' } as OcPath)
    ).toThrow(/field requires item/);
  });

  it('rejects empty file', () => {
    expect(() => formatOcPath({ file: '' } as OcPath)).toThrow(/file/);
    try {
      formatOcPath({ file: '' } as OcPath);
    } catch (err) {
      expect((err as OcPathError).code).toBe('OC_PATH_FILE_REQUIRED');
    }
  });
});

describe('round-trip — formatOcPath(parseOcPath(s)) === s', () => {
  const canonicalPaths = [
    'oc://SOUL.md',
    'oc://SOUL.md/Boundaries',
    'oc://SOUL.md/Boundaries/deny-rule-1',
    'oc://TOOLS.md/Tools/send-email/risk',
    'oc://MEMORY.md/Knowledge/email',
    'oc://IDENTITY.md/Identity/name',
    'oc://AGENTS.md/Delegation/scout',
    'oc://USER.md/PreAuthorizations/send-email',
    'oc://HEARTBEAT.md/Schedule/daily-triage',
    'oc://skills/email-drafter',
    'oc://skills/email-drafter/SKILL.md',
    'oc://skills/email-drafter/handler.ts',
    'oc://lobster.yaml/steps/triage',
    'oc://lobster.yaml/steps/triage/tools',
    'oc://lobster.yaml/transitions/triage-to-draft',
    'oc://TOOLS.md/Tools/send-email?session=cron:daily',
    'oc://sessions/cron:daily-triage',
    'oc://sessions/cron:daily-triage/tools',
    'oc://sessions/cron:daily-triage/config',
    'oc://SOUL.md?session=abc123',
  ];

  it.each(canonicalPaths)('round-trips %s', (path) => {
    expect(formatOcPath(parseOcPath(path))).toBe(path);
  });
});

describe('parseOcPath — malformed input rejection', () => {
  it('throws OcPathError on missing scheme', () => {
    expect(() => parseOcPath('SOUL.md')).toThrow(OcPathError);
    expect(() => parseOcPath('http://SOUL.md')).toThrow(/Missing oc:\/\/ scheme/);
    try {
      parseOcPath('SOUL.md');
    } catch (err) {
      expect((err as OcPathError).code).toBe('OC_PATH_MISSING_SCHEME');
      expect((err as OcPathError).input).toBe('SOUL.md');
    }
  });

  it('throws OcPathError on empty file', () => {
    expect(() => parseOcPath('oc://')).toThrow(/Empty oc:\/\/ path/);
    try {
      parseOcPath('oc://');
    } catch (err) {
      expect((err as OcPathError).code).toBe('OC_PATH_EMPTY');
    }
  });

  it('throws OcPathError on empty path segments', () => {
    expect(() => parseOcPath('oc://SOUL.md//Boundaries')).toThrow(/Empty segment/);
    expect(() => parseOcPath('oc://SOUL.md/')).toThrow(/Empty segment/);
    try {
      parseOcPath('oc://SOUL.md//item');
    } catch (err) {
      expect((err as OcPathError).code).toBe('OC_PATH_EMPTY_SEGMENT');
    }
  });

  it('throws OcPathError on too many segments (> 4)', () => {
    expect(() =>
      parseOcPath('oc://TOOLS.md/Tools/send-email/risk/extra')
    ).toThrow(/Too many segments/);
    try {
      parseOcPath('oc://TOOLS.md/Tools/send-email/risk/extra');
    } catch (err) {
      expect((err as OcPathError).code).toBe('OC_PATH_TOO_DEEP');
    }
  });

  it('throws OcPathError for non-string input', () => {
    expect(() => parseOcPath(null as unknown as string)).toThrow(OcPathError);
    expect(() => parseOcPath(42 as unknown as string)).toThrow(/must be a string/);
    try {
      parseOcPath(null as unknown as string);
    } catch (err) {
      expect((err as OcPathError).code).toBe('OC_PATH_NOT_STRING');
    }
  });
});

describe('edge cases', () => {
  it('handles special characters in names (dashes, underscores, dots)', () => {
    expect(parseOcPath('oc://skills/my_skill-v2.1')).toEqual({
      file: 'skills',
      section: 'my_skill-v2.1',
    });
    expect(formatOcPath({ file: 'skills', section: 'my_skill-v2.1' })).toBe(
      'oc://skills/my_skill-v2.1'
    );
  });

  it('handles uppercase file names and mixed-case sections', () => {
    const p = parseOcPath('oc://ENTITLEMENTS.md/PreAuthorizations/send-email');
    expect(p.file).toBe('ENTITLEMENTS.md');
    expect(p.section).toBe('PreAuthorizations');
    expect(p.item).toBe('send-email');
  });

  it('handles colon characters (session IDs) inside path segments', () => {
    expect(parseOcPath('oc://sessions/cron:daily')).toEqual({
      file: 'sessions',
      section: 'cron:daily',
    });
  });
});

describe('isValidOcPath', () => {
  it('returns true for well-formed paths', () => {
    expect(isValidOcPath('oc://SOUL.md')).toBe(true);
    expect(isValidOcPath('oc://TOOLS.md/Tools/send-email/risk')).toBe(true);
    expect(isValidOcPath('oc://SOUL.md?session=s1')).toBe(true);
  });

  it('returns false for malformed input', () => {
    expect(isValidOcPath('SOUL.md')).toBe(false);
    expect(isValidOcPath('oc://')).toBe(false);
    expect(isValidOcPath('oc://SOUL.md//x')).toBe(false);
    expect(isValidOcPath(null)).toBe(false);
    expect(isValidOcPath(42)).toBe(false);
    expect(isValidOcPath(undefined)).toBe(false);
  });
});

describe('OcPathError', () => {
  it('carries input, code, and name', () => {
    try {
      parseOcPath('bad-input');
    } catch (err) {
      expect(err).toBeInstanceOf(OcPathError);
      expect(err).toBeInstanceOf(Error);
      const ocErr = err as OcPathError;
      expect(ocErr.name).toBe('OcPathError');
      expect(ocErr.code).toBe('OC_PATH_MISSING_SCHEME');
      expect(ocErr.input).toBe('bad-input');
    }
  });
});
