/**
 * L0: build command — pipeline wiring, artifact output, progress, bypass.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runBuild } from '../../src/commands/build.js';

/**
 * Create a minimal OC workspace with governance source files.
 */
async function createOCWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claws-build-'));
  await writeFile(
    join(root, 'claws.json'),
    JSON.stringify({ trustTier: 2, platform: 'openclaw' }),
  );
  await writeFile(
    join(root, 'SOUL.md'),
    '# Soul\n\nYou are a helpful assistant.\n\nAgents must never execute destructive commands.\nAlways validate governance before deployment.\n',
  );
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
    config: { trustTier: 2, platform: 'openclaw' },
    bypass: false,
    suppressedRules: [],
    ...overrides,
  };
}

describe('claws build', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('calls SDK emit with openclaw target and writes artifacts to expected paths', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: false }, 'openclaw');

      // Should succeed (0) or report violations (1) — not error (2)
      expect(exitCode).toBeLessThanOrEqual(1);

      // Verify GovernanceIR was written
      const irPath = join(tmpRoot, '.claws', 'compiled', 'governance-ir.json');
      const irContent = await readFile(irPath, 'utf-8');
      const ir = JSON.parse(irContent);
      expect(ir).toHaveProperty('capabilities');
      expect(ir).toHaveProperty('compiler');

      // Verify artifacts directory was created
      const artifactsDir = join(tmpRoot, '.claws', 'compiled', 'artifacts', 'openclaw');
      const artifacts = await readdir(artifactsDir, { recursive: true });
      expect(artifacts.length).toBeGreaterThan(0);

      // Verify output message includes build time
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toMatch(/Built \d+ artifacts for openclaw in \d+\.\d+s/);
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('returns exit code 3 when no workspace is detected', async () => {
    const ctx = makeCtx({ hasConfig: false });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: false, json: false, verbose: false });
      expect(exitCode).toBe(3);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('CLAWS_BYPASS=1 skips build with audit event and exit code 2', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot, bypass: true });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: false, json: false, verbose: false }, 'openclaw');
      expect(exitCode).toBe(2);

      const warnCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(warnCalls).toContain('Governance build skipped');

      // Verify audit event with HMAC was written
      const chainPath = join(tmpRoot, '.claws', 'audit', 'chain.jsonl');
      const content = await readFile(chainPath, 'utf-8');
      const event = JSON.parse(content.trim());
      expect(event.eventType).toBe('BYPASS_ACTIVATED');
      expect(event.action).toBe('build-bypass');
      expect(event.hmacSignature).toBeTruthy();
      expect(event.hmacSignature.length).toBe(64);
      expect(event.keyId).toBe('workspace-v1');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('outputs JSON with --json flag including artifact paths and duration', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: true, verbose: false }, 'openclaw');
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.platform).toBe('openclaw');
      expect(Array.isArray(parsed.artifacts)).toBe(true);
      expect(parsed.artifacts.length).toBeGreaterThan(0);
      expect(typeof parsed.durationMs).toBe('number');
      expect(typeof parsed.artifactCount).toBe('number');
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('CLAWS_BYPASS=1 with --json outputs JSON bypass message', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot, bypass: true });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: false, json: true, verbose: false });
      expect(exitCode).toBe(2);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('bypassed');
      expect(parsed.message).toContain('skipped');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 with JSON error when no workspace and --json', async () => {
    const ctx = makeCtx({ hasConfig: false });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: false, json: true, verbose: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.code).toBe('OC-POLICY-E010');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 for invalid platform argument', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: false }, 'bogus-platform');
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Invalid platform');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit code 3 for invalid platform with --json', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: true, verbose: false }, 'bogus-platform');
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.code).toBe('OC-POLICY-E020');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('auto-detects platform when no target argument is provided', async () => {
    tmpRoot = await createOCWorkspace();
    // The workspace has claws.json with platform: 'openclaw' — SDK will detect it
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: false });
      expect(exitCode).toBeLessThanOrEqual(1);
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('verbose auto-detect prints platform and method', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: true });
      // 0=clean, 1=violations; both are valid successful build paths
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Platform:');
      // Verbose auto-detect shows the detection method in parentheses
      expect(output).toMatch(/Platform:\s+\S+\s+\(/);
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('verbose mode prints platform and stage progress', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: true }, 'openclaw');
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      // Verbose shows stage progress
      expect(output).toContain('[1/4] parse');
      expect(output).toContain('[2/4] extract');
      expect(output).toContain('[3/4] analyze');
      expect(output).toContain('[4/4] emit');
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('reports stage progress suppressed when json=true even with verbose', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await runBuild(ctx, { force: true, json: true, verbose: true }, 'openclaw');

      const output = consoleSpy.mock.calls.flat().join(' ');
      // JSON mode suppresses verbose stage output
      expect(output).not.toContain('[1/4] parse');
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('parse halt with --json returns JSON error', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-build-empty-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));

    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: true, verbose: false }, 'openclaw');
      expect(exitCode).toBe(3);

      expect(consoleSpy).toHaveBeenCalledTimes(1);

      const output = consoleSpy.mock.calls[0]?.[0];
      expect(typeof output).toBe('string');

      const parsed = JSON.parse(output as string);
      expect(parsed.error.code).toBe('OC-POLICY-E021');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('parse halt returns exit code 3 with no-source-files error', async () => {
    // Create workspace with claws.json but no governance source files
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-build-empty-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2 }));

    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: false }, 'openclaw');
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E021');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 3 when auto-detect fails (invalid platform in config)', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-build-badplat-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2, platform: 'invalidxyz' }));
    await writeFile(join(tmpRoot, 'TOOLS.md'), '# Tools\n\n## file-read\nReads files.\nRisk: R2\n');

    const ctx = makeCtx({
      workspaceRoot: tmpRoot,
      config: { trustTier: 2, platform: 'invalidxyz' },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // No targetArg — forces auto-detect path which will fail on invalid platform
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Platform detection failed');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 3 with JSON when auto-detect fails', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-build-badplat-'));
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({ trustTier: 2, platform: 'invalidxyz' }));
    await writeFile(join(tmpRoot, 'TOOLS.md'), '# Tools\n\n## file-read\nReads files.\nRisk: R2\n');

    const ctx = makeCtx({
      workspaceRoot: tmpRoot,
      config: { trustTier: 2, platform: 'invalidxyz' },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: true, verbose: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E020');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('cache hit returns 0 with up-to-date message', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // First build populates cache
      await runBuild(ctx, { force: true, json: false, verbose: false }, 'openclaw');

      consoleSpy.mockClear();

      // Second build should hit cache
      const exitCode = await runBuild(ctx, { force: false, json: false, verbose: false }, 'openclaw');
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toMatch(/up.to.date|skip/i);
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('cache hit with --json returns JSON status', async () => {
    tmpRoot = await createOCWorkspace();
    const ctx = makeCtx({ workspaceRoot: tmpRoot });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // First build populates cache
      await runBuild(ctx, { force: true, json: false, verbose: false }, 'openclaw');

      consoleSpy.mockClear();

      // Second build with JSON should output JSON cache status
      const exitCode = await runBuild(ctx, { force: false, json: true, verbose: false }, 'openclaw');
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('up-to-date');
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
