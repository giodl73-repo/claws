/**
 * CLI handler argv parsing — 4 tests across the 11 verb surface.
 */

import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli-handlers/client.js';
import { stage } from '../../src/cli-handlers/stage.js';
import { discardStage } from '../../src/cli-handlers/discardStage.js';
import { diff } from '../../src/cli-handlers/diff.js';

function collect(): { lines: string[]; ctx: (argv: string[]) => Parameters<typeof stage>[0] } {
  const lines: string[] = [];
  const ctx = (argv: string[]): Parameters<typeof stage>[0] => ({
    argv,
    endpoint: 'http://127.0.0.1:0',
    stdout: (line) => lines.push(line),
    stderr: (line) => lines.push(`ERR: ${line}`),
  });
  return { lines, ctx };
}

describe('cli-handlers — argv parsing', () => {
  it('parseArgs splits positional + flags, handling --key=value and --key value', () => {
    const result = parseArgs(['a', '--k1', 'v1', '--k2=v2', '--flag']);
    expect(result.positional).toEqual(['a']);
    expect(result.flags).toEqual({ k1: 'v1', k2: 'v2', flag: true });
  });

  it('stage verb requires on|off positional', async () => {
    const { lines, ctx } = collect();
    const noarg = await stage(ctx([]));
    expect(noarg.exitCode).toBe(2);
    const bad = await stage(ctx(['maybe']));
    expect(bad.exitCode).toBe(2);
    lines.length = 0;
    const ok = await stage(ctx(['on']));
    expect(ok.exitCode).toBe(0);
    expect(lines[0]).toBe('stage on');
  });

  it('discardStage handles both --stage flag and positional id forms', async () => {
    const { lines, ctx } = collect();
    await discardStage(ctx(['--stage']));
    await discardStage(ctx(['sha256-abc']));
    const usageResult = await discardStage(ctx([]));
    expect(usageResult.exitCode).toBe(2);
    expect(lines[0]).toBe('discard --stage: cleared');
    expect(lines[1]).toBe('discard sha256-abc');
  });

  it('diff verb requires two positional snapshot ids', async () => {
    const { ctx } = collect();
    const none = await diff(ctx([]));
    expect(none.exitCode).toBe(2);
    const one = await diff(ctx(['sha256-a']));
    expect(one.exitCode).toBe(2);

    // Two ids + stub fetch returning a valid body -> 0 via --level file.
    const stubFetch: typeof fetch = (async () => new Response(
      JSON.stringify({ id: 'x', files: { 'A.md': 'a' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;
    const two = await diff({ ...ctx(['sha256-a', 'sha256-b', '--level', 'file']), fetch: stubFetch });
    expect(two.exitCode).toBe(0);
  });
});
