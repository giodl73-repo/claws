/**
 * L0: static source-tree checks that prove the claws-sdk compilation path has
 * no runtime `@craftworks/` imports left over after Pulse 13 internalization.
 *
 * These are file-system grep-style tests: cheap, pure, I/O only against our
 * own src tree and package manifest. They protect the package-split invariant
 * ("claws-compiler ships standalone") against future regressions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC_ROOT = resolve(__dirname, '../../src');
const PKG_PATH = resolve(__dirname, '../../package.json');

// Matches a runtime `@craftworks/...` specifier inside `from '...'`,
// `import('...')`, or `require('...')`. Comments and strings that merely
// mention the substring (doc comments, error messages) are ignored.
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

function scanForCraftworksImports(dir: string): string[] {
  const hits: string[] = [];
  for (const file of walkTs(dir)) {
    const text = readFileSync(file, 'utf-8');
    if (IMPORT_RE.test(text)) hits.push(file);
    IMPORT_RE.lastIndex = 0;
  }
  return hits;
}

describe('no-external-deps (L0)', () => {
  it('src/compile/**/*.ts has zero @craftworks/ imports', () => {
    const hits = scanForCraftworksImports(join(SRC_ROOT, 'compile'));
    expect(hits).toEqual([]);
  });

  it('src/emit/**/*.ts has zero @craftworks/ imports', () => {
    const hits = scanForCraftworksImports(join(SRC_ROOT, 'emit'));
    expect(hits).toEqual([]);
  });

  it('src/governance/**/*.ts has zero @craftworks/ imports', () => {
    const hits = scanForCraftworksImports(join(SRC_ROOT, 'governance'));
    expect(hits).toEqual([]);
  });

  it('package.json has zero @craftworks/ entries in runtime dependencies', () => {
    const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8')) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkg.dependencies ?? {});
    const craftDeps = deps.filter(d => d.startsWith('@craftworks/'));
    expect(craftDeps).toEqual([]);
  });
});
