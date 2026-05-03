import { parseYaml } from '@bic/oc-paths-substrate';
import { describe, expect, it } from 'vitest';
import {
  stepDedupeId,
  stepSwapShellToPipeline,
  yamlStarterFixers,
} from '../../../src/extensions/ocdoctor-fixers-yaml-starter/index.js';
import type { OcPathFixerSpec } from '../../../src/plugin-sdk/oc-doctor/types.js';

function detect(spec: OcPathFixerSpec<unknown>, raw: string, fileName = 'wf.lobster') {
  return spec.detect({ fileName, ast: parseYaml(raw).ast, raw });
}
function fix(spec: OcPathFixerSpec<unknown>, raw: string, fileName = 'wf.lobster') {
  const ast = parseYaml(raw).ast;
  const matches = spec.detect({ fileName, ast, raw });
  if (matches.length === 0) return raw;
  return spec.fix({
    fileName,
    ast,
    raw,
    match: { ocPath: matches[0]!.ocPath },
  });
}

describe('yaml-starter — step/swap-shell-to-pipeline (issues #25, #26, #41)', () => {
  it('detects `command: openclaw.invoke ...`', () => {
    expect(
      detect(
        stepSwapShellToPipeline,
        'steps:\n  - id: a\n    command: openclaw.invoke --tool foo\n',
      ).length,
    ).toBe(1);
  });

  it('rewrites `command:` to `pipeline:` for in-process tools', () => {
    const before = 'steps:\n  - id: a\n    command: openclaw.invoke --tool foo\n';
    const after = fix(stepSwapShellToPipeline, before);
    expect(after).toContain('pipeline: openclaw.invoke');
    expect(after).not.toMatch(/command: openclaw\.invoke/);
  });

  it('rewrites `run:` to `pipeline:` for in-process tools', () => {
    const before = 'steps:\n  - id: a\n    run: llm_task.invoke ...\n';
    const after = fix(stepSwapShellToPipeline, before);
    expect(after).toContain('pipeline: llm_task.invoke');
  });

  it('preserves `command:` for real shell commands', () => {
    const before = 'steps:\n  - id: a\n    command: gh issue list\n';
    const after = fix(stepSwapShellToPipeline, before);
    expect(after).toContain('command: gh issue list');
  });

  it('is idempotent — second fix is a no-op', () => {
    const before = 'steps:\n  - id: a\n    command: openclaw.invoke --tool foo\n';
    const once = fix(stepSwapShellToPipeline, before);
    const twice = fix(stepSwapShellToPipeline, once);
    expect(twice).toBe(once);
  });

  it('rewrites every offending step in a multi-step workflow', () => {
    const before =
      'steps:\n' +
      '  - id: a\n    command: openclaw.invoke ...\n' +
      '  - id: b\n    command: ls\n' +
      '  - id: c\n    command: llm.invoke ...\n';
    const after = fix(stepSwapShellToPipeline, before);
    // step b's command stays (it's a real shell cmd)
    expect(after).toContain('command: ls');
    // both in-process steps rewritten
    expect(after.match(/pipeline:/g)?.length).toBe(2);
  });
});

describe('yaml-starter — step/dedupe-id (issues #76, #77)', () => {
  it('detects collision', () => {
    expect(
      detect(
        stepDedupeId,
        'steps:\n  - id: a\n    command: x\n  - id: a\n    command: y\n',
      ).length,
    ).toBe(1);
  });

  it('renames duplicate with index-suffix by default', () => {
    const before =
      'steps:\n  - id: a\n    command: x\n  - id: a\n    command: y\n';
    const after = fix(stepDedupeId, before);
    // First a stays, second renamed to a_1
    expect(after).toMatch(/id: a_1/);
  });

  it('honors operator-supplied rename-second strategy', () => {
    const before =
      'steps:\n  - id: a\n    command: x\n  - id: a\n    command: y\n';
    const ast = parseYaml(before).ast;
    const matches = stepDedupeId.detect({ fileName: 'wf.lobster', ast, raw: before });
    const after = stepDedupeId.fix({
      fileName: 'wf.lobster',
      ast,
      raw: before,
      match: { ocPath: matches[0]!.ocPath },
      options: { strategy: 'rename-second' },
    });
    expect(after).toMatch(/id: a_dupe/);
  });

  it('declares safe defaults', () => {
    expect(stepDedupeId.defaultOptions?.strategy).toBe('index-suffix');
  });

  it('passes a workflow with unique ids', () => {
    expect(
      detect(
        stepDedupeId,
        'steps:\n  - id: a\n    command: x\n  - id: b\n    command: y\n',
      ).length,
    ).toBe(0);
  });

  it('is idempotent — once renamed, no further fix', () => {
    const before =
      'steps:\n  - id: a\n    command: x\n  - id: a\n    command: y\n';
    const once = fix(stepDedupeId, before);
    const twice = fix(stepDedupeId, once);
    expect(twice).toBe(once);
  });
});

describe('yaml-starter — pack invariants', () => {
  it('exports 2 fixers', () => {
    expect(yamlStarterFixers).toHaveLength(2);
  });
  it('all use yaml-starter-v0 namespace', () => {
    for (const f of yamlStarterFixers) {
      expect(f.id.startsWith('yaml-starter-v0/')).toBe(true);
    }
  });
  it('all apply to *.lobster', () => {
    for (const f of yamlStarterFixers) {
      expect(f.appliesTo).toBe('*.lobster');
    }
  });
});

describe('yaml-starter — adversarial inputs do not throw', () => {
  const inputs = [
    '',
    'steps: []\n',
    'steps:\n',
    'unknown: stuff\n',
    'broken yaml [{[}',
    'steps:\n  - {}\n',
    'steps:\n  - command: ls\n', // no id
  ];
  for (const fixer of yamlStarterFixers) {
    for (const raw of inputs) {
      it(`${fixer.id} no-throw on ${JSON.stringify(raw.slice(0, 30))}`, () => {
        expect(() => fix(fixer, raw)).not.toThrow();
      });
    }
  }
});
