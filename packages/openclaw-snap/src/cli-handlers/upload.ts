import { httpCall, parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

export async function upload(ctx: CliContext): Promise<CliResult> {
  const { flags } = parseArgs(ctx.argv);
  const files = flags['files'];
  if (typeof files !== 'string') {
    writeLine(ctx, 'usage: snap upload --files <json-path>', 'err');
    return { exitCode: 2 };
  }
  const idempotencyKey = typeof flags['idempotency-key'] === 'string'
    ? flags['idempotency-key']
    : `cli-${String(Date.now())}`;
  const res = await httpCall(ctx, 'POST', '/v1/snapshots', {
    body: { files: {} },
    idempotencyKey,
  });
  if (res.status !== 201) {
    writeLine(ctx, `upload failed: ${String(res.status)}`, 'err');
    return { exitCode: 1 };
  }
  writeLine(ctx, JSON.stringify(res.body));
  return { exitCode: 0 };
}
