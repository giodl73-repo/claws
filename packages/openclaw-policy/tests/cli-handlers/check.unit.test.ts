import { describe, it, expect } from 'vitest';

import { handle, renderDiagnostic } from '../../src/cli-handlers/check.js';
import type { PolicyIR } from '../../src/types/index.js';
import { waffles } from '../helpers/fixture.js';

describe('policy check handler', () => {
  it('returns exit 0 and "ok" summary when the workspace IR passes analyze', async () => {
    const ir = waffles();
    const result = await handle(
      { binaryName: 'claws', args: ['--workspace', '/ws'], cwd: '/cwd' },
      async () => ir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('claws policy check:');
    expect(result.stdout).toContain('ok');
    expect(result.stderr).toBe('');
  });

  it('returns exit 1 when analyze emits a governance-fatal diagnostic', async () => {
    const ir = waffles();
    const fatal: PolicyIR = {
      ...ir,
      tools: [
        {
          name: 'send-email',
          riskLevel: 5,
          capabilities: ['IRREVERSIBLE_EXTERNAL'],
        },
      ],
    };
    const result = await handle(
      { binaryName: 'claws', args: [], cwd: '/cwd' },
      async () => fatal,
    );
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/error /);
    expect(result.stdout).toMatch(/OC-POLICY/);
  });

  it('returns exit 2 when no workspace can be resolved', async () => {
    const result = await handle(
      { binaryName: 'claws', args: ['--workspace', ''], cwd: '' },
      async () => waffles(),
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('workspace path required');
  });

  it('returns exit 1 when the loader throws (missing policy-ir.json)', async () => {
    const result = await handle(
      { binaryName: 'claws', args: ['--workspace', '/ws'], cwd: '/cwd' },
      async () => {
        throw new Error('ENOENT: policy-ir.json not found');
      },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('ENOENT');
  });

  it('falls back to argv.cwd when no --workspace flag is supplied', async () => {
    let seen = '';
    await handle(
      { binaryName: 'claws', args: [], cwd: '/fallback' },
      async (workspace) => {
        seen = workspace;
        return waffles();
      },
    );
    expect(seen).toBe('/fallback');
  });

  it('renders diagnostics in LSP-compatible shape (<file>:<line>:<col> <severity> <code>: <message>)', () => {
    const line = renderDiagnostic({
      code: 'OC-POLICY-E231',
      severity: 'error',
      message: 'R3 tool consumes non-user_prompt without declared provenance',
      path: 'SOUL.md',
      line: 12,
      column: 3,
    });
    expect(line).toBe(
      'SOUL.md:12:3 error OC-POLICY-E231: R3 tool consumes non-user_prompt without declared provenance',
    );
  });

  it('defaults path/line/column for diagnostics missing location info', () => {
    const line = renderDiagnostic({
      code: 'OC-POLICY-W100',
      severity: 'warning',
      message: 'tone field empty',
    });
    expect(line).toBe('<workspace>:0:0 warning OC-POLICY-W100: tone field empty');
  });
});
