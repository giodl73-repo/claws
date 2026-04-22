import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  trackPid,
  untrackPid,
  killTree,
  killTreeWindows,
  killTreePosix,
  teardownHttpProcess,
  rmrfWithRetry,
  checkLeaks,
  listTracked,
  parseWmicDescendants,
  _resetRegistryForTests,
  _cleanupForTests,
  _hookCleanup,
  _onSigint,
} from '../lifecycle.ts';

function spawnSleeper(ms: number): { pid: number; onExit: Promise<void> } {
  const child =
    process.platform === 'win32'
      ? spawn(
          process.execPath,
          ['-e', `setTimeout(() => {}, ${ms})`],
          { windowsHide: true, stdio: 'ignore' },
        )
      : spawn('node', ['-e', `setTimeout(() => {}, ${ms})`], {
          stdio: 'ignore',
        });
  if (child.pid === undefined) throw new Error('spawn failed to return pid');
  const onExit = new Promise<void>((resolve) => child.on('exit', () => resolve()));
  return { pid: child.pid, onExit };
}

describe('lifecycle.trackPid / listTracked', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('registers a tracked pid with its label', () => {
    trackPid(1234, { label: 'snap-runner' });
    expect(listTracked()).toEqual([{ pid: 1234, label: 'snap-runner' }]);
  });

  it('rejects non-positive or non-integer pids', () => {
    expect(() => trackPid(0, { label: 'x' })).toThrow();
    expect(() => trackPid(-1, { label: 'x' })).toThrow();
    expect(() => trackPid(1.5, { label: 'x' })).toThrow();
  });

  it('untrackPid removes the entry', () => {
    trackPid(4321, { label: 'host' });
    untrackPid(4321);
    expect(listTracked()).toEqual([]);
  });
});

describe('lifecycle.killTree', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('kills a tracked child process (happy path)', async () => {
    const { pid, onExit } = spawnSleeper(60_000);
    trackPid(pid, { label: 'sleeper' });
    await killTree(pid, { timeoutMs: 5_000 });
    await Promise.race([onExit, delay(2_000)]);
    expect(listTracked().some((e) => e.pid === pid)).toBe(false);
  });

  it('removes the pid from the registry after killing', async () => {
    const { pid, onExit } = spawnSleeper(60_000);
    trackPid(pid, { label: 'sleeper-2' });
    await killTree(pid, { timeoutMs: 5_000 });
    await Promise.race([onExit, delay(2_000)]);
    expect(listTracked()).toEqual([]);
  });
});

describe('lifecycle.rmrfWithRetry', () => {
  beforeEach(() => _resetRegistryForTests());

  it('removes a directory tree', async () => {
    const base = await mkdtemp(join(tmpdir(), 'lifecycle-rm-'));
    await mkdir(join(base, 'nested'), { recursive: true });
    await writeFile(join(base, 'nested', 'a.txt'), 'hello');
    await rmrfWithRetry(base);
    await expect(stat(base)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('retries when the first attempt throws EBUSY (injected rm impl)', async () => {
    const fs = await import('node:fs/promises');
    const base = await mkdtemp(join(tmpdir(), 'lifecycle-rm-retry-'));
    await writeFile(join(base, 'a.txt'), 'x');
    let calls = 0;
    const impl = async (dir: string): Promise<void> => {
      calls += 1;
      if (calls === 1) {
        const err = new Error('EBUSY') as NodeJS.ErrnoException;
        err.code = 'EBUSY';
        throw err;
      }
      await fs.rm(dir, { recursive: true, force: true });
    };
    await rmrfWithRetry(base, { _rmImpl: impl, _retryDelayMs: 10 });
    expect(calls).toBe(2);
    await expect(stat(base)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('throws after exhausting retries', async () => {
    const impl = async (): Promise<void> => {
      const err = new Error('EBUSY') as NodeJS.ErrnoException;
      err.code = 'EBUSY';
      throw err;
    };
    let thrown = 0;
    try {
      await rmrfWithRetry('/nonexistent-path-for-test', { _rmImpl: impl, _retryDelayMs: 5 });
    } catch (err) {
      thrown = 1;
      expect((err as NodeJS.ErrnoException).code).toBe('EBUSY');
    }
    expect(thrown).toBe(1);
  });
});

describe('lifecycle.checkLeaks', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('reports empty residuals when no tracked pids', () => {
    expect(checkLeaks()).toEqual({ residuals: [] });
  });

  it('reports residuals when a tracked pid is still alive', async () => {
    const { pid, onExit } = spawnSleeper(60_000);
    trackPid(pid, { label: 'zombie-sleeper' });
    const report = checkLeaks();
    expect(report.residuals).toEqual([{ pid, label: 'zombie-sleeper' }]);
    await killTree(pid, { timeoutMs: 5_000 });
    await Promise.race([onExit, delay(2_000)]);
  });

  it('does NOT report residuals for dead tracked pids', async () => {
    const { pid, onExit } = spawnSleeper(30_000);
    trackPid(pid, { label: 'will-die' });
    await killTree(pid, { timeoutMs: 5_000 });
    await Promise.race([onExit, delay(2_000)]);
    trackPid(pid, { label: 'will-die' });
    expect(checkLeaks().residuals).toEqual([]);
  });

  it('supports injected isAlive predicate', () => {
    trackPid(99991, { label: 'synthetic' });
    const always = () => true;
    expect(checkLeaks(always).residuals).toEqual([{ pid: 99991, label: 'synthetic' }]);
    const never = () => false;
    expect(checkLeaks(never).residuals).toEqual([]);
  });
});

describe('parseWmicDescendants', () => {
  it('returns [] for empty input', () => {
    expect(parseWmicDescendants(1, '')).toEqual([]);
  });

  it('returns [] when no CSV rows match', () => {
    expect(parseWmicDescendants(9999, 'Node,HandleCount,Name\r\nA,1,foo')).toEqual([]);
  });

  it('walks a 3-deep parent→child chain', () => {
    const csv = [
      'Node,ParentProcessId,ProcessId',
      'H,100,200',
      'H,200,300',
      'H,300,400',
      'H,999,888',
    ].join('\r\n');
    const out = parseWmicDescendants(100, csv);
    expect(new Set(out)).toEqual(new Set([200, 300, 400]));
  });

  it('skips malformed lines and non-numeric pids', () => {
    const csv = ['Node,ParentProcessId,ProcessId', 'H,abc,def', 'short', 'H,10,20'].join('\r\n');
    expect(parseWmicDescendants(10, csv)).toEqual([20]);
  });

  it('handles cycles without infinite loop', () => {
    const csv = ['Node,ParentProcessId,ProcessId', 'H,1,2', 'H,2,1'].join('\r\n');
    const out = parseWmicDescendants(1, csv);
    expect(out.includes(2)).toBe(true);
    expect(out.length).toBeLessThan(10);
  });
});

describe('killTreeWindows (unit, injected deps)', () => {
  it('taskkills descendants until none remain alive', async () => {
    const killed: number[] = [];
    const taskkill = async (p: number): Promise<void> => {
      killed.push(p);
    };
    let calls = 0;
    const listDescendants = async (_p: number): Promise<number[]> => {
      calls += 1;
      if (calls === 1) return [100, 200];
      return [];
    };
    let aliveState = new Set<number>([42, 100, 200]);
    const isAlive = (p: number): boolean => aliveState.has(p);
    // Simulate kernel reaping after first loop iteration
    setTimeout(() => {
      aliveState = new Set();
    }, 0);
    let t = 0;
    const now = (): number => {
      t += 25;
      return t;
    };
    await killTreeWindows(42, 10_000, taskkill, listDescendants, isAlive, now);
    expect(killed).toContain(42);
  });

  it('exits the loop when deadline elapses', async () => {
    const taskkill = async (): Promise<void> => {};
    const listDescendants = async (): Promise<number[]> => [];
    const isAlive = (): boolean => true; // always alive
    let t = 0;
    const now = (): number => {
      t += 10_000;
      return t;
    };
    await killTreeWindows(1, 1, taskkill, listDescendants, isAlive, now);
  });

  it('skips re-killing the root when rootAlive is false but stragglers remain', async () => {
    const killed: number[] = [];
    let iter = 0;
    const taskkill = async (p: number): Promise<void> => {
      killed.push(p);
    };
    const listDescendants = async (): Promise<number[]> => {
      iter += 1;
      return iter === 1 ? [7001, 7002] : [];
    };
    let strCheck = 0;
    const isAlive = (p: number): boolean => {
      // Root stays dead from the start; stragglers alive on first call, dead after
      if (p === 42) return false;
      strCheck += 1;
      return strCheck <= 2;
    };
    let t = 0;
    const now = (): number => {
      t += 5;
      return t;
    };
    await killTreeWindows(42, 10_000, taskkill, listDescendants, isAlive, now);
    // The first taskkill hits root=42 unconditionally, then stragglers, but NOT root again.
    const rootKills = killed.filter((p) => p === 42).length;
    expect(rootKills).toBe(1);
    expect(killed).toContain(7001);
    expect(killed).toContain(7002);
  });
});

describe('killTreePosix (unit, injected deps)', () => {
  it('SIGTERM alone suffices when process exits quickly', async () => {
    const sent: NodeJS.Signals[] = [];
    const treeKill = async (_p: number, s: NodeJS.Signals): Promise<void> => {
      sent.push(s);
    };
    let alive = true;
    const isAlive = (): boolean => {
      const v = alive;
      alive = false;
      return v;
    };
    const now = (): number => 0;
    await killTreePosix(12345, 200, treeKill, isAlive, now);
    expect(sent).toEqual(['SIGTERM']);
  });

  it('escalates to SIGKILL when SIGTERM does not reap', async () => {
    const sent: NodeJS.Signals[] = [];
    const treeKill = async (_p: number, s: NodeJS.Signals): Promise<void> => {
      sent.push(s);
    };
    const isAlive = (): boolean => true; // never exits
    let t = 0;
    const now = (): number => {
      t += 10_000;
      return t;
    };
    await killTreePosix(12345, 200, treeKill, isAlive, now);
    expect(sent).toEqual(['SIGTERM', 'SIGKILL']);
  });
});

describe('killTree dispatch (injected platform)', () => {
  beforeEach(() => _resetRegistryForTests());

  it('routes to Windows path when _platform is win32', async () => {
    const taskkillCalls: number[] = [];
    await killTree(555, {
      _platform: 'win32',
      _taskkill: async (p) => {
        taskkillCalls.push(p);
      },
      _listDescendants: async () => [],
      _isAlive: () => false,
      _now: () => 0,
      timeoutMs: 100,
    });
    expect(taskkillCalls).toContain(555);
  });

  it('routes to POSIX path when _platform is linux', async () => {
    const treeKillCalls: NodeJS.Signals[] = [];
    await killTree(777, {
      _platform: 'linux',
      _treeKill: async (_p, s) => {
        treeKillCalls.push(s);
      },
      _isAlive: () => false,
      _now: () => 0,
      timeoutMs: 100,
    });
    expect(treeKillCalls).toEqual(['SIGTERM']);
  });

  it('removes pid from registry in the finally block', async () => {
    trackPid(8888, { label: 'registry-cleanup' });
    await killTree(8888, {
      _platform: 'linux',
      _treeKill: async () => {},
      _isAlive: () => false,
      _now: () => 0,
      timeoutMs: 50,
    });
    expect(listTracked()).toEqual([]);
  });
});

describe('teardownHttpProcess', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('returns early when POST /shutdown succeeds and process exits', async () => {
    trackPid(1111, { label: 'http' });
    const calls: string[] = [];
    await teardownHttpProcess(1111, {
      shutdownUrl: 'http://127.0.0.1:1/shutdown',
      shutdownMs: 100,
      _platform: 'linux',
      _isAlive: () => false,
      _now: () => 0,
      _fetch: async () => {
        calls.push('fetch');
        return { ok: true };
      },
      _sigterm: () => calls.push('sigterm'),
      killOpts: {
        _platform: 'linux',
        _treeKill: async () => {
          calls.push('kill');
        },
        _isAlive: () => false,
        _now: () => 0,
      },
    });
    expect(calls).toEqual(['fetch']);
    expect(listTracked()).toEqual([]);
  });

  it('falls through to SIGTERM on POSIX when shutdown fails', async () => {
    const calls: string[] = [];
    let aliveAfterSigterm = false;
    let t = 0;
    const advancingNow = (): number => {
      t += 200;
      return t;
    };
    await teardownHttpProcess(2222, {
      shutdownUrl: 'http://127.0.0.1:1/shutdown',
      shutdownMs: 50,
      sigtermMs: 50,
      _platform: 'linux',
      _isAlive: (p: number) => {
        if (p === 2222) return !aliveAfterSigterm ? true : false;
        return false;
      },
      _now: advancingNow,
      _fetch: async () => {
        calls.push('fetch-fail');
        throw new Error('boom');
      },
      _sigterm: () => {
        calls.push('sigterm');
        aliveAfterSigterm = true;
      },
      killOpts: {
        _platform: 'linux',
        _treeKill: async () => {
          calls.push('kill');
        },
        _isAlive: () => false,
        _now: advancingNow,
      },
    });
    expect(calls).toContain('fetch-fail');
    expect(calls).toContain('sigterm');
  });

  it('escalates to killTree when SIGTERM does not reap', async () => {
    const calls: string[] = [];
    let t = 0;
    const advancingNow = (): number => {
      t += 1_000;
      return t;
    };
    await teardownHttpProcess(3333, {
      _platform: 'linux',
      _isAlive: () => true, // never dies under SIGTERM
      _now: advancingNow,
      sigtermMs: 10,
      _sigterm: () => calls.push('sigterm'),
      killOpts: {
        _platform: 'linux',
        _treeKill: async (_p, s) => {
          calls.push(`treekill-${s}`);
        },
        _isAlive: () => false,
        _now: advancingNow,
      },
    });
    expect(calls).toContain('sigterm');
    expect(calls.some((c) => c.startsWith('treekill-'))).toBe(true);
  });

  it('swallows sigterm throw without crashing', async () => {
    await teardownHttpProcess(4444, {
      _platform: 'linux',
      _isAlive: () => false,
      _now: () => 0,
      _sigterm: () => {
        throw new Error('ESRCH');
      },
      killOpts: {
        _platform: 'linux',
        _treeKill: async () => {},
        _isAlive: () => false,
        _now: () => 0,
      },
    });
  });

  it('skips SIGTERM path on win32 platform', async () => {
    const calls: string[] = [];
    await teardownHttpProcess(5555, {
      _platform: 'win32',
      _isAlive: () => false,
      _now: () => 0,
      _sigterm: () => {
        calls.push('sigterm');
      },
      killOpts: {
        _platform: 'win32',
        _taskkill: async () => {
          calls.push('taskkill');
        },
        _listDescendants: async () => [],
        _isAlive: () => false,
        _now: () => 0,
      },
    });
    expect(calls).not.toContain('sigterm');
    expect(calls).toContain('taskkill');
  });

  it('returns early when non-ok response exits the process', async () => {
    trackPid(6666, { label: 'non-ok' });
    await teardownHttpProcess(6666, {
      shutdownUrl: 'http://127.0.0.1:1/shutdown',
      shutdownMs: 50,
      _platform: 'linux',
      _isAlive: () => false,
      _now: () => 0,
      _fetch: async () => ({ ok: false }),
      killOpts: {
        _platform: 'linux',
        _treeKill: async () => {},
        _isAlive: () => false,
        _now: () => 0,
      },
    });
    expect(listTracked()).toEqual([]);
  });
});

describe('_cleanupForTests', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('no-ops when nothing is tracked', () => {
    _cleanupForTests('linux', () => true);
  });

  it('skips dead pids', () => {
    trackPid(7777, { label: 'dead' });
    _cleanupForTests('linux', () => false);
    // did not throw
  });

  it('on POSIX, swallows process.kill errors', () => {
    trackPid(8888, { label: 'posix' });
    const orig = process.kill;
    (process as unknown as { kill: typeof process.kill }).kill = () => {
      throw new Error('ESRCH');
    };
    try {
      _cleanupForTests('linux', () => true);
    } finally {
      (process as unknown as { kill: typeof process.kill }).kill = orig;
    }
  });
});

describe('rmrfWithRetry (real fs, no injection)', () => {
  it('uses the default fs.rm when no injection is supplied', async () => {
    const base = await mkdtemp(join(tmpdir(), 'lifecycle-rm-default-'));
    await writeFile(join(base, 'x.txt'), 'y');
    await rmrfWithRetry(base);
    await expect(stat(base)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('process hooks (exported for coverage)', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('_hookCleanup runs against real registry without throwing', () => {
    _hookCleanup();
  });

  it('_onSigint invokes cleanup then exit(130) with injected hooks', () => {
    let cleanupCalls = 0;
    let exitCode = -1;
    _onSigint(
      () => {
        cleanupCalls += 1;
      },
      (code) => {
        exitCode = code;
      },
    );
    expect(cleanupCalls).toBe(1);
    expect(exitCode).toBe(130);
  });

  it('_onSigint uses default exit hook when only cleanup is provided', () => {
    const origExit = process.exit;
    let observedCode: unknown = null;
    (process as unknown as { exit: (code?: number) => never }).exit = ((code?: number) => {
      observedCode = code;
      return undefined as unknown as never;
    }) as typeof process.exit;
    try {
      _onSigint(() => {});
    } finally {
      (process as unknown as { exit: typeof process.exit }).exit = origExit;
    }
    expect(observedCode).toBe(130);
  });
});

describe('killTree default POSIX path (no _treeKill injection)', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('calls the default treeKillDefault wrapper when _treeKill is omitted', async () => {
    // Advance time rapidly so waitUntilGone exits.
    let t = 0;
    const fastNow = (): number => {
      t += 10_000;
      return t;
    };
    await killTree(99999999, {
      _platform: 'linux',
      _isAlive: () => false,
      _now: fastNow,
      timeoutMs: 50,
    });
    // tree-kill against a non-existent pid is a no-op; we just covered the wrapper.
  });
});

describe('_cleanupForTests win32 branch', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('spawns taskkill when platform is win32 and pid is "alive"', () => {
    trackPid(99999998, { label: 'win-branch' });
    _cleanupForTests('win32', () => true);
    // Does not throw; taskkill against a non-existent pid returns an error but we unref and ignore.
  });
});

describe('teardownHttpProcess default _fetch/_sigterm lambdas', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('exercises the default fetch wrapper when _fetch is omitted', async () => {
    // Unreachable URL → default fetch throws → falls through. On 'linux'
    // platform stub, default _sigterm (process.kill SIGTERM) runs against a
    // non-existent pid and catches ESRCH. We don't inject _sigterm so the
    // default lambda is covered.
    let t = 0;
    const fastNow = (): number => {
      t += 10_000;
      return t;
    };
    await teardownHttpProcess(99999997, {
      shutdownUrl: 'http://127.0.0.1:1/unreachable',
      shutdownMs: 50,
      sigtermMs: 50,
      _platform: 'linux',
      _isAlive: () => false,
      _now: fastNow,
      killOpts: {
        _platform: 'linux',
        _treeKill: async () => {},
        _isAlive: () => false,
        _now: fastNow,
      },
    });
  });

  it('exercises default _sigterm lambda (ESRCH is swallowed) on POSIX path', async () => {
    let t = 0;
    const fastNow = (): number => {
      t += 10_000;
      return t;
    };
    let isAliveCalls = 0;
    await teardownHttpProcess(99999995, {
      _platform: 'linux',
      _isAlive: () => {
        isAliveCalls += 1;
        // True once → triggers sigterm path; then false so waitUntilGone returns.
        return isAliveCalls === 1;
      },
      _now: fastNow,
      sigtermMs: 50,
      killOpts: {
        _platform: 'linux',
        _treeKill: async () => {},
        _isAlive: () => false,
        _now: fastNow,
      },
    });
    expect(isAliveCalls).toBeGreaterThanOrEqual(1);
  });

  it('exercises all default opt fallbacks (?? defaults) without injection', async () => {
    // Call teardownHttpProcess with ONLY shutdownUrl. All other options default:
    //   platform → process.platform, isAlive → isAliveDefault, now → Date.now,
    //   fetch → global fetch, sigterm → process.kill SIGTERM, killOpts → {}.
    // Target: a pid that is definitely dead so isAliveDefault returns false
    // immediately and waitUntilGone exits on first poll.
    // Use an unreachable URL so default fetch rejects quickly.
    // On Windows this skips the sigterm branch; killTree also sees dead pid.
    await teardownHttpProcess(99999990, {
      shutdownUrl: 'http://127.0.0.1:1/nope',
      shutdownMs: 50,
      sigtermMs: 50,
    });
  });

  it('triggers the abort timer when fetch hangs past shutdownMs', async () => {
    let t = 0;
    const fastNow = (): number => {
      t += 10_000;
      return t;
    };
    let aborted = false;
    const hangingFetch = async (
      _u: string,
      i: { method: string; signal: AbortSignal },
    ): Promise<{ ok: boolean }> => {
      return new Promise((_resolve, reject) => {
        i.signal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('aborted'));
        });
      });
    };
    await teardownHttpProcess(99999994, {
      shutdownUrl: 'http://127.0.0.1:1/hang',
      shutdownMs: 30,
      _platform: 'linux',
      _isAlive: () => false,
      _now: fastNow,
      _fetch: hangingFetch,
      killOpts: {
        _platform: 'linux',
        _treeKill: async () => {},
        _isAlive: () => false,
        _now: fastNow,
      },
    });
    expect(aborted).toBe(true);
  });
});

describe('isAliveDefault branches (via default killTree path)', () => {
  beforeEach(() => _resetRegistryForTests());
  afterEach(() => _resetRegistryForTests());

  it('reports live status for the current process pid (covers the return-true branch)', () => {
    // Default isAlive via checkLeaks against our own pid.
    trackPid(process.pid, { label: 'self' });
    const residuals = checkLeaks().residuals;
    expect(residuals.map((r) => r.pid)).toContain(process.pid);
    // cleanup: untrack to avoid killing ourselves at process exit
    untrackPid(process.pid);
  });

  it('reports not-alive for a never-used high pid (ESRCH path)', () => {
    trackPid(99999996, { label: 'ghost' });
    const residuals = checkLeaks().residuals;
    expect(residuals.find((r) => r.pid === 99999996)).toBeUndefined();
  });
});
