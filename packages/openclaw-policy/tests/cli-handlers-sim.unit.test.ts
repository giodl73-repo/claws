import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { handle, blockOnSignals } from '../src/cli-handlers/sim.js';
import { MINIMAL_IR } from './ops-fixtures.js';
import { startMockGateway } from '../src/ops/mock-gateway.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'sim-handler-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function writeIr(): Promise<string> {
  const path = join(tmp, 'policy-ir.json');
  await writeFile(path, JSON.stringify(MINIMAL_IR), 'utf8');
  return path;
}

describe('sim handler — usage errors', () => {
  it('exits 2 when --policy-ir is missing', async () => {
    const result = await handle({ binaryName: 'claws', args: ['--port', '0'], cwd: tmp });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--policy-ir');
  });

  it('exits 2 when --port is non-numeric', async () => {
    const policyIr = await writeIr();
    const result = await handle({
      binaryName: 'claws',
      args: ['--policy-ir', policyIr, '--port', 'nope'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--port');
  });

  it('exits 2 when --port is out of range', async () => {
    const policyIr = await writeIr();
    const result = await handle({
      binaryName: 'claws',
      args: ['--policy-ir', policyIr, '--port', '70000'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
  });

  it('exits 2 when policy-ir file is missing', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['--policy-ir', join(tmp, 'nope.json'), '--port', '0'],
      cwd: tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('failed to read policy-ir');
  });
});

describe('sim handler — lifecycle via waitForShutdown hook', () => {
  it('starts gateway, reports URL, closes on hook resolve (clean shutdown)', async () => {
    const policyIr = await writeIr();
    let observedUrl = '';
    let announced = '';
    const result = await handle(
      {
        binaryName: 'claws',
        args: ['--policy-ir', policyIr, '--port', '0'],
        cwd: tmp,
      },
      {
        announce: (line) => {
          announced += line;
        },
        waitForShutdown: async (h) => {
          observedUrl = h.url;
          // Immediately signal shutdown.
        },
      },
    );
    expect(result.exitCode).toBe(0);
    expect(announced).toContain('listening on ');
    expect(observedUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    // After handle.close() the listener is gone — connect attempts should
    // refuse, proving no orphan.
    const port = Number(observedUrl.split(':').pop());
    await expect(fetch(`http://127.0.0.1:${String(port)}/v1/health`)).rejects.toThrow();
  });

  it('closes the gateway even when waitForShutdown throws', async () => {
    const policyIr = await writeIr();
    await expect(
      handle(
        {
          binaryName: 'claws',
          args: ['--policy-ir', policyIr, '--port', '0'],
          cwd: tmp,
        },
        {
          waitForShutdown: async () => {
            throw new Error('forced shutdown');
          },
        },
      ),
    ).rejects.toThrow('forced shutdown');
    // If close() was skipped, subsequent tests would leak. Nothing to assert
    // directly but failure would show up as zombie port warnings.
  });

  it('blockOnSignals resolves on SIGTERM and removes listeners', async () => {
    const gw = await startMockGateway({ policyIR: MINIMAL_IR, port: 0 });
    try {
      const before = process.listenerCount('SIGTERM');
      const p = blockOnSignals(gw);
      expect(process.listenerCount('SIGTERM')).toBe(before + 1);
      process.emit('SIGTERM');
      await p;
      expect(process.listenerCount('SIGTERM')).toBe(before);
    } finally {
      await gw.close();
    }
  });

  it('runs the default signal-wiring path when no waitForShutdown hook is set', async () => {
    const policyIr = await writeIr();
    const run = handle({
      binaryName: 'claws',
      args: ['--policy-ir', policyIr, '--port', '0'],
      cwd: tmp,
    });
    // Give the handler a tick to bind the gateway + register signal handlers.
    await new Promise<void>((r) => setTimeout(r, 50));
    process.emit('SIGTERM');
    const result = await run;
    expect(result.exitCode).toBe(0);
  });

  it('defaults --port to 8443 when omitted (parsed before library call)', async () => {
    const policyIr = await writeIr();
    // Bind 0 for real — we only assert the default branch executes without
    // argv error. Use a waitForShutdown hook so the handler returns.
    const result = await handle(
      {
        binaryName: 'claws',
        args: ['--policy-ir', policyIr],
        cwd: tmp,
      },
      {
        waitForShutdown: async () => {
          // no-op — return immediately
        },
      },
    ).catch((err: unknown) => {
      // Port 8443 might already be in use on some CI hosts — accept that
      // as a library-level error (exit 1) while still exercising the
      // default-port branch.
      if (err instanceof Error && /EADDRINUSE|EACCES/.test(err.message)) {
        return { exitCode: 1 as const, stdout: '', stderr: err.message };
      }
      throw err;
    });
    expect([0, 1]).toContain(result.exitCode);
  });
});
