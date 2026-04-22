import { httpCall, parseArgs, type CliContext, type CliResult, writeLine } from './client.js';
import { writeSnapshotFiles, clearStage } from '@bic/openclaw-workspace/staging';

export async function checkout(ctx: CliContext): Promise<CliResult> {
  const { flags, positional } = parseArgs(ctx.argv);
  const id = positional[0];
  if (id === undefined) {
    writeLine(ctx, 'usage: snap checkout <id> [--root <path>] [--keep-stage]', 'err');
    return { exitCode: 2 };
  }
  const root = typeof flags['root'] === 'string' ? flags['root'] : process.cwd();
  const keepStage = flags['keep-stage'] === true;

  const res = await httpCall(ctx, 'GET', `/v1/snapshots/${encodeURIComponent(id)}`);
  if (res.status !== 200) {
    writeLine(ctx, `checkout failed: ${String(res.status)}`, 'err');
    return { exitCode: 1 };
  }
  const body = res.body as { files?: Record<string, string> };
  if (body === null || typeof body !== 'object' || typeof body.files !== 'object' || body.files === null) {
    writeLine(ctx, 'checkout failed: response missing files map', 'err');
    return { exitCode: 1 };
  }
  await writeSnapshotFiles(root, body.files);
  if (!keepStage) {
    await clearStage(root);
  }
  writeLine(ctx, JSON.stringify(res.body));
  return { exitCode: 0 };
}
