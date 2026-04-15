/**
 * L0: init command edge cases — mocked SDK for branch coverage on
 * optional chaining and error paths that real workspaces can't trigger.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@bic/claws-sdk/init', () => ({
  initWorkspace: vi.fn(),
  TemplateNotFoundError: class TemplateNotFoundError extends Error {
    readonly templateName: string;
    readonly availableTemplates: readonly string[];
    constructor(name: string) {
      super(`Template "${name}" not found.`);
      this.name = 'TemplateNotFoundError';
      this.templateName = name;
      this.availableTemplates = ['soc2', 'hipaa', 'minimal'];
    }
  },
}));

import { initWorkspace, TemplateNotFoundError } from '@bic/claws-sdk/init';
import { runInit } from '../../src/commands/init.js';

const mockInit = vi.mocked(initWorkspace);

describe('claws init — edge-case branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('JSON output defaults to "unknown" when detection is undefined', async () => {
    mockInit.mockResolvedValue({
      exitCode: 0,
      status: 'initialized',
      configPath: '/ws/claws.json',
      // detection is undefined — triggers ?? 'unknown' branches
    } as ReturnType<typeof initWorkspace> extends Promise<infer R> ? R : never);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: true });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.platform).toBe('unknown');
      expect(parsed.method).toBe('unknown');
      expect(parsed.template).toBeNull();
      expect(parsed.policyFiles).toEqual([]);
      expect(parsed.sidecarDirs).toEqual([]);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('text output defaults to "unknown" when detection is undefined', async () => {
    mockInit.mockResolvedValue({
      exitCode: 0,
      status: 'initialized',
      configPath: '/ws/claws.json',
    } as ReturnType<typeof initWorkspace> extends Promise<infer R> ? R : never);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Detected: unknown');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('text output includes template info with policy count', async () => {
    mockInit.mockResolvedValue({
      exitCode: 0,
      status: 'initialized',
      configPath: '/ws/claws.json',
      detection: { platform: 'node', method: 'auto-detect' },
      templateApplied: 'soc2',
      policyFiles: ['access-control.yaml', 'audit-logging.yaml'],
      sidecarDirs: ['.claws/compiled', '.claws/audit'],
    } as ReturnType<typeof initWorkspace> extends Promise<infer R> ? R : never);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Template: soc2 (2 policies)');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('text output includes template info with zero policies when policyFiles is undefined', async () => {
    mockInit.mockResolvedValue({
      exitCode: 0,
      status: 'initialized',
      configPath: '/ws/claws.json',
      detection: { platform: 'node', method: 'auto-detect' },
      templateApplied: 'minimal',
      // policyFiles is undefined — triggers ?? 0 branch
    } as ReturnType<typeof initWorkspace> extends Promise<infer R> ? R : never);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Template: minimal (0 policies)');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('catch block handles non-Error throw with String()', async () => {
    mockInit.mockRejectedValue('raw string error');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: false });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('CLAWS-E081');
      expect(output).toContain('raw string error');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('TemplateNotFoundError renders error with available templates (text)', async () => {
    const err = new TemplateNotFoundError('nonexistent');
    mockInit.mockRejectedValue(err);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: false, template: 'nonexistent' });
      expect(exitCode).toBe(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('CLAWS-E082');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('TemplateNotFoundError renders JSON error', async () => {
    const err = new TemplateNotFoundError('nonexistent');
    mockInit.mockRejectedValue(err);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: true, template: 'nonexistent' });
      expect(exitCode).toBe(1);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('CLAWS-E082');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('already-initialized with JSON outputs error JSON', async () => {
    mockInit.mockResolvedValue({
      exitCode: 2,
      status: 'already-initialized',
      configPath: '/ws/claws.json',
    } as ReturnType<typeof initWorkspace> extends Promise<infer R> ? R : never);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: true });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('CLAWS-E080');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('already-initialized with text outputs error text', async () => {
    mockInit.mockResolvedValue({
      exitCode: 2,
      status: 'already-initialized',
      configPath: '/ws/claws.json',
    } as ReturnType<typeof initWorkspace> extends Promise<infer R> ? R : never);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: false });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('CLAWS-E080');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('catch block handles Error throw with message', async () => {
    mockInit.mockRejectedValue(new Error('disk full'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runInit('/ws', { json: true });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.what).toContain('disk full');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
