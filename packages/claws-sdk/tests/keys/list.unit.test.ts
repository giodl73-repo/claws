/**
 * L0: Key listing — display keys with metadata columns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { formatKeysTable, listKeys } from '../../src/keys/list.js';
import type { KeyEntry } from '../../src/keys/types.js';

function makeEntry(overrides: Partial<KeyEntry> = {}): KeyEntry {
  return {
    id: 'ed25519-aabbccdd',
    algorithm: 'ed25519',
    storageTier: 'file',
    createdAt: '2026-04-13T10:00:00.000Z',
    rotatedAt: null,
    revoked: false,
    rotationSchedule: null,
    version: 1,
    purpose: 'signing',
    revokedAt: null,
    ...overrides,
  };
}

describe('formatKeysTable', () => {
  it('returns "No keys found." for empty list', () => {
    expect(formatKeysTable([])).toBe('No keys found.');
  });

  it('formats all columns correctly', () => {
    const table = formatKeysTable([makeEntry()]);
    expect(table).toContain('ID');
    expect(table).toContain('ALGORITHM');
    expect(table).toContain('CREATED');
    expect(table).toContain('TIER');
    expect(table).toContain('ROTATION');
    expect(table).toContain('NEXT');
    expect(table).toContain('ed25519-aabbccdd');
    expect(table).toContain('ed25519');
    expect(table).toContain('2026-04-13');
    expect(table).toContain('file');
    expect(table).toContain('none');
  });

  it('shows "revoked" status for revoked keys', () => {
    const table = formatKeysTable([makeEntry({ revoked: true })]);
    expect(table).toContain('revoked');
  });

  it('shows "pending" status when rotation is enabled but never rotated', () => {
    const table = formatKeysTable([makeEntry({
      rotationSchedule: { enabled: true, intervalDays: 90 },
    })]);
    expect(table).toContain('pending');
    // Next rotation should be ~90 days from creation
    expect(table).toContain('2026-07-12');
  });

  it('shows "rotated" status when rotation is enabled and has been rotated', () => {
    const table = formatKeysTable([makeEntry({
      rotatedAt: '2026-04-13T10:00:00.000Z',
      rotationSchedule: { enabled: true, intervalDays: 30 },
    })]);
    expect(table).toContain('rotated');
  });

  it('shows dash for revoked key next rotation', () => {
    const table = formatKeysTable([makeEntry({
      revoked: true,
      rotationSchedule: { enabled: true, intervalDays: 90 },
    })]);
    // Next rotation column should be '-' for revoked keys
    const lines = table.split('\n');
    const dataLine = lines[1]!;
    // Last column (NEXT) should be '-'
    expect(dataLine).toMatch(/-\s*$/);
  });

  it('formats multiple keys', () => {
    const table = formatKeysTable([
      makeEntry({ id: 'ed25519-11111111' }),
      makeEntry({ id: 'hmac-22222222', algorithm: 'hmac-sha256', storageTier: 'env' }),
    ]);
    const lines = table.split('\n');
    // header + 2 data rows
    expect(lines).toHaveLength(3);
    expect(table).toContain('ed25519-11111111');
    expect(table).toContain('hmac-22222222');
  });
});

// ── listKeys (async, needs filesystem) ─────────────────────────────────

describe('listKeys', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-list-keys-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty table when registry has no keys', async () => {
    const keysDir = join(tempDir, '.claws', 'keys');
    await mkdir(keysDir, { recursive: true });
    await writeFile(join(keysDir, 'registry.json'), JSON.stringify({ version: 1, keys: [] }), 'utf-8');

    const result = await listKeys(tempDir);
    expect(result.keys).toHaveLength(0);
    expect(result.table).toBe('No keys found.');
  });

  it('returns keys and table from registry', async () => {
    const keysDir = join(tempDir, '.claws', 'keys');
    await mkdir(keysDir, { recursive: true });
    const entries: KeyEntry[] = [makeEntry()];
    await writeFile(join(keysDir, 'registry.json'), JSON.stringify({ version: 1, keys: entries }), 'utf-8');

    const result = await listKeys(tempDir);
    expect(result.keys).toHaveLength(1);
    expect(result.table).toContain('ed25519-aabbccdd');
  });
});
