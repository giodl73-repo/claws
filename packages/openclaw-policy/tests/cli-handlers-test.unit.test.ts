import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { handle } from '../src/cli-handlers/test.js';

let tmp: string;
let server: Server | undefined;

const SINGLE_SCENARIO = [
  'snapshot: sha256-a',
  'given:',
  '  tool_call:',
  '    name: send-email',
  'expect:',
  '  decision: allow',
].join('\n');

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'test-handler-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
  if (server !== undefined) {
    await new Promise<void>((resolvePromise) => {
      server!.close(() => resolvePromise());
    });
    server = undefined;
  }
});

async function startStub(decision: 'allow' | 'deny'): Promise<string> {
  server = createServer((_req, res) => {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ decision }));
  });
  await new Promise<void>((resolvePromise) => server!.listen(0, '127.0.0.1', resolvePromise));
  const addr = server.address() as AddressInfo;
  return `http://127.0.0.1:${String(addr.port)}`;
}

describe('test handler — usage errors', () => {
  it('exits 2 when neither --gateway nor --policy-ir supplied', async () => {
    const result = await handle({ binaryName: 'claws', args: [], cwd: tmp });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--gateway');
    expect(result.stderr).toContain('--policy-ir');
  });

  it('exits 2 when the default scenarios dir is absent', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['--gateway', 'http://127.0.0.1:1'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
  });

  it('exits 2 when the directory has no yaml files', async () => {
    const dir = join(tmp, 'scenarios');
    await mkdir(dir, { recursive: true });
    const result = await handle({
      binaryName: 'claws',
      args: ['--gateway', 'http://127.0.0.1:1', '--dir', dir],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('no scenarios');
  });

  it('exits 2 when --file points at a missing path', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: [
        '--gateway', 'http://127.0.0.1:1',
        '--file', join(tmp, 'nope.yaml'),
      ],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
  });
});

describe('test handler — scenario execution', () => {
  it('reports PASS and exits 0 when gateway decision matches expect', async () => {
    const file = join(tmp, 'sc.yaml');
    await writeFile(file, SINGLE_SCENARIO, 'utf8');
    const url = await startStub('allow');
    const result = await handle({
      binaryName: 'claws',
      args: ['--gateway', url, '--file', file],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[PASS]');
    expect(result.stdout).toContain('passed=1 failed=0');
  });

  it('reports FAIL and exits 1 when gateway decision mismatches', async () => {
    const file = join(tmp, 'sc.yaml');
    await writeFile(file, SINGLE_SCENARIO, 'utf8');
    const url = await startStub('deny');
    const result = await handle({
      binaryName: 'claws',
      args: ['--gateway', url, '--file', file],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('[FAIL]');
    expect(result.stdout).toContain('failed=1');
  });

  it('emits JSON result with --json', async () => {
    const file = join(tmp, 'sc.yaml');
    await writeFile(file, SINGLE_SCENARIO, 'utf8');
    const url = await startStub('allow');
    const result = await handle({
      binaryName: 'claws',
      args: ['--gateway', url, '--file', file, '--json'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout.trim()) as { total: number; passed: number };
    expect(parsed.total).toBe(1);
    expect(parsed.passed).toBe(1);
  });

  it('reads the default <cwd>/test/scenarios directory', async () => {
    const dir = join(tmp, 'test', 'scenarios');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'a.yaml'), SINGLE_SCENARIO, 'utf8');
    await writeFile(join(dir, 'b.yml'), SINGLE_SCENARIO, 'utf8');
    const url = await startStub('allow');
    const result = await handle({
      binaryName: 'claws',
      args: ['--gateway', url],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('passed=2');
  });

  it('runs in-memory when --policy-ir is supplied (no external gateway)', async () => {
    const { waffles } = await import('./helpers/fixture.js');
    const ir = waffles();
    const irPath = join(tmp, 'ir.json');
    await writeFile(irPath, JSON.stringify(ir), 'utf8');
    const file = join(tmp, 'sc.yaml');
    await writeFile(
      file,
      [
        'snapshot: sha256-a',
        'given:',
        '  tool_call:',
        '    name: draft-reply',
        'expect:',
        '  decision: allow',
      ].join('\n'),
      'utf8',
    );
    const result = await handle({
      binaryName: 'claws',
      args: ['--policy-ir', irPath, '--file', file],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('passed=1');
  });

  it('exits 1 when --policy-ir path cannot be read', async () => {
    const file = join(tmp, 'sc.yaml');
    await writeFile(file, SINGLE_SCENARIO, 'utf8');
    const result = await handle({
      binaryName: 'claws',
      args: ['--policy-ir', join(tmp, 'no-such-ir.json'), '--file', file],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(1);
  });
});
