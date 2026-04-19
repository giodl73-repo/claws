/**
 * L0: uninstall command — SDK delegation, status rendering, error handling.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock the SDK before importing the command
vi.mock('@bic/claws-sdk/init', () => ({
  uninstallWorkspace: vi.fn(),
}));

import { uninstallWorkspace } from '@bic/claws-sdk/init';
import { runUninstall } from '../../src/commands/uninstall.js';

const mockUninstall = vi.mocked(uninstallWorkspace);

describe('claws uninstall', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders text message on no-op (no .claws/ directory)', async () => {
    mockUninstall.mockResolvedValue({ exitCode: 0, status: 'no-op' });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runUninstall('/tmp/ws', { json: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Nothing to uninstall');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders JSON on no-op when json=true', async () => {
    mockUninstall.mockResolvedValue({ exitCode: 0, status: 'no-op' });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runUninstall('/tmp/ws', { json: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('no-op');
      expect(parsed.message).toContain('No .claws/');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders text success message with backup path', async () => {
    mockUninstall.mockResolvedValue({
      exitCode: 0,
      status: 'uninstalled',
      backupPath: '/home/user/.claws-backups/abc/20260101',
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runUninstall('/tmp/ws', { json: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Uninstalled');
      expect(output).toContain('/home/user/.claws-backups/abc/20260101');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders audit archive path when present', async () => {
    mockUninstall.mockResolvedValue({
      exitCode: 0,
      status: 'uninstalled',
      backupPath: '/home/user/.claws-backups/abc/20260101',
      auditArchivePath: '/home/user/.claws-backups/abc/20260101/audit-archive',
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runUninstall('/tmp/ws', { json: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Audit chain archived at');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('does not render audit archive line when not present', async () => {
    mockUninstall.mockResolvedValue({
      exitCode: 0,
      status: 'uninstalled',
      backupPath: '/home/user/.claws-backups/abc/20260101',
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runUninstall('/tmp/ws', { json: false });

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).not.toContain('Audit chain archived');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders JSON success with all fields', async () => {
    mockUninstall.mockResolvedValue({
      exitCode: 0,
      status: 'uninstalled',
      backupPath: '/backup/path',
      auditArchivePath: '/backup/audit',
      gitignoreRemoved: ['.claws/keys/', '.claws/secrets/'],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runUninstall('/tmp/ws', { json: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('uninstalled');
      expect(parsed.backupPath).toBe('/backup/path');
      expect(parsed.auditArchivePath).toBe('/backup/audit');
      expect(parsed.gitignoreRemoved).toEqual(['.claws/keys/', '.claws/secrets/']);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders JSON success with null defaults when fields absent', async () => {
    mockUninstall.mockResolvedValue({
      exitCode: 0,
      status: 'uninstalled',
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runUninstall('/tmp/ws', { json: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.backupPath).toBeNull();
      expect(parsed.auditArchivePath).toBeNull();
      expect(parsed.gitignoreRemoved).toEqual([]);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 and renders text error on SDK throw', async () => {
    mockUninstall.mockRejectedValue(new Error('Permission denied'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runUninstall('/tmp/ws', { json: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E085');
      expect(output).toContain('Permission denied');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 and renders JSON error on SDK throw', async () => {
    mockUninstall.mockRejectedValue(new Error('EACCES'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runUninstall('/tmp/ws', { json: true });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E085');
      expect(parsed.error.what).toContain('EACCES');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('handles non-Error throw gracefully', async () => {
    mockUninstall.mockRejectedValue('string error');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runUninstall('/tmp/ws', { json: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('string error');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
