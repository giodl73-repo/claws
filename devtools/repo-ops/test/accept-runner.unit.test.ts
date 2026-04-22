/**
 * devtools/repo-ops/test/accept-runner.unit.test.ts — sanity tests for the
 * manifest-driven accept-scenario validator (Horus CP-8 pulse 73.8).
 *
 * Coverage:
 *   - parseManifest: happy path, version gate, unknown field, bad min, missing fields
 *   - registry: registerRunner / isRunnerRegistered / knownRunners
 *   - validateAcceptScenarios: missing-manifest, undeclared-series, under-min-count,
 *     unknown-runner WARN, well-formed package emits no findings
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseManifest,
  ManifestParseError,
  registerRunner,
  isRunnerRegistered,
  knownRunners,
  validateAcceptScenarios,
} from '../src/accept-runner/index.ts';

let docsRoot: string;

beforeEach(() => {
  docsRoot = mkdtempSync(join(tmpdir(), 'repo-ops-accept-'));
});

afterEach(() => {
  try {
    rmSync(docsRoot, { recursive: true, force: true });
  } catch {
    /* best-effort on Windows */
  }
});

function writeManifest(pkg: string, yaml: string): void {
  const scenariosDir = join(docsRoot, pkg, 'scenarios');
  mkdirSync(scenariosDir, { recursive: true });
  writeFileSync(join(scenariosDir, 'manifest.yaml'), yaml, 'utf8');
}

function writeScenarioFile(pkg: string, code: string, name: string, body = 'scenario'): void {
  const dir = join(docsRoot, pkg, 'scenarios', code);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), body, 'utf8');
}

describe('parseManifest', () => {
  it('parses a well-formed manifest', () => {
    const raw = [
      'version: 1',
      'series:',
      '  AAA:',
      '    runner: e2e-loop-sim',
      '    min: 3',
      '    description: smoke',
      '  BBB:',
      '    runner: approval-flow-sim',
      '    min: 1',
    ].join('\n');
    const m = parseManifest(raw, 'x.yaml');
    expect(m.version).toBe(1);
    expect(m.series.AAA).toEqual({ runner: 'e2e-loop-sim', min: 3, description: 'smoke' });
    expect(m.series.BBB).toEqual({ runner: 'approval-flow-sim', min: 1 });
  });

  it('rejects a non-1 version', () => {
    expect(() => parseManifest('version: 2\nseries:\n', 'x.yaml')).toThrow(ManifestParseError);
  });

  it('rejects a min that is zero or negative', () => {
    const raw = 'version: 1\nseries:\n  AAA:\n    runner: foo\n    min: 0\n';
    expect(() => parseManifest(raw, 'x.yaml')).toThrow(/min must be positive integer/);
  });

  it('rejects missing runner', () => {
    const raw = 'version: 1\nseries:\n  AAA:\n    min: 2\n';
    expect(() => parseManifest(raw, 'x.yaml')).toThrow(/missing runner or min/);
  });

  it('rejects an unknown field', () => {
    const raw = 'version: 1\nseries:\n  AAA:\n    runner: foo\n    min: 1\n    bogus: x\n';
    expect(() => parseManifest(raw, 'x.yaml')).toThrow(/unknown field bogus/);
  });
});

describe('runner registry', () => {
  it('pre-registers the planned runner names', () => {
    expect(isRunnerRegistered('e2e-loop-sim')).toBe(true);
    expect(isRunnerRegistered('approval-flow-sim')).toBe(true);
    expect(isRunnerRegistered('host-shape-sim')).toBe(true);
    expect(isRunnerRegistered('compile-sim')).toBe(true);
    expect(isRunnerRegistered('security-sim')).toBe(true);
  });

  it('registerRunner makes a runner known and knownRunners lists it', () => {
    registerRunner('custom-runner-xyz');
    expect(isRunnerRegistered('custom-runner-xyz')).toBe(true);
    expect(knownRunners()).toContain('custom-runner-xyz');
  });

  it('isRunnerRegistered returns false for unknown runners', () => {
    expect(isRunnerRegistered('definitely-not-registered-42')).toBe(false);
  });
});

describe('validateAcceptScenarios', () => {
  it('returns no findings when docsRoot does not exist', () => {
    expect(validateAcceptScenarios(join(docsRoot, 'nonexistent'))).toEqual([]);
  });

  it('BLOCKs when series dirs exist but manifest.yaml is missing', () => {
    writeScenarioFile('alpha', 'AAA', 'case-1.md');
    const findings = validateAcceptScenarios(docsRoot);
    const missing = findings.find((f) => f.rule === 'manifest-missing');
    expect(missing?.severity).toBe('BLOCK');
  });

  it('BLOCKs a series dir that has no manifest entry', () => {
    writeManifest(
      'alpha',
      'version: 1\nseries:\n  AAA:\n    runner: e2e-loop-sim\n    min: 1\n',
    );
    writeScenarioFile('alpha', 'AAA', 'case-1.md');
    writeScenarioFile('alpha', 'ZZZ', 'case-1.md'); // undeclared
    const findings = validateAcceptScenarios(docsRoot);
    expect(findings.some((f) => f.rule === 'undeclared-series')).toBe(true);
  });

  it('BLOCKs a series dir that falls below its min-count', () => {
    writeManifest(
      'alpha',
      'version: 1\nseries:\n  AAA:\n    runner: e2e-loop-sim\n    min: 3\n',
    );
    writeScenarioFile('alpha', 'AAA', 'case-1.md');
    const findings = validateAcceptScenarios(docsRoot);
    const under = findings.find((f) => f.rule === 'under-min-count');
    expect(under?.severity).toBe('BLOCK');
    expect(under?.message).toContain('1 scenarios');
    expect(under?.message).toContain('min 3');
  });

  it('WARNs when a manifest entry references an unregistered runner', () => {
    writeManifest(
      'alpha',
      'version: 1\nseries:\n  AAA:\n    runner: future-runner-not-yet-landed\n    min: 1\n',
    );
    writeScenarioFile('alpha', 'AAA', 'case-1.md');
    const findings = validateAcceptScenarios(docsRoot);
    const warn = findings.find((f) => f.rule === 'unknown-runner');
    expect(warn?.severity).toBe('WARN');
  });

  it('returns no findings for a well-formed manifest + scenarios', () => {
    writeManifest(
      'alpha',
      'version: 1\nseries:\n  AAA:\n    runner: e2e-loop-sim\n    min: 2\n',
    );
    writeScenarioFile('alpha', 'AAA', 'case-1.md');
    writeScenarioFile('alpha', 'AAA', 'case-2.md');
    const findings = validateAcceptScenarios(docsRoot);
    expect(findings).toEqual([]);
  });

  it('BLOCKs on a malformed manifest (parse error)', () => {
    writeManifest('alpha', 'version: 2\nseries:\n');
    writeScenarioFile('alpha', 'AAA', 'case-1.md');
    const findings = validateAcceptScenarios(docsRoot);
    const parseErr = findings.find((f) => f.rule === 'manifest-parse-error');
    expect(parseErr?.severity).toBe('BLOCK');
  });

  it('ignores hidden files when counting scenarios', () => {
    writeManifest(
      'alpha',
      'version: 1\nseries:\n  AAA:\n    runner: e2e-loop-sim\n    min: 1\n',
    );
    writeScenarioFile('alpha', 'AAA', 'case-1.md');
    writeScenarioFile('alpha', 'AAA', '.gitkeep'); // hidden — not counted
    const findings = validateAcceptScenarios(docsRoot);
    expect(findings).toEqual([]);
  });
});
