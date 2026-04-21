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

async function startN(n: number): Promise<SnapHandle[]> {
  const started = await Promise.all(
    Array.from({ length: n }, () =>
      startSnap({ policyDir: '/tmp/__parallel-port', healthcheckTimeoutMs: 10_000 }),
    ),
  );
  handles.push(...started);
  return started;
}

describe('parallel port allocation (pulse 35 D5, SC-01 F-03)', () => {
  it('8 concurrent startSnap → 8 distinct ports all serving /v1/healthz', async () => {
    const eight = await startN(8);
    const ports = eight.map((h) => h.port);
    const unique = new Set(ports);
    expect(unique.size).toBe(ports.length);
    // Verify each is actually responsive to guarantee the read-back port
    // is the one the server is bound to (not a stale reservation).
    await Promise.all(
      eight.map(async (h) => {
        const res = await fetch(`${h.url}/v1/healthz`);
        expect(res.status).toBe(200);
        await res.text();
      }),
    );
  }, 60_000);

  const slowEnabled = process.env['SLOW'] === '1';
  (slowEnabled ? it : it.skip)(
    '16 concurrent startSnap under load (gated on SLOW=1)',
    async () => {
      const sixteen = await startN(16);
      const ports = sixteen.map((h) => h.port);
      expect(new Set(ports).size).toBe(ports.length);
    },
    120_000,
  );
});
