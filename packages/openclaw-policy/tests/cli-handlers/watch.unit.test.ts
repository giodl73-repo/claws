import { describe, it, expect } from 'vitest';

import { handle } from '../../src/cli-handlers/watch.js';
import type { WatchHandle } from '../../src/types/index.js';

describe('policy watch handler', () => {
  it('arms the watcher on the supplied workspace and stops cleanly on abort', async () => {
    const controller = new AbortController();
    let closed = false;
    let factoryCalledWith: { workspaceRoot: string; debounceMs: number } | null = null;
    const handleStub: WatchHandle = {
      async close() {
        closed = true;
      },
    };

    const run = handle(
      { binaryName: 'claws', args: ['--workspace', '/ws'], cwd: '/cwd' },
      { signal: controller.signal },
      (opts) => {
        factoryCalledWith = opts;
        return handleStub;
      },
    );

    queueMicrotask(() => controller.abort());
    const result = await run;

    expect(factoryCalledWith).toEqual({ workspaceRoot: '/ws', debounceMs: 300 });
    expect(closed).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('stopped (/ws)');
  });

  it('invokes onArmed once the watcher is created', async () => {
    const controller = new AbortController();
    controller.abort();
    const seen: string[] = [];
    await handle(
      { binaryName: 'claws', args: [], cwd: '/fallback' },
      {
        signal: controller.signal,
        onArmed: (ws) => seen.push(ws),
      },
      () => ({ async close() {} }),
    );
    expect(seen).toEqual(['/fallback']);
  });

  it('returns exit 2 when no workspace can be resolved', async () => {
    const result = await handle(
      { binaryName: 'claws', args: ['--workspace', ''], cwd: '' },
      { signal: new AbortController().signal },
      () => ({ async close() {} }),
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('workspace path required');
  });

  it('returns exit 1 if the factory throws (library init failure)', async () => {
    const controller = new AbortController();
    const result = await handle(
      { binaryName: 'claws', args: ['--workspace', '/ws'], cwd: '/cwd' },
      { signal: controller.signal },
      () => {
        throw new Error('chokidar init failed');
      },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('chokidar init failed');
  });

  it('resolves immediately when the supplied signal is already aborted and still invokes close', async () => {
    const controller = new AbortController();
    controller.abort();
    let closed = false;
    const result = await handle(
      { binaryName: 'claws', args: ['--workspace', '/ws'], cwd: '/cwd' },
      { signal: controller.signal },
      () => ({
        async close() {
          closed = true;
        },
      }),
    );
    expect(closed).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('falls back to process SIGINT when no signal is supplied', async () => {
    let closed = false;
    const run = handle(
      { binaryName: 'claws', args: ['--workspace', '/ws'], cwd: '/cwd' },
      {},
      () => ({
        async close() {
          closed = true;
        },
      }),
    );
    // Give the handler a tick to register the SIGINT listener before firing.
    await new Promise((resolve) => setImmediate(resolve));
    process.emit('SIGINT');
    const result = await run;
    expect(closed).toBe(true);
    expect(result.exitCode).toBe(0);
  });
});
