/**
 * Pulse 57 — `--scope` flag coverage for claws policy generate.
 *
 * 6 L0 tests organized as:
 *   • 2 argv parsing    (default + explicit --scope)
 *   • 2 scope-prefix substitution in emitted import lines
 *   • 2 byte-parity     (policy-ir.json + audit-manifest.json across scopes)
 *
 * Governing roles: craft:architect (scope-prefix plumbing through emit-plugin.ts),
 * claws:gateway-eng (emitted imports resolve correctly).
 */

import { describe, it, expect } from 'vitest';
import {
  parseScopeArg,
  SCOPE_CHOICES,
} from '../src/emit/scope.js';
import {
  DEFAULT_SCOPE_PREFIX,
  emitPluginCode,
} from '../src/emit/emit-plugin.js';
import { generateInMemory } from '../src/generator.js';
import { waffles } from './helpers/fixture.js';

describe('P57 argv parsing (L0 #1–#2)', () => {
  it('defaults to @bic/openclaw when --scope is absent', () => {
    expect(parseScopeArg([])).toBe('@bic/openclaw');
    expect(parseScopeArg(['--other', 'x', 'file.md'])).toBe('@bic/openclaw');
    expect(DEFAULT_SCOPE_PREFIX).toBe('@bic/openclaw');
    expect(SCOPE_CHOICES).toContain('@bic/openclaw');
    expect(SCOPE_CHOICES).toContain('@openclaw');
  });

  it('accepts explicit --scope @openclaw and --scope=@openclaw', () => {
    expect(parseScopeArg(['--scope', '@openclaw'])).toBe('@openclaw');
    expect(parseScopeArg(['--scope=@openclaw'])).toBe('@openclaw');
    expect(parseScopeArg(['--scope', '@bic/openclaw'])).toBe('@bic/openclaw');
    expect(parseScopeArg(['--scope=@bic/openclaw'])).toBe('@bic/openclaw');
    expect(() => parseScopeArg(['--scope'])).toThrow(/--scope requires a value/);
    expect(() => parseScopeArg(['--scope', 'bogus'])).toThrow(/--scope must be one of/);
  });
});

describe('P57 scope-prefix substitution in import lines (L0 #3–#4)', () => {
  it('@bic/openclaw emits flat hyphen-form package names in import lines only', () => {
    const src = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-AAAA',
      scopePrefix: '@bic/openclaw',
    });
    expect(src).toContain("from '@bic/openclaw-policy/runtime'");
    expect(src).toContain("from '@bic/openclaw-guardrails'");
    expect(src).toContain("from '@bic/openclaw-workspace/path'");
    expect(src).not.toContain("from '@openclaw/policy/runtime'");
    expect(src).not.toContain("from '@openclaw/guardrails'");
    expect(src).not.toContain("from '@openclaw/workspace/path'");
  });

  it('@openclaw flips only import lines to upstream slash-form subpath imports', () => {
    const src = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-AAAA',
      scopePrefix: '@openclaw',
    });
    expect(src).toContain("from '@openclaw/policy/runtime'");
    expect(src).toContain("from '@openclaw/guardrails'");
    expect(src).toContain("from '@openclaw/workspace/path'");
    expect(src).not.toContain("from '@bic/openclaw-policy/runtime'");
    expect(src).not.toContain("from '@bic/openclaw-guardrails'");
    expect(src).not.toContain("from '@bic/openclaw-workspace/path'");
  });
});

describe('P57 byte-parity across scopes (L0 #5–#6)', () => {
  it('policy-ir.json is byte-identical across @bic/openclaw and @openclaw scopes', () => {
    const bic = generateInMemory({
      workspaceRoot: '.',
      draft: draftFromWaffles(),
      scopePrefix: '@bic/openclaw',
    });
    const oc = generateInMemory({
      workspaceRoot: '.',
      draft: draftFromWaffles(),
      scopePrefix: '@openclaw',
    });
    expect(bic.policyIr).toBe(oc.policyIr);
  });

  it('audit-manifest.json is byte-identical across @bic/openclaw and @openclaw scopes', () => {
    const bic = generateInMemory({
      workspaceRoot: '.',
      draft: draftFromWaffles(),
      scopePrefix: '@bic/openclaw',
    });
    const oc = generateInMemory({
      workspaceRoot: '.',
      draft: draftFromWaffles(),
      scopePrefix: '@openclaw',
    });
    expect(bic.auditManifest).toBe(oc.auditManifest);
  });
});

function draftFromWaffles() {
  const ir = waffles();
  const { policyId: _p, canonicalizerVersion: _v, version, ...rest } = ir;
  return { ...rest, version };
}
