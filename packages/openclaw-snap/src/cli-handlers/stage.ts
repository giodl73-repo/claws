import { parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

export async function stage(ctx: CliContext): Promise<CliResult> {
  const { positional } = parseArgs(ctx.argv);
  const mode = positional[0];
  if (mode !== 'on' && mode !== 'off') {
    writeLine(ctx, 'usage: snap stage <on|off>', 'err');
    return { exitCode: 2 };
  }
  writeLine(ctx, `stage ${mode}`);
  return { exitCode: 0 };
}
