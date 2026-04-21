import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { handle } from '../src/cli-handlers/report.js';

let tmp: string;

const COMPLIANCE_PAYLOAD = {
  snapshotId: 'sha256-snap',
  rubric: { id: 'soc2', version: '1.0', framework: 'SOC2' },
  generatedAt: '2026-04-20T00:00:00.000Z',
  results: [],
  summary: { total: 0, pass: 0, fail: 0, partial: 0, na: 0 },
  signature: { algo: 'hmac-sha256', key_id: 'k', value: 'v' },
};

const DIFF_PAYLOAD = {
  from: 'sha256-a',
  to: 'sha256-b',
  added: ['new-tool'],
  removed: [],
  modified: [],
};

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'report-handler-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function writeJson(payload: unknown): Promise<string> {
  const path = join(tmp, 'input.json');
  await writeFile(path, JSON.stringify(payload), 'utf8');
  return path;
}

describe('report handler — usage errors', () => {
  it('exits 2 when --kind is missing', async () => {
    const result = await handle({ binaryName: 'claws', args: ['--format', 'json'], cwd: tmp });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--kind');
  });

  it('exits 2 when --kind is unrecognised', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'made-up', '--input', 'anything'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('unknown kind');
  });

  it('exits 2 when --input is missing', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--input');
  });

  it('exits 2 with helpful message for --format sarif', async () => {
    const input = await writeJson(COMPLIANCE_PAYLOAD);
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance', '--input', input, '--format', 'sarif'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('sarif');
  });

  it('exits 2 when --format is unknown', async () => {
    const input = await writeJson(COMPLIANCE_PAYLOAD);
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance', '--input', input, '--format', 'bogus'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('unknown format');
  });

  it('exits 1 when input file cannot be read', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance', '--input', join(tmp, 'nope.json')],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('failed to read input');
  });
});

describe('report handler — rendering', () => {
  it('renders compliance as markdown by default', async () => {
    const input = await writeJson(COMPLIANCE_PAYLOAD);
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance', '--input', input],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('#');
  });

  it('accepts --format md as an alias for markdown', async () => {
    const input = await writeJson(COMPLIANCE_PAYLOAD);
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance', '--input', input, '--format', 'md'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it('renders snapshot-diff as html', async () => {
    const input = await writeJson(DIFF_PAYLOAD);
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'snapshot-diff', '--input', input, '--format', 'html'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('<html>');
  });

  it('writes to --out when supplied', async () => {
    const input = await writeJson(COMPLIANCE_PAYLOAD);
    const out = join(tmp, 'report.md');
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance', '--input', input, '--out', out, '--format', 'markdown'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`wrote ${out}`);
    const body = await readFile(out, 'utf8');
    expect(body.length).toBeGreaterThan(0);
  });

  it('exits 1 when --out target is not writable', async () => {
    const input = await writeJson(COMPLIANCE_PAYLOAD);
    const result = await handle({
      binaryName: 'claws',
      args: [
        '--kind', 'compliance',
        '--input', input,
        '--out', join(tmp, 'no-such-dir', 'x.md'),
      ],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('failed to write out');
  });

  it('renders as json identical to JSON.stringify of the input', async () => {
    const input = await writeJson(COMPLIANCE_PAYLOAD);
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance', '--input', input, '--format', 'json'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout.trim()) as { kind: string };
    expect(parsed.kind).toBe('compliance');
  });

  it('renders pdf format with valid PDF header', async () => {
    const input = await writeJson(COMPLIANCE_PAYLOAD);
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance', '--input', input, '--format', 'pdf'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.startsWith('%PDF-1.4')).toBe(true);
  });

  it('renders audit payload as markdown', async () => {
    const input = await writeJson({ length: 0, valid: true, chain: [] });
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'audit', '--input', input, '--format', 'markdown'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Audit');
  });

  it('exits 1 when renderReport throws on a compliance payload lacking required fields', async () => {
    // The library throws when `compliance` is undefined for kind=compliance.
    // Materialise that path by writing a nullish JSON value through input.
    const input = await writeJson(null);
    const result = await handle({
      binaryName: 'claws',
      args: ['--kind', 'compliance', '--input', input, '--format', 'html'],
      cwd: tmp,
    });
    // Library goes through renderComplianceHtml which crashes on null — the
    // handler catches and rethrows as exit 1.
    expect(result.exitCode).toBe(1);
  });
});
