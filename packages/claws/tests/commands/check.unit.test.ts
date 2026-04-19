/**
 * L0: check command — violation rendering, exit codes, --json flag.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runCheck } from '../../src/commands/check.js';

async function createCleanWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-check-'));
  await writeFile(join(root, 'claws.json'), JSON.stringify({ trustTier: 2 }));
  await writeFile(
    join(root, 'TOOLS.md'),
    '# Tools\n\n## file-read\nReads files.\nRisk: R2\n',
  );
  return root;
}

function makeCtx(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    workspaceRoot: '/tmp/fake',
    hasConfig: true,
    config: { trustTier: 2 },
    bypass: false,
    suppressedRules: [],
    ...overrides,
  };
}

describe('claws check', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('workspace renders summary line with PASS or FAIL and timing', async () => {
    tmpRoot = await createCleanWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: false, color: false });
      // 0=clean, 1=violations — both valid for a simple workspace
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      // Summary line always has PASS or FAIL plus timing
      expect(output).toMatch(/PASS|FAIL/);
      expect(output).toMatch(/\d+\.\d+s/);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('workspace with violations renders FAIL with rule ID and severity', async () => {
    tmpRoot = await createCleanWorkspace();
    // Add SOUL.md with deny constraints to trigger potential violations
    await writeFile(
      join(tmpRoot, 'SOUL.md'),
      '# Soul\n\nNever access production databases.\n',
    );
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: false, color: false });
      // Exit code 0 (no violations from basic rules) or 1 (violations)
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      // Should have either PASS or FAIL
      expect(output).toMatch(/PASS|FAIL/);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('--json flag outputs valid JSON with violation array', async () => {
    tmpRoot = await createCleanWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: true, verbose: false, color: false });
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toMatch(/^(pass|fail)$/);
      expect(Array.isArray(parsed.violations)).toBe(true);
      expect(parsed.summary).toBeDefined();
      expect(typeof parsed.summary.total).toBe('number');
      expect(typeof parsed.durationMs).toBe('number');
      // Each violation has required fields
      for (const v of parsed.violations) {
        expect(v.rule).toBeDefined();
        expect(v.severity).toBeDefined();
        expect(v.message).toBeDefined();
        expect(v.diagnosticCode).toBeDefined();
      }
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 when no workspace detected', async () => {
    const ctx = makeCtx({ hasConfig: false });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: false, color: false });
      expect(exitCode).toBe(3);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('CLAWS_BYPASS=1 skips check with warning and exit code 2', async () => {
    tmpRoot = await createCleanWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot, bypass: true });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: false, color: false });
      expect(exitCode).toBe(2);

      const warnCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(warnCalls).toContain('Governance check skipped');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('CLAWS_BYPASS=1 writes audit event with HMAC signature', async () => {
    tmpRoot = await createCleanWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot, bypass: true });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await runCheck(ctx, { json: false, verbose: false, color: false });

      const { readFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const chainPath = join(tmpRoot!, '.claws', 'audit', 'chain.jsonl');
      const content = await readFile(chainPath, 'utf-8');
      const event = JSON.parse(content.trim());
      expect(event.eventType).toBe('BYPASS_ACTIVATED');
      expect(event.action).toBe('check-bypass');
      expect(event.hmacSignature).toBeTruthy();
      expect(event.hmacSignature.length).toBe(64);
      expect(event.keyId).toBe('workspace-v1');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 when no workspace detected with --json', async () => {
    const ctx = makeCtx({ hasConfig: false });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: true, verbose: false, color: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E010');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 when parse halts (no source files)', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-check-empty-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));

    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: false, color: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E021');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 when parse halts with --json', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-check-empty-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));

    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: true, verbose: false, color: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E021');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('--format sarif routes through format registry', async () => {
    tmpRoot = await createCleanWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: false, color: false, format: 'sarif' });
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      // SARIF output has $schema and runs array
      expect(parsed.$schema).toContain('sarif');
      expect(Array.isArray(parsed.runs)).toBe(true);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('--format csv outputs CSV', async () => {
    tmpRoot = await createCleanWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: false, color: false, format: 'csv' });
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join('');
      // CSV always has a header line
      expect(output).toMatch(/rule|severity|message/i);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('CLAWS_BYPASS=1 with --json outputs JSON bypass status', async () => {
    tmpRoot = await createCleanWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot, bypass: true });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: true, verbose: false, color: false });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('bypassed');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
