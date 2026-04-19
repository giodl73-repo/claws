import { parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

export async function serve(ctx: CliContext): Promise<CliResult> {
  const { flags } = parseArgs(ctx.argv);
  const port = typeof flags['port'] === 'string' ? Number(flags['port']) : 4173;
  if (!Number.isFinite(port) || port <= 0) {
    writeLine(ctx, 'usage: snap serve [--port <n>]', 'err');
    return { exitCode: 2 };
  }
  writeLine(ctx, `serve --port ${String(port)}: (invoke startServer() from @bic/openclaw-snap)`);
  return { exitCode: 0 };
}
