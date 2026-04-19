/**
 * L0 unit — `claws fleet compile` render + exit-code paths.
 *
 * The SDK's `fleetCompile()` is mocked; these tests exercise only the CLI
 * adapter: human/ndjson output shape, exit-code selection per summary
 * (succeeded/failed), the `--stats` suffix, `--output-dir` plumbing, and
 * the thrown-error fallback branches (human + json).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FleetCompileResult, FleetWorkspaceResult } from '@bic/claws-sdk/compiler/fleet';

const fleetCompileMock = vi.fn();

vi.mock('@bic/claws-sdk/compiler/fleet', () => ({
  fleetCompile: (...args: unknown[]) => fleetCompileMock(...args),
}));

import { runFleetCompile, type FleetCompileOpts } from '#src/commands/fleet-compile.js';

class StreamCollector {
  chunks: string[] = [];
  write(chunk: string | Uint8Array): boolean {
    this.chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    return true;
  }
  get text(): string {
    return this.chunks.join('');
  }
}

function makeStreams(): {
  stdout: StreamCollector;
  stderr: StreamCollector;
  injected: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream };
} {
  const stdout = new StreamCollector();
  const stderr = new StreamCollector();
  return {
    stdout,
    stderr,
    injected: {
      stdout: stdout as unknown as NodeJS.WritableStream,
      stderr: stderr as unknown as NodeJS.WritableStream,
    },
  };
}

function makeOpts(overrides: Partial<FleetCompileOpts> = {}): FleetCompileOpts {
  return {
    maxConcurrency: 2,
    json: false,
    stats: false,
    outputDir: 'out',
    ...overrides,
  };
}

function successWs(workspace: string, elapsedMs = 10): FleetWorkspaceResult {
  return {
    status: 'success',
    workspace,
    elapsedMs,
    result: {
      success: true,
      cacheHit: false,
      emitResults: {},
      duration: elapsedMs,
    },
  } as unknown as FleetWorkspaceResult;
}

function failureWs(
  workspace: string,
  overrides: {
    kind?: string;
    stage?: string;
    message?: string;
    diagWorkspace?: string;
    elapsedMs?: number;
  } = {},
): FleetWorkspaceResult {
  const elapsedMs = overrides.elapsedMs ?? 5;
  return {
    status: 'failure',
    workspace,
    elapsedMs,
    diagnostic: {
      kind: overrides.kind ?? 'CompileFailed',
      workspace: overrides.diagWorkspace ?? workspace,
      stage: overrides.stage ?? 'parse',
      message: overrides.message ?? 'boom',
    },
  } as unknown as FleetWorkspaceResult;
}

function cancelledWs(workspace: string, elapsedMs = 1): FleetWorkspaceResult {
  return { status: 'cancelled', workspace, elapsedMs } as unknown as FleetWorkspaceResult;
}

function notStartedWs(workspace: string): FleetWorkspaceResult {
  return { status: 'not-started', workspace, elapsedMs: 0 } as unknown as FleetWorkspaceResult;
}

function makeResult(
  workspaces: FleetWorkspaceResult[],
  summary: Partial<FleetCompileResult['summary']> = {},
): FleetCompileResult {
  const succeeded = workspaces.filter((w) => w.status === 'success').length;
  const failed = workspaces.filter((w) => w.status === 'failure').length;
  const skipped = workspaces.filter((w) => w.status === 'cancelled' || w.status === 'not-started').length;
  return {
    workspaces,
    summary: {
      totalWorkspaces: workspaces.length,
      succeeded,
      failed,
      skipped,
      wallClockMs: 100,
      peakConcurrency: 2,
      parallelismRatio: 1.5,
      maxConcurrency: 2,
      ...summary,
    },
  };
}

beforeEach(() => {
  fleetCompileMock.mockReset();
});

describe('runFleetCompile — human renderer (render + exit codes)', () => {
  it('returns 0 and renders ok glyph when every workspace succeeds', async () => {
    fleetCompileMock.mockResolvedValue(
      makeResult([successWs('/fleet/a', 42), successWs('/fleet/b', 17)]),
    );

    const s = makeStreams();
    const code = await runFleetCompile('/fleet', makeOpts(), s.injected);

    expect(code).toBe(0);
    expect(s.stderr.text).toBe('');
    const out = s.stdout.text;
    expect(out).toContain('claws fleet compile -- 2 workspaces, concurrency 2');
    expect(out).toContain('\u2713 a  42ms');
    expect(out).toContain('\u2713 b  17ms');
    expect(out).toContain('2 workspaces: 2 ok, 0 failed in 100ms');
    expect(out).not.toContain('peak=');
  });

  it('returns 1 when every workspace fails (zero succeeded)', async () => {
    fleetCompileMock.mockResolvedValue(
      makeResult([
        failureWs('/fleet/bad', {
          kind: 'MissingSoulFile',
          stage: 'parse',
          message: 'SOUL.md missing',
          diagWorkspace: 'bad',
        }),
      ]),
    );

    const s = makeStreams();
    const code = await runFleetCompile('/fleet', makeOpts(), s.injected);

    expect(code).toBe(1);
    const out = s.stdout.text;
    expect(out).toContain('\u2717 bad  5ms  MissingSoulFile@parse: SOUL.md missing');
    expect(out).toContain('1 workspaces: 0 ok, 1 failed in 100ms');
  });

  it('returns 2 when at least one succeeded and at least one failed', async () => {
    fleetCompileMock.mockResolvedValue(
      makeResult([
        successWs('/fleet/ok', 30),
        failureWs('/fleet/bad', { kind: 'EmitFailed', stage: 'emit', message: 'nope', diagWorkspace: 'bad' }),
      ]),
    );

    const s = makeStreams();
    const code = await runFleetCompile('/fleet', makeOpts(), s.injected);

    expect(code).toBe(2);
    const out = s.stdout.text;
    expect(out).toContain('\u2713 ok');
    expect(out).toContain('\u2717 bad');
    expect(out).toContain('2 workspaces: 1 ok, 1 failed');
  });

  it('renders cancelled and not-started workspaces with the skip glyph', async () => {
    fleetCompileMock.mockResolvedValue(
      makeResult(
        [cancelledWs('/fleet/c'), notStartedWs('/fleet/d')],
        { succeeded: 0, failed: 0, skipped: 2 },
      ),
    );

    const s = makeStreams();
    const code = await runFleetCompile('/fleet', makeOpts(), s.injected);

    expect(code).toBe(0); // failed === 0 → exit 0
    const out = s.stdout.text;
    expect(out).toContain('\u2022 c  cancelled');
    expect(out).toContain('\u2022 d  not-started');
  });

  it('falls back to raw workspace when no path separator is present', async () => {
    fleetCompileMock.mockResolvedValue(makeResult([successWs('soloworkspace', 7)]));

    const s = makeStreams();
    await runFleetCompile('/fleet', makeOpts(), s.injected);

    expect(s.stdout.text).toContain('\u2713 soloworkspace  7ms');
  });

  it('handles forward-slash and backslash paths equivalently', async () => {
    fleetCompileMock.mockResolvedValue(
      makeResult([successWs('C:\\fleet\\win-ws', 3), successWs('/fleet/nix-ws', 4)]),
    );

    const s = makeStreams();
    await runFleetCompile('/fleet', makeOpts(), s.injected);

    const out = s.stdout.text;
    expect(out).toContain('\u2713 win-ws  3ms');
    expect(out).toContain('\u2713 nix-ws  4ms');
  });

  it('appends the stats suffix when opts.stats is true', async () => {
    fleetCompileMock.mockResolvedValue(
      makeResult([successWs('/fleet/a')], {
        peakConcurrency: 4,
        parallelismRatio: 2.345,
      }),
    );

    const s = makeStreams();
    await runFleetCompile('/fleet', makeOpts({ stats: true }), s.injected);

    expect(s.stdout.text).toContain('(peak=4, parallelism=2.35x)');
  });
});

describe('runFleetCompile — ndjson renderer', () => {
  it('emits one JSON line per workspace plus a trailing summary line', async () => {
    const workspaces = [successWs('/fleet/a', 11), failureWs('/fleet/b', { diagWorkspace: 'b' })];
    const result = makeResult(workspaces);
    fleetCompileMock.mockResolvedValue(result);

    const s = makeStreams();
    const code = await runFleetCompile('/fleet', makeOpts({ json: true }), s.injected);

    expect(code).toBe(2);
    const lines = s.stdout.text.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]!)).toMatchObject({ status: 'success', workspace: '/fleet/a' });
    expect(JSON.parse(lines[1]!)).toMatchObject({ status: 'failure', workspace: '/fleet/b' });
    expect(JSON.parse(lines[2]!)).toMatchObject({
      totalWorkspaces: 2,
      succeeded: 1,
      failed: 1,
    });
    expect(s.stderr.text).toBe('');
  });
});

describe('runFleetCompile — SDK error fallthrough (exit 1)', () => {
  it('writes a human error line to stderr when fleetCompile throws Error', async () => {
    fleetCompileMock.mockRejectedValue(new Error('fleet-dir not found'));

    const s = makeStreams();
    const code = await runFleetCompile('/missing', makeOpts(), s.injected);

    expect(code).toBe(1);
    expect(s.stdout.text).toBe('');
    expect(s.stderr.text).toBe('claws fleet compile: fleet-dir not found\n');
  });

  it('writes a json error line to stderr when --json is set', async () => {
    fleetCompileMock.mockRejectedValue(new Error('scan failed'));

    const s = makeStreams();
    const code = await runFleetCompile('/missing', makeOpts({ json: true }), s.injected);

    expect(code).toBe(1);
    expect(s.stdout.text).toBe('');
    expect(JSON.parse(s.stderr.text.trim())).toEqual({ error: 'scan failed' });
  });

  it('stringifies non-Error rejections', async () => {
    fleetCompileMock.mockRejectedValue('raw string failure');

    const s = makeStreams();
    const code = await runFleetCompile('/missing', makeOpts(), s.injected);

    expect(code).toBe(1);
    expect(s.stderr.text).toBe('claws fleet compile: raw string failure\n');
  });
});

describe('runFleetCompile — SDK invocation contract', () => {
  it('forwards maxConcurrency + outputDir and hardcodes targets=[oc], cacheEnabled=false', async () => {
    fleetCompileMock.mockResolvedValue(makeResult([successWs('/fleet/a')]));

    const s = makeStreams();
    await runFleetCompile(
      '/fleet',
      makeOpts({ maxConcurrency: 8, outputDir: 'custom-out' }),
      s.injected,
    );

    expect(fleetCompileMock).toHaveBeenCalledTimes(1);
    const [fleetDir, sdkOpts] = fleetCompileMock.mock.calls[0]!;
    expect(fleetDir).toBe('/fleet');
    expect(sdkOpts).toEqual({
      maxConcurrency: 8,
      compileOptions: {
        targets: ['oc'],
        outputDir: 'custom-out',
        cacheEnabled: false,
      },
    });
  });

  it('defaults streams to process.stdout / process.stderr when omitted', async () => {
    fleetCompileMock.mockResolvedValue(makeResult([successWs('/fleet/a')]));
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      const code = await runFleetCompile('/fleet', makeOpts());
      expect(code).toBe(0);
      expect(stdoutSpy).toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});
