/**
 * L2 e2e: prove claws-sdk can compile a workspace end-to-end with zero
 * `@craftworks/` packages on the runtime module-resolution path, and that
 * the packaged tarball declares no `@craftworks/` runtime dependencies.
 *
 * This is the gate for Pulse 14 (create-claws-compiler-package): if either
 * test fails, the package split cannot proceed because the compiler still
 * depends on sibling packages.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { compile } from '#src/compiler/host/compile.js';

const PKG_PATH = resolve(__dirname, '../../package.json');
const SRC_ROOT = resolve(__dirname, '../../src');
const WORKSPACE = resolve(__dirname, '../fixtures/full-workspace');

const IMPORT_RE =
  /(?:from|import|require)\s*\(?\s*['"]@craftworks\/[^'"]+['"]/g;

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const info = statSync(abs);
    if (info.isDirectory()) walkTs(abs, acc);
    else if (info.isFile() && entry.endsWith('.ts')) acc.push(abs);
  }
  return acc;
}

describe('standalone-compile (L2)', () => {
  it('end-to-end compile succeeds with zero @craftworks/ on module resolution path', async () => {
    // The resolve alias in vitest.config.ts would happily redirect any
    // `@craftworks/compiler-sdk` or `@craftworks/agent-sdk` import to the
    // sibling package -- so we also prove, by static scan, that nothing in
    // the transitive source tree actually uses those specifiers at import
    // time. Comments and error strings are ignored.
    const offenders: string[] = [];
    for (const file of walkTs(SRC_ROOT)) {
      const text = readFileSync(file, 'utf-8');
      if (IMPORT_RE.test(text)) offenders.push(file);
      IMPORT_RE.lastIndex = 0;
    }
    expect(offenders).toEqual([]);

    // And the pipeline must actually run end-to-end on the fixture
    // workspace, producing real artifacts for both free-tier targets.
    const outputDir = mkdtempSync(join(tmpdir(), 'claws-standalone-'));
    try {
      const result = await compile(WORKSPACE, {
        targets: ['oc', 'claude-code'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      expect(result.success).toBe(true);
      expect(Object.keys(result.emitResults).sort()).toEqual(['claude-code', 'oc']);
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('package.json dependency tree has zero @craftworks/ runtime entries', () => {
    const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8')) as {
      name: string;
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };

    for (const group of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
      const entries = Object.keys(pkg[group] ?? {});
      const craft = entries.filter(d => d.startsWith('@craftworks/'));
      expect(craft, `${group} must not contain @craftworks/ entries`).toEqual([]);
    }

    // The "files" whitelist shipped in the tarball must be dist only; source
    // and tests don't get published and therefore can't drag in dev deps.
    // This is a belt-and-braces check: `npm pack` would otherwise succeed
    // with a polluted tarball.
    const pkgFull = JSON.parse(readFileSync(PKG_PATH, 'utf-8')) as {
      files?: readonly string[];
    };
    expect(pkgFull.files).toEqual(['dist']);
  });
});
