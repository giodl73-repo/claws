import { httpCall, parseArgs, type CliContext, type CliResult, writeLine } from './client.js';

interface SnapshotResponse {
  readonly id: string;
  readonly files: Record<string, string>;
}

function diffFiles(a: SnapshotResponse, b: SnapshotResponse): {
  added: string[];
  removed: string[];
  changed: string[];
} {
  const keysA = new Set(Object.keys(a.files));
  const keysB = new Set(Object.keys(b.files));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const k of keysB) {
    if (!keysA.has(k)) added.push(k);
    else if (a.files[k] !== b.files[k]) changed.push(k);
  }
  for (const k of keysA) {
    if (!keysB.has(k)) removed.push(k);
  }
  added.sort();
  removed.sort();
  changed.sort();
  return { added, removed, changed };
}

async function fetchSnap(ctx: CliContext, id: string): Promise<SnapshotResponse | null> {
  const res = await httpCall(ctx, 'GET', `/v1/snapshots/${encodeURIComponent(id)}`);
  if (res.status !== 200) return null;
  const body = res.body as SnapshotResponse;
  if (body === null || typeof body !== 'object' || typeof body.files !== 'object') return null;
  return body;
}

export async function diff(ctx: CliContext): Promise<CliResult> {
  const { flags, positional } = parseArgs(ctx.argv);
  const from = positional[0];
  const to = positional[1];
  if (from === undefined || to === undefined) {
    writeLine(ctx, 'usage: snap diff <a> <b> [--level file|semantic]', 'err');
    return { exitCode: 2 };
  }
  const level = typeof flags['level'] === 'string' ? flags['level'] : 'semantic';

  const [a, b] = await Promise.all([fetchSnap(ctx, from), fetchSnap(ctx, to)]);
  if (a === null || b === null) {
    writeLine(ctx, 'diff failed: could not fetch one or both snapshots', 'err');
    return { exitCode: 1 };
  }

  if (level !== 'file') {
    try {
      const policy = (await import('@bic/openclaw-policy')) as unknown as {
        diff?: (a: unknown, b: unknown) => unknown;
      };
      if (typeof policy.diff === 'function') {
        const result = policy.diff(a, b);
        writeLine(ctx, JSON.stringify(result));
        return { exitCode: 0 };
      }
    } catch {
      writeLine(
        ctx,
        'note: @bic/openclaw-policy not installed; falling back to file-level diff. Install with: npm i @bic/openclaw-policy',
      );
    }
  }

  writeLine(ctx, JSON.stringify(diffFiles(a, b)));
  return { exitCode: 0 };
}
