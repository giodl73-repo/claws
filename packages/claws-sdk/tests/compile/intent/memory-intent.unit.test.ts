/**
 * L0: MEMORY.md intent extraction unit tests.
 *
 * Tests:
 * 1. Single memory entry with sensitivity and retention
 * 2. Multiple memory entries
 * 3. Sensitivity tiers: restricted, confidential, internal, public
 * 4. Retention inference: permanent, session, dated, indefinite
 * 5. Empty content produces no intents
 * 6. H1 headings are ignored
 * 7. Empty-body entries still emitted (label-only)
 */

import { describe, it, expect } from 'vitest';
import { extractMemoryIntents } from '../../../src/compile/intent/memory-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'MEMORY.md',
    content,
    provenance: {
      source: 'MEMORY.md',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-12T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractMemoryIntents', () => {
  it('extracts a single memory entry', () => {
    const entry = makeEntry(
      '# Memory\n\n## API Keys\n\nStore the secret credential securely.\n',
    );
    const result = extractMemoryIntents(entry);

    expect(result.source).toBe('MEMORY.md');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.intents).toHaveLength(1);

    const intent = result.intents[0]!;
    expect(intent.label).toBe('API Keys');
    expect(intent.sensitivity).toBe('restricted');
    expect(intent.line).toBe(3);
  });

  it('extracts multiple memory entries', () => {
    const entry = makeEntry(
      '## Project Notes\n\nInternal policy reference.\n\n' +
      '## Public Docs\n\nPublicly available information.\n',
    );
    const result = extractMemoryIntents(entry);

    expect(result.intents).toHaveLength(2);
    expect(result.intents[0]!.label).toBe('Project Notes');
    expect(result.intents[1]!.label).toBe('Public Docs');
  });

  it('classifies restricted sensitivity for secret/credential keywords', () => {
    const entry = makeEntry('## Secrets\n\nContains password and private key data.\n');
    const result = extractMemoryIntents(entry);
    expect(result.intents[0]!.sensitivity).toBe('restricted');
  });

  it('classifies confidential sensitivity for PII keywords', () => {
    const entry = makeEntry('## User Data\n\nContains PII and customer data records.\n');
    const result = extractMemoryIntents(entry);
    expect(result.intents[0]!.sensitivity).toBe('confidential');
  });

  it('classifies internal sensitivity for policy keywords', () => {
    const entry = makeEntry('## Policies\n\nInternal security compliance rules.\n');
    const result = extractMemoryIntents(entry);
    expect(result.intents[0]!.sensitivity).toBe('internal');
  });

  it('classifies public sensitivity by default', () => {
    const entry = makeEntry('## Readme\n\nGeneral usage instructions.\n');
    const result = extractMemoryIntents(entry);
    expect(result.intents[0]!.sensitivity).toBe('public');
  });

  it('infers permanent retention', () => {
    const entry = makeEntry('## Core Config\n\nPermanent configuration never delete.\n');
    const result = extractMemoryIntents(entry);
    expect(result.intents[0]!.retention).toBe('permanent');
  });

  it('infers session retention', () => {
    const entry = makeEntry('## Scratch\n\nTemporary session data.\n');
    const result = extractMemoryIntents(entry);
    expect(result.intents[0]!.retention).toBe('session');
  });

  it('infers dated retention from ISO date', () => {
    const entry = makeEntry('## Audit Log\n\nRetain until 2026-12-31 review.\n');
    const result = extractMemoryIntents(entry);
    expect(result.intents[0]!.retention).toBe('dated');
  });

  it('defaults to indefinite retention', () => {
    const entry = makeEntry('## Notes\n\nGeneral notes for the team.\n');
    const result = extractMemoryIntents(entry);
    expect(result.intents[0]!.retention).toBe('indefinite');
  });

  it('empty content produces no intents', () => {
    const entry = makeEntry('');
    const result = extractMemoryIntents(entry);
    expect(result.intents).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('H1 headings do not create memory entries', () => {
    const entry = makeEntry(
      '# Memory\n\n## First Entry\n\nSome content.\n',
    );
    const result = extractMemoryIntents(entry);
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.label).toBe('First Entry');
  });

  it('label-only entries (no body text) are still emitted', () => {
    const entry = makeEntry(
      '## Empty Entry\n\n## Next Entry\n\nHas content.\n',
    );
    const result = extractMemoryIntents(entry);
    // The first entry has no body text — check it's still emitted
    expect(result.intents).toHaveLength(2);
    expect(result.intents[0]!.label).toBe('Empty Entry');
    expect(result.intents[0]!.sensitivity).toBe('public');
    expect(result.intents[0]!.retention).toBe('indefinite');
  });
});
