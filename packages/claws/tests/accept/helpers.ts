/**
 * Shared helpers for CLI acceptance tests.
 *
 * All tests in this directory run the real `claws` binary as a subprocess.
 * This catches packaging failures (missing tsup entries, broken subpath
 * imports) that unit/integration tests miss because vitest resolves
 * modules through source aliases, not dist/.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Absolute path to the claws binary entry point. */
export const CLAWS_BIN = resolve(__dirname, '../../bin/claws.js');

export interface ClawsResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Run claws as a subprocess. Throws on Node-level errors (not claws exit codes). */
export async function claws(
  args: string[],
  options: { cwd?: string; timeout?: number } = {},
): Promise<ClawsResult> {
  try {
    const env = { ...process.env, NO_COLOR: '1' };
    delete env['FORCE_COLOR'];
    const { stdout, stderr } = await execFileAsync('node', [CLAWS_BIN, ...args], {
      cwd: options.cwd ?? process.cwd(),
      timeout: options.timeout ?? 30_000,
      env,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      message?: string;
      code?: number | string;
    };
    const hasModuleNotFoundError =
      e.stderr?.includes('ERR_MODULE_NOT_FOUND') === true ||
      e.message?.includes('ERR_MODULE_NOT_FOUND') === true;
    // Re-throw real Node errors (ENOENT, ERR_MODULE_NOT_FOUND, etc.)
    if (typeof e.code === 'string' || hasModuleNotFoundError) {
      throw err;
    }
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: typeof e.code === 'number' ? e.code : 1,
    };
  }
}

/** Create a temp directory and return { dir, cleanup }. */
export function makeTempWorkspace(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'claws-accept-'));
  return {
    dir,
    cleanup: () => {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Init a temp workspace and return its path. Caller must cleanup. */
export async function initTempWorkspace(): Promise<{ dir: string; cleanup: () => void }> {
  const ws = makeTempWorkspace();
  const r = await claws(['init', '--scaffold'], { cwd: ws.dir });
  if (r.exitCode !== 0) {
    ws.cleanup();
    throw new Error(`claws init failed: ${r.stderr}`);
  }
  return ws;
}
