/**
 * L0: MockTools — exercises all methods: record, calls, callsFor, clear.
 */

import { describe, it, expect } from 'vitest';
import { MockTools } from '../../src/mock/mock-tools.js';

describe('MockTools', () => {
  it('starts with empty calls', () => {
    const tools = new MockTools();
    expect(tools.calls).toHaveLength(0);
  });

  it('records a tool invocation with correct fields', () => {
    const tools = new MockTools();
    tools.record('file-read', { path: '/tmp' }, { content: 'data' });

    expect(tools.calls).toHaveLength(1);
    expect(tools.calls[0]!.toolName).toBe('file-read');
    expect(tools.calls[0]!.input).toEqual({ path: '/tmp' });
    expect(tools.calls[0]!.output).toEqual({ content: 'data' });
    expect(tools.calls[0]!.timestamp).toBeTruthy();
  });

  it('records multiple invocations in order', () => {
    const tools = new MockTools();
    tools.record('tool-a', 'input-a', 'output-a');
    tools.record('tool-b', 'input-b', 'output-b');
    tools.record('tool-a', 'input-c', 'output-c');

    expect(tools.calls).toHaveLength(3);
    expect(tools.calls[0]!.toolName).toBe('tool-a');
    expect(tools.calls[1]!.toolName).toBe('tool-b');
    expect(tools.calls[2]!.toolName).toBe('tool-a');
  });

  it('callsFor filters by tool name', () => {
    const tools = new MockTools();
    tools.record('file-read', '/a', 'content-a');
    tools.record('file-write', '/b', 'ok');
    tools.record('file-read', '/c', 'content-c');

    const reads = tools.callsFor('file-read');
    expect(reads).toHaveLength(2);
    expect(reads[0]!.input).toBe('/a');
    expect(reads[1]!.input).toBe('/c');
  });

  it('callsFor returns empty for unrecorded tool', () => {
    const tools = new MockTools();
    tools.record('file-read', '/a', 'content');
    expect(tools.callsFor('unknown-tool')).toHaveLength(0);
  });

  it('clear removes all recorded calls', () => {
    const tools = new MockTools();
    tools.record('tool-a', 1, 2);
    tools.record('tool-b', 3, 4);
    expect(tools.calls).toHaveLength(2);

    tools.clear();
    expect(tools.calls).toHaveLength(0);
  });

  it('can record after clear', () => {
    const tools = new MockTools();
    tools.record('tool-a', 1, 2);
    tools.clear();
    tools.record('tool-b', 3, 4);

    expect(tools.calls).toHaveLength(1);
    expect(tools.calls[0]!.toolName).toBe('tool-b');
  });

  it('handles null and undefined input/output', () => {
    const tools = new MockTools();
    tools.record('tool-x', null, undefined);

    expect(tools.calls[0]!.input).toBeNull();
    expect(tools.calls[0]!.output).toBeUndefined();
  });

  it('timestamp is a valid ISO string', () => {
    const tools = new MockTools();
    tools.record('tool-a', 'in', 'out');

    const ts = tools.calls[0]!.timestamp;
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});
