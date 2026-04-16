/**
 * WebSocket event stream — 7 governance event types with JSON serialization,
 * client management, and Origin validation.
 *
 * Current-state-only: no replay buffer. Clients that reconnect receive
 * only future events.
 *
 * @module claws-serve/ws/events
 */

import type { IncomingMessage } from 'node:http';
import type { WebSocket, WebSocketServer } from 'ws';

/**
 * The 7 governance event types pushed to connected editors.
 */
export type WsEventType =
  | 'compile:start'
  | 'compile:complete'
  | 'diagnostic:update'
  | 'tension:detected'
  | 'tension:resolved'
  | 'snapshot:saved'
  | 'ir:invalidated';

/**
 * Wire format for a WebSocket governance event.
 */
export interface WsEvent {
  readonly type: WsEventType;
  readonly timestamp: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Serialize a WsEvent to JSON string.
 */
export function serializeEvent(event: WsEvent): string {
  return JSON.stringify(event);
}

/**
 * Create a WsEvent with the current timestamp.
 */
export function createEvent(type: WsEventType, payload: Record<string, unknown> = {}): WsEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    payload,
  };
}

/**
 * Validate Origin header for WebSocket upgrade requests.
 *
 * When `allowedOrigins` is provided, the origin must match one of the entries
 * (exact match on the full origin string, e.g. "http://localhost:3000").
 * This takes precedence regardless of bind address.
 *
 * When `allowedOrigins` is not provided, falls back to the original behavior:
 * localhost-bound servers only accept localhost origins.
 *
 * Returns true if the origin is allowed, false otherwise.
 */
export function validateOrigin(
  origin: string | undefined,
  serverHost: string,
  allowedOrigins?: readonly string[] | undefined,
): boolean {
  // When an explicit allowlist is provided, use it regardless of bind address
  if (allowedOrigins !== undefined) {
    // No origin header — reject when an allowlist is active (explicit policy)
    if (origin === undefined || origin === '') {
      return false;
    }
    return allowedOrigins.includes(origin);
  }

  const isLocalhost = serverHost === '127.0.0.1' || serverHost === '::1' || serverHost === 'localhost';

  // If not bound to localhost, allow all origins
  if (!isLocalhost) {
    return true;
  }

  // If bound to localhost but no origin header, allow (same-origin / CLI clients)
  if (origin === undefined || origin === '') {
    return true;
  }

  // Parse the origin to check if it's localhost
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return host === '127.0.0.1' || host === '::1' || host === 'localhost';
  } catch {
    return false;
  }
}

/**
 * Client manager — tracks connected WebSocket clients and broadcasts events.
 *
 * No replay buffer: newly connected clients receive only future events.
 */
export class ClientManager {
  private readonly clients: Set<WebSocket> = new Set();

  /** Number of currently connected clients. */
  get size(): number {
    return this.clients.size;
  }

  /** Add a client connection. Registers a close handler for cleanup. */
  add(ws: WebSocket): void {
    this.clients.add(ws);
    ws.on('close', () => {
      this.clients.delete(ws);
    });
  }

  /** Remove a client connection. */
  remove(ws: WebSocket): void {
    this.clients.delete(ws);
  }

  /** Broadcast a serialized event to all connected clients. */
  broadcast(event: WsEvent): void {
    const data = serializeEvent(event);
    for (const client of this.clients) {
      // WebSocket.OPEN = 1
      if (client.readyState === 1) {
        try {
          client.send(data);
        } catch {
          // Remove the failed client so future broadcasts skip it
          this.clients.delete(client);
        }
      }
    }
  }

  /** Disconnect all clients and clear the set. */
  closeAll(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
  }
}

/**
 * Attach WebSocket upgrade handling to a WebSocketServer.
 *
 * Validates Origin on connection. Registers each new client with the
 * ClientManager.
 */
export function attachWsHandler(
  wss: WebSocketServer,
  manager: ClientManager,
  serverHost: string,
  allowedOrigins?: readonly string[] | undefined,
): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const origin = req.headers['origin'] as string | undefined;

    if (!validateOrigin(origin, serverHost, allowedOrigins)) {
      ws.close(1008, 'Origin not allowed');
      return;
    }

    manager.add(ws);
  });
}
