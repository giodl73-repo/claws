/**
 * Sidecar crash survival — plugin continues to decide after snap kill.
 *
 * Runs under `track: 'local-dir'` so `harness.snap.kill()` is meaningful
 * (real child process bound to an ephemeral port via snap-runner). Two
 * invariants per pulse-45 deliverable D6:
 *   1. kill() mid-scenario; plugin continues to decide based on last-loaded
 *      IR under InProcessAdapter (adapter is in-process, so decisions do not
 *      depend on the snap child).
 *   2. snap.restart() brings /v1/healthz back to 200 and decisions resume.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { startHarness, type Harness } from './_lib/start-harness.ts';

const live: Harness[] = [];
afterEach(async () => {
  while (live.length > 0) {
    const h = live.pop()!;
    await h.shutdown();
  }
});

describe('sidecar-crash-survival (local-dir track)', () => {
  it('snap.kill() mid-scenario; plugin continues to decide under InProcessAdapter', async () => {
    const harness = await startHarness({
      fixture: 'allow-r1-public',
      track: 'local-dir',
    });
    live.push(harness);

    // Sanity: a decision lands before kill.
    const before = await harness.invokeTool('r1-public-read', {
      path: 'public/doc.txt',
    });
    expect(before.action).toBe('allow');

    // Kill the snap child. The InProcessAdapter's decision path does not
    // depend on the snap server, so subsequent invocations still resolve.
    expect(harness.snap).not.toBeNull();
    await harness.snap!.kill();

    const after = await harness.invokeTool('r1-public-read', {
      path: 'public/after-kill.txt',
    });
    expect(after.action).toBe('allow');
    expect(after.status).toBe('allowed');
  });

  it('snap.restart() returns /v1/healthz 200 and decisions resume', async () => {
    const harness = await startHarness({
      fixture: 'allow-r1-public',
      track: 'local-dir',
      scenarioId: 'sidecar-restart',
    });
    live.push(harness);

    expect(harness.snap).not.toBeNull();
    const snap = harness.snap!;
    const originalPort = snap.port;

    await snap.restart();

    // Restart re-binds to (possibly) a different ephemeral port and reopens
    // /v1/healthz. Ports should be non-zero; the URL should answer 200.
    expect(snap.port).toBeGreaterThan(0);
    void originalPort;

    const health = await fetch(`${snap.url}/v1/healthz`);
    expect(health.status).toBe(200);

    // And the full decision flow still works after restart.
    const result = await harness.invokeTool('r1-public-read', {
      path: 'public/after-restart.txt',
    });
    expect(result.action).toBe('allow');
  });
});
