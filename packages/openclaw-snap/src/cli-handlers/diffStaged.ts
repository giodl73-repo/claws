import { parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

export async function diffStaged(ctx: CliContext): Promise<CliResult> {
  const { flags } = parseArgs(ctx.argv);
  if (flags['staged'] !== true) {
    writeLine(ctx, 'usage: snap diff --staged', 'err');
    return { exitCode: 2 };
  }
  writeLine(ctx, 'diff-staged: (not implemented — thin stub)');
  return { exitCode: 0 };
}
