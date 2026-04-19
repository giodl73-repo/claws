/**
 * @bic/openclaw-snap/server/startServer — Node `http` adapter around the
 * pure `dispatch` handler.
 *
 * Parses method/path/query/headers/body into a `SnapRequest`, runs
 * dispatch, and writes the `SnapResponse` back as JSON. The pure handlers
 * are exported from ./handlers.ts for unit testing without sockets.
 *
 * @module @bic/openclaw-snap/server/startServer
 */

import * as http from 'node:http';
import { safeParse } from '@bic/openclaw-workspace/canonicalize';
import { computeSnapshotId } from '../canonical.js';
import { toSnapError } from '../error.js';
import type { SnapshotStore } from '../types.js';
import type { AuditSink } from './audit.js';
import {
  dispatch,
  type AuthContextResult,
  type HandlerDeps,
  type IdempotencyCache,
  type IdempotencyCacheEntry,
  type SnapRequest,
} from './handlers.js';

export interface StartServerOptions {
  readonly port: number;
  readonly store: SnapshotStore;
  readonly authContext?: (headers: Readonly<Record<string, string>>) => AuthContextResult;
  readonly auditSink?: AuditSink;
  readonly promotionRequirePolicy?: boolean;
  readonly host?: string;
  /**
   * Accepted `canonicalizerVersion` values in uploaded policy-ir.json.
   * Defaults to ['1.0.0'] matching the current workspace canonicalizer.
   */
  readonly supportedCanonicalizerVersions?: readonly string[];
  /**
   * Override the built-in in-memory idempotency cache with a persistent
   * store (e.g. Redis). When omitted a per-process Map-based cache is
   * used; acceptable for the reference impl but not for multi-replica
   * production deployments.
   */
  readonly idempotencyCache?: IdempotencyCache;
}

function defaultIdempotencyCache(): IdempotencyCache {
  const store = new Map<string, IdempotencyCacheEntry>();
  return {
    get(key): IdempotencyCacheEntry | undefined {
      const entry = store.get(key);
      if (entry === undefined) return undefined;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry;
    },
    set(key, entry): void {
      store.set(key, entry);
    },
  };
}

export interface ServerHandle {
  readonly port: number;
  readonly url: string;
  close(): Promise<void>;
}

const MAX_BODY_BYTES = 10 * 1024 * 1024;

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    total += buf.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error('request body exceeds 10 MiB limit');
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.trim() === '') return undefined;
  return safeParse(raw, { maxDepth: 100 });
}

function parseUrl(raw: string | undefined): { path: string; query: Record<string, string> } {
  const input = raw ?? '/';
  const qIdx = input.indexOf('?');
  const path = qIdx === -1 ? input : input.slice(0, qIdx);
  const queryStr = qIdx === -1 ? '' : input.slice(qIdx + 1);
  const query: Record<string, string> = {};
  if (queryStr !== '') {
    for (const pair of queryStr.split('&')) {
      const eq = pair.indexOf('=');
      const k = eq === -1 ? pair : pair.slice(0, eq);
      const v = eq === -1 ? '' : pair.slice(eq + 1);
      if (k !== '') query[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }
  return { path, query };
}

function normalizeHeaders(h: http.IncomingHttpHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) out[k.toLowerCase()] = v.join(',');
    else out[k.toLowerCase()] = v;
  }
  return out;
}

export async function startServer(opts: StartServerOptions): Promise<ServerHandle> {
  const depsBuilder: {
    store: SnapshotStore;
    computeSnapshotId: typeof computeSnapshotId;
    authContext?: HandlerDeps['authContext'];
    auditSink?: AuditSink;
    promotionRequirePolicy?: boolean;
    supportedCanonicalizerVersions?: readonly string[];
    idempotencyCache?: IdempotencyCache;
  } = {
    store: opts.store,
    computeSnapshotId,
    idempotencyCache: opts.idempotencyCache ?? defaultIdempotencyCache(),
  };
  if (opts.authContext !== undefined) depsBuilder.authContext = opts.authContext;
  if (opts.auditSink !== undefined) depsBuilder.auditSink = opts.auditSink;
  if (opts.promotionRequirePolicy !== undefined) {
    depsBuilder.promotionRequirePolicy = opts.promotionRequirePolicy;
  }
  if (opts.supportedCanonicalizerVersions !== undefined) {
    depsBuilder.supportedCanonicalizerVersions = opts.supportedCanonicalizerVersions;
  }
  const deps: HandlerDeps = depsBuilder as HandlerDeps;

  const server = http.createServer((req, res) => {
    void (async (): Promise<void> => {
      try {
        const { path, query } = parseUrl(req.url);
        const headers = normalizeHeaders(req.headers);
        let body: unknown;
        try {
          body = await readBody(req);
        } catch (e) {
          // CodeQL `js/stack-trace-exposure`: never pass the caught error
          // directly onto the wire, even though toSnapError routes through
          // sanitizeMessage. Build the envelope from a static message so
          // taint analysis sees the chain broken. The SNAPSHOT_MALFORMED
          // code already communicates WHAT failed to the caller; detail
          // stays server-side.
          void e; // caught for observability; not used on the wire
          const envelope = toSnapError(
            'SNAPSHOT_MALFORMED',
            new Error('request body malformed or exceeded size limit'),
          );
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify(envelope));
          return;
        }
        const snapReq: SnapRequest = {
          method: req.method as string,
          path,
          query,
          headers,
          body,
        };
        const response = await dispatch(deps, snapReq);
        res.writeHead(response.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(response.body));
      } catch (e) {
        // Same contract as above: static message on the wire; the code
        // enum (SNAPSHOT_MALFORMED) conveys category without the caught
        // error details routing to the client.
        void e;
        const envelope = toSnapError(
          'SNAPSHOT_MALFORMED',
          new Error('internal server error during snap dispatch'),
        );
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify(envelope));
      }
    })();
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error): void => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(opts.port, opts.host ?? '127.0.0.1');
  });

  const address = server.address() as { port: number };
  const boundPort = address.port;
  const host = opts.host ?? '127.0.0.1';
  const url = `http://${host}:${String(boundPort)}`;

  return {
    port: boundPort,
    url,
    async close(): Promise<void> {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}
