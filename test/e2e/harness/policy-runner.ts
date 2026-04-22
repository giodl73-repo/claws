/**
 * policy-runner — spawn `claws policy generate` as a real child process.
 *
 * Per pulse 36 plan: the runner MUST exec the real binary. Re-entering via
 * a module `import` is not acceptable — it would bypass the CLI's startup
 * path (preCommand hooks, exit-code semantics, stderr framing) and the test
 * would stop being a fair proof that the shipped binary works.
 *
 * The binary is spawned via `node bin/claws.js` — the same shipping entry
 * point exercised by the pulse 47.6 D7 dual-spawn gate. `src/cli.ts` only
 * exports `createProgram()`; invoking it via `tsx src/cli.ts` produces no
 * output because nothing calls `parseAsync`. The dist entry wraps that
 * for us, so the harness runs exactly what users run.
 *
 * Pulse 47.7 removed the pulse-36 `command?: ResolvedCommand` override
 * seam. CP-5.5 wired the real `policy generate` handler (pulses 47.1-47.5)
 * and pulse 47.6 proved it works end-to-end on the real binary, so the
 * override is obsolete. The real binary is now authoritative; tests that
 * want to simulate the runner's spawn/capture plumbing must use the real
 * CLI or a harness of their own making — they MAY NOT paper over CLI gaps
 * by injecting a fake command here.
 *
 * Callers MUST ensure the dist build is fresh (run `npm run build` before
 * the suite). The pulse-47.6 accept suite enforces this via a `beforeAll`
 * build step; other suites that call `generatePolicy` inherit the same
 * contract.
 */

import { spawn } from 'node:child_process';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export interface GeneratePolicyOpts {
  scope?: '@bic/openclaw' | '@openclaw';
  /** Milliseconds before the child is killed; default 30_000. */
  timeoutMs?: number;
  /** Extra env overlayed on `process.env`. */
  env?: Record<string, string>;
}

export interface GeneratePolicyResult {
  policyDir: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class PolicyGenerateError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly tmpFixtureDir: string,
  ) {
    super(message);
    this.name = 'PolicyGenerateError';
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

interface ResolvedCommand {
  bin: string;
  args: readonly string[];
}

/**
 * Runs `claws policy generate` against `tmpFixtureDir` (which MUST already
 * be a per-scenario tmp copy produced by fixture-copier — we never mutate
 * a source fixture). Returns the produced `.openclaw/policy/` tree path
 * alongside captured stdout/stderr. Non-zero exit yields a structured
 * `PolicyGenerateError`.
 */
export async function generatePolicy(
  tmpFixtureDir: string,
  opts: GeneratePolicyOpts = {},
): Promise<GeneratePolicyResult> {
  const command = resolveClawsCommand(opts.scope);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const env: NodeJS.ProcessEnv = { ...process.env, ...opts.env };

  const { stdout, stderr, exitCode } = await spawnCapture(
    command.bin,
    [...command.args],
    tmpFixtureDir,
    env,
    timeoutMs,
  );

  const policyDir = join(tmpFixtureDir, '.openclaw', 'policy');

  if (exitCode !== 0) {
    throw new PolicyGenerateError(
      `claws policy generate exited ${exitCode} in ${tmpFixtureDir}`,
      exitCode,
      stdout,
      stderr,
      tmpFixtureDir,
    );
  }

  return { policyDir, stdout, stderr, exitCode };
}

/**
 * Build the argv that invokes the shipping claws CLI via `node bin/claws.js`.
 * This is the same entry point the pulse 47.6 D7 dual-spawn gate uses in
 * its `node-bin` mode — the artifact users actually run.
 */
function resolveClawsCommand(
  scope?: '@bic/openclaw' | '@openclaw',
): ResolvedCommand {
  const binPath = join(
    repoRoot(),
    'packages',
    'claws',
    'bin',
    'claws.js',
  );
  const args: string[] = [binPath, 'policy', 'generate'];
  if (scope !== undefined) {
    args.push('--scope', scope);
  }
  // process.execPath is the absolute node binary; spawnCapture's Windows
  // shell-mode branch deliberately skips shell wrapping for absolute bins
  // so paths with spaces (e.g. "C:\Program Files\nodejs") stay quoted
  // correctly.
  return { bin: process.execPath, args };
}

function repoRoot(): string {
  // test/e2e/harness/policy-runner.ts → ../../../
  return join(HERE, '..', '..', '..');
}

interface CaptureResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function spawnCapture(
  bin: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<CaptureResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    // On Windows, npm-shim binaries (`tsx`, `claws`) land as `.cmd` files
    // that cannot be exec'd directly — `shell: true` is required. But when
    // the caller passed an absolute path (e.g. `process.execPath`), going
    // through cmd.exe double-quotes the path incorrectly when it contains
    // spaces (e.g. "C:\Program Files\nodejs\node.exe"). So shell-mode is
    // only engaged for bare-name bins on Windows.
    const shell =
      process.platform === 'win32' && !isAbsolute(bin);
    const child = spawn(bin, [...args], {
      cwd,
      env,
      shell,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;

    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      settle(() => {
        child.kill('SIGKILL');
        rejectPromise(
          new PolicyGenerateError(
            `claws policy generate timed out after ${timeoutMs}ms`,
            124,
            Buffer.concat(stdoutChunks).toString('utf8'),
            Buffer.concat(stderrChunks).toString('utf8'),
            cwd,
          ),
        );
      });
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on('error', (err) => {
      settle(() => rejectPromise(err));
    });

    child.on('close', (exitCode) => {
      settle(() =>
        resolvePromise({
          stdout: Buffer.concat(stdoutChunks).toString('utf8'),
          stderr: Buffer.concat(stderrChunks).toString('utf8'),
          // `exitCode` is null on signal termination; surface 1 so callers
          // see a non-zero exit regardless.
          exitCode: exitCode === null ? 1 : exitCode,
        }),
      );
    });
  });
}
