/**
 * test/e2e/harness/port-allocator — ephemeral port reservation.
 *
 * Wraps Node `net.Server.listen(0)` + `address()` to obtain an OS-chosen
 * port the caller can hand to a spawned child process. The server is
 * closed before returning, leaving a standard TOCTOU window between
 * release and real consumption: another process on the same host could
 * bind the same port. For a single-machine test harness this is
 * acceptable, and pulse 35 parallel-safety tests demonstrate 8+
 * concurrent reservations without collision in practice.
 *
 * Usage:
 *   const { port, release } = await reservePort();
 *   spawn(bin, ['--port', String(port)]);
 *   // release() is a no-op kept for API symmetry — the listener is
 *   // already closed before reservePort resolves.
 *
 * @module test/e2e/harness/port-allocator
 */

import { createServer } from 'node:net';

export interface PortReservation {
  readonly port: number;
  readonly release: () => void;
}

export function reservePort(): Promise<PortReservation> {
  return new Promise<PortReservation>((resolve) => {
    const server = createServer();
    server.once('listening', () => {
      const addr = server.address() as { port: number };
      const port = addr.port;
      server.close(() => {
        resolve({ port, release: (): void => { /* no-op */ } });
      });
    });
    server.listen(0, '127.0.0.1');
  });
}
