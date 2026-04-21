import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { handle } from '../src/cli-handlers/comply.js';
import { MINIMAL_IR, EMPTY_IR } from './ops-fixtures.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'comply-handler-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function writeIr(ir: object = MINIMAL_IR): Promise<string> {
  const path = join(tmp, 'policy-ir.json');
  await writeFile(path, JSON.stringify(ir), 'utf8');
  return path;
}

describe('comply handler — usage errors', () => {
  it('exits 2 when --snapshot is missing', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['--rubric', 'soc2'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--snapshot');
  });

  it('exits 2 when --policy-ir is missing', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['--snapshot', 'sha256-abc'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--policy-ir');
  });

  it('exits 1 when policy-ir file is unreadable', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['--snapshot', 'sha256-abc', '--policy-ir', join(tmp, 'missing.json')],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('failed to read policy-ir');
  });

  it('exits 1 when a custom-path rubric is unreadable', async () => {
    const policyIr = await writeIr();
    const result = await handle({
      binaryName: 'claws',
      args: [
        '--snapshot', 'sha256-abc',
        '--policy-ir', policyIr,
        '--rubric', 'no-such-rubric-file.yaml',
      ],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('ENOENT');
  });
});

describe('comply handler — evaluation', () => {
  it('emits human summary by default', async () => {
    const policyIr = await writeIr();
    const result = await handle({
      binaryName: 'claws',
      args: ['--snapshot', 'sha256-abc', '--policy-ir', policyIr],
      cwd: tmp,
    });
    expect(result.stdout).toContain('rubric:');
    expect(result.stdout).toContain('snapshot:  sha256-abc');
    expect(result.stdout).toContain('total:');
  });

  it('emits JSON with --json flag', async () => {
    const policyIr = await writeIr();
    const result = await handle({
      binaryName: 'claws',
      args: ['--snapshot', 'sha256-abc', '--policy-ir', policyIr, '--json'],
      cwd: tmp,
    });
    const parsed = JSON.parse(result.stdout.trim()) as {
      snapshotId: string;
      rubric: { id: string };
      summary: { total: number };
      signature: { algo: string };
    };
    expect(parsed.snapshotId).toBe('sha256-abc');
    expect(parsed.rubric.id).toMatch(/^soc2/);
    expect(parsed.summary.total).toBeGreaterThan(0);
    expect(parsed.signature.algo).toBe('hmac-sha256');
  });

  it('exits 0 when every requirement resolves to not_applicable', async () => {
    const policyIr = await writeIr(EMPTY_IR);
    // Custom rubric whose sole predicate is unknown → not_applicable.
    const rubric = join(tmp, 'all-na.yaml');
    await writeFile(
      rubric,
      [
        'id: all-na',
        'version: "1.0"',
        'framework: Test',
        'requirements:',
        '  - id: NA-1',
        '    title: NA requirement',
        '    kind: static',
        '    predicate: totally-unknown',
      ].join('\n'),
      'utf8',
    );
    const result = await handle({
      binaryName: 'claws',
      args: ['--snapshot', 'sha256-empty', '--policy-ir', policyIr, '--rubric', rubric],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
  });

  it('exits 1 when the rubric has a failing requirement', async () => {
    const policyIr = await writeIr();
    const result = await handle({
      binaryName: 'claws',
      args: ['--snapshot', 'sha256-abc', '--policy-ir', policyIr, '--rubric', 'soc2'],
      cwd: tmp,
    });
    // MINIMAL_IR has an R5 tool without IRREVERSIBLE_EXTERNAL (delete-db).
    expect(result.exitCode).toBe(1);
  });

  it('accepts a custom rubric YAML by path', async () => {
    const policyIr = await writeIr();
    const rubric = join(tmp, 'rubric.yaml');
    await writeFile(
      rubric,
      [
        'id: minimal',
        'version: "1.0"',
        'framework: Minimal',
        'requirements:',
        '  - id: MIN-1',
        '    title: No-op',
        '    kind: static',
        '    predicate: unknown-predicate',
      ].join('\n'),
      'utf8',
    );
    const result = await handle({
      binaryName: 'claws',
      args: [
        '--snapshot', 'sha256-abc',
        '--policy-ir', policyIr,
        '--rubric', rubric,
      ],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('rubric:    minimal@1.0');
  });
});
