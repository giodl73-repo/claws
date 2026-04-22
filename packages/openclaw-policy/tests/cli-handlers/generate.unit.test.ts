/**
 * L0 unit tests for `claws policy generate` CLI handler (pulse 47.1 D3).
 *
 * Asserts: success path renders writtenFiles+diagnostics counts; --scope flag
 * is parsed; library throw surfaces exit 1; governance-fatal error-severity
 * diagnostics surface exit 1.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/generator.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/generator.js')>();
  return { ...actual, generate: vi.fn() };
});

import { handle } from '../../src/cli-handlers/generate.js';
import { generate } from '../../src/generator.js';

const OK_ARGV = { binaryName: 'claws', args: [] as string[], cwd: '/tmp/ws' };

const mockedGenerate = vi.mocked(generate);

describe('generate handler', () => {
  beforeEach(() => {
    mockedGenerate.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success with artifacts → exit 0 with file + diagnostics counts', async () => {
    mockedGenerate.mockResolvedValue({
      workspaceRoot: '/tmp/ws',
      writtenFiles: ['/tmp/ws/.openclaw/policy-ir.json', '/tmp/ws/.openclaw/gateway-plugin.ts'],
      diagnostics: [],
    });
    const res = await handle(OK_ARGV);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('files=2 diagnostics=0');
    expect(res.stdout).toContain('scope=@bic/openclaw');
    expect(mockedGenerate).toHaveBeenCalledWith({ workspaceRoot: '/tmp/ws' });
  });

  it('--scope flag parsed and echoed', async () => {
    mockedGenerate.mockResolvedValue({
      workspaceRoot: '/tmp/ws',
      writtenFiles: [],
      diagnostics: [],
    });
    const res = await handle({ ...OK_ARGV, args: ['--scope', '@openclaw'] });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('scope=@openclaw');
  });

  it('library throw → exit 1 with error message', async () => {
    mockedGenerate.mockRejectedValue(new Error('boom'));
    const res = await handle(OK_ARGV);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain('boom');
  });

  it('governance-fatal diagnostic → exit 1 with code+message', async () => {
    mockedGenerate.mockResolvedValue({
      workspaceRoot: '/tmp/ws',
      writtenFiles: [],
      diagnostics: [
        { code: 'OC-POLICY-E042', severity: 'error', message: 'duplicate tool spec' },
      ],
    });
    const res = await handle(OK_ARGV);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain('OC-POLICY-E042');
    expect(res.stderr).toContain('duplicate tool spec');
  });

  it('bad --scope value → exit 2 usage error (no library call)', async () => {
    const res = await handle({ ...OK_ARGV, args: ['--scope', 'nope'] });
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('--scope must be one of');
    expect(mockedGenerate).not.toHaveBeenCalled();
  });
});
