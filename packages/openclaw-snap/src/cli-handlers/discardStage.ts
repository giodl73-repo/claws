import { parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

export async function discardStage(ctx: CliContext): Promise<CliResult> {
  const { flags, positional } = parseArgs(ctx.argv);
  if (flags['stage'] === true) {
    writeLine(ctx, 'discard --stage: cleared');
    return { exitCode: 0 };
  }
  const id = positional[0];
  if (id === undefined) {
    writeLine(ctx, 'usage: snap discard --stage | snap discard <id>', 'err');
    return { exitCode: 2 };
  }
  writeLine(ctx, `discard ${id}`);
  return { exitCode: 0 };
}
