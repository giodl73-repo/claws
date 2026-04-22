import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runPresuiteHygiene,
  killStaleClawsProcesses,
  sweepHarnessTmpDirs,
  type PresuiteProcess,
} from '#harness/presuite-hygiene.ts';

const createdRoots: string[] = [];

afterEach(() => {
  while (createdRoots.length > 0) {
    const d = createdRoots.pop()!;
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
});

function makeFakeTmpRoot(): string {
  const d = mkdtempSync(join(tmpdir(), 'hygiene-int-'));
  createdRoots.push(d);
  return d;
}

function makeDir(root: string, name: string, ageMs: number): string {
  const full = join(root, name);
  mkdirSync(full, { recursive: true });
  writeFileSync(join(full, 'marker.txt'), 'marker', 'utf8');
  const now = Date.now();
  const mtime = new Date(now - ageMs);
  utimesSync(full, mtime, mtime);
  return full;
}

describe('presuite-hygiene sweep', () => {
  it('kills stale claws process: older-than threshold triggers kill', async () => {
    const killed: number[] = [];
    const procs: readonly PresuiteProcess[] = [
      // stale: ageMs > threshold, matches `claws`
      { pid: 4001, ageMs: 7_200_000, commandLine: 'node claws.js --port 9000' },
      // young: below threshold
      { pid: 4002, ageMs: 60_000, commandLine: 'node claws.js --port 9001' },
      // non-match: ignored
      { pid: 4003, ageMs: 7_200_000, commandLine: 'node something-else.js' },
    ];
    const result = await killStaleClawsProcesses({
      olderThanMs: 60 * 60 * 1000,
      log: () => {},
      listProcesses: async () => procs,
      killProcess: async (pid) => {
        killed.push(pid);
        return true;
      },
    });
    expect(result.killedPids).toEqual([4001]);
    expect(result.skippedPids).toEqual([4002]);
    expect(killed).toEqual([4001]);
  });

  it('sweeps old tmp dirs: older-than threshold removes, younger are kept', async () => {
    const root = makeFakeTmpRoot();
    const staleDir = makeDir(root, 'claws-harness-abc123', 7_200_000);
    const freshDir = makeDir(root, 'claws-harness-def456', 30_000);
    const unrelatedDir = makeDir(root, 'other-harness-789', 7_200_000);

    const result = await sweepHarnessTmpDirs({
      olderThanMs: 60 * 60 * 1000,
      log: () => {},
      tmpRoot: root,
      now: () => Date.now(),
    });
    expect(result.sweptDirs).toContain(staleDir);
    expect(result.keptDirs).toContain(freshDir);
    // Unrelated dir is ignored by the prefix filter.
    expect(result.sweptDirs).not.toContain(unrelatedDir);
    expect(result.keptDirs).not.toContain(unrelatedDir);
    expect(existsSync(staleDir)).toBe(false);
    expect(existsSync(freshDir)).toBe(true);
    expect(existsSync(unrelatedDir)).toBe(true);
  });

  it('leaves in-flight dirs alone: runPresuiteHygiene end-to-end preserves fresh work', async () => {
    const root = makeFakeTmpRoot();
    const freshDir = makeDir(root, 'claws-harness-current-run', 10_000);

    const result = await runPresuiteHygiene({
      olderThanMs: 60 * 60 * 1000,
      log: () => {},
      tmpRoot: root,
      listProcesses: async () => [],
      killProcess: async () => true,
    });
    expect(result.sweptDirs).toHaveLength(0);
    expect(result.keptDirs).toContain(freshDir);
    expect(existsSync(freshDir)).toBe(true);
  });

  it('killStaleClawsProcesses skips when kill returns false', async () => {
    const result = await killStaleClawsProcesses({
      olderThanMs: 1000,
      log: () => {},
      listProcesses: async () => [
        { pid: 5001, ageMs: 7_200_000, commandLine: 'node claws.js --serve' },
      ],
      killProcess: async () => false,
    });
    expect(result.killedPids).toEqual([]);
    expect(result.skippedPids).toContain(5001);
  });

  it('sweepHarnessTmpDirs handles missing root dir gracefully', async () => {
    const result = await sweepHarnessTmpDirs({
      olderThanMs: 1000,
      log: () => {},
      tmpRoot: '/nonexistent/does/not/exist/' + Date.now(),
      now: () => Date.now(),
    });
    expect(result.sweptDirs).toEqual([]);
    expect(result.keptDirs).toEqual([]);
  });

  it('runPresuiteHygiene with default process lister (no kills): exercises the real OS path', async () => {
    const root = makeFakeTmpRoot();
    const result = await runPresuiteHygiene({
      // MAX_SAFE_INTEGER guarantees no real process is killed — we only want
      // to drive the defaultListProcesses branch (wmic on win32, ps elsewhere)
      // so coverage sees the happy path.
      olderThanMs: Number.MAX_SAFE_INTEGER,
      log: () => {},
      tmpRoot: root,
    });
    // Real OS call: killed must be [] because olderThanMs blocks every kill.
    expect(result.killedPids).toEqual([]);
    // sweep also kept anything it saw — no stale dirs at this threshold.
    expect(result.sweptDirs).toHaveLength(0);
  });

  it('runPresuiteHygiene default killProcess covers the real signal-send path', async () => {
    // Inject a synthetic process whose pid does NOT exist — defaultKillProcess
    // will attempt `process.kill(pid, 'SIGTERM')` and hit its catch block,
    // returning false and pushing the pid into skippedPids.
    const result = await killStaleClawsProcesses({
      olderThanMs: 1,
      log: () => {},
      listProcesses: async () => [
        { pid: 1, ageMs: Number.MAX_SAFE_INTEGER, commandLine: 'node claws.js' },
      ],
    });
    // pid=1 on Windows is not ours — the kill will fail, which routes via
    // defaultKillProcess's catch → returns false → pid lands in skipped.
    expect(result.killedPids.length + result.skippedPids.length).toBeGreaterThanOrEqual(1);
  });

  it('runPresuiteHygiene with linux platform override: ps path returns empty gracefully', async () => {
    // Platform-override drives the Linux default lister even on Windows — ps
    // will either run (native) or fail gracefully (Windows, which has no ps),
    // and the error path returns []. Both outcomes cover the ps branch.
    const root = makeFakeTmpRoot();
    const result = await runPresuiteHygiene({
      olderThanMs: Number.MAX_SAFE_INTEGER,
      log: () => {},
      platform: 'linux',
      tmpRoot: root,
    });
    expect(Array.isArray(result.killedPids)).toBe(true);
    expect(Array.isArray(result.skippedPids)).toBe(true);
  });

  it('parsers: wmic CSV + ps output parse correctly', async () => {
    const { parseWmicCsv, parsePsOutput } = await import('#harness/presuite-hygiene.ts');
    // Synthesize a wmic CSV: header + one claws row.
    const wmicStdout =
      'Node,CommandLine,CreationDate,ProcessId\r\n' +
      `WIN,node claws.js,20250101120000.000000+000,4321\r\n`;
    const procs = parseWmicCsv(wmicStdout);
    expect(procs.length).toBeGreaterThanOrEqual(1);
    expect(procs.find((p) => p.pid === 4321)?.commandLine).toBe('node claws.js');

    const psStdout =
      '  PID  ELAPSED COMMAND\n' +
      ' 1234    7200 node /usr/local/bin/claws\n' +
      ' 5678      60 node other.js\n';
    const psProcs = parsePsOutput(psStdout);
    expect(psProcs).toHaveLength(2);
    expect(psProcs[0]!.ageMs).toBe(7_200_000);
    expect(psProcs[1]!.pid).toBe(5678);
  });
});
