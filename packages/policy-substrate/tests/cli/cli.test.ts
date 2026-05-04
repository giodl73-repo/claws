/**
 * openclaw-policy CLI smoke tests — exercise generate / check /
 * diff / evaluate / list-generators / help end-to-end.
 *
 * Each test uses a fixture workspace + temporary IR file path so
 * the full pipeline (manifest walk → parse → extract → buildPolicyIR
 * → emit) runs against real bytes.
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/index.js';

interface Captured {
  out: string[];
  err: string[];
  exitCode: number;
}

async function captureCli(argv: string[]): Promise<Captured> {
  const argvJson = argv.includes('--json') || argv.includes('--human')
    ? argv
    : [...argv, '--json'];
  const out: string[] = [];
  const err: string[] = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.stdout.write = ((c: any) => {
    out.push(String(c));
    return true;
  }) as typeof process.stdout.write;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.stderr.write = ((c: any) => {
    err.push(String(c));
    return true;
  }) as typeof process.stderr.write;
  let exitCode = -1;
  try {
    exitCode = await runCli(argvJson);
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
  return { out, err, exitCode };
}

function makeFixtureWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'oc-policy-cli-'));
  writeFileSync(
    join(dir, 'SOUL.md'),
    '## Boundaries\n- Never share RESTRICTED data\n- Never bypass approval\n',
    'utf-8',
  );
  writeFileSync(
    join(dir, 'TOOLS.md'),
    '## Tools\n### post-channel # R5, COMMUNICATE, IRREVERSIBLE_EXTERNAL\n### read-doc # R1, READ\n',
    'utf-8',
  );
  return dir;
}

describe('openclaw-policy CLI', () => {
  it('CLI-01 help exits 0 with subcommand list', async () => {
    const r = await captureCli(['help']);
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(r.out.join(''));
    expect(json.bin).toBe('openclaw-policy');
    expect(json.subcommands).toContain('generate');
    expect(json.subcommands).toContain('check');
    expect(json.subcommands).toContain('evaluate');
  });

  it('CLI-02 list-generators shows registered md generator', async () => {
    const r = await captureCli(['list-generators']);
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(r.out.join(''));
    expect(json.count).toBeGreaterThan(0);
    expect(json.generators.find((g: { id: string }) => g.id === 'md')).toBeDefined();
  });

  it('CLI-03 generate produces a PolicyIR with stable policyId', async () => {
    const ws = makeFixtureWorkspace();
    const r = await captureCli(['generate', ws]);
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(r.out.join(''));
    expect(json.ok).toBe(true);
    expect(json.generator).toBe('md');
    expect(json.policyId).toMatch(/^[0-9a-f]{64}$/);
    expect(json.tools).toBe(2); // post-channel + read-doc
    expect(json.denyRules).toBe(2);
  });

  it('CLI-04 generate --out writes IR to disk', async () => {
    const ws = makeFixtureWorkspace();
    const outPath = join(ws, 'policy-ir.json');
    const r = await captureCli(['generate', ws, '--out', outPath]);
    expect(r.exitCode).toBe(0);
    const written = JSON.parse(readFileSync(outPath, 'utf-8'));
    expect(written.policyId).toMatch(/^[0-9a-f]{64}$/);
    expect(written.tools).toHaveLength(2);
  });

  it('CLI-05 check on a valid IR exits 0', async () => {
    const ws = makeFixtureWorkspace();
    const outPath = join(ws, 'policy-ir.json');
    await captureCli(['generate', ws, '--out', outPath]);
    const r = await captureCli(['check', outPath]);
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(r.out.join(''));
    expect(json.ok).toBe(true);
  });

  it('CLI-06 check on a tampered IR exits 1', async () => {
    const ws = makeFixtureWorkspace();
    const outPath = join(ws, 'policy-ir.json');
    await captureCli(['generate', ws, '--out', outPath]);
    // Tamper: mutate the body without recomputing policyId.
    const ir = JSON.parse(readFileSync(outPath, 'utf-8'));
    ir.tools.push({ id: 'sneaky', capabilities: [], risk: 'low', sensitivity: 'public' });
    writeFileSync(outPath, JSON.stringify(ir, null, 2), 'utf-8');
    const r = await captureCli(['check', outPath]);
    expect(r.exitCode).toBe(1);
    const json = JSON.parse(r.out.join(''));
    expect(json.ok).toBe(false);
    expect(json.tampered).toBe(true);
  });

  it('CLI-07 evaluate returns Decision for known tool', async () => {
    const ws = makeFixtureWorkspace();
    const outPath = join(ws, 'policy-ir.json');
    await captureCli(['generate', ws, '--out', outPath]);
    const r = await captureCli(['evaluate', outPath, 'post-channel']);
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(r.out.join(''));
    expect(json.decision.kind).toBe('requires-approval'); // R5 + IRREVERSIBLE_EXTERNAL
  });

  it('CLI-08 evaluate returns deny for unknown tool', async () => {
    const ws = makeFixtureWorkspace();
    const outPath = join(ws, 'policy-ir.json');
    await captureCli(['generate', ws, '--out', outPath]);
    const r = await captureCli(['evaluate', outPath, 'mystery']);
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(r.out.join(''));
    expect(json.decision.kind).toBe('deny');
    expect(json.decision.reason).toContain('unknown-tool');
  });

  it('CLI-09 evaluate honors --args for tag-based deny matching', async () => {
    const ws = makeFixtureWorkspace();
    const outPath = join(ws, 'policy-ir.json');
    await captureCli(['generate', ws, '--out', outPath]);
    // The deny tag derived from "Never share RESTRICTED data" is
    // `*never*share*restricted*` — every keyword must appear in
    // the value (case-insensitive) for the tag to match. Construct
    // an arg that contains all three keywords so the deny fires.
    const r = await captureCli([
      'evaluate',
      outPath,
      'read-doc',
      '--args',
      '{"action":"never share these RESTRICTED documents"}',
    ]);
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(r.out.join(''));
    expect(json.decision.kind).toBe('deny');
  });

  it('CLI-10 diff between two IRs reports changes', async () => {
    const ws = makeFixtureWorkspace();
    const aPath = join(ws, 'a.json');
    const bPath = join(ws, 'b.json');
    await captureCli(['generate', ws, '--out', aPath]);
    // Modify the workspace, regenerate.
    writeFileSync(
      join(ws, 'TOOLS.md'),
      '## Tools\n### post-channel # R5, COMMUNICATE, IRREVERSIBLE_EXTERNAL\n### read-doc # R1, READ\n### new-tool # R2, READ\n',
      'utf-8',
    );
    await captureCli(['generate', ws, '--out', bPath]);
    const r = await captureCli(['diff', aPath, bPath]);
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(r.out.join(''));
    expect(json.changed).toBe(true);
    expect(json.tools.added).toContain('new-tool');
  });

  it('CLI-11 unknown subcommand exits 2', async () => {
    const r = await captureCli(['no-such-cmd']);
    expect(r.exitCode).toBe(2);
  });

  it('CLI-12 empty argv prints help, exits 0', async () => {
    const r = await captureCli([]);
    expect(r.exitCode).toBe(0);
  });
});
