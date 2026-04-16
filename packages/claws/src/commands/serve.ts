/**
 * Thin CLI adapter for `claws serve`.
 *
 * All server logic lives in @bic/claws-serve.
 * This module only parses flags and calls startServer().
 */

import { startServer, resolvePort, type ServerOptions } from '@bic/claws-serve';

export interface ServeOpts {
  port?: number | undefined;
  host?: string | undefined;
  noWs?: boolean | undefined;
  json?: boolean | undefined;
}

export async function runServe(opts: ServeOpts): Promise<number> {
  const serverOpts: ServerOptions = {
    port: opts.port,
    host: opts.host,
    noWs: opts.noWs,
  };

  const port = resolvePort(serverOpts);
  const host = serverOpts.host ?? '127.0.0.1';

  try {
    const { server } = startServer(serverOpts);

    server.on('listening', () => {
      if (opts.json) {
        console.log(JSON.stringify({ status: 'running', port, host, ws: !opts.noWs }));
      } else {
        const wsStatus = opts.noWs ? ' (WebSocket disabled)' : '';
        console.log(`claws serve running on http://${host}:${port}${wsStatus}`);
      }
    });

    // Keep alive until SIGTERM/SIGINT (graceful shutdown registered by startServer)
    await new Promise<void>((resolve) => {
      server.on('close', resolve);
    });

    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`Error starting server: ${message}`);
    }
    return 1;
  }
}
