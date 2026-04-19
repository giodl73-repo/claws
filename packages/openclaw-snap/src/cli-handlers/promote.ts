import { httpCall, parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

export async function promote(ctx: CliContext): Promise<CliResult> {
  const { flags, positional } = parseArgs(ctx.argv);
  const id = positional[0];
  if (id === undefined) {
    writeLine(ctx, 'usage: snap promote <id>', 'err');
    return { exitCode: 2 };
  }
  const idempotencyKey = typeof flags['idempotency-key'] === 'string'
    ? flags['idempotency-key']
    : `cli-${String(Date.now())}`;
  const res = await httpCall(ctx, 'POST', `/v1/snapshots/${encodeURIComponent(id)}/promote`, {
    body: {},
    idempotencyKey,
  });
  if (res.status !== 200) {
    writeLine(ctx, `promote failed: ${String(res.status)}`, 'err');
    return { exitCode: 1 };
  }
  writeLine(ctx, JSON.stringify(res.body));
  return { exitCode: 0 };
}
