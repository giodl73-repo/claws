/**
 * L0: compile command — pipeline wiring, IR output, cache check, bypass.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runCompile } from '../../src/commands/compile.js';

/**
 * Create a minimal workspace with claws.json and a TOOLS.md file.
 */
async function createMinimalWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-compile-'));
  await writeFile(join(root, 'claws.json'), JSON.stringify({ trustTier: 2 }));
  await writeFile(
    join(root, 'TOOLS.md'),
    '# Tools\n\n## file-read\nReads files from the local filesystem.\n',
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

describe('claws compile', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('calls SDK parse+extract+analyze and writes governance-ir.json', async () => {
    tmpRoot = await createMinimalWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: false, verbose: false });

      // Should succeed (0) or report violations (1) — not error (2)
      expect(exitCode).toBeLessThanOrEqual(1);

      // Verify IR was written
      const irPath = join(tmpRoot, '.claws', 'compiled', 'governance-ir.json');
      const irContent = await readFile(irPath, 'utf-8');
      const ir = JSON.parse(irContent);
      expect(ir).toHaveProperty('capabilities');
      expect(ir).toHaveProperty('analysis');
      expect(ir).toHaveProperty('compiler');
      expect(ir.compiler.compilerVersion).toBe('0.36.0');
      expect(ir.compiler.schemaVersion).toBe(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 when no workspace is detected', async () => {
    const ctx = makeCtx({ hasConfig: false });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: false, json: false, verbose: false });
      expect(exitCode).toBe(3);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns cached result when IR is up-to-date', async () => {
    tmpRoot = await createMinimalWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      // First compile
      await runCompile(ctx, { force: true, json: false, verbose: false });

      // Second compile without --force should use cache
      const exitCode = await runCompile(ctx, { force: false, json: false, verbose: false });
      expect(exitCode).toBe(0);

      // Verify the cache message was logged
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).toContain('up-to-date');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('CLAWS_BYPASS=1 short-circuits governance with warning and exit code 2', async () => {
    tmpRoot = await createMinimalWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot, bypass: true });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: false, json: false, verbose: false });
      expect(exitCode).toBe(2);

      // Should have warned about bypass
      const warnCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(warnCalls).toContain('Governance checks skipped');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('CLAWS_BYPASS=1 writes audit event with HMAC signature to chain.jsonl', async () => {
    tmpRoot = await createMinimalWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot, bypass: true });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await runCompile(ctx, { force: false, json: false, verbose: false });

      // Verify audit event was written
      const chainPath = join(tmpRoot, '.claws', 'audit', 'chain.jsonl');
      const content = await readFile(chainPath, 'utf-8');
      const event = JSON.parse(content.trim());
      expect(event.eventType).toBe('BYPASS_ACTIVATED');
      expect(event.outcome).toBe('allow');
      expect(event.hmacSignature).toBeTruthy();
      expect(event.hmacSignature.length).toBe(64); // SHA-256 hex = 64 chars
      expect(event.keyId).toBe('workspace-v1');
      expect(event.algorithm).toBe('sha256');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('CLAWS_BYPASS=1 with --json outputs JSON bypassed status', async () => {
    tmpRoot = await createMinimalWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot, bypass: true });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: false, json: true, verbose: false });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('bypassed');
      expect(parsed.message).toContain('skipped');
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('no workspace with --json outputs JSON error', async () => {
    const ctx = makeCtx({ hasConfig: false });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: false, json: true, verbose: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.code).toBe('CLAWS-E010');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('cached result with --json returns JSON cached status', async () => {
    tmpRoot = await createMinimalWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      // First compile to populate cache
      await runCompile(ctx, { force: true, json: false, verbose: false });

      consoleSpy.mockClear();

      // Second compile with JSON should show cached status
      const exitCode = await runCompile(ctx, { force: false, json: true, verbose: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('cached');
      expect(parsed.path).toContain('governance-ir.json');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('verbose mode prints parse file count', async () => {
    tmpRoot = await createMinimalWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: false, verbose: true });
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toMatch(/Parsed \d+ files/);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('verbose mode prints duration', async () => {
    tmpRoot = await createMinimalWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: false, verbose: true });
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toMatch(/Duration: \d+ms/);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('JSON output includes violation and conflict counts', async () => {
    tmpRoot = await createMinimalWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: true, verbose: false });
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toMatch(/^(ok|violations)$/);
      expect(parsed.path).toContain('governance-ir.json');
      expect(typeof parsed.violations).toBe('number');
      expect(typeof parsed.conflicts).toBe('number');
      expect(typeof parsed.durationMs).toBe('number');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('parse halt returns exit code 3 with no-source-files error', async () => {
    // Workspace with claws.json but no governance source files
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-compile-empty-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));

    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: false, verbose: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('CLAWS-E021');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('text output includes IR path when workspace has governance directives', async () => {
    tmpRoot = await createMinimalWorkspace();
    // Create a workspace that triggers conflicts by having conflicting governance directives
    await writeFile(
      join(tmpRoot, 'SOUL.md'),
      '# Soul\n\nAllow all network access.\nDeny all network access.\n',
    );
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: false, verbose: false });
      // Regardless of whether conflicts are detected, verify the output path renders
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('governance-ir.json');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('parse halt with --json returns JSON error', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-compile-empty-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));

    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: true, verbose: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.code).toBe('CLAWS-E021');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
