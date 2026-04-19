/**
 * L0 unit tests for heartbeat-reader.ts
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { heartbeatReader } from '#src/compiler/readers/heartbeat-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('heartbeatReader', () => {
  it('parses HEARTBEAT.md with schedule entries', async () => {
    const result = await heartbeatReader.read(resolve(FIXTURES, 'full-workspace'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.schedules.length).toBe(2);
    expect(result.data.schedules[0]!.trigger).toBe('On Start');
    expect(result.data.schedules[0]!.actions.length).toBe(2);
    expect(result.data.schedules[0]!.actions[0]).toContain('Verify security policy');
    expect(result.data.schedules[1]!.trigger).toBe('Every 5 Minutes');
    expect(result.data.schedules[1]!.actions.length).toBe(2);
  });

  it('returns warning for missing optional HEARTBEAT.md', async () => {
    const result = await heartbeatReader.read('/nonexistent/path');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.severity).toBe('warning');
    }
  });
});
