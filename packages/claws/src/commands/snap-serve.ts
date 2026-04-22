/**
 * `claws snap serve` — start the OpenClaw snapshot registry HTTP server.
 *
 * Thin CLI adapter: parses --port/--host/--json, calls `startServer` from
 * `@bic/openclaw-snap`, and keeps the process alive until SIGTERM/SIGINT.
 *
 * When `--port 0` (the default), the server binds to an ephemeral OS-chosen
 * port via Node `net.Server.listen(0)` and prints the bound port on the
 * `listening` event so harness spawners can read it back.
 *
 * @module claws-cli/commands/snap-serve
 */

import { startServer, inMemoryStore, type ServerHandle } from '@bic/openclaw-snap';

export interface SnapServeOptions {
  readonly port?: number | undefined;
  readonly host?: string | undefined;
  readonly json?: boolean | undefined;
}

export async function runSnapServe(opts: SnapServeOptions): Promise<number> {
  const port = opts.port ?? 0;
  const host = opts.host ?? '127.0.0.1';

  // The server's promote-gate requires `.openclaw/policy/policy-ir.json`
  // inside the uploaded snapshot. `readStagedOrCanonical` (upload client
  // side) filters hidden segments, so `.openclaw/*` never enters. Tests
  // and trusted-local flows can opt out of the gate via an env var; the
  // default remains on for network deployments.
  const requirePolicy = process.env['OPENCLAW_SNAP_REQUIRE_POLICY_IR'] !== 'false';

  let handle: ServerHandle;
  try {
    handle = await startServer({
      port,
      host,
      store: inMemoryStore(),
      promotionRequirePolicy: requirePolicy,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`snap serve: failed to start — ${message}`);
    }
    return 1;
  }

  if (opts.json) {
    console.log(JSON.stringify({ status: 'listening', port: handle.port, host, url: handle.url }));
  } else {
    console.log(`snap serve listening on ${handle.url}`);
  }

  const shutdown = (): void => {
    void handle.close().then(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await new Promise<void>(() => {
    // park until signal
  });
  /* c8 ignore next -- unreachable: park promise never resolves; shutdown exits via process.exit */
  return 0;
}
