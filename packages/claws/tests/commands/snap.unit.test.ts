/**
 * L0: snap command — snapshot save, restore, list, delete wiring + JSON/text output.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockSave = vi.fn();
const mockRestore = vi.fn();
const mockList = vi.fn();
const mockRemove = vi.fn();
const mockExists = vi.fn();
const mockDiff = vi.fn();
const mockRenderDiff = vi.fn();
const mockRenderDiffJson = vi.fn();
const mockPromote = vi.fn();
const mockListVersions = vi.fn();

// TamperError and PromotionError must be created inside the factory since vi.mock is hoisted.
vi.mock('@bic/claws-sdk/snapshot', () => {
  class _TamperError extends Error {
    readonly failedFiles: readonly { relativePath: string; reason: string }[];
    constructor(
      message: string,
      failedFiles: readonly { relativePath: string; reason: string }[],
    ) {
      super(message);
      this.name = 'TamperError';
      this.failedFiles = failedFiles;
    }
  }
  class _PromotionError extends Error {
    readonly violations: readonly { ruleId: string; target: string; message: string }[];
    constructor(
      message: string,
      violations: readonly { ruleId: string; target: string; message: string }[],
    ) {
      super(message);
      this.name = 'PromotionError';
      this.violations = violations;
    }
  }
  return {
    save: (...args: unknown[]) => mockSave(...args),
    restore: (...args: unknown[]) => mockRestore(...args),
    list: (...args: unknown[]) => mockList(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    exists: (...args: unknown[]) => mockExists(...args),
    diff: (...args: unknown[]) => mockDiff(...args),
    renderDiff: (...args: unknown[]) => mockRenderDiff(...args),
    renderDiffJson: (...args: unknown[]) => mockRenderDiffJson(...args),
    promote: (...args: unknown[]) => mockPromote(...args),
    listVersions: (...args: unknown[]) => mockListVersions(...args),
    TamperError: _TamperError,
    PromotionError: _PromotionError,
  };
});

import {
  runSnapSave,
  runSnapRestore,
  runSnapList,
  runSnapDelete,
  runSnapDiff,
  runSnapPromote,
} from '../../src/commands/snap.js';
import { TamperError, PromotionError } from '@bic/claws-sdk/snapshot';

// ── Helpers ─────────────────────────────────────────────────────────────────

const jsonOpts = { json: true } as const;
const textOpts = { json: false } as const;

function resetMocks() {
  vi.restoreAllMocks();
  mockSave.mockReset();
  mockRestore.mockReset();
  mockList.mockReset();
  mockRemove.mockReset();
  mockExists.mockReset();
  mockDiff.mockReset();
  mockRenderDiff.mockReset();
  mockRenderDiffJson.mockReset();
  mockPromote.mockReset();
  mockListVersions.mockReset();
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws snap save', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and prints success message on save', async () => {
    mockSave.mockResolvedValue({
      name: 'v1',
      fileCount: 5,
      manifest: { timestamp: '2026-01-01T00:00:00Z', workspaceHash: 'abc123' },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapSave('/ws', 'v1', textOpts);
      expect(code).toBe(0);

      expect(mockSave).toHaveBeenCalledWith('/ws', 'v1');

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Snapshot "v1" saved');
      expect(output).toContain('5 files');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on save with --json', async () => {
    mockSave.mockResolvedValue({
      name: 'v2',
      fileCount: 3,
      manifest: { timestamp: '2026-01-02T00:00:00Z', workspaceHash: 'def456' },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapSave('/ws', 'v2', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.snapshot).toBe('v2');
      expect(parsed.fileCount).toBe(3);
      expect(parsed.timestamp).toBe('2026-01-02T00:00:00Z');
      expect(parsed.workspaceHash).toBe('def456');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 and prints error when save throws', async () => {
    mockSave.mockRejectedValue(new Error('Disk full'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapSave('/ws', 'v1', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Disk full');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error when save throws with --json', async () => {
    mockSave.mockRejectedValue(new Error('Write failed'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapSave('/ws', 'v1', jsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Write failed');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockSave.mockRejectedValue('string error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapSave('/ws', 'v1', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('string error');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('claws snap restore', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and prints success message on restore', async () => {
    mockRestore.mockResolvedValue({ name: 'v1', fileCount: 5 });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapRestore('/ws', 'v1', textOpts);
      expect(code).toBe(0);

      expect(mockRestore).toHaveBeenCalledWith('/ws', 'v1');

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Snapshot "v1" restored');
      expect(output).toContain('5 files');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on restore with --json', async () => {
    mockRestore.mockResolvedValue({ name: 'v1', fileCount: 7 });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapRestore('/ws', 'v1', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.snapshot).toBe('v1');
      expect(parsed.fileCount).toBe(7);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and prints tamper details when TamperError is thrown', async () => {
    mockRestore.mockRejectedValue(
      new TamperError('integrity failed', [
        { relativePath: 'policies/rule.yaml', reason: 'hash mismatch' },
        { relativePath: 'claws.json', reason: 'file missing' },
      ]),
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapRestore('/ws', 'v1', textOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Tamper detected');
      expect(output).toContain('policies/rule.yaml');
      expect(output).toContain('hash mismatch');
      expect(output).toContain('claws.json');
      expect(output).toContain('file missing');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 and outputs JSON tamper details when TamperError with --json', async () => {
    mockRestore.mockRejectedValue(
      new TamperError('integrity check failed', [
        { relativePath: 'config.json', reason: 'modified' },
      ]),
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapRestore('/ws', 'v1', jsonOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('tamper');
      expect(parsed.message).toContain('integrity check failed');
      expect(parsed.failedFiles).toHaveLength(1);
      expect(parsed.failedFiles[0].relativePath).toBe('config.json');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and prints error when restore throws generic error', async () => {
    mockRestore.mockRejectedValue(new Error('Snapshot not found'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapRestore('/ws', 'v1', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Snapshot not found');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error when restore throws generic error with --json', async () => {
    mockRestore.mockRejectedValue(new Error('Read failure'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapRestore('/ws', 'v1', jsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Read failure');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockRestore.mockRejectedValue(42);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapRestore('/ws', 'v1', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('42');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('claws snap list', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and prints "No snapshots found" when empty', async () => {
    mockList.mockResolvedValue([]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapList('/ws', textOpts);
      expect(code).toBe(0);

      expect(mockList).toHaveBeenCalledWith('/ws');

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No snapshots found');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and prints snapshot details when snapshots exist', async () => {
    mockList.mockResolvedValue([
      { name: 'v1', timestamp: '2026-01-01T00:00:00Z', fileCount: 5 },
      { name: 'v2', timestamp: '2026-01-02T00:00:00Z', fileCount: 8 },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapList('/ws', textOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Snapshots:');
      expect(output).toContain('v1');
      expect(output).toContain('5 files');
      expect(output).toContain('v2');
      expect(output).toContain('8 files');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON when --json', async () => {
    const snapshots = [
      { name: 'v1', timestamp: '2026-01-01T00:00:00Z', fileCount: 5 },
    ];
    mockList.mockResolvedValue(snapshots);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapList('/ws', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.snapshots).toHaveLength(1);
      expect(parsed.snapshots[0].name).toBe('v1');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON with empty snapshots when --json and none exist', async () => {
    mockList.mockResolvedValue([]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapList('/ws', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.snapshots).toHaveLength(0);
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe('claws snap delete', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and prints success when snapshot exists', async () => {
    mockExists.mockResolvedValue(true);
    mockRemove.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapDelete('/ws', 'v1', textOpts);
      expect(code).toBe(0);

      expect(mockExists).toHaveBeenCalledWith('/ws', 'v1');
      expect(mockRemove).toHaveBeenCalledWith('/ws', 'v1');

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Snapshot "v1" deleted');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on delete with --json', async () => {
    mockExists.mockResolvedValue(true);
    mockRemove.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapDelete('/ws', 'v1', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.deleted).toBe('v1');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 and prints error when snapshot not found', async () => {
    mockExists.mockResolvedValue(false);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapDelete('/ws', 'gone', textOpts);
      expect(code).toBe(3);

      expect(mockRemove).not.toHaveBeenCalled();

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Snapshot "gone" not found');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error when snapshot not found with --json', async () => {
    mockExists.mockResolvedValue(false);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapDelete('/ws', 'gone', jsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('gone');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('claws snap diff', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and prints diff lines on success', async () => {
    const diffResult = { changes: [] };
    mockDiff.mockResolvedValue(diffResult);
    mockRenderDiff.mockReturnValue(['+ added policy.yaml', '- removed old.yaml']);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapDiff('/ws', 'v1', 'v2', textOpts);
      expect(code).toBe(0);

      expect(mockDiff).toHaveBeenCalledWith('/ws', 'v1', 'v2');
      expect(mockRenderDiff).toHaveBeenCalledWith(diffResult);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('+ added policy.yaml');
      expect(output).toContain('- removed old.yaml');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON diff on success with --json', async () => {
    const diffResult = { changes: [{ file: 'a.yaml', type: 'added' }] };
    mockDiff.mockResolvedValue(diffResult);
    mockRenderDiffJson.mockReturnValue({ status: 'ok', changes: [{ file: 'a.yaml', type: 'added' }] });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapDiff('/ws', 'v1', 'v2', jsonOpts);
      expect(code).toBe(0);

      expect(mockRenderDiffJson).toHaveBeenCalledWith(diffResult);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.changes).toHaveLength(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 when TamperError is thrown (text)', async () => {
    mockDiff.mockRejectedValue(
      new TamperError('integrity failed', [
        { relativePath: 'config.yaml', reason: 'hash mismatch' },
      ]),
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapDiff('/ws', 'v1', 'v2', textOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Tamper detected');
      expect(output).toContain('config.yaml');
      expect(output).toContain('hash mismatch');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 when TamperError is thrown (json)', async () => {
    mockDiff.mockRejectedValue(
      new TamperError('tampered', [
        { relativePath: 'rules.yaml', reason: 'modified' },
      ]),
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapDiff('/ws', 'v1', 'v2', jsonOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('tamper');
      expect(parsed.failedFiles).toHaveLength(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 when generic error is thrown (text)', async () => {
    mockDiff.mockRejectedValue(new Error('Snapshot not found'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapDiff('/ws', 'v1', 'v2', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Snapshot not found');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 when generic error is thrown (json)', async () => {
    mockDiff.mockRejectedValue(new Error('Read failed'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapDiff('/ws', 'v1', 'v2', jsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Read failed');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockDiff.mockRejectedValue('raw diff error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapDiff('/ws', 'v1', 'v2', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw diff error');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('claws snap promote', () => {
  afterEach(() => {
    resetMocks();
  });

  const promoteOpts = { json: false, fleet: '/fleet' } as const;
  const promoteJsonOpts = { json: true, fleet: '/fleet' } as const;

  it('returns 0 and prints promote success (text)', async () => {
    mockPromote.mockResolvedValue({
      name: 'v1',
      version: '1.0.0',
      provenance: {
        signer: 'local',
        bundleHash: 'abcdef0123456789abcdef0123456789',
        workspaceHash: '9876543210fedcba9876543210fedcba',
        timestamp: '2026-01-01T00:00:00Z',
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapPromote('/ws', 'v1', promoteOpts);
      expect(code).toBe(0);

      expect(mockPromote).toHaveBeenCalledWith('/ws', 'v1', '/fleet', {});

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Snapshot "v1" promoted');
      expect(output).toContain('v1.0.0');
      expect(output).toContain('signer:');
      expect(output).toContain('bundleHash:');
      expect(output).toContain('workspaceHash:');
      expect(output).toContain('timestamp:');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('passes signer option when provided', async () => {
    mockPromote.mockResolvedValue({
      name: 'v1',
      version: '1.0.0',
      provenance: {
        signer: 'ci-bot',
        bundleHash: 'abcdef0123456789abcdef0123456789',
        workspaceHash: '9876543210fedcba9876543210fedcba',
        timestamp: '2026-01-01T00:00:00Z',
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runSnapPromote('/ws', 'v1', { ...promoteOpts, signer: 'ci-bot' });

      expect(mockPromote).toHaveBeenCalledWith('/ws', 'v1', '/fleet', { signer: 'ci-bot' });
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on success with --json', async () => {
    mockPromote.mockResolvedValue({
      name: 'v1',
      version: '1.0.0',
      provenance: {
        signer: 'local',
        bundleHash: 'abcdef0123456789',
        workspaceHash: '9876543210fedcba',
        timestamp: '2026-01-01T00:00:00Z',
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSnapPromote('/ws', 'v1', promoteJsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.snapshot).toBe('v1');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.provenance.signer).toBe('local');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 when TamperError is thrown (text)', async () => {
    mockPromote.mockRejectedValue(
      new TamperError('integrity failed', [
        { relativePath: 'policy.yaml', reason: 'hash mismatch' },
      ]),
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapPromote('/ws', 'v1', promoteOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Tamper detected');
      expect(output).toContain('policy.yaml');
      expect(output).toContain('hash mismatch');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 when TamperError is thrown (json)', async () => {
    mockPromote.mockRejectedValue(
      new TamperError('tampered', [
        { relativePath: 'a.yaml', reason: 'modified' },
      ]),
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapPromote('/ws', 'v1', promoteJsonOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('tamper');
      expect(parsed.failedFiles).toHaveLength(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 2 when PromotionError is thrown (text)', async () => {
    mockPromote.mockRejectedValue(
      new PromotionError('pinch gate failed', [
        { ruleId: 'PG-001', target: 'policy.yaml', message: 'Missing required field' },
      ]),
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapPromote('/ws', 'v1', promoteOpts);
      expect(code).toBe(2);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Promotion blocked');
      expect(output).toContain('[PG-001]');
      expect(output).toContain('policy.yaml');
      expect(output).toContain('Missing required field');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 2 when PromotionError is thrown (json)', async () => {
    mockPromote.mockRejectedValue(
      new PromotionError('pinch gate failed', [
        { ruleId: 'PG-002', target: 'rules.yaml', message: 'Version mismatch' },
      ]),
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapPromote('/ws', 'v1', promoteJsonOpts);
      expect(code).toBe(2);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('pinch_failed');
      expect(parsed.violations).toHaveLength(1);
      expect(parsed.violations[0].ruleId).toBe('PG-002');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 when generic error is thrown (text)', async () => {
    mockPromote.mockRejectedValue(new Error('Registry unavailable'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapPromote('/ws', 'v1', promoteOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Registry unavailable');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 when generic error is thrown (json)', async () => {
    mockPromote.mockRejectedValue(new Error('Write failed'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapPromote('/ws', 'v1', promoteJsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Write failed');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockPromote.mockRejectedValue(99);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapPromote('/ws', 'v1', promoteOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('99');
    } finally {
      errorSpy.mockRestore();
    }
  });
});
