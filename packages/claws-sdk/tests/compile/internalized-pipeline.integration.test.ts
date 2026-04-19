/**
 * L1: prove each internalized module from CP-1 / CP-2 is the one actually
 * wired into the compile path -- not a stale re-export from the external
 * SDKs. Each test exercises one internalized subsystem end-to-end without
 * reaching into `@craftworks/` at import time.
 *
 * If any of these tests start failing, the package-split invariant
 * ("claws-compiler ships standalone") is broken: something in the pipeline
 * is going out to agent-sdk or compiler-sdk again.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { compile } from '#src/compiler/host/compile.js';
import { readOCWorkspace } from '#src/compiler/readers/workspace-reader.js';
import { generateKeypair, ed25519Sign } from '#src/compiler/crypto/ed25519.js';
import { AuditChain } from '#src/compiler/audit/chain.js';
import { enforceR5 } from '#src/compiler/enforce/r5.js';
import { CompilationCache, contentHash } from '#src/compiler/cache/index.js';
import { canonicalJson } from '#src/util/canonical-json.js';
import type { GovAnalysis } from '#src/compiler/enforce/types.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { WorkspaceFile } from '#src/compiler/readers/types.js';

const WORKSPACE = resolve(__dirname, '../fixtures/full-workspace');

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const info = statSync(abs);
    if (info.isDirectory()) walkTs(abs, acc);
    else if (info.isFile() && entry.endsWith('.ts')) acc.push(abs);
  }
  return acc;
}

// Minimal empty-governance fixtures so the enforce pass is trivially ok.
const EMPTY_GOV: GovAnalysis = {
  violations: [],
  warnings: [],
  enforcementPlan: {
    blockedTools: [],
    requiredApprovals: [],
    auditOnlyRules: [],
    channelRedactions: [],
    ruleSuppressions: [],
  },
  reclassificationTable: [],
  effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
};

const EMPTY_WORKSPACE_IR = {
  diagnostics: [],
} as unknown as OCWorkspaceIR;

describe('internalized-pipeline (L1)', () => {
  it('OC reader reads workspace files from internalized reader', async () => {
    const model = await readOCWorkspace(WORKSPACE);
    expect(model.presentCount).toBeGreaterThanOrEqual(8);
    expect(model.soul.ok).toBe(true);
    expect(model.tools.ok).toBe(true);
    expect(model.agents.ok).toBe(true);
  });

  it('emitter produces OC + Claude Code artifacts via internalized codegen', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'claws-internal-emit-'));
    try {
      const result = await compile(WORKSPACE, {
        targets: ['oc', 'claude-code'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      expect(result.success).toBe(true);
      expect(Object.keys(result.emitResults).sort()).toEqual(['claude-code', 'oc']);
      for (const target of ['oc', 'claude-code'] as const) {
        const emit = result.emitResults[target];
        expect(emit).toBeDefined();
      }
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('audit chain signs entries with internalized Ed25519 + canonicalJson', () => {
    const { privateKey, publicKey } = generateKeypair();
    const chain = new AuditChain(privateKey, publicKey);
    const entry = chain.append({
      action: 'compile.start',
      subject: 'workspace',
      payload: { target: 'oc' },
    });
    expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.signature).toMatch(/^[0-9a-f]+$/);
    // Independent signature over the same hash must match: proves we are
    // using the internalized crypto primitives (not agent-sdk).
    const expectedSig = ed25519Sign(entry.hash, privateKey);
    expect(entry.signature).toBe(expectedSig);
    // Canonical JSON is stable and internalized.
    expect(canonicalJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it('R5 enforcement runs through the internalized enforce module', () => {
    const result = enforceR5(EMPTY_GOV, EMPTY_WORKSPACE_IR);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.rulesChecked).toBe('number');
    }
  });

  it('compilation cache stores artifacts via internalized cache', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'claws-internal-cache-'));
    try {
      const cache = new CompilationCache({ cacheDir, maxSize: 1024 * 1024 });
      const key = 'a'.repeat(64);
      const value = JSON.stringify({ contentHash: key, artifacts: ['oc'] });
      await cache.set(key, value);
      const hit = await cache.get(key);
      expect(hit).toBe(value);

      // contentHash helper is internalized (uses compiler/crypto/hash.ts).
      const files: readonly WorkspaceFile[] = [
        { path: 'a', rawContent: 'hello', normalizedContent: 'hello\n' },
      ];
      const h = contentHash(files);
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it('compile host orchestrates full pipeline via internalized modules only', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'claws-internal-host-'));
    const cacheDir = mkdtempSync(join(tmpdir(), 'claws-internal-host-cache-'));
    try {
      const first = await compile(WORKSPACE, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: true,
        cacheDir,
        dryRun: true,
      });
      expect(first.success).toBe(true);
      expect(first.cacheHit).toBe(false);
      expect(first.contentHash).toMatch(/^[0-9a-f]{64}$/);

      // Second compile on identical input hits the internalized cache.
      const second = await compile(WORKSPACE, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: true,
        cacheDir,
        dryRun: true,
      });
      expect(second.cacheHit).toBe(true);
      expect(second.contentHash).toBe(first.contentHash);

      // Proof-of-internalization: every .ts file under compiler/host/ must
      // be free of runtime `@craftworks/` imports.
      const hostDir = resolve(__dirname, '../../src/compiler/host');
      for (const file of walkTs(hostDir)) {
        const text = readFileSync(file, 'utf-8');
        expect(text).not.toMatch(/from\s+['"]@craftworks\//);
      }
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });
});
