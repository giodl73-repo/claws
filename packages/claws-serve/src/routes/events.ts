/**
 * GET /api/events — SSE subscription endpoint.
 *
 * Sets SSE headers, flushes them immediately so reverse proxies don't buffer,
 * sends an initial `connected` event with the current sequence so clients can
 * anchor gap detection (P-275), subscribes to the EventStream for future
 * broadcasts, and cleans up on socket close.
 *
 * Gateway-eng note: the broadcast path is non-blocking — a client whose
 * write fails is evicted via `EventStream.broadcast` without propagating
 * back into the server event loop.
 *
 * @module claws-serve/routes/events
 */

import { Router, type Request, type Response } from 'express';
import type { EventStream, ClientWriter } from '../sse/event-stream.js';

/**
 * Attach the `GET /api/events` handler onto an events-prefix router.
 *
 * The caller mounts the returned router at `/api/events`; this handler
 * responds to `GET /` (i.e. the exact `/api/events` URL).
 */
export function eventsRouter(stream: EventStream): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response): void => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(200);
    res.flushHeaders();

    const writer: ClientWriter = {
      write(frame: string): boolean {
        if (res.writableEnded) return false;
        return res.write(frame);
      },
    };

    const unsubscribe = stream.subscribe(writer);

    // Anchor event — lets the client record the server's current sequence
    // so it can detect gaps on reconnect. Uses `broadcastConnected` so the
    // payload's `sequence` field is allocated atomically with the envelope,
    // closing the race with external broadcasters (e.g., the
    // CompilerEventBus → SSE bridge) that can fire between a
    // `currentSequence + 1` read and the enclosing broadcast.
    stream.broadcastConnected(new Date().toISOString());

    const cleanup = (): void => {
      unsubscribe();
      if (!res.writableEnded) {
        res.end();
      }
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
  });

  return router;
}
