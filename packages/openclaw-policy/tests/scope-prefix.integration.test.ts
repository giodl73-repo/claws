/**
 * Pulse 57 — L1 integration for `--scope` flag.
 *
 * 2 L1 tests:
 *   1. end-to-end `generate --scope @openclaw` via the generate handler produces
 *      a gateway-plugin.ts that differs from the default only in import lines.
 *   2. round-trip validation: scope-prefixed import paths resolve against a
 *      mock module resolver (each emitted `from '<path>'` matches a known
 *      subpath export the shipped packages declare).
 */

import { describe, it, expect } from 'vitest';
import { handle as handleGenerate } from '../src/cli-handlers/generate.js';
import { emitPluginCode } from '../src/emit/emit-plugin.js';
import { waffles } from './helpers/fixture.js';

const BIC_EXPORTS = new Set<string>([
  '@bic/openclaw-policy/runtime',
  '@bic/openclaw-guardrails',
  '@bic/openclaw-workspace/path',
]);

const UPSTREAM_EXPORTS = new Set<string>([
  '@openclaw/policy/runtime',
  '@openclaw/guardrails',
  '@openclaw/workspace/path',
]);

function mockResolve(specifier: string, scope: '@bic/openclaw' | '@openclaw'): boolean {
  const table = scope === '@bic/openclaw' ? BIC_EXPORTS : UPSTREAM_EXPORTS;
  return table.has(specifier);
}

function importLines(src: string): string[] {
  const out: string[] = [];
  for (const line of src.split('\n')) {
    const m = line.match(/from\s+'([^']+)'/);
    if (m) out.push(m[1]!);
  }
  return out;
}

function nonImportLines(src: string): string {
  return src
    .split('\n')
    .filter((line) => !/from\s+'[^']+'/.test(line))
    .join('\n');
}

describe('P57 L1 #1 — generate --scope @openclaw end-to-end', () => {
  it('handle(generate, --scope @openclaw) succeeds and emitted plugin differs from default only in import lines', async () => {
    const res = await handleGenerate({
      binaryName: 'claws',
      args: ['--scope', '@openclaw'],
      cwd: process.cwd(),
    });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/scope=@openclaw/);
    expect(res.stderr).toBe('');

    const defaultSrc = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-AAAA',
    });
    const upstreamSrc = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-AAAA',
      scopePrefix: '@openclaw',
    });

    expect(upstreamSrc).not.toBe(defaultSrc);
    expect(nonImportLines(upstreamSrc)).toBe(nonImportLines(defaultSrc));

    const defaultImports = importLines(defaultSrc).filter(
      (s) => s.includes('openclaw') || s.includes('guardrails'),
    );
    const upstreamImports = importLines(upstreamSrc).filter(
      (s) => s.includes('openclaw') || s.includes('guardrails'),
    );
    expect(defaultImports.length).toBeGreaterThan(0);
    expect(upstreamImports.length).toBe(defaultImports.length);
    expect(upstreamImports).not.toEqual(defaultImports);
  });
});

describe('P57 L1 #2 — round-trip validation: scope-prefixed imports resolve against a mock resolver', () => {
  it('every emitted import resolves under its scope, and cross-scope resolution fails', () => {
    for (const scope of ['@bic/openclaw', '@openclaw'] as const) {
      const src = emitPluginCode({
        ir: waffles(),
        snapshotId: 'sha256-AAAA',
        scopePrefix: scope,
      });
      const externals = importLines(src).filter(
        (s) => s.startsWith('@bic/') || s.startsWith('@openclaw/'),
      );
      expect(externals.length).toBeGreaterThan(0);
      const otherScope = scope === '@bic/openclaw' ? '@openclaw' : '@bic/openclaw';
      for (const spec of externals) {
        expect(mockResolve(spec, scope), `expected ${spec} to resolve under ${scope}`).toBe(true);
        expect(mockResolve(spec, otherScope), `expected ${spec} to NOT resolve under ${otherScope}`).toBe(false);
      }
    }
  });
});
