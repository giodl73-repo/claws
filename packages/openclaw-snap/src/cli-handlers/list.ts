import { httpCall, parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

export async function list(ctx: CliContext): Promise<CliResult> {
  parseArgs(ctx.argv);
  const res = await httpCall(ctx, 'GET', '/v1/snapshots');
  if (res.status !== 200) {
    writeLine(ctx, `list failed: ${String(res.status)}`, 'err');
    return { exitCode: 1 };
  }
  writeLine(ctx, JSON.stringify(res.body));
  return { exitCode: 0 };
}
