/**
 * L0 unit tests for fleet exception registry — glob matching, expiry,
 * load/save, purge, validation, and add.
 *
 * @module claws-sdk/tests/fleet/exception.unit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  matchException,
  purgeExpiredExceptions,
  loadExceptions,
  saveExceptions,
  addException,
} from '#src/fleet/exception.js';
import type { FleetException } from '#src/fleet/drift-types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'exception-unit-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  vi.useRealTimers();
});

// ── matchException ──────────────────────────────────────────────────

describe('matchException', () => {
  const baseException: FleetException = {
    workspacePattern: 'special-ws',
    reason: 'Approved deviation',
    approver: 'admin@corp.com',
    expiresAt: null,
  };

  it('returns null when exception list is empty', () => {
    const result = matchException('/fleet/workspace-a', []);
    expect(result).toBeNull();
  });

  it('matches exact workspace name at end of path', () => {
    const result = matchException('/fleet/special-ws', [baseException]);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('Approved deviation');
  });

  it('matches with backslash-normalized path', () => {
    const result = matchException('C:\\fleet\\special-ws', [baseException]);
    expect(result).not.toBeNull();
  });

  it('returns null when no pattern matches', () => {
    const result = matchException('/fleet/other-ws', [baseException]);
    expect(result).toBeNull();
  });

  it('skips expired exceptions', () => {
    const expired: FleetException = {
      ...baseException,
      expiresAt: '2020-01-01T00:00:00.000Z',
    };
    const result = matchException('/fleet/special-ws', [expired]);
    expect(result).toBeNull();
  });

  it('includes non-expired exceptions', () => {
    const future: FleetException = {
      ...baseException,
      expiresAt: '2099-12-31T23:59:59.000Z',
    };
    const result = matchException('/fleet/special-ws', [future]);
    expect(result).not.toBeNull();
  });

  it('returns first matching exception when multiple match', () => {
    const first: FleetException = { ...baseException, reason: 'First' };
    const second: FleetException = { ...baseException, reason: 'Second' };
    const result = matchException('/fleet/special-ws', [first, second]);
    expect(result!.reason).toBe('First');
  });

  it('skips expired and returns next matching', () => {
    const expired: FleetException = {
      ...baseException,
      reason: 'Expired',
      expiresAt: '2020-01-01T00:00:00.000Z',
    };
    const valid: FleetException = { ...baseException, reason: 'Valid' };
    const result = matchException('/fleet/special-ws', [expired, valid]);
    expect(result!.reason).toBe('Valid');
  });
});

// ── glob pattern matching (globToRegex) ───────────────────────────

describe('glob pattern matching', () => {
  it('matches * wildcard (any chars except /)', () => {
    const exc: FleetException = {
      workspacePattern: 'team-*',
      reason: 'Team wildcard',
      approver: 'admin',
      expiresAt: null,
    };
    expect(matchException('/fleet/team-alpha', [exc])).not.toBeNull();
    expect(matchException('/fleet/team-beta', [exc])).not.toBeNull();
    expect(matchException('/fleet/other', [exc])).toBeNull();
  });

  it('* does not match across path separators', () => {
    const exc: FleetException = {
      workspacePattern: 'team-*',
      reason: 'Wildcard',
      approver: 'admin',
      expiresAt: null,
    };
    // * should not match a path with extra segments
    expect(matchException('/fleet/team-alpha/sub', [exc])).toBeNull();
  });

  it('matches ** wildcard (any chars including /)', () => {
    const exc: FleetException = {
      workspacePattern: 'projects/**',
      reason: 'Deep wildcard',
      approver: 'admin',
      expiresAt: null,
    };
    expect(matchException('/root/projects/a/b/c', [exc])).not.toBeNull();
    expect(matchException('/root/projects/single', [exc])).not.toBeNull();
  });

  it('matches ? wildcard (single char)', () => {
    const exc: FleetException = {
      workspacePattern: 'ws-?',
      reason: 'Single char',
      approver: 'admin',
      expiresAt: null,
    };
    expect(matchException('/fleet/ws-a', [exc])).not.toBeNull();
    expect(matchException('/fleet/ws-1', [exc])).not.toBeNull();
    expect(matchException('/fleet/ws-ab', [exc])).toBeNull();
  });

  it('escapes regex metacharacters in pattern', () => {
    const exc: FleetException = {
      workspacePattern: 'ws.special+name',
      reason: 'Escape test',
      approver: 'admin',
      expiresAt: null,
    };
    expect(matchException('/fleet/ws.special+name', [exc])).not.toBeNull();
    // Should not match regex-interpreted version
    expect(matchException('/fleet/wsXspeciallname', [exc])).toBeNull();
  });

  it('escapes all regex metacharacters: . + ^ $ { } ( ) | [ ] \\', () => {
    // Test each metacharacter individually
    const metachars = ['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'];
    for (const ch of metachars) {
      const exc: FleetException = {
        workspacePattern: `ws${ch}name`,
        reason: `Escape ${ch}`,
        approver: 'admin',
        expiresAt: null,
      };
      expect(matchException(`/fleet/ws${ch}name`, [exc])).not.toBeNull();
    }
  });

  it('** followed by / consumes the slash', () => {
    const exc: FleetException = {
      workspacePattern: '**/deep',
      reason: 'Deep match',
      approver: 'admin',
      expiresAt: null,
    };
    expect(matchException('/a/b/c/deep', [exc])).not.toBeNull();
  });

  it('normalizes backslashes in patterns', () => {
    const exc: FleetException = {
      workspacePattern: 'team\\special',
      reason: 'Backslash pattern',
      approver: 'admin',
      expiresAt: null,
    };
    // Pattern backslashes get normalized to /
    expect(matchException('/fleet/team/special', [exc])).not.toBeNull();
  });
});

// ── purgeExpiredExceptions ──────────────────────────────────────────

describe('purgeExpiredExceptions', () => {
  it('removes expired exceptions', () => {
    const expired: FleetException = {
      workspacePattern: 'ws1',
      reason: 'Old',
      approver: 'admin',
      expiresAt: '2020-01-01T00:00:00.000Z',
    };
    const result = purgeExpiredExceptions([expired]);
    expect(result).toHaveLength(0);
  });

  it('keeps non-expired exceptions', () => {
    const valid: FleetException = {
      workspacePattern: 'ws1',
      reason: 'Still valid',
      approver: 'admin',
      expiresAt: '2099-12-31T23:59:59.000Z',
    };
    const result = purgeExpiredExceptions([valid]);
    expect(result).toHaveLength(1);
  });

  it('keeps exceptions with null expiresAt (never expire)', () => {
    const neverExpire: FleetException = {
      workspacePattern: 'ws1',
      reason: 'Permanent',
      approver: 'admin',
      expiresAt: null,
    };
    const result = purgeExpiredExceptions([neverExpire]);
    expect(result).toHaveLength(1);
  });

  it('filters mixed expired and valid exceptions', () => {
    const exceptions: FleetException[] = [
      { workspacePattern: 'ws1', reason: 'Expired', approver: 'a', expiresAt: '2020-01-01T00:00:00.000Z' },
      { workspacePattern: 'ws2', reason: 'Valid', approver: 'b', expiresAt: '2099-12-31T00:00:00.000Z' },
      { workspacePattern: 'ws3', reason: 'Permanent', approver: 'c', expiresAt: null },
    ];
    const result = purgeExpiredExceptions(exceptions);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.workspacePattern)).toEqual(['ws2', 'ws3']);
  });

  it('returns empty array when all are expired', () => {
    const exceptions: FleetException[] = [
      { workspacePattern: 'ws1', reason: 'Old1', approver: 'a', expiresAt: '2020-01-01T00:00:00.000Z' },
      { workspacePattern: 'ws2', reason: 'Old2', approver: 'b', expiresAt: '2021-06-15T00:00:00.000Z' },
    ];
    const result = purgeExpiredExceptions(exceptions);
    expect(result).toHaveLength(0);
  });
});

// ── loadExceptions ──────────────────────────────────────────────────

describe('loadExceptions', () => {
  it('returns empty array when file does not exist', async () => {
    const result = await loadExceptions(tempDir);
    expect(result).toHaveLength(0);
  });

  it('loads and purges expired exceptions on load', async () => {
    const registry = {
      exceptions: [
        { workspacePattern: 'ws1', reason: 'Expired', approver: 'admin', expiresAt: '2020-01-01T00:00:00.000Z' },
        { workspacePattern: 'ws2', reason: 'Valid', approver: 'admin', expiresAt: '2099-12-31T00:00:00.000Z' },
      ],
    };
    mkdirSync(join(tempDir, '.claws'), { recursive: true });
    writeFileSync(join(tempDir, '.claws', 'fleet-exceptions.json'), JSON.stringify(registry));

    const result = await loadExceptions(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0]!.workspacePattern).toBe('ws2');
  });

  it('handles malformed JSON gracefully', async () => {
    mkdirSync(join(tempDir, '.claws'), { recursive: true });
    writeFileSync(join(tempDir, '.claws', 'fleet-exceptions.json'), 'not-json');

    const result = await loadExceptions(tempDir);
    expect(result).toHaveLength(0);
  });

  it('handles missing exceptions key gracefully', async () => {
    mkdirSync(join(tempDir, '.claws'), { recursive: true });
    writeFileSync(join(tempDir, '.claws', 'fleet-exceptions.json'), '{}');

    const result = await loadExceptions(tempDir);
    expect(result).toHaveLength(0);
  });
});

// ── saveExceptions ──────────────────────────────────────────────────

describe('saveExceptions', () => {
  it('writes exceptions to the fleet exceptions file', async () => {
    const exceptions: FleetException[] = [
      { workspacePattern: 'ws1', reason: 'Test', approver: 'admin', expiresAt: null },
    ];

    await saveExceptions(tempDir, exceptions);

    const filePath = join(tempDir, '.claws', 'fleet-exceptions.json');
    expect(existsSync(filePath)).toBe(true);
    const saved = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(saved.exceptions).toHaveLength(1);
    expect(saved.exceptions[0].workspacePattern).toBe('ws1');
  });

  it('creates .claws directory if it does not exist', async () => {
    await saveExceptions(tempDir, []);
    expect(existsSync(join(tempDir, '.claws', 'fleet-exceptions.json'))).toBe(true);
  });

  it('overwrites existing exceptions file', async () => {
    const first: FleetException[] = [
      { workspacePattern: 'ws1', reason: 'First', approver: 'admin', expiresAt: null },
    ];
    const second: FleetException[] = [
      { workspacePattern: 'ws2', reason: 'Second', approver: 'admin', expiresAt: null },
    ];

    await saveExceptions(tempDir, first);
    await saveExceptions(tempDir, second);

    const saved = JSON.parse(readFileSync(join(tempDir, '.claws', 'fleet-exceptions.json'), 'utf-8'));
    expect(saved.exceptions).toHaveLength(1);
    expect(saved.exceptions[0].workspacePattern).toBe('ws2');
  });
});

// ── addException ────────────────────────────────────────────────────

describe('addException', () => {
  it('adds exception to an empty registry', async () => {
    const exception: FleetException = {
      workspacePattern: 'ws1',
      reason: 'New exception',
      approver: 'admin@corp.com',
      expiresAt: null,
    };

    await addException(tempDir, exception);

    const loaded = await loadExceptions(tempDir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.reason).toBe('New exception');
  });

  it('appends exception to existing registry', async () => {
    const first: FleetException = {
      workspacePattern: 'ws1',
      reason: 'First',
      approver: 'admin',
      expiresAt: null,
    };
    const second: FleetException = {
      workspacePattern: 'ws2',
      reason: 'Second',
      approver: 'admin',
      expiresAt: null,
    };

    await addException(tempDir, first);
    await addException(tempDir, second);

    const loaded = await loadExceptions(tempDir);
    expect(loaded).toHaveLength(2);
  });

  it('throws when approver is empty string', async () => {
    const bad: FleetException = {
      workspacePattern: 'ws1',
      reason: 'Bad',
      approver: '',
      expiresAt: null,
    };

    await expect(addException(tempDir, bad)).rejects.toThrow('approver must be a non-empty string');
  });

  it('throws when approver is whitespace only', async () => {
    const bad: FleetException = {
      workspacePattern: 'ws1',
      reason: 'Bad',
      approver: '   ',
      expiresAt: null,
    };

    await expect(addException(tempDir, bad)).rejects.toThrow('approver must be a non-empty string');
  });
});
