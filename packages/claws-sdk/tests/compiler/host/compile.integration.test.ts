/**
 * L1 integration tests for the compilation host.
 *
 * Exercises compile() against a fixture workspace and verifies the cache
 * short-circuit / invalidation behavior end-to-end.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/compile.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('compile() (integration)', () => {
  let outputDir: string;
  let cacheDir: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'claws-host-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-host-cache-'));
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('compiles a fixture workspace and produces both OC and Claude Code artifacts', async () => {
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.cacheHit).toBe(false);
    expect(Object.keys(result.emitResults).sort()).toEqual(['claude-code', 'oc']);
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.validationReport?.overallPass).toBe(true);
  });

  it('cache hit on the second compile of the same workspace', async () => {
    const opts = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    };

    const first = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(first.cacheHit).toBe(false);
    expect(first.success).toBe(true);

    const second = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(second.cacheHit).toBe(true);
    expect(second.contentHash).toBe(first.contentHash);
  });

  it('different targets produce different cache keys (CM-4)', async () => {
    // First compile with oc only.
    const ocOnly = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });
    expect(ocOnly.cacheHit).toBe(false);

    // Second compile requesting oc + claude-code must NOT reuse the oc-only entry.
    const both = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });
    expect(both.cacheHit).toBe(false);
    expect(Object.keys(both.emitResults).sort()).toEqual(['claude-code', 'oc']);
  });

  it('different outputDir/dryRun produce different cache keys (CM-4)', async () => {
    const otherOut = mkdtempSync(join(tmpdir(), 'claws-host-out-other-'));
    try {
      const first = await compile(resolve(FIXTURES, 'full-workspace'), {
        targets: ['oc'],
        outputDir,
        cacheEnabled: true,
        cacheDir,
        dryRun: true,
      });
      expect(first.cacheHit).toBe(false);

      const differentOutput = await compile(resolve(FIXTURES, 'full-workspace'), {
        targets: ['oc'],
        outputDir: otherOut,
        cacheEnabled: true,
        cacheDir,
        dryRun: true,
      });
      expect(differentOutput.cacheHit).toBe(false);

      const differentDryRun = await compile(resolve(FIXTURES, 'full-workspace'), {
        targets: ['oc'],
        outputDir,
        cacheEnabled: true,
        cacheDir,
        dryRun: false,
      });
      expect(differentDryRun.cacheHit).toBe(false);
    } finally {
      rmSync(otherOut, { recursive: true, force: true });
    }
  });

  it('validator runs once per emitted target (CM-2)', async () => {
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    // Merged report still has 12 checks — the merge collapses per-target
    // check results into a single 12-check surface.
    expect(result.validationReport?.checks.length).toBe(12);
    // The merged overallPass reflects both targets.
    expect(result.validationReport?.overallPass).toBe(true);
  });

  it('compiledAt is deterministic across compiles (CM-7)', async () => {
    const optsBase = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    };
    const a = await compile(resolve(FIXTURES, 'full-workspace'), optsBase);
    const b = await compile(resolve(FIXTURES, 'full-workspace'), optsBase);
    // The OC emitter embeds compilerVersion/compiledAt into its manifest JSON,
    // so byte-identical IR inputs produce byte-identical emit outputs.
    const aFiles = a.emitResults.oc?.files.map((f) => f.content).join('\u0000');
    const bFiles = b.emitResults.oc?.files.map((f) => f.content).join('\u0000');
    expect(aFiles).toBe(bFiles);
  });

  it('options.now overrides the deterministic epoch (CM-7)', async () => {
    const now = '2030-01-01T00:00:00.000Z';
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
      now,
    });
    // The OC emitter embeds compiledAt into index.ts and the config JSON.
    const indexFile = result.emitResults.oc?.files.find((f) =>
      f.path.endsWith('index.ts'),
    );
    expect(indexFile?.content).toContain(now);
  });

  it('host appends audit entries at stage boundaries when auditChain is provided (CM-10)', async () => {
    const { AuditChain } = await import('#src/compiler/audit/chain.js');
    const { generateKeypair } = await import('#src/compiler/crypto/ed25519.js');
    const keypair = generateKeypair();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
      auditChain: chain,
    });
    expect(result.success).toBe(true);

    const actions = chain.allEntries.map((e) => e.action);
    expect(actions[0]).toBe('compile.start');
    expect(actions).toContain('enforce.start');
    expect(actions).toContain('enforce.complete');
    expect(actions).toContain('emit.start');
    expect(actions).toContain('emit.complete');
    expect(actions).toContain('validate.start');
    expect(actions).toContain('validate.complete');
    expect(actions[actions.length - 1]).toBe('compile.complete');
  });

  it('host records audit entries on sidecar failure (CM-10)', async () => {
    const { AuditChain } = await import('#src/compiler/audit/chain.js');
    const { generateKeypair } = await import('#src/compiler/crypto/ed25519.js');
    const keypair = generateKeypair();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    const bad = mkdtempSync(join(tmpdir(), 'claws-host-bad-'));
    try {
      writeFileSync(join(bad, 'SOUL.md'), '# SOUL\npersona: x\n');
      writeFileSync(join(bad, 'TOOLS.md'), '# TOOLS\n');
      // Invalid sidecar
      writeFileSync(join(bad, '.claws'), '{"targets": ["oc"]}');

      const result = await compile(bad, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
        auditChain: chain,
      });
      expect(result.success).toBe(false);

      const actions = chain.allEntries.map((e) => e.action);
      expect(actions).toContain('compile.start');
      expect(actions).toContain('compile.failed');
    } finally {
      rmSync(bad, { recursive: true, force: true });
    }
  });

  it('cache hit path records an audit compile.complete entry (CM-10)', async () => {
    const { AuditChain } = await import('#src/compiler/audit/chain.js');
    const { generateKeypair } = await import('#src/compiler/crypto/ed25519.js');
    const keypair = generateKeypair();

    // CL-04 §IS.1: the signing-key fingerprint folds into the compile-level
    // cache key so a signing-key rotation invalidates cached emit output
    // (emit bytes embed signatures). Seed the cache with the same chain
    // so the hit path can record its audit entries.
    const seedChain = new AuditChain(keypair.privateKey, keypair.publicKey);
    const opts = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    };
    await compile(resolve(FIXTURES, 'full-workspace'), {
      ...opts,
      auditChain: seedChain,
    });

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    const hit = await compile(resolve(FIXTURES, 'full-workspace'), {
      ...opts,
      auditChain: chain,
    });
    expect(hit.cacheHit).toBe(true);
    const actions = chain.allEntries.map((e) => e.action);
    expect(actions).toEqual(['compile.start', 'compile.complete']);
  });

  it('threads soul principles + boundaries from SOUL.md into the IR (CM-1)', async () => {
    // We cannot inspect IR directly from the result (not exported on the
    // public surface), so assert through emit output instead: the Claude
    // Code emitter copies principles/boundaries into CLAUDE.md.
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    const claudeMd = result.emitResults['claude-code']?.files.find(
      (f) => f.path === 'CLAUDE.md',
    );
    // full-workspace SOUL.md declares a `## Boundaries` section with 3 items.
    expect(claudeMd?.content).toContain('Never bypass security policies');
    expect(claudeMd?.content).toContain('Always audit tool usage');
  });

  it('merged validation report passes check 10 when any target matches user.platform', async () => {
    // full-workspace fixture defaults user.platform to "oc". Compiling for
    // both oc and claude-code exercises the merge's pass-if-any path:
    // check 10 passes for the oc target, fails for claude-code, merged=pass.
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    const check10 = result.validationReport?.checks.find((c) => c.checkId === 10);
    expect(check10?.pass).toBe(true);
    expect(result.validationReport?.overallPass).toBe(true);
  });

  it('pass-if-any check 10 flips from fail to pass as targets iterate', async () => {
    // Iterate claude-code first (fails check 10), then oc (passes). The
    // merge uses pass-if-any semantics for check 10, exercising the
    // "!existing.pass && r.pass" branch.
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['claude-code', 'oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    const check10 = result.validationReport?.checks.find((c) => c.checkId === 10);
    expect(check10?.pass).toBe(true);
  });

  it('merged validation fails when both targets fail a pass-if-any check', async () => {
    // Author a workspace with user.platform=cursor. Neither free-tier emit
    // target matches, so check 10 fails for both. The merge's pass-if-any
    // semantics yield a failing merged result.
    const ws = mkdtempSync(join(tmpdir(), 'claws-host-platform-'));
    try {
      writeFileSync(
        join(ws, 'SOUL.md'),
        '# SOUL\npersona: platform-mismatch\n',
      );
      writeFileSync(join(ws, 'TOOLS.md'), '# TOOLS\n## Read\nRead files.\n');
      writeFileSync(
        join(ws, 'USER.md'),
        '# User\n## Role\nEngineer\n## Platform\ncursor\n',
      );
      const result = await compile(ws, {
        targets: ['oc', 'claude-code'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      expect(result.validationReport?.checks.length).toBe(12);
      const check10 = result.validationReport?.checks.find((c) => c.checkId === 10);
      expect(check10?.pass).toBe(false);
      expect(result.validationReport?.failCount).toBeGreaterThanOrEqual(1);
      expect(result.validationReport?.overallPass).toBe(false);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('cache miss after a workspace file changes', async () => {
    // Copy the fixture into a tmp dir so we can mutate it without touching the source.
    const mutableRoot = mkdtempSync(join(tmpdir(), 'claws-host-mut-'));
    try {
      const src = resolve(FIXTURES, 'full-workspace');
      const { readdirSync, statSync, copyFileSync } = await import('node:fs');
      function copyTree(from: string, to: string): void {
        mkdirSync(to, { recursive: true });
        for (const name of readdirSync(from)) {
          const fromPath = join(from, name);
          const toPath = join(to, name);
          if (statSync(fromPath).isDirectory()) {
            copyTree(fromPath, toPath);
          } else {
            copyFileSync(fromPath, toPath);
          }
        }
      }
      copyTree(src, mutableRoot);

      const opts = {
        targets: ['oc'] as const,
        outputDir,
        cacheEnabled: true,
        cacheDir,
        dryRun: true,
      };

      const first = await compile(mutableRoot, opts);
      expect(first.cacheHit).toBe(false);

      // Mutate SOUL.md so the content hash changes.
      const soulPath = join(mutableRoot, 'SOUL.md');
      const original = readFileSync(soulPath, 'utf-8');
      writeFileSync(soulPath, original + '\n# mutated\n', 'utf-8');

      const second = await compile(mutableRoot, opts);
      expect(second.cacheHit).toBe(false);
      expect(second.contentHash).not.toBe(first.contentHash);
    } finally {
      rmSync(mutableRoot, { recursive: true, force: true });
    }
  });
});
