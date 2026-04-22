import { describe, expect, it } from 'vitest';
import { parseListeningLine } from '../snap-runner-envelope.ts';

describe('parseListeningLine (pulse 35)', () => {
  it('returns {port,url} for a valid listening envelope', () => {
    const out = parseListeningLine(
      '{"status":"listening","port":51234,"host":"127.0.0.1","url":"http://127.0.0.1:51234"}',
    );
    expect(out).toEqual({ port: 51234, url: 'http://127.0.0.1:51234' });
  });

  it('tolerates surrounding whitespace', () => {
    const out = parseListeningLine(
      '   {"status":"listening","port":42,"url":"http://127.0.0.1:42"}  \n',
    );
    expect(out).toEqual({ port: 42, url: 'http://127.0.0.1:42' });
  });

  it('returns null on empty input', () => {
    expect(parseListeningLine('')).toBeNull();
    expect(parseListeningLine('   ')).toBeNull();
  });

  it('returns null on non-JSON lines (CLI prose logs)', () => {
    expect(parseListeningLine('snap serve listening on http://127.0.0.1:42')).toBeNull();
    expect(parseListeningLine('something happened')).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    expect(parseListeningLine('{not json')).toBeNull();
    expect(parseListeningLine('{"status":"listening"')).toBeNull();
  });

  it('returns null for wrong status value', () => {
    expect(
      parseListeningLine('{"status":"error","port":1,"url":"x"}'),
    ).toBeNull();
    expect(
      parseListeningLine('{"port":1,"url":"x"}'),
    ).toBeNull();
  });

  it('returns null when port is not a number', () => {
    expect(
      parseListeningLine('{"status":"listening","port":"51234","url":"http://x"}'),
    ).toBeNull();
  });

  it('returns null when url is not a string', () => {
    expect(
      parseListeningLine('{"status":"listening","port":1,"url":42}'),
    ).toBeNull();
    expect(
      parseListeningLine('{"status":"listening","port":1}'),
    ).toBeNull();
  });
});
