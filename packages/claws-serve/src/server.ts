import express, { type Express } from 'express';
import type { Server } from 'node:http';
import { healthRouter } from './routes/health.js';
import { statusRouter } from './routes/status.js';
import { compileRouter } from './routes/compile.js';
import { irRouter } from './routes/ir.js';
import { diagnosticsRouter } from './routes/diagnostics.js';
import { tensionsRouter } from './routes/tensions.js';
import { classifyRouter } from './routes/classify.js';
import { bodyLimit } from './middleware/body-limit.js';
import { contentType } from './middleware/content-type.js';
import { rateLimit } from './middleware/rate-limit.js';
import { cors } from './middleware/cors.js';
import { CompilationHost, type CompileFn } from './compilation-host.js';
import { snapshotRouter, type SnapshotStore } from './routes/snapshot.js';
import { invalidateRouter } from './routes/invalidate.js';
import { WebSocketServer } from 'ws';
import { ClientManager, attachWsHandler } from './ws/events.js';

export interface ServerOptions {
  port?: number | undefined;
  host?: string | undefined;
  rateLimitMax?: number | undefined;
  compileFn?: CompileFn | undefined;
  workspaceRoot?: string | undefined;
  noWs?: boolean | undefined;
  allowedOrigins?: string[] | undefined;
}

export interface ServerState {
  startedAt: number;
  compileCount: number;
}

const DEFAULT_PORT = 3939;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_RATE_LIMIT = 10;

export function createApp(
  state: ServerState,
  options: ServerOptions = {},
  clientManager?: ClientManager | undefined,
): Express {
  const app = express();

  const rateLimitMax = options.rateLimitMax ?? DEFAULT_RATE_LIMIT;

  // CORS deny-by-default on all HTTP responses
  app.use(cors());

  // Apply middleware to all POST routes
  app.post('*', contentType());
  app.post('*', bodyLimit());
  app.use(express.json());
  app.post('/compile', rateLimit({ maxPerMinute: rateLimitMax }));

  // Register routes
  app.use(healthRouter(state));

  // Compile + IR routes (require compileFn)
  if (options.compileFn !== undefined) {
    const workspaceRoot = options.workspaceRoot ?? process.cwd();
    const host = new CompilationHost(options.compileFn, workspaceRoot);
    app.use(statusRouter(host));
    app.use(compileRouter(host, state, clientManager));
    app.use(irRouter(host));
    app.use(diagnosticsRouter(host));
    app.use(tensionsRouter(host));
    app.use(classifyRouter(host));
    const snapshotStore: SnapshotStore = new Map();
    app.use(snapshotRouter(host, snapshotStore, clientManager));
    app.use(invalidateRouter(host, clientManager));
  } else {
    // No compileFn — status returns 501
    app.use(statusRouter());
  }

  return app;
}

export function resolvePort(options: ServerOptions): number {
  if (options.port !== undefined) {
    return options.port;
  }
  const envPort = process.env['CLAWS_PORT'];
  if (envPort !== undefined && envPort !== '') {
    const parsed = parseInt(envPort, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed < 65536) {
      return parsed;
    }
  }
  return DEFAULT_PORT;
}

export function registerGracefulShutdown(server: Server, clientManager?: ClientManager | undefined): void {
  const shutdown = (): void => {
    clientManager?.closeAll();
    server.close();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export interface StartServerResult {
  server: Server;
  state: ServerState;
  clientManager: ClientManager | undefined;
}

export function startServer(options: ServerOptions = {}): StartServerResult {
  const state: ServerState = {
    startedAt: Date.now(),
    compileCount: 0,
  };

  const noWs = options.noWs ?? false;
  const host = options.host ?? DEFAULT_HOST;

  let clientManager: ClientManager | undefined;
  if (!noWs) {
    clientManager = new ClientManager();
  }

  const app = createApp(state, options, clientManager);
  const port = resolvePort(options);

  if (host === '0.0.0.0') {
    console.warn('WARNING: Server exposed to network without authentication. Use a reverse proxy for production.');
  }

  const server = app.listen(port, host);

  // Attach WebSocket upgrade handling if WS is enabled
  if (clientManager !== undefined) {
    const wss = new WebSocketServer({ server, path: '/ws' });
    attachWsHandler(wss, clientManager, host, options.allowedOrigins);
  }

  registerGracefulShutdown(server, clientManager);

  return { server, state, clientManager };
}
