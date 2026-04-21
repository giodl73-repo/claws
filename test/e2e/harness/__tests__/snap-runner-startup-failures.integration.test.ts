import { describe, expect, it } from 'vitest';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startSnap } from '../snap-runner.ts';

/**
 * SC-03 F-10 observability: when `claws snap serve` fails to start, the
 * harness must surface stderr and route the appropriate rejection. We
 * drive the three spawnChild error branches — listening-line timeout,
 * child-exits-before-listening, and healthz-timeout-after-listening —
 * by pointing snap-runner at a tmp script via `binOverride`.
 *
 * The override option existed only to DI these failure paths; real
 * callers (pulse 42, 47, acceptance) never set it.
 */

async function withTmpScript<T>(
  source: string,
  fn: (scriptPath: string) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'snap-runner-fail-'));
  const script = join(dir, 'fake-claws.js');
  await writeFile(script, source, 'utf8');
  try {
    return await fn(script);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('snap-runner startup failures (pulse 35, SC-03 F-10)', () => {
  it('rejects when the child exits before printing a listening line', async () => {
    // A "claws binary" that immediately exits with code 42 and writes a
    // known string to stderr. snap-runner's onExit branch should fire
    // and surface the stderr + exit code in the error message.
    const source = `
      process.stderr.write('BOOM: fake startup error\\n');
      process.exit(42);
    `;
    await withTmpScript(source, async (script) => {
      await expect(
        startSnap({
          policyDir: '/tmp/__fail-exit',
          binOverride: script,
          listeningTimeoutMs: 5_000,
        }),
      ).rejects.toThrow(/exited before listening/);
    });
  }, 15_000);

  it('rejects when the child never prints a listening line within the timeout', async () => {
    // A "claws binary" that stays alive forever but never prints JSON.
    // snap-runner's setTimeout → reject path should fire after
    // listeningTimeoutMs, kill the child, and surface captured stderr.
    const source = `
      process.stderr.write('still booting...\\n');
      setInterval(() => {}, 60000);
    `;
    await withTmpScript(source, async (script) => {
      await expect(
        startSnap({
          policyDir: '/tmp/__fail-silent',
          binOverride: script,
          listeningTimeoutMs: 1_000,
        }),
      ).rejects.toThrow(/no listening line within 1000ms/);
    });
  }, 15_000);

  it('ignores non-JSON prose on stdout before the listening envelope', async () => {
    // The real `claws` process may emit prose banners or warnings on
    // stdout before/around the listening JSON. snap-runner's onStdout
    // branch `if (parsed)` must return false for those and keep
    // reading. We inject prose, then a valid envelope, then assert the
    // handle came up healthy.
    const source = `
      const http = require('http');
      process.stdout.write('starting up (ignore me)\\n');
      process.stdout.write('\\n'); // empty line
      const srv = http.createServer((req, res) => {
        if (req.url === '/v1/healthz') { res.writeHead(200); res.end('ok'); return; }
        res.writeHead(404); res.end();
      });
      srv.listen(0, '127.0.0.1', () => {
        const port = srv.address().port;
        process.stdout.write(
          JSON.stringify({ status: 'listening', port, host: '127.0.0.1', url: 'http://127.0.0.1:' + port }) + '\\n',
        );
      });
    `;
    await withTmpScript(source, async (script) => {
      const { startSnap } = await import('../snap-runner.ts');
      const h = await startSnap({
        policyDir: '/tmp/__prose',
        binOverride: script,
        healthcheckTimeoutMs: 5_000,
        listeningTimeoutMs: 5_000,
      });
      try {
        const res = await fetch(`${h.url}/v1/healthz`);
        expect(res.status).toBe(200);
        await res.text();
      } finally {
        await h.kill();
      }
    });
  }, 15_000);

  it('rejects when the child prints a listening line but never serves healthz', async () => {
    // A "claws binary" that prints a valid listening envelope pointing
    // at a port NOTHING listens on. This exercises the pollHealthz
    // timeout path: the parse succeeds, trackPid fires, but pollHealthz
    // throws after healthcheckTimeoutMs and the catch branch in
    // startInternal calls untrackPid + SIGKILL.
    const source = `
      const http = require('http');
      // Bind then immediately close so the advertised port is dead.
      const srv = http.createServer();
      srv.listen(0, '127.0.0.1', () => {
        const port = srv.address().port;
        srv.close(() => {
          process.stdout.write(
            JSON.stringify({ status: 'listening', port, host: '127.0.0.1', url: 'http://127.0.0.1:' + port }) + '\\n',
          );
          setInterval(() => {}, 60000);
        });
      });
    `;
    await withTmpScript(source, async (script) => {
      await expect(
        startSnap({
          policyDir: '/tmp/__fail-healthz',
          binOverride: script,
          listeningTimeoutMs: 5_000,
          healthcheckTimeoutMs: 1_000,
        }),
      ).rejects.toThrow(/\/v1\/healthz did not return 200/);
    });
  }, 15_000);
});
