import { afterEach, describe, expect, it } from 'vitest';
import { startSnap, type SnapHandle } from '../snap-runner.ts';

const handles: SnapHandle[] = [];

afterEach(async () => {
  for (const h of handles.splice(0)) {
    try {
      await h.kill();
    } catch {
      // best-effort teardown
    }
  }
});

async function start(): Promise<SnapHandle> {
  const h = await startSnap({ policyDir: '/tmp/__snap-runner-lifecycle', healthcheckTimeoutMs: 8_000 });
  handles.push(h);
  return h;
}

describe('snap-runner lifecycle (pulse 35 D4)', () => {
  it('spawn + healthz 200 (baseline)', async () => {
    const h = await start();
    expect(h.pid).toBeGreaterThan(0);
    expect(h.port).toBeGreaterThan(1024);
    expect(h.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    const res = await fetch(`${h.url}/v1/healthz`);
    expect(res.status).toBe(200);
    await res.text();
    expect(h.startupMs).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it('kill() terminates and /v1/healthz refuses thereafter', async () => {
    const h = await start();
    const res1 = await fetch(`${h.url}/v1/healthz`);
    expect(res1.status).toBe(200);
    await res1.text();

    await h.kill();

    // After kill the endpoint must not be reachable. fetch either rejects
    // (connection refused) or returns a non-2xx; both are acceptable.
    let refused = false;
    try {
      const res2 = await fetch(`${h.url}/v1/healthz`);
      refused = !res2.ok;
      await res2.text().catch(() => { /* ignore */ });
    } catch {
      refused = true;
    }
    expect(refused).toBe(true);
  }, 30_000);

  it('restart() rebinds and serves 200 again (SIGTERM/SIGKILL escalation path)', async () => {
    const h = await start();
    const firstPort = h.port;
    await h.restart();
    // Second spawn must be healthy again
    const res = await fetch(`${h.url}/v1/healthz`);
    expect(res.status).toBe(200);
    await res.text();
    expect(h.port).toBeGreaterThan(1024);
    // Port may or may not be reused by the OS; do not assert uniqueness.
    expect(typeof firstPort).toBe('number');
  }, 45_000);

  it('teardown via SIGTERM->SIGKILL when /shutdown is absent', async () => {
    // The snap server does not implement POST /shutdown, so the teardown
    // path used by kill() falls back to SIGTERM and (if needed) SIGKILL.
    // Success == the process is actually gone and the port stops serving.
    const h = await start();
    const pid = h.pid;
    const beforeRes = await fetch(`${h.url}/v1/healthz`);
    expect(beforeRes.status).toBe(200);
    await beforeRes.text();

    await h.kill();

    // Use a process.kill(pid, 0) probe — ESRCH means gone, EPERM means
    // still there but unreachable (we accept both as "not our problem"
    // since the kill path already escalated).
    let gone = false;
    try {
      process.kill(pid, 0);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ESRCH') gone = true;
    }
    expect(gone).toBe(true);
  }, 30_000);
});
