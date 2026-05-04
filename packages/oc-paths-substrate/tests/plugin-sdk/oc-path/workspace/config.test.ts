/**
 * Unit tests for `workspace.json` loader + override resolvers.
 *
 * Locks the schema, loader behavior (missing-file is null, parse-
 * fail throws), the rule-id glob matcher, and the precedence rules
 * for merging workspace defaults with CLI flag overrides.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  filterByOnlyGlobs,
  loadWorkspaceConfig,
  matchRuleIdGlob,
  resolveDoctorOverrides,
  resolveLintOverrides,
} from '../../../../src/plugin-sdk/oc-path/workspace/config.js';

describe('loadWorkspaceConfig', () => {
  it('LWC-01 returns null when workspace.json is absent', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wsc-empty-'));
    const cfg = await loadWorkspaceConfig(dir);
    expect(cfg).toBeNull();
  });

  it('LWC-02 parses a minimal `{}` config', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wsc-empty-config-'));
    writeFileSync(join(dir, 'workspace.json'), '{}', 'utf-8');
    const cfg = await loadWorkspaceConfig(dir);
    expect(cfg).toEqual({});
  });

  it('LWC-03 parses a fully-shaped config', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wsc-full-'));
    const body = {
      version: '0.1.0',
      lint: {
        skip: ['policy-starter-v0/tools/duplicate-tool-id'],
        severity: { 'lkg-starter-v0/lkg/sentinel-in-content': 'error' },
        only: ['policy-starter-v0/*'],
      },
      doctor: { skip: ['policy-starter-v0/tools/dedupe-tool-id'] },
      policy: { generator: 'md', policyPath: 'policy.jsonc' },
    };
    writeFileSync(join(dir, 'workspace.json'), JSON.stringify(body), 'utf-8');
    const cfg = await loadWorkspaceConfig(dir);
    expect(cfg).toEqual(body);
  });

  it('LWC-04 throws on malformed JSON with a useful message', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wsc-bad-'));
    writeFileSync(join(dir, 'workspace.json'), '{ this is not json', 'utf-8');
    await expect(loadWorkspaceConfig(dir)).rejects.toThrow(/parse failed/);
  });

  it('LWC-05 silently accepts unknown future fields', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wsc-future-'));
    writeFileSync(
      join(dir, 'workspace.json'),
      JSON.stringify({ futureField: 'hi', lint: { skip: ['x'] } }),
      'utf-8',
    );
    const cfg = await loadWorkspaceConfig(dir);
    // Unknown field passes through; old loader doesn't break.
    expect((cfg as { futureField?: string }).futureField).toBe('hi');
    expect(cfg?.lint?.skip).toEqual(['x']);
  });
});

describe('matchRuleIdGlob', () => {
  it('MGR-01 exact match', () => {
    expect(matchRuleIdGlob('a/b/c', 'a/b/c')).toBe(true);
    expect(matchRuleIdGlob('a/b/c', 'a/b/d')).toBe(false);
  });

  it('MGR-02 wildcard `*`', () => {
    expect(matchRuleIdGlob('a/b/*', 'a/b/c')).toBe(true);
    expect(matchRuleIdGlob('a/b/*', 'a/b/anything-here')).toBe(true);
    expect(matchRuleIdGlob('a/b/*', 'a/c/x')).toBe(false);
  });

  it('MGR-03 namespace prefix glob', () => {
    expect(matchRuleIdGlob('starter-v0/*', 'starter-v0/agents/foo')).toBe(true);
    expect(matchRuleIdGlob('starter-v0/*', 'policy-starter-v0/foo')).toBe(false);
  });

  it('MGR-04 alternation `{a,b,c}`', () => {
    expect(matchRuleIdGlob('{a,b}/x', 'a/x')).toBe(true);
    expect(matchRuleIdGlob('{a,b}/x', 'b/x')).toBe(true);
    expect(matchRuleIdGlob('{a,b}/x', 'c/x')).toBe(false);
  });

  it('MGR-05 special chars in rule ids escaped properly', () => {
    expect(matchRuleIdGlob('a.b/c', 'a.b/c')).toBe(true);
    expect(matchRuleIdGlob('a.b/c', 'aXb/c')).toBe(false); // `.` not regex
  });
});

describe('resolveLintOverrides', () => {
  const ALL_RULES = [
    'starter-v0/agents/missing-boundaries',
    'starter-v0/agents/empty-tools-section',
    'policy-starter-v0/tools/missing-risk-level',
    'lkg-starter-v0/lkg/sentinel-in-content',
  ];

  it('RLO-01 empty config + no flags → empty disabled set', () => {
    const r = resolveLintOverrides(null, {}, ALL_RULES);
    expect(r.disabledRuleIds.size).toBe(0);
    expect(Object.keys(r.severityOverrides)).toHaveLength(0);
    expect(r.onlyGlobs).toEqual([]);
  });

  it('RLO-02 workspace skip glob expands against registered ids', () => {
    const r = resolveLintOverrides(
      { lint: { skip: ['starter-v0/agents/*'] } },
      {},
      ALL_RULES,
    );
    expect(r.disabledRuleIds.has('starter-v0/agents/missing-boundaries')).toBe(true);
    expect(r.disabledRuleIds.has('starter-v0/agents/empty-tools-section')).toBe(true);
    expect(r.disabledRuleIds.has('policy-starter-v0/tools/missing-risk-level')).toBe(false);
  });

  it('RLO-03 CLI --skip is exact-id and adds to workspace disabled set', () => {
    const r = resolveLintOverrides(
      { lint: { skip: ['lkg-starter-v0/*'] } },
      { skip: ['policy-starter-v0/tools/missing-risk-level'] },
      ALL_RULES,
    );
    expect(r.disabledRuleIds.has('lkg-starter-v0/lkg/sentinel-in-content')).toBe(true);
    expect(r.disabledRuleIds.has('policy-starter-v0/tools/missing-risk-level')).toBe(true);
  });

  it('RLO-04 CLI severity wins over workspace severity for the same id', () => {
    const r = resolveLintOverrides(
      { lint: { severity: { 'a/b/c': 'info' } } },
      { severity: { 'a/b/c': 'error' } },
      ALL_RULES,
    );
    expect(r.severityOverrides['a/b/c']).toBe('error');
  });

  it('RLO-05 only globs union workspace + CLI', () => {
    const r = resolveLintOverrides(
      { lint: { only: ['policy-starter-v0/*'] } },
      { only: ['lkg-starter-v0/*'] },
      ALL_RULES,
    );
    expect(r.onlyGlobs).toEqual(['policy-starter-v0/*', 'lkg-starter-v0/*']);
  });
});

describe('filterByOnlyGlobs', () => {
  const ITEMS = [
    { id: 'starter-v0/agents/missing-boundaries' },
    { id: 'policy-starter-v0/tools/missing-risk-level' },
    { id: 'lkg-starter-v0/lkg/sentinel-in-content' },
  ];

  it('FBOG-01 empty globs returns input unchanged', () => {
    expect(filterByOnlyGlobs(ITEMS, [])).toBe(ITEMS);
  });

  it('FBOG-02 single-glob filter narrows to matching prefix', () => {
    const result = filterByOnlyGlobs(ITEMS, ['policy-starter-v0/*']);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('policy-starter-v0/tools/missing-risk-level');
  });

  it('FBOG-03 multi-glob filter is union (any match)', () => {
    const result = filterByOnlyGlobs(ITEMS, [
      'policy-starter-v0/*',
      'lkg-starter-v0/*',
    ]);
    expect(result).toHaveLength(2);
  });
});

describe('resolveDoctorOverrides', () => {
  const ALL = [
    'policy-starter-v0/tools/migrate-sensitivity-syntax',
    'policy-starter-v0/policy/regenerate-on-drift',
    'lkg-starter-v0/lkg/scrub-sentinel-from-tracked',
  ];

  it('RDO-01 empty config + no CLI flags → empty disabled set', () => {
    const r = resolveDoctorOverrides(null, {}, ALL);
    expect(r.size).toBe(0);
  });

  it('RDO-02 workspace doctor.skip glob expands against registered ids', () => {
    const r = resolveDoctorOverrides(
      { doctor: { skip: ['policy-starter-v0/*'] } },
      {},
      ALL,
    );
    expect(r.has('policy-starter-v0/tools/migrate-sensitivity-syntax')).toBe(true);
    expect(r.has('policy-starter-v0/policy/regenerate-on-drift')).toBe(true);
    expect(r.has('lkg-starter-v0/lkg/scrub-sentinel-from-tracked')).toBe(false);
  });

  it('RDO-03 CLI skip is additive', () => {
    const r = resolveDoctorOverrides(
      { doctor: { skip: ['policy-starter-v0/*'] } },
      { skip: ['lkg-starter-v0/lkg/scrub-sentinel-from-tracked'] },
      ALL,
    );
    expect(r.size).toBe(3);
  });
});
