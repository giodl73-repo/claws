import { httpCall, parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

export async function checkout(ctx: CliContext): Promise<CliResult> {
  const { positional } = parseArgs(ctx.argv);
  const id = positional[0];
  if (id === undefined) {
    writeLine(ctx, 'usage: snap checkout <id>', 'err');
    return { exitCode: 2 };
  }
  const res = await httpCall(ctx, 'GET', `/v1/snapshots/${encodeURIComponent(id)}`);
  if (res.status !== 200) {
    writeLine(ctx, `checkout failed: ${String(res.status)}`, 'err');
    return { exitCode: 1 };
  }
  writeLine(ctx, JSON.stringify(res.body));
  return { exitCode: 0 };
}
