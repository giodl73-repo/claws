/**
 * L0: cache command — CLI wiring for cache status, export, import, clear.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────

const mockLoad = vi.fn();
const mockSave = vi.fn();
const mockCheck = vi.fn();
const mockStore = vi.fn();
const mockExport = vi.fn();
const mockImport = vi.fn();
const mockStatus = vi.fn();
const mockClear = vi.fn();

vi.mock('@bic/claws-sdk/compile', () => {
  class _LLMCache {
    load(...args: unknown[]) { return mockLoad(...args); }
    save(...args: unknown[]) { return mockSave(...args); }
    check(...args: unknown[]) { return mockCheck(...args); }
    store(...args: unknown[]) { return mockStore(...args); }
    export(...args: unknown[]) { return mockExport(...args); }
    import(...args: unknown[]) { return mockImport(...args); }
    status(...args: unknown[]) { return mockStatus(...args); }
    clear(...args: unknown[]) { return mockClear(...args); }
  }
  return { LLMCache: _LLMCache };
});

const mockReadFile = vi.fn();

vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

import {
  runCacheStatus,
  runCacheExport,
  runCacheImport,
  runCacheClear,
} from '../../src/commands/cache.js';

// ── Helpers ─────────────────────────────────────────────────────────────

const jsonOpts = { json: true } as const;
const textOpts = { json: false } as const;

function resetMocks() {
  vi.restoreAllMocks();
  mockLoad.mockReset();
  mockSave.mockReset();
  mockCheck.mockReset();
  mockStore.mockReset();
  mockExport.mockReset();
  mockImport.mockReset();
  mockStatus.mockReset();
  mockClear.mockReset();
  mockReadFile.mockReset();
  mockLoad.mockResolvedValue(undefined);
  mockSave.mockResolvedValue(undefined);
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('claws cache status', () => {
  afterEach(resetMocks);

  it('returns 0 and prints status summary (text)', async () => {
    mockStatus.mockReturnValue({
      size: 5,
      hits: 10,
      misses: 3,
      hitRate: 10 / 13,
      modelIds: ['model-a', 'model-b'],
      promptVersions: ['p1', 'p2'],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCacheStatus('/ws', textOpts);
      expect(code).toBe(0);
      expect(mockLoad).toHaveBeenCalled();

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('5 entries');
      expect(output).toContain('model-a');
      expect(output).toContain('model-b');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on status with --json', async () => {
    mockStatus.mockReturnValue({
      size: 2,
      hits: 1,
      misses: 1,
      hitRate: 0.5,
      modelIds: ['model-x'],
      promptVersions: ['pv1'],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCacheStatus('/ws', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.size).toBe(2);
      expect(parsed.hitRate).toBe(0.5);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 with empty models and prompt versions (text)', async () => {
    mockStatus.mockReturnValue({
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: null,
      modelIds: [],
      promptVersions: [],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCacheStatus('/ws', textOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('0 entries');
      expect(output).not.toContain('models:');
      expect(output).not.toContain('prompt versions:');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 on error (text)', async () => {
    mockLoad.mockRejectedValue(new Error('Disk error'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheStatus('/ws', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Disk error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 on error (json)', async () => {
    mockLoad.mockRejectedValue(new Error('IO failure'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheStatus('/ws', jsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('IO failure');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockLoad.mockRejectedValue('string error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheStatus('/ws', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('string error');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('claws cache export', () => {
  afterEach(resetMocks);

  it('returns 0 and prints export JSON', async () => {
    const exportData = {
      version: 1,
      entries: { 'k1': { key: 'k1', result: {}, storedAt: '2026-01-01T00:00:00Z' } },
      exportedAt: '2026-01-01T00:00:00Z',
    };
    mockExport.mockReturnValue(exportData);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCacheExport('/ws', textOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.version).toBe(1);
      expect(parsed.entries.k1).toBeDefined();
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 on export error (text)', async () => {
    mockLoad.mockRejectedValue(new Error('Read failed'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheExport('/ws', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Read failed');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 on export error (json)', async () => {
    mockLoad.mockRejectedValue(new Error('Disk error'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheExport('/ws', jsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Disk error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockLoad.mockRejectedValue(42);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheExport('/ws', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('42');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('claws cache import', () => {
  afterEach(resetMocks);

  it('returns 0 and imports from file', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({
      version: 1,
      entries: {},
      exportedAt: '2026-01-01T00:00:00Z',
    }));
    mockLoad.mockResolvedValue(undefined);
    mockSave.mockResolvedValue(undefined);
    mockImport.mockReturnValue({ skipped: 0, reasons: [] });
    mockStatus.mockReturnValue({
      size: 3,
      hits: 0,
      misses: 0,
      hitRate: null,
      modelIds: [],
      promptVersions: [],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCacheImport('/ws', '/tmp/cache.json', textOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('imported');
      expect(output).toContain('3 entries');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on import with --json', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({
      version: 1,
      entries: {},
      exportedAt: '2026-01-01T00:00:00Z',
    }));
    mockLoad.mockResolvedValue(undefined);
    mockSave.mockResolvedValue(undefined);
    mockImport.mockReturnValue({ skipped: 0, reasons: [] });
    mockStatus.mockReturnValue({
      size: 5,
      hits: 0,
      misses: 0,
      hitRate: null,
      modelIds: [],
      promptVersions: [],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCacheImport('/ws', '/tmp/cache.json', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.size).toBe(5);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 on import error (text)', async () => {
    mockReadFile.mockRejectedValue(new Error('No such file'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheImport('/ws', '/bad/path.json', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No such file');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 on import error (json)', async () => {
    mockReadFile.mockRejectedValue(new Error('File not found'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheImport('/ws', '/bad/path.json', jsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('File not found');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockReadFile.mockRejectedValue('raw import error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheImport('/ws', '/bad.json', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw import error');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('claws cache clear', () => {
  afterEach(resetMocks);

  it('returns 0 and clears cache (text)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCacheClear('/ws', textOpts);
      expect(code).toBe(0);

      expect(mockClear).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('cleared');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on clear with --json', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCacheClear('/ws', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.cleared).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 on error (text)', async () => {
    mockSave.mockRejectedValue(new Error('Permission denied'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheClear('/ws', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Permission denied');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 on error (json)', async () => {
    mockSave.mockRejectedValue(new Error('Write denied'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheClear('/ws', jsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Write denied');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockSave.mockRejectedValue(99);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCacheClear('/ws', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('99');
    } finally {
      errorSpy.mockRestore();
    }
  });
});
