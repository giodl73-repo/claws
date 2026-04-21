import { httpCall, parseArgs, type CliContext, type CliResult, writeLine } from './client.js';
import { readStagedOrCanonical, clearStage } from '@bic/openclaw-workspace/staging';
import { computeSnapshotId } from '../canonical.js';

export async function upload(ctx: CliContext): Promise<CliResult> {
  const { flags } = parseArgs(ctx.argv);
  const filesFlag = flags['files'];
  if (typeof filesFlag !== 'string') {
    writeLine(ctx, 'usage: snap upload --files <workspace-root>', 'err');
    return { exitCode: 2 };
  }
  const idempotencyKey = typeof flags['idempotency-key'] === 'string'
    ? flags['idempotency-key']
    : `cli-${String(Date.now())}`;

  const files = await readStagedOrCanonical(filesFlag);
  const snapshotId = computeSnapshotId(files);

  const res = await httpCall(ctx, 'POST', '/v1/snapshots', {
    body: { files, snapshotId },
    idempotencyKey,
  });
  if (res.status !== 201) {
    writeLine(ctx, `upload failed: ${String(res.status)}`, 'err');
    return { exitCode: 1 };
  }
  await clearStage(filesFlag);
  writeLine(ctx, JSON.stringify(res.body));
  return { exitCode: 0 };
}
