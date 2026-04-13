/**
 * L0: USER.md intent extraction unit tests.
 *
 * Tests:
 * 1. Full USER.md with role and preferences
 * 2. Authority bounds from Permissions section
 * 3. Authority bounds from Authority section
 * 4. No role means no intent emitted
 * 5. Empty preferences list
 * 6. Multiple bound items
 * 7. Role line number tracking
 */

import { describe, it, expect } from 'vitest';
import { extractUserIntents } from '../../../src/compile/intent/user-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'USER.md',
    content,
    provenance: {
      source: 'USER.md',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-12T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractUserIntents', () => {
  it('extracts role and preferences from a complete USER.md', () => {
    const entry = makeEntry(
      '# User\n\n' +
      '## Role\n\nSenior Backend Engineer\n\n' +
      '## Preferences\n\n- Prefer verbose error messages\n- Use TypeScript strict mode\n',
    );
    const result = extractUserIntents(entry);

    expect(result.source).toBe('USER.md');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.intents).toHaveLength(1);

    const intent = result.intents[0]!;
    expect(intent.role).toBe('Senior Backend Engineer');
    expect(intent.bounds).toEqual([
      'Prefer verbose error messages',
      'Use TypeScript strict mode',
    ]);
  });

  it('extracts bounds from Permissions section', () => {
    const entry = makeEntry(
      '## Role\n\nDeveloper\n\n' +
      '## Permissions\n\n- Can read production logs\n- Cannot deploy to prod\n',
    );
    const result = extractUserIntents(entry);

    expect(result.intents[0]!.bounds).toEqual([
      'Can read production logs',
      'Cannot deploy to prod',
    ]);
  });

  it('extracts bounds from Authority section', () => {
    const entry = makeEntry(
      '## Role\n\nAdmin\n\n' +
      '## Authority\n\n- Full database access\n- Can approve deployments\n',
    );
    const result = extractUserIntents(entry);

    expect(result.intents[0]!.bounds).toEqual([
      'Full database access',
      'Can approve deployments',
    ]);
  });

  it('emits no intent when role section is missing', () => {
    const entry = makeEntry(
      '# User\n\n## Preferences\n\n- Some preference\n',
    );
    const result = extractUserIntents(entry);
    expect(result.intents).toHaveLength(0);
  });

  it('emits intent with empty bounds when no preferences section exists', () => {
    const entry = makeEntry(
      '## Role\n\nData Scientist\n',
    );
    const result = extractUserIntents(entry);

    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.role).toBe('Data Scientist');
    expect(result.intents[0]!.bounds).toEqual([]);
  });

  it('handles multiple bound items with different list markers', () => {
    const entry = makeEntry(
      '## Role\n\nEngineer\n\n' +
      '## Preferences\n\n- First pref\n* Second pref\n+ Third pref\n',
    );
    const result = extractUserIntents(entry);

    expect(result.intents[0]!.bounds).toEqual([
      'First pref',
      'Second pref',
      'Third pref',
    ]);
  });

  it('tracks role line number correctly', () => {
    const entry = makeEntry(
      '# User\n\n## Role\n\nSRE Lead\n\n## Preferences\n\n- Prefer minimal output\n',
    );
    const result = extractUserIntents(entry);

    // "SRE Lead" is on line 5 (1-indexed)
    expect(result.intents[0]!.line).toBe(5);
  });

  it('empty content produces no intents', () => {
    const entry = makeEntry('');
    const result = extractUserIntents(entry);
    expect(result.intents).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('skips blank lines inside sections', () => {
    const entry = makeEntry(
      '## Role\n\n\n\nPlatform Architect\n\n## Preferences\n\n\n- Pref A\n\n- Pref B\n',
    );
    const result = extractUserIntents(entry);

    expect(result.intents[0]!.role).toBe('Platform Architect');
    expect(result.intents[0]!.bounds).toEqual(['Pref A', 'Pref B']);
  });
});
