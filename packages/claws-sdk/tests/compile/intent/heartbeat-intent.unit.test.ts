/**
 * L0: HEARTBEAT.md intent extraction unit tests.
 *
 * Tests:
 * 1. Single schedule section with actions
 * 2. Multiple schedule sections
 * 3. Risk level derivation across all tiers (R1–R5)
 * 4. Trigger parsing: "Every N minutes/hours" and "On X"
 * 5. Empty content produces no intents
 * 6. Sections with no actions are skipped
 * 7. H1 headings are ignored
 */

import { describe, it, expect } from 'vitest';
import { extractHeartbeatIntents } from '../../../src/compile/intent/heartbeat-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'HEARTBEAT.md',
    content,
    provenance: {
      source: 'HEARTBEAT.md',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-12T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractHeartbeatIntents', () => {
  it('single schedule section with actions', () => {
    const entry = makeEntry(
      '# Heartbeat\n\n## On Start\n\n- Initialize cache\n- Load config\n',
    );
    const result = extractHeartbeatIntents(entry);

    expect(result.source).toBe('HEARTBEAT.md');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.intents).toHaveLength(1);

    const intent = result.intents[0]!;
    expect(intent.trigger).toBe('on_start');
    expect(intent.actions).toEqual(['Initialize cache', 'Load config']);
    expect(intent.line).toBe(3);
  });

  it('multiple schedule sections', () => {
    const entry = makeEntry(
      '# Heartbeat\n\n' +
      '## On Start\n\n- Initialize cache\n\n' +
      '## On Shutdown\n\n- Flush logs\n- Close connections\n',
    );
    const result = extractHeartbeatIntents(entry);

    expect(result.intents).toHaveLength(2);
    expect(result.intents[0]!.trigger).toBe('on_start');
    expect(result.intents[0]!.actions).toEqual(['Initialize cache']);
    expect(result.intents[1]!.trigger).toBe('on_shutdown');
    expect(result.intents[1]!.actions).toEqual(['Flush logs', 'Close connections']);
  });

  it('derives risk level R5 for production write actions', () => {
    const entry = makeEntry(
      '## Deploy\n\n- Deploy to production write endpoint\n',
    );
    const result = extractHeartbeatIntents(entry);
    expect(result.intents[0]!.riskLevel).toBe(5);
  });

  it('derives risk level R4 for production read actions', () => {
    const entry = makeEntry(
      '## Monitor\n\n- Monitor prod health metrics\n',
    );
    const result = extractHeartbeatIntents(entry);
    expect(result.intents[0]!.riskLevel).toBe(4);
  });

  it('derives risk level R3 for API/external actions', () => {
    const entry = makeEntry(
      '## Notify\n\n- Send webhook notification\n',
    );
    const result = extractHeartbeatIntents(entry);
    expect(result.intents[0]!.riskLevel).toBe(3);
  });

  it('derives risk level R2 for file/write actions', () => {
    const entry = makeEntry(
      '## Persist\n\n- Write state to file\n',
    );
    const result = extractHeartbeatIntents(entry);
    expect(result.intents[0]!.riskLevel).toBe(2);
  });

  it('derives risk level R1 for benign actions', () => {
    const entry = makeEntry(
      '## Idle\n\n- Check memory usage\n',
    );
    const result = extractHeartbeatIntents(entry);
    expect(result.intents[0]!.riskLevel).toBe(1);
  });

  it('parses "Every N minutes" trigger', () => {
    const entry = makeEntry(
      '## Every 5 Minutes\n\n- Ping healthcheck\n',
    );
    const result = extractHeartbeatIntents(entry);
    expect(result.intents[0]!.trigger).toBe('every_5m');
  });

  it('parses "Every N hours" trigger', () => {
    const entry = makeEntry(
      '## Every 1 Hour\n\n- Rotate logs\n',
    );
    const result = extractHeartbeatIntents(entry);
    expect(result.intents[0]!.trigger).toBe('every_1h');
  });

  it('parses "Every N seconds" trigger', () => {
    const entry = makeEntry(
      '## Every 30 Seconds\n\n- Heartbeat ping\n',
    );
    const result = extractHeartbeatIntents(entry);
    expect(result.intents[0]!.trigger).toBe('every_30s');
  });

  it('empty content produces no intents', () => {
    const entry = makeEntry('');
    const result = extractHeartbeatIntents(entry);
    expect(result.intents).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('sections with no actions are skipped', () => {
    const entry = makeEntry(
      '## On Start\n\nSome description text.\n\n## On Shutdown\n\n- Flush logs\n',
    );
    const result = extractHeartbeatIntents(entry);
    // "On Start" has no list items, so it should not produce an intent
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.trigger).toBe('on_shutdown');
  });

  it('H1 headings are ignored and do not create triggers', () => {
    const entry = makeEntry(
      '# Heartbeat\n\n## On Start\n\n- Boot sequence\n',
    );
    const result = extractHeartbeatIntents(entry);
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.trigger).toBe('on_start');
  });
});
