/**
 * L0: keys command — generate, list, rotate, revoke, ceremony init/reconstruct wiring + JSON/text output.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockGenerateKey = vi.fn();
const mockCreateStorage = vi.fn();
const mockRegisterKey = vi.fn();
const mockListKeys = vi.fn();
const mockRotateKey = vi.fn();
const mockRevokeKey = vi.fn();
const mockShamirReconstruct = vi.fn();
const mockRecordParticipant = vi.fn();
const mockDeriveSingleDevKey = vi.fn();
const mockInitCeremony = vi.fn();
const mockRecordCeremonyInitiated = vi.fn();
const mockRecordShareDistributed = vi.fn();
const mockRecordKeyReconstructed = vi.fn();

vi.mock('@bic/claws-sdk/keys', () => ({
  generateKey: (...args: unknown[]) => mockGenerateKey(...args),
  createStorage: (...args: unknown[]) => mockCreateStorage(...args),
  registerKey: (...args: unknown[]) => mockRegisterKey(...args),
  listKeys: (...args: unknown[]) => mockListKeys(...args),
  rotateKey: (...args: unknown[]) => mockRotateKey(...args),
  revokeKey: (...args: unknown[]) => mockRevokeKey(...args),
  shamirReconstruct: (...args: unknown[]) => mockShamirReconstruct(...args),
  recordParticipant: (...args: unknown[]) => mockRecordParticipant(...args),
  deriveSingleDevKey: (...args: unknown[]) => mockDeriveSingleDevKey(...args),
  initCeremony: (...args: unknown[]) => mockInitCeremony(...args),
  recordCeremonyInitiated: (...args: unknown[]) => mockRecordCeremonyInitiated(...args),
  recordShareDistributed: (...args: unknown[]) => mockRecordShareDistributed(...args),
  recordKeyReconstructed: (...args: unknown[]) => mockRecordKeyReconstructed(...args),
}));

// ── FS mocks ────────────────────────────────────────────────────────────────

const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();

vi.mock('node:fs/promises', () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import {
  runKeysGenerate,
  runKeysList,
  runKeysRotate,
  runKeysRevoke,
  runKeysCeremonyInit,
  runKeysCeremonyReconstruct,
} from '../../src/commands/keys.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

const jsonOpts = { json: true } as const;
const textOpts = { json: false } as const;

function resetMocks() {
  vi.restoreAllMocks();
  mockGenerateKey.mockReset();
  mockCreateStorage.mockReset();
  mockRegisterKey.mockReset();
  mockListKeys.mockReset();
  mockRotateKey.mockReset();
  mockRevokeKey.mockReset();
  mockShamirReconstruct.mockReset();
  mockRecordParticipant.mockReset();
  mockDeriveSingleDevKey.mockReset();
  mockInitCeremony.mockReset();
  mockRecordCeremonyInitiated.mockReset();
  mockRecordShareDistributed.mockReset();
  mockRecordKeyReconstructed.mockReset();
  mockMkdir.mockReset();
  mockWriteFile.mockReset();
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws keys generate', () => {
  afterEach(() => { resetMocks(); });

  const genOpts = { json: false, algorithm: 'ed25519' as const, storage: 'file' as const };
  const genJsonOpts = { json: true, algorithm: 'ed25519' as const, storage: 'file' as const };

  function setupGenerateMocks() {
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    mockGenerateKey.mockReturnValue({ privateKey: 'priv', publicKey: 'pub' });
    mockCreateStorage.mockReturnValue({ write: mockWrite });
    mockRegisterKey.mockResolvedValue({
      id: 'key-001',
      algorithm: 'ed25519',
      storageTier: 'file',
      createdAt: '2026-01-01T00:00:00Z',
    });
    return mockWrite;
  }

  it('returns 0 and prints text on success', async () => {
    setupGenerateMocks();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysGenerate('/ws', genOpts);
      expect(code).toBe(0);
      expect(mockGenerateKey).toHaveBeenCalledWith('ed25519');
      expect(mockCreateStorage).toHaveBeenCalledWith('file', '/ws');
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Key generated: key-001');
      expect(output).toContain('algorithm: ed25519');
      expect(output).toContain('storage:   file');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 and outputs JSON on success', async () => {
    setupGenerateMocks();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysGenerate('/ws', genJsonOpts);
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('created');
      expect(parsed.id).toBe('key-001');
      expect(parsed.algorithm).toBe('ed25519');
      expect(parsed.storageTier).toBe('file');
      expect(parsed.createdAt).toBe('2026-01-01T00:00:00Z');
    } finally { logSpy.mockRestore(); }
  });

  it('writes public key when present', async () => {
    const mockWrite = setupGenerateMocks();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runKeysGenerate('/ws', genOpts);
      expect(mockWrite).toHaveBeenCalledWith('key-001', 'priv');
      expect(mockWrite).toHaveBeenCalledWith('key-001.pub', 'pub');
    } finally { logSpy.mockRestore(); }
  });

  it('skips public key write when not present', async () => {
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    mockGenerateKey.mockReturnValue({ privateKey: 'priv', publicKey: undefined });
    mockCreateStorage.mockReturnValue({ write: mockWrite });
    mockRegisterKey.mockResolvedValue({
      id: 'key-002', algorithm: 'ed25519', storageTier: 'file', createdAt: '2026-01-01T00:00:00Z',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runKeysGenerate('/ws', genOpts);
      expect(mockWrite).toHaveBeenCalledTimes(1);
      expect(mockWrite).toHaveBeenCalledWith('key-002', 'priv');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 1 and prints error on failure (text)', async () => {
    mockGenerateKey.mockImplementation(() => { throw new Error('bad algorithm'); });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysGenerate('/ws', genOpts);
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: bad algorithm');
    } finally { errorSpy.mockRestore(); }
  });

  it('returns 1 and outputs JSON error on failure', async () => {
    mockGenerateKey.mockImplementation(() => { throw new Error('bad algorithm'); });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysGenerate('/ws', genJsonOpts);
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('bad algorithm');
    } finally { logSpy.mockRestore(); }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockGenerateKey.mockImplementation(() => { throw 'raw string'; });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysGenerate('/ws', genOpts);
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw string');
    } finally { errorSpy.mockRestore(); }
  });
});

describe('claws keys list', () => {
  afterEach(() => { resetMocks(); });

  it('returns 0 and prints table on success (text)', async () => {
    mockListKeys.mockResolvedValue({
      keys: [{ id: 'k1' }],
      table: 'ID        ALGO\nk1        ed25519',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysList('/ws', textOpts);
      expect(code).toBe(0);
      expect(mockListKeys).toHaveBeenCalledWith('/ws');
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('k1');
      expect(output).toContain('ed25519');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 and outputs JSON on success', async () => {
    mockListKeys.mockResolvedValue({
      keys: [{ id: 'k1', algorithm: 'ed25519' }],
      table: 'unused',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysList('/ws', jsonOpts);
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.keys).toHaveLength(1);
      expect(parsed.keys[0].id).toBe('k1');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 1 and prints error on failure (text)', async () => {
    mockListKeys.mockRejectedValue(new Error('registry missing'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysList('/ws', textOpts);
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: registry missing');
    } finally { errorSpy.mockRestore(); }
  });

  it('returns 1 and outputs JSON error on failure', async () => {
    mockListKeys.mockRejectedValue(new Error('registry missing'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysList('/ws', jsonOpts);
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('registry missing');
    } finally { logSpy.mockRestore(); }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockListKeys.mockRejectedValue(404);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysList('/ws', textOpts);
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('404');
    } finally { errorSpy.mockRestore(); }
  });
});

describe('claws keys rotate', () => {
  afterEach(() => { resetMocks(); });

  const rotateResult = {
    entry: { id: 'k1', version: 2, rotatedAt: '2026-02-01T00:00:00Z' },
    previousVersion: 1,
    artifactsReSigned: 3,
  };

  it('returns 0 and prints rotation details (text)', async () => {
    mockRotateKey.mockResolvedValue(rotateResult);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysRotate('/ws', 'k1', textOpts);
      expect(code).toBe(0);
      expect(mockRotateKey).toHaveBeenCalledWith('/ws', 'k1');
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Key rotated: k1');
      expect(output).toContain('3 artifact(s)');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 and outputs JSON on success', async () => {
    mockRotateKey.mockResolvedValue(rotateResult);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysRotate('/ws', 'k1', jsonOpts);
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('rotated');
      expect(parsed.id).toBe('k1');
      expect(parsed.version).toBe(2);
      expect(parsed.previousVersion).toBe(1);
      expect(parsed.artifactsReSigned).toBe(3);
      expect(parsed.rotatedAt).toBe('2026-02-01T00:00:00Z');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 1 and prints error on failure (text)', async () => {
    mockRotateKey.mockRejectedValue(new Error('key not found'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysRotate('/ws', 'k1', textOpts);
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: key not found');
    } finally { errorSpy.mockRestore(); }
  });

  it('returns 1 and outputs JSON error on failure', async () => {
    mockRotateKey.mockRejectedValue(new Error('key not found'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysRotate('/ws', 'k1', jsonOpts);
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('key not found');
    } finally { logSpy.mockRestore(); }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockRotateKey.mockRejectedValue('rotate failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysRotate('/ws', 'k1', textOpts);
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('rotate failed');
    } finally { errorSpy.mockRestore(); }
  });
});

describe('claws keys revoke', () => {
  afterEach(() => { resetMocks(); });

  const revokeOpts = { json: false, reason: 'compromised' };
  const revokeJsonOpts = { json: true, reason: 'compromised' };

  it('returns 0 and prints revocation details (text)', async () => {
    mockRevokeKey.mockResolvedValue({
      entry: { id: 'k1' },
      revokedAt: '2026-03-01T00:00:00Z',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysRevoke('/ws', 'k1', revokeOpts);
      expect(code).toBe(0);
      expect(mockRevokeKey).toHaveBeenCalledWith('/ws', 'k1', 'compromised');
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Key revoked: k1');
      expect(output).toContain('reason:     compromised');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 and outputs JSON on success', async () => {
    mockRevokeKey.mockResolvedValue({
      entry: { id: 'k1' },
      revokedAt: '2026-03-01T00:00:00Z',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysRevoke('/ws', 'k1', revokeJsonOpts);
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('revoked');
      expect(parsed.id).toBe('k1');
      expect(parsed.revokedAt).toBe('2026-03-01T00:00:00Z');
      expect(parsed.reason).toBe('compromised');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 1 and prints error on failure (text)', async () => {
    mockRevokeKey.mockRejectedValue(new Error('already revoked'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysRevoke('/ws', 'k1', revokeOpts);
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: already revoked');
    } finally { errorSpy.mockRestore(); }
  });

  it('returns 1 and outputs JSON error on failure', async () => {
    mockRevokeKey.mockRejectedValue(new Error('already revoked'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysRevoke('/ws', 'k1', revokeJsonOpts);
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('already revoked');
    } finally { logSpy.mockRestore(); }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockRevokeKey.mockRejectedValue(42);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysRevoke('/ws', 'k1', revokeOpts);
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('42');
    } finally { errorSpy.mockRestore(); }
  });
});

describe('claws keys ceremony init (M-of-N)', () => {
  afterEach(() => { resetMocks(); });

  function setupCeremonyMocks() {
    mockInitCeremony.mockResolvedValue({
      ceremonyId: 'cer-001',
      keyId: 'key-001',
      totalShares: 3,
      threshold: 2,
      keyHash: 'abc123',
      shares: [
        { index: 0, data: 'share0' },
        { index: 1, data: 'share1' },
        { index: 2, data: 'share2' },
      ],
    });
    mockRecordCeremonyInitiated.mockResolvedValue(undefined);
    mockRecordParticipant.mockImplementation((identity: string, index: number) => ({
      identity, index,
    }));
    mockRecordShareDistributed.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  }

  it('returns 0 and prints ceremony details (text)', async () => {
    setupCeremonyMocks();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', {
        json: false, shares: 3, threshold: 2,
      });
      expect(code).toBe(0);
      expect(mockInitCeremony).toHaveBeenCalledWith('/ws', { totalShares: 3, threshold: 2 });
      expect(mockRecordCeremonyInitiated).toHaveBeenCalledWith('/ws', 'cer-001', 3, 2);
      expect(mockWriteFile).toHaveBeenCalledTimes(3);
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Ceremony initialized: cer-001');
      expect(output).toContain('key ID:    key-001');
      expect(output).toContain('shares:    3');
      expect(output).toContain('threshold: 2');
      expect(output).toContain('key hash:  abc123');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 and outputs JSON on success', async () => {
    setupCeremonyMocks();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', {
        json: true, shares: 3, threshold: 2,
      });
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('split');
      expect(parsed.ceremonyId).toBe('cer-001');
      expect(parsed.keyId).toBe('key-001');
      expect(parsed.totalShares).toBe(3);
      expect(parsed.threshold).toBe(2);
      expect(parsed.keyHash).toBe('abc123');
      expect(parsed.shares).toHaveLength(3);
    } finally { logSpy.mockRestore(); }
  });

  it('uses custom outputDir when provided', async () => {
    setupCeremonyMocks();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runKeysCeremonyInit('/ws', {
        json: false, shares: 3, threshold: 2, outputDir: '/custom/out',
      });
      expect(mockMkdir).toHaveBeenCalledWith('/custom/out', { recursive: true });
    } finally { logSpy.mockRestore(); }
  });

  it('uses participant names when provided', async () => {
    setupCeremonyMocks();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runKeysCeremonyInit('/ws', {
        json: false, shares: 3, threshold: 2,
        participants: ['alice', 'bob', 'charlie'],
      });
      expect(mockRecordParticipant).toHaveBeenCalledWith('alice', 0);
      expect(mockRecordParticipant).toHaveBeenCalledWith('bob', 1);
      expect(mockRecordParticipant).toHaveBeenCalledWith('charlie', 2);
    } finally { logSpy.mockRestore(); }
  });

  it('falls back to participant-{index} when no participants given', async () => {
    setupCeremonyMocks();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runKeysCeremonyInit('/ws', {
        json: false, shares: 3, threshold: 2,
      });
      expect(mockRecordParticipant).toHaveBeenCalledWith('participant-0', 0);
      expect(mockRecordParticipant).toHaveBeenCalledWith('participant-1', 1);
      expect(mockRecordParticipant).toHaveBeenCalledWith('participant-2', 2);
    } finally { logSpy.mockRestore(); }
  });

  it('returns 1 and prints error on failure (text)', async () => {
    mockInitCeremony.mockRejectedValue(new Error('threshold > shares'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', {
        json: false, shares: 2, threshold: 5,
      });
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: threshold > shares');
    } finally { errorSpy.mockRestore(); }
  });

  it('returns 1 and outputs JSON error on failure', async () => {
    mockInitCeremony.mockRejectedValue(new Error('threshold > shares'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', {
        json: true, shares: 2, threshold: 5,
      });
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('threshold > shares');
    } finally { logSpy.mockRestore(); }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockInitCeremony.mockRejectedValue('bad ceremony');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', {
        json: false, shares: 3, threshold: 2,
      });
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('bad ceremony');
    } finally { errorSpy.mockRestore(); }
  });
});

describe('claws keys ceremony init (single-dev)', () => {
  afterEach(() => { resetMocks(); });

  it('returns 0 and prints derived key info (text)', async () => {
    mockDeriveSingleDevKey.mockReturnValue({ algorithm: 'ed25519' });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', {
        json: false, singleDev: true, passphrase: 'my-secret',
      });
      expect(code).toBe(0);
      expect(mockDeriveSingleDevKey).toHaveBeenCalledWith('my-secret', '/ws');
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Single-developer key derived');
      expect(output).toContain('algorithm: ed25519');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 and outputs JSON on success', async () => {
    mockDeriveSingleDevKey.mockReturnValue({ algorithm: 'ed25519' });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', {
        json: true, singleDev: true, passphrase: 'my-secret',
      });
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('derived');
      expect(parsed.mode).toBe('single-dev');
      expect(parsed.algorithm).toBe('ed25519');
    } finally { logSpy.mockRestore(); }
  });

  it('uses custom salt when provided', async () => {
    mockDeriveSingleDevKey.mockReturnValue({ algorithm: 'ed25519' });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runKeysCeremonyInit('/ws', {
        json: false, singleDev: true, passphrase: 'my-secret', salt: 'custom-salt',
      });
      expect(mockDeriveSingleDevKey).toHaveBeenCalledWith('my-secret', 'custom-salt');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 1 when passphrase is missing (text)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', {
        json: false, singleDev: true,
      });
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('--passphrase is required');
    } finally { errorSpy.mockRestore(); }
  });

  it('returns 1 when passphrase is missing (json)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', {
        json: true, singleDev: true,
      });
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('--passphrase is required');
    } finally { logSpy.mockRestore(); }
  });
});

describe('claws keys ceremony init (missing shares/threshold)', () => {
  afterEach(() => { resetMocks(); });

  it('returns 1 when shares and threshold are missing (text)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', { json: false });
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('--shares and --threshold are required');
    } finally { errorSpy.mockRestore(); }
  });

  it('returns 1 when shares and threshold are missing (json)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyInit('/ws', { json: true });
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('--shares and --threshold are required');
    } finally { logSpy.mockRestore(); }
  });
});

describe('claws keys ceremony reconstruct', () => {
  afterEach(() => { resetMocks(); });

  const shares = [
    { index: 0, data: 'share0' },
    { index: 1, data: 'share1' },
  ];
  const baseOpts = {
    shares,
    expectedHash: 'abc123',
    ceremonyId: 'cer-001',
  };

  it('returns 0 when verified (text)', async () => {
    mockShamirReconstruct.mockReturnValue({ verified: true });
    mockRecordKeyReconstructed.mockResolvedValue(undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyReconstruct('/ws', { ...baseOpts, json: false });
      expect(code).toBe(0);
      expect(mockShamirReconstruct).toHaveBeenCalledWith(shares, 'abc123');
      expect(mockRecordKeyReconstructed).toHaveBeenCalledWith('/ws', 'cer-001', 2, true);
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Key reconstructed and verified');
      expect(output).toContain('ceremony: cer-001');
      expect(output).toContain('shares:   2');
      expect(output).toContain('verified: true');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 and outputs JSON when verified', async () => {
    mockShamirReconstruct.mockReturnValue({ verified: true });
    mockRecordKeyReconstructed.mockResolvedValue(undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyReconstruct('/ws', { ...baseOpts, json: true });
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('reconstructed');
      expect(parsed.verified).toBe(true);
      expect(parsed.ceremonyId).toBe('cer-001');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 1 when hash mismatch (text)', async () => {
    mockShamirReconstruct.mockReturnValue({ verified: false });
    mockRecordKeyReconstructed.mockResolvedValue(undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyReconstruct('/ws', { ...baseOpts, json: false });
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('hash mismatch');
      expect(output).toContain('verified: false');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 1 and outputs JSON when hash mismatch', async () => {
    mockShamirReconstruct.mockReturnValue({ verified: false });
    mockRecordKeyReconstructed.mockResolvedValue(undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyReconstruct('/ws', { ...baseOpts, json: true });
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('mismatch');
      expect(parsed.verified).toBe(false);
    } finally { logSpy.mockRestore(); }
  });

  it('returns 1 and prints error on failure (text)', async () => {
    mockShamirReconstruct.mockImplementation(() => { throw new Error('insufficient shares'); });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyReconstruct('/ws', { ...baseOpts, json: false });
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: insufficient shares');
    } finally { errorSpy.mockRestore(); }
  });

  it('returns 1 and outputs JSON error on failure', async () => {
    mockShamirReconstruct.mockImplementation(() => { throw new Error('insufficient shares'); });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyReconstruct('/ws', { ...baseOpts, json: true });
      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('insufficient shares');
    } finally { logSpy.mockRestore(); }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockShamirReconstruct.mockImplementation(() => { throw 'shamir failed'; });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKeysCeremonyReconstruct('/ws', { ...baseOpts, json: false });
      expect(code).toBe(1);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('shamir failed');
    } finally { errorSpy.mockRestore(); }
  });
});
