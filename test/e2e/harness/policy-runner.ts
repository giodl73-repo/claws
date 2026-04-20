/**
 * policy-runner — spawn `claws policy generate` as a real child process.
 *
 * Per pulse 36 plan: the runner MUST exec the real binary. Re-entering via
 * a module `import` is not acceptable — it would bypass the CLI's startup
 * path (preCommand hooks, exit-code semantics, stderr framing) and the test
 * would stop being a fair proof that the shipped binary works.
 *
 * The binary is spawned via `tsx cli.ts` against the repo's working
 * `packages/claws/src/cli.ts` so harness runs always see the current source,
 * not a stale `dist/` build.
 */

import { spawn } from 'node:child_process';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export interface GeneratePolicyOpts {
  scope?: '@bic/openclaw' | '@openclaw';
  /**
   * Override the command executed. Production callers leave this unset;
   * tests that exercise the runner's spawn/capture plumbing without the
   * real `policy generate` command injected here.
   */
  command?: ResolvedCommand;
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

export interface ResolvedCommand {
  bin: string;
  args: readonly string[];
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
  const command = opts.command ?? defaultClawsCommand(opts.scope);
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
 * Resolve the default command that invokes the in-tree claws CLI through
 * tsx. We target `packages/claws/src/cli.ts` so the test always runs the
 * current source — harness runs don't depend on a fresh `tsup` build.
 */
export function defaultClawsCommand(
  scope?: '@bic/openclaw' | '@openclaw',
): ResolvedCommand {
  const cliPath = join(
    repoRoot(),
    'packages',
    'claws',
    'src',
    'cli.ts',
  );
  const args: string[] = ['tsx', cliPath, 'policy', 'generate'];
  if (scope !== undefined) {
    args.push('--scope', scope);
  }
  // The first arg is the bin we actually exec. Passing `tsx` as argv[0]
  // (a wrapper shim) is fine on Windows because npm puts `tsx.cmd` next
  // to `tsx` and Node resolves the .cmd for us when `shell: true`.
  return { bin: args[0]!, args: args.slice(1) };
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
