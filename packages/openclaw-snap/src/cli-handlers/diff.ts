import { parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

export async function diff(ctx: CliContext): Promise<CliResult> {
  const { positional } = parseArgs(ctx.argv);
  const from = positional[0];
  const to = positional[1];
  if (from === undefined || to === undefined) {
    writeLine(ctx, 'usage: snap diff <a> <b>', 'err');
    return { exitCode: 2 };
  }
  writeLine(ctx, `diff ${from}..${to}: (not implemented — thin stub; imports diffPolicyIR from @bic/openclaw-policy at compose time)`);
  return { exitCode: 0 };
}
