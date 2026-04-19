/**
 * `claws fleet compile <fleet-dir>` — parallel compile across workspaces.
 *
 * Thin CLI adapter: parses args, calls `fleetCompile()` from the SDK,
 * renders per-workspace + summary output (human or ndjson). All business
 * logic (discovery, concurrency, diagnostic shape, cache isolation) lives
 * in `@bic/claws-sdk/compiler/fleet`.
 *
 * Exit codes per CL-01 v1.2 §`claws fleet compile`:
 *   0 — every workspace succeeded
 *   2 — at least one succeeded AND at least one failed
 *   1 — zero succeeded, OR fleet-dir scan itself failed, OR invalid flags
 *
 * @module claws-cli/commands/fleet-compile
 */

import { cpus } from 'node:os';
import { fleetCompile } from '@bic/claws-sdk/compiler/fleet';
import type {
  FleetCompileResult,
  FleetWorkspaceResult,
} from '@bic/claws-sdk/compiler/fleet';

/**
 * Parsed CLI options for `claws fleet compile`.
 *
 * `maxConcurrency` is already validated to a positive integer at parse
 * time; invalid input exits `1` before this struct is built.
 */
export interface FleetCompileOpts {
  readonly maxConcurrency: number;
  readonly json: boolean;
  readonly stats: boolean;
  readonly outputDir: string;
}

/**
 * Validate `--max-concurrency <N>` and return the parsed integer.
 *
 * Accepts a positive integer only: `0`, negative values, non-integer
 * strings (e.g. `"1.5"`, `"foo"`) all fail with the exact CL-01 v1.2
 * message. The caller treats an `Error` return as exit `1` (AC-12).
 */
export function parseMaxConcurrency(raw: string | undefined): number {
  if (raw === undefined) return cpus().length;
  if (!/^\d+$/.test(raw)) {
    throw new Error('--max-concurrency must be a positive integer');
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('--max-concurrency must be a positive integer');
  }
  return n;
}

const GLYPH_OK = '\u2713'; // ✓
const GLYPH_FAIL = '\u2717'; // ✗
const GLYPH_SKIP = '\u2022'; // •

function workspaceBasename(ws: FleetWorkspaceResult): string {
  // Per-workspace scope in the SDK strips basename into the diagnostic;
  // the raw `workspace` on success/cancelled/not-started is the path.
  if (ws.status === 'failure') return ws.diagnostic.workspace;
  const m = /[\\/]([^\\/]+)$/.exec(ws.workspace);
  return m !== null ? m[1]! : ws.workspace;
}

function renderHuman(result: FleetCompileResult, opts: FleetCompileOpts, out: NodeJS.WritableStream): void {
  const { workspaces, summary } = result;
  out.write(`claws fleet compile -- ${summary.totalWorkspaces} workspaces, concurrency ${summary.maxConcurrency}\n`);
  for (const ws of workspaces) {
    const name = workspaceBasename(ws);
    if (ws.status === 'success') {
      out.write(`  ${GLYPH_OK} ${name}  ${ws.elapsedMs}ms\n`);
    } else if (ws.status === 'failure') {
      out.write(
        `  ${GLYPH_FAIL} ${name}  ${ws.elapsedMs}ms  ${ws.diagnostic.kind}@${ws.diagnostic.stage}: ${ws.diagnostic.message}\n`,
      );
    } else {
      out.write(`  ${GLYPH_SKIP} ${name}  ${ws.status}\n`);
    }
  }
  const okCount = summary.succeeded;
  const failCount = summary.failed;
  let summaryLine = `${summary.totalWorkspaces} workspaces: ${okCount} ok, ${failCount} failed in ${summary.wallClockMs}ms`;
  if (opts.stats) {
    summaryLine += `  (peak=${summary.peakConcurrency}, parallelism=${summary.parallelismRatio.toFixed(2)}x)`;
  }
  out.write(`${summaryLine}\n`);
}

function renderNdjson(result: FleetCompileResult, out: NodeJS.WritableStream): void {
  for (const ws of result.workspaces) {
    out.write(`${JSON.stringify(ws)}\n`);
  }
  out.write(`${JSON.stringify(result.summary)}\n`);
}

function exitCodeFor(result: FleetCompileResult): number {
  const { succeeded, failed } = result.summary;
  if (failed === 0) return 0;
  if (succeeded === 0) return 1;
  return 2;
}

/**
 * Run `claws fleet compile <fleet-dir>`.
 *
 * `stdout` and `stderr` are injected for testability — the CLI binding
 * passes `process.stdout` / `process.stderr`.
 */
export async function runFleetCompile(
  fleetDir: string,
  opts: FleetCompileOpts,
  streams: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream } = {
    stdout: process.stdout,
    stderr: process.stderr,
  },
): Promise<number> {
  let result: FleetCompileResult;
  try {
    result = await fleetCompile(fleetDir, {
      maxConcurrency: opts.maxConcurrency,
      compileOptions: {
        targets: ['oc'],
        outputDir: opts.outputDir,
        cacheEnabled: false,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      streams.stderr.write(`${JSON.stringify({ error: msg })}\n`);
    } else {
      streams.stderr.write(`claws fleet compile: ${msg}\n`);
    }
    return 1;
  }

  if (opts.json) {
    renderNdjson(result, streams.stdout);
  } else {
    renderHuman(result, opts, streams.stdout);
  }
  return exitCodeFor(result);
}
