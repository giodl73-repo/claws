import { parseJsonl } from '@bic/oc-paths-substrate';
import { describe, expect, it } from 'vitest';
import {
  jsonlStarterFixers,
  sessionAppendTerminalEvent,
  sessionQuarantineMalformedLine,
} from '../../../src/extensions/ocdoctor-fixers-jsonl-starter/index.js';
import { syntheticMatch } from '../../test-match.js';

function detect(spec: typeof sessionAppendTerminalEvent, raw: string, fileName = 'session.jsonl') {
  return spec.detect({ fileName, ast: parseJsonl(raw).ast, raw });
}
function fix(spec: typeof sessionAppendTerminalEvent, raw: string, fileName = 'session.jsonl') {
  const ast = parseJsonl(raw).ast;
  const matches = spec.detect({ fileName, ast, raw });
  if (matches.length === 0) return raw;
  return spec.fix({
    fileName,
    ast,
    raw,
    match: matches[0]!.match,
  });
}

describe('sessionAppendTerminalEvent', () => {
  it('detects non-terminal final event', () => {
    expect(
      detect(sessionAppendTerminalEvent, '{"event":"start"}\n{"event":"step"}\n').length,
    ).toBe(1);
  });
  it('does not detect when last event is end', () => {
    expect(
      detect(sessionAppendTerminalEvent, '{"event":"start"}\n{"event":"end"}\n').length,
    ).toBe(0);
  });
  it('appends terminal event with _auto marker', () => {
    const after = fix(sessionAppendTerminalEvent, '{"event":"step"}\n');
    expect(after).toContain('"event":"end"');
    expect(after).toContain('"_auto":true');
  });
  it('preserves prior lines verbatim', () => {
    const before = '{"event":"start"}\n{"event":"step","n":42}\n';
    const after = fix(sessionAppendTerminalEvent, before);
    expect(after.startsWith(before)).toBe(true);
  });
  it('is idempotent', () => {
    const once = fix(sessionAppendTerminalEvent, '{"event":"step"}\n');
    const twice = fix(sessionAppendTerminalEvent, once);
    expect(twice).toBe(once);
  });
  it('no-ops on empty file', () => {
    expect(fix(sessionAppendTerminalEvent, '')).toBe('');
  });
  it('no-ops on file ending with already-terminal event', () => {
    const before = '{"event":"start"}\n{"event":"complete"}\n';
    expect(fix(sessionAppendTerminalEvent, before)).toBe(before);
  });
});

describe('sessionQuarantineMalformedLine', () => {
  it('detects malformed lines individually', () => {
    expect(
      detect(
        sessionQuarantineMalformedLine,
        '{"event":"start"}\nbroken1\n{"event":"end"}\nbroken2\n',
      ).length,
    ).toBe(2);
  });
  it('passes a clean log', () => {
    expect(
      detect(sessionQuarantineMalformedLine, '{"event":"start"}\n{"event":"end"}\n')
        .length,
    ).toBe(0);
  });
  it('replaces malformed lines with quarantine events preserving original', () => {
    const after = fix(
      sessionQuarantineMalformedLine,
      '{"event":"start"}\nbroken1\n{"event":"end"}\n',
    );
    const lines = after.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(3);
    const quarantine = JSON.parse(lines[1] ?? '');
    expect(quarantine.event).toBe('malformed');
    expect(quarantine.original).toBe('broken1');
    expect(quarantine._auto).toBe(true);
  });
  it('is idempotent — re-running on quarantined file is a no-op', () => {
    const once = fix(
      sessionQuarantineMalformedLine,
      '{"event":"start"}\nbroken\n{"event":"end"}\n',
    );
    const twice = fix(sessionQuarantineMalformedLine, once);
    expect(twice).toBe(once);
  });
  it('preserves blank lines and value lines', () => {
    const before = '{"event":"a"}\n\nbroken\n\n{"event":"b"}\n';
    const after = fix(sessionQuarantineMalformedLine, before);
    const lines = after.split('\n');
    expect(lines[0]).toBe('{"event":"a"}');
    expect(lines[1]).toBe(''); // blank preserved
    expect(JSON.parse(lines[2] ?? '').event).toBe('malformed');
    expect(lines[3]).toBe(''); // blank preserved
    expect(lines[4]).toBe('{"event":"b"}');
  });
});

describe('jsonlStarterFixers — pack registration', () => {
  it('exports 2 fixers', () => {
    expect(jsonlStarterFixers).toHaveLength(2);
  });
  it('all share the jsonl kind discriminator', () => {
    for (const f of jsonlStarterFixers) {
      expect(f.appliesTo).toMatch(/jsonl/);
    }
  });
});
