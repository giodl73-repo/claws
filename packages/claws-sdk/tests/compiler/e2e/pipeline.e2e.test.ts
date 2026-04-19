/**
 * L2 e2e tests for the CP-2 compile pipeline gate.
 *
 * Exercises the full standalone compile pipeline from the 9-file fixture
 * workspace through both emit targets, validates the R5 fail-closed path
 * on the broken-governance fixture, verifies the compilation cache hit
 * path, and verifies that an audit chain recording compile events is
 * Ed25519 signed with a valid hash chain.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/index.js';
import { AuditChain, verifyChain } from '#src/compiler/audit/index.js';
import { generateKeypair } from '#src/compiler/crypto/ed25519.js';

const WORKSPACE = resolve(__dirname, 'fixtures/workspace');
const BROKEN = resolve(__dirname, 'fixtures/broken-governance');

describe('CP-2 compile pipeline (e2e)', () => {
  let outputDir: string;
  let cacheDir: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'claws-pipeline-e2e-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-pipeline-e2e-cache-'));
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('compiles the 9-file workspace through both OC and Claude Code emit targets', async () => {
    const result = await compile(WORKSPACE, {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: false,
    });

    expect(result.success).toBe(true);
    expect(result.cacheHit).toBe(false);

    // OC plugin landed under outputDir/plugins/claws-governance.
    expect(existsSync(join(outputDir, 'plugins', 'claws-governance'))).toBe(true);
    // Claude Code workspace landed CLAUDE.md at the output root.
    expect(existsSync(join(outputDir, 'CLAUDE.md'))).toBe(true);

    // Validator overall-pass — every 12 checks passed.
    expect(result.validationReport?.overallPass).toBe(true);
    expect(result.validationReport?.checks.every((c) => c.pass)).toBe(true);
  });

  it('R5 fail-closed blocks compilation when governance rules conflict', async () => {
    const result = await compile(BROKEN, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });

    expect(result.success).toBe(false);
    // enforceR5 promotes the LOBSTER-MISSING-NAME reader error into a fail-closed
    // violation on the R5-<code> diagnostic surface.
    const r5Denials = result.diagnostics.filter(
      (d) => d.stage === 'enforce' && d.code.startsWith('R5-'),
    );
    expect(r5Denials.length).toBeGreaterThan(0);
    // No emit output was produced — the enforcer halted before emit.
    expect(Object.keys(result.emitResults)).toEqual([]);
    // Nothing was written to disk in dry-run but the guard path still held.
    expect(existsSync(join(outputDir, 'plugins', 'claws-governance'))).toBe(false);
  });

  it('cache hit on the second compilation with identical workspace input', async () => {
    const opts = {
      targets: ['oc', 'claude-code'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    };

    const first = await compile(WORKSPACE, opts);
    expect(first.success).toBe(true);
    expect(first.cacheHit).toBe(false);

    const second = await compile(WORKSPACE, opts);
    expect(second.cacheHit).toBe(true);
    expect(second.contentHash).toBe(first.contentHash);
    // Cached result is returned verbatim — emit files (paths) match.
    const firstOcPaths = first.emitResults.oc?.files.map((f) => f.path).sort();
    const secondOcPaths = second.emitResults.oc?.files.map((f) => f.path).sort();
    expect(secondOcPaths).toEqual(firstOcPaths);
  });

  it('audit chain entries recording compile events are Ed25519 signed and verify', async () => {
    const keypair = generateKeypair();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    const result = await compile(WORKSPACE, {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
      auditChain: chain,
    });
    expect(result.success).toBe(true);

    // The host appended entries at every stage boundary: compile.start,
    // enforce.start/complete, emit.start + per-target emit.complete (x2),
    // validate.start/complete, compile.complete.
    const entries = chain.allEntries;
    expect(entries.length).toBeGreaterThanOrEqual(7);

    const actions = entries.map((e) => e.action);
    expect(actions[0]).toBe('compile.start');
    expect(actions).toContain('enforce.start');
    expect(actions).toContain('enforce.complete');
    expect(actions).toContain('emit.start');
    expect(actions).toContain('emit.complete');
    expect(actions).toContain('validate.start');
    expect(actions).toContain('validate.complete');
    expect(actions[actions.length - 1]).toBe('compile.complete');

    // Every entry carries an Ed25519 signature and a hash chain to the prior.
    for (const entry of entries) {
      expect(entry.signature).toMatch(/^[0-9a-f]+$/);
      expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(entries[0]!.previousHash).toBeNull();
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i]!.previousHash).toBe(entries[i - 1]!.hash);
    }

    // A compile.complete payload carries the content hash so the chain is
    // tamper-evident against the compiled workspace.
    const completeEntry = entries.find((e) => e.action === 'compile.complete');
    expect(completeEntry?.payload['contentHash']).toBe(result.contentHash);

    const verification = verifyChain(entries, keypair.publicKey);
    expect(verification.valid).toBe(true);
  });
});
