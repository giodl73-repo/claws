import { describe, expect, it } from 'vitest';
import { parseJsonl } from '../../../../src/plugin-sdk/oc-path/jsonl/parse.js';
import { resolveJsonlOcPath } from '../../../../src/plugin-sdk/oc-path/jsonl/resolve.js';
import { parseOcPath } from '../../../../src/plugin-sdk/oc-path/oc-path.js';

const log = `{"event":"start","ts":1}
{"event":"step","n":1,"result":{"ok":true,"detail":"a"}}

{"event":"end","ts":99}
`;

function rs(ocPath: string) {
  const { ast } = parseJsonl(log);
  return resolveJsonlOcPath(ast, parseOcPath(ocPath));
}

describe('resolveJsonlOcPath', () => {
  it('returns root when no segments are given', () => {
    expect(rs('oc://session-events')?.kind).toBe('root');
  });

  it('addresses an entire line by line number', () => {
    const m = rs('oc://session-events/L1');
    expect(m?.kind).toBe('line');
  });

  it('addresses fields under a line via item segment', () => {
    const m = rs('oc://session-events/L2/event');
    expect(m?.kind).toBe('object-entry');
    if (m?.kind === 'object-entry') {
      expect(m.node.value).toMatchObject({ kind: 'string', value: 'step' });
    }
  });

  it('descends via dotted item paths', () => {
    const m = rs('oc://session-events/L2/result.ok');
    expect(m?.kind).toBe('object-entry');
    if (m?.kind === 'object-entry') {
      expect(m.node.value).toMatchObject({ kind: 'boolean', value: true });
    }
  });

  it('resolves $last to the most recent value line', () => {
    const m = rs('oc://session-events/$last/event');
    expect(m?.kind).toBe('object-entry');
    if (m?.kind === 'object-entry') {
      expect(m.node.value).toMatchObject({ kind: 'string', value: 'end' });
    }
  });

  it('returns null for unknown line addresses', () => {
    expect(rs('oc://session-events/L99')).toBeNull();
    expect(rs('oc://session-events/garbage')).toBeNull();
  });

  it('returns null when descending into a blank line', () => {
    expect(rs('oc://session-events/L3/anything')).toBeNull();
  });
});
