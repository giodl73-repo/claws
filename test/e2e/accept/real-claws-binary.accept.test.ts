/**
 * Real-binary proof — the L3 gate that the shipping `claws` binary boots
 * and responds to two canonical CLI invocations from a fresh Node process.
 *
 *   1. `claws --version` prints a non-empty version string on stdout and
 *      exits 0. This is the cheapest proof that commander option
 *      registration is clean: any broken sub-command registration would
 *      throw during `createProgram` and `--version` would never print.
 *   2. `claws policy generate` in a per-test tmp copy of the
 *      `allow-r1-public` fixture exits 0 and writes at least one stdout
 *      line. The handler body is currently stubbed (tracked in CP-5.5
 *      plan `claws-cli-handler-wiring`), so this test does NOT assert
 *      that a `.openclaw/policy/` tree lands — it asserts the stub path
 *      is clean (exit 0 + response). When CP-5.5 wires the real body,
 *      this test extends to assert policy-ir.json + gateway-plugin.ts +
 *      audit-manifest.json without rewriting the spawn plumbing.
 *
 * Both tests use `copyFixture` from the harness so the source fixture is
 * never mutated. Both tests spawn the real `bin/claws.js` via
 * `process.execPath` — no tsx, no module re-import.
 *
 * @module test/e2e/accept/real-claws-binary.accept.test.ts
 */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { copyFixture } from '#harness';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const CLAWS_BIN = resolve(REPO_ROOT, 'packages', 'claws', 'bin', 'claws.js');
const FIXTURES_ROOT = resolve(HERE, '..', 'fixtures');

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length > 0) {
    const d = tmpDirs.pop()!;
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
});

interface SpawnResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function spawnClaws(
  args: readonly string[],
  cwd: string,
): Promise<SpawnResult> {
  return new Promise((resolvePromise) => {
    const bin = process.execPath;
    const shell = process.platform === 'win32' && !isAbsolute(bin);
    const child = spawn(bin, [CLAWS_BIN, ...args], {
      cwd,
      shell,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', (c: Buffer) => out.push(c));
    child.stderr.on('data', (c: Buffer) => err.push(c));
    child.on('close', (code) => {
      resolvePromise({
        exitCode: code === null ? 1 : code,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      });
    });
  });
}

describe('real `claws` binary — CLI boot + policy generate stub path', () => {
  it('claws --version exits 0 and prints a non-empty version', async () => {
    const result = await spawnClaws(['--version'], REPO_ROOT);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim().length).toBeGreaterThan(0);
  });

  it('claws policy generate on allow-r1-public fixture exits 0 (stub path tested; real body landing CP-5.5)', async () => {
    const tmp = await copyFixture(
      join(FIXTURES_ROOT, 'allow-r1-public'),
      `accept-policy-generate-${Date.now()}`,
    );
    tmpDirs.push(tmp);

    const result = await spawnClaws(['policy', 'generate'], tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
    // Stub body in @bic/openclaw-policy/cli-handlers — the real body
    // lands in CP-5.5 (claws-cli-handler-wiring). When it does, extend
    // this test to assert `.openclaw/policy/{policy-ir.json,
    // gateway-plugin.ts, audit-manifest.json}` exists.
  });
});
