/**
 * @bic/openclaw-snap/server/handlers — pure request → response handlers
 * for the 9-endpoint HTTP surface.
 *
 * Each handler takes a lightweight `SnapRequest` (method, path, query,
 * headers, body) and returns a `SnapResponse` (status, body). The HTTP
 * adapter in `startServer.ts` wraps Node's `http` module around these.
 *
 * Split into pure handlers + HTTP glue so unit tests can exercise every
 * branch without opening sockets.
 *
 * @module @bic/openclaw-snap/server/handlers
 */

import { computePolicyId, POLICY_IR_PATH, safeParse } from '../canonical.js';
import { toSnapError } from '../error.js';
import type { PromoteContext, SnapError, SnapshotStore } from '../types.js';
import {
  buildPromoteEvent,
  buildRollbackEvent,
  type AuditSink,
} from './audit.js';

export interface SnapRequest {
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export interface SnapResponse {
  readonly status: number;
  readonly body: unknown;
}

export interface AuthContextResult {
  readonly principal: string;
  readonly tenant?: string;
  readonly freshnessSeconds?: number;
}

export interface HandlerDeps {
  readonly store: SnapshotStore;
  readonly computeSnapshotId: (files: Readonly<Record<string, string>>) => string;
  readonly authContext?: (headers: Readonly<Record<string, string>>) => AuthContextResult;
  readonly auditSink?: AuditSink;
  readonly promotionRequirePolicy?: boolean;
  readonly clock?: () => Date;
  /**
   * Accepted `canonicalizerVersion` values in uploaded policy-ir.json.
   * Bundles that declare any other version are rejected with
   * `POLICY_IR_VERSION_UNSUPPORTED`. Defaults to the version currently
   * shipped by @bic/openclaw-workspace when undefined.
   */
  readonly supportedCanonicalizerVersions?: readonly string[];
  /** In-memory idempotency cache for promote/rollback retries. */
  readonly idempotencyCache?: IdempotencyCache;
}

/**
 * Cached first-response for an (snapshotId, idempotency_key) pair. Per
 * snap.md §Promotion, retries with the same key return the byte-identical
 * response without re-executing the promotion and without emitting a
 * duplicate audit event. 24h TTL is the spec minimum; production
 * deployments back this with a persistent store (Redis, etc.).
 */
export interface IdempotencyCacheEntry {
  readonly status: number;
  readonly body: unknown;
  readonly expiresAt: number;
}

export interface IdempotencyCache {
  get(key: string): IdempotencyCacheEntry | undefined;
  set(key: string, entry: IdempotencyCacheEntry): void;
}

const DEFAULT_SUPPORTED_CANONICALIZER_VERSIONS: readonly string[] = ['1.0.0'];

function err(status: number, error: SnapError): SnapResponse {
  return { status, body: error };
}

function notFound(id: string): SnapResponse {
  return err(404, toSnapError('SNAPSHOT_NOT_FOUND', new Error('snapshot not found'), { snapshotId: id }));
}

function requireIdempotencyKey(req: SnapRequest): SnapResponse | string {
  const key = req.headers['idempotency-key'];
  if (key === undefined || key === '') {
    return err(400, toSnapError('IDEMPOTENCY_KEY_REQUIRED', new Error('missing Idempotency-Key header')));
  }
  return key;
}

function resolveAuth(
  deps: HandlerDeps,
  req: SnapRequest,
): AuthContextResult | SnapResponse {
  if (deps.authContext === undefined) {
    return { principal: 'anonymous' };
  }
  try {
    const ctx = deps.authContext(req.headers);
    if (ctx.principal === '' || ctx.principal === undefined) {
      const body = toSnapError(
        'AUTH_CONTEXT_UNAVAILABLE',
        new Error('authContext returned empty principal'),
        ctx.freshnessSeconds !== undefined
          ? { details: { authContextFreshnessSeconds: ctx.freshnessSeconds } }
          : {},
      );
      return { status: 503, body };
    }
    return ctx;
  } catch (e) {
    return { status: 503, body: toSnapError('AUTH_CONTEXT_UNAVAILABLE', e) };
  }
}

/**
 * Upload-time shift-left gates for `.openclaw/policy/policy-ir.json`
 * (snap.md §Uploading): canonicalizerVersion handshake and optional
 * X-Expected-Policy-Id header. Runs before storage so drafts carrying
 * incompatible or misidentified policies never enter the registry.
 */
function validateUploadPolicyIR(
  files: Readonly<Record<string, string>>,
  expectedPolicyId: string | undefined,
  supported: readonly string[],
): SnapResponse | null {
  const rawIr = files[POLICY_IR_PATH];
  if (rawIr === undefined) return null;
  let parsed: unknown;
  try {
    parsed = safeParse(rawIr, { maxDepth: 100 });
  } catch (e) {
    return err(400, toSnapError('POLICY_IR_MALFORMED', e));
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return err(400, toSnapError('POLICY_IR_MALFORMED', new Error('policy-ir.json is not an object')));
  }
  const ir = parsed as Record<string, unknown>;
  const declaredVersion = ir['canonicalizerVersion'];
  if (typeof declaredVersion === 'string' && !supported.includes(declaredVersion)) {
    return err(
      400,
      toSnapError(
        'POLICY_IR_VERSION_UNSUPPORTED',
        new Error('policy-ir.json canonicalizerVersion not supported by this server'),
        { details: { got: declaredVersion, supported: [...supported] } },
      ),
    );
  }
  if (expectedPolicyId !== undefined && expectedPolicyId !== '') {
    const computed = computePolicyId(ir);
    if (computed !== expectedPolicyId) {
      return err(
        400,
        toSnapError(
          'POLICY_ID_MISMATCH',
          new Error('X-Expected-Policy-Id does not match computed policyId'),
          { details: { expected: expectedPolicyId, computed } },
        ),
      );
    }
  }
  return null;
}

function validatePolicyIR(files: Readonly<Record<string, string>>, require: boolean): SnapResponse | null {
  const rawIr = files[POLICY_IR_PATH];
  if (rawIr === undefined) {
    if (require) {
      return err(
        409,
        toSnapError('POLICY_NOT_GENERATED', new Error('.openclaw/policy/policy-ir.json missing from snapshot')),
      );
    }
    return null;
  }
  let parsed: unknown;
  try {
    parsed = safeParse(rawIr, { maxDepth: 100 });
  } catch (e) {
    return err(409, toSnapError('POLICY_IR_MALFORMED', e));
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return err(409, toSnapError('POLICY_IR_MALFORMED', new Error('policy-ir.json is not an object')));
  }
  const ir = parsed as Record<string, unknown>;
  const declared = ir['policyId'];
  if (typeof declared !== 'string') {
    return err(
      409,
      toSnapError('POLICY_IR_INCONSISTENT', new Error('policyId missing or not a string')),
    );
  }
  const computed = computePolicyId(ir);
  if (computed !== declared) {
    return err(
      409,
      toSnapError('POLICY_IR_INCONSISTENT', new Error('computed policyId mismatches declared')),
    );
  }
  return null;
}

async function handleUpload(deps: HandlerDeps, req: SnapRequest): Promise<SnapResponse> {
  const auth = resolveAuth(deps, req);
  if ('status' in auth) return auth;
  const keyOrErr = requireIdempotencyKey(req);
  if (typeof keyOrErr !== 'string') return keyOrErr;
  const body = req.body;
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return err(400, toSnapError('SNAPSHOT_MALFORMED', new Error('request body must be an object')));
  }
  const filesRaw = (body as { files?: unknown }).files;
  if (filesRaw === null || typeof filesRaw !== 'object' || Array.isArray(filesRaw)) {
    return err(400, toSnapError('SNAPSHOT_MALFORMED', new Error('body.files must be an object')));
  }
  const files: Record<string, string> = {};
  for (const [k, v] of Object.entries(filesRaw as Record<string, unknown>)) {
    if (typeof v !== 'string') {
      return err(400, toSnapError('SNAPSHOT_MALFORMED', new Error(`file content for "${k}" must be a string`)));
    }
    files[k] = v;
  }
  const id = deps.computeSnapshotId(files);
  const expectedId = req.headers['x-expected-snapshot-id'];
  if (expectedId !== undefined && expectedId !== '' && expectedId !== id) {
    return err(
      400,
      toSnapError('SNAPSHOT_ID_MISMATCH', new Error('X-Expected-Snapshot-Id does not match computed id'), {
        snapshotId: id,
        details: { expected: expectedId, computed: id },
      }),
    );
  }
  const supported = deps.supportedCanonicalizerVersions ?? DEFAULT_SUPPORTED_CANONICALIZER_VERSIONS;
  const policyGate = validateUploadPolicyIR(
    files,
    req.headers['x-expected-policy-id'],
    supported,
  );
  if (policyGate !== null) return policyGate;
  const now = (deps.clock ?? ((): Date => new Date()))().toISOString();
  await deps.store.put({
    id,
    files,
    createdAt: now,
    author: auth.principal,
    status: 'draft',
  });
  return { status: 201, body: { id, status: 'draft' } };
}

async function handleList(deps: HandlerDeps, req: SnapRequest): Promise<SnapResponse> {
  const limitRaw = req.query['limit'];
  const limit = limitRaw !== undefined ? Number(limitRaw) : undefined;
  const items = await deps.store.list(limit !== undefined && Number.isFinite(limit) ? { limit } : {});
  return { status: 200, body: items };
}

async function handleGet(deps: HandlerDeps, id: string): Promise<SnapResponse> {
  const snap = await deps.store.get(id);
  if (snap === null) return notFound(id);
  return { status: 200, body: snap };
}

function cacheKey(op: 'promote' | 'rollback', snapshotId: string, key: string): string {
  return `${op}:${snapshotId}:${key}`;
}

function cachedOrNull(deps: HandlerDeps, key: string, now: number): SnapResponse | null {
  const cache = deps.idempotencyCache;
  if (cache === undefined) return null;
  const entry = cache.get(key);
  if (entry === undefined) return null;
  if (entry.expiresAt <= now) return null;
  return { status: entry.status, body: entry.body };
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function cacheStore(deps: HandlerDeps, key: string, res: SnapResponse, now: number): void {
  const cache = deps.idempotencyCache;
  if (cache === undefined) return;
  cache.set(key, { status: res.status, body: res.body, expiresAt: now + IDEMPOTENCY_TTL_MS });
}

async function handlePromote(
  deps: HandlerDeps,
  req: SnapRequest,
  id: string,
): Promise<SnapResponse> {
  const auth = resolveAuth(deps, req);
  if ('status' in auth) return auth;
  const keyOrErr = requireIdempotencyKey(req);
  if (typeof keyOrErr !== 'string') return keyOrErr;
  const clock = deps.clock ?? ((): Date => new Date());
  const nowMs = clock().getTime();
  const ckey = cacheKey('promote', id, keyOrErr);
  const cached = cachedOrNull(deps, ckey, nowMs);
  if (cached !== null) return cached;
  const snap = await deps.store.get(id);
  if (snap === null) return notFound(id);
  const require = deps.promotionRequirePolicy ?? true;
  const gate = validatePolicyIR(snap.files, require);
  if (gate !== null) return gate;
  const priorCurrent = await deps.store.current();
  const ctx: PromoteContext = {
    principal: auth.principal,
    idempotencyKey: keyOrErr,
    ...(auth.tenant !== undefined ? { tenant: auth.tenant } : {}),
  };
  const { promotedAt } = await deps.store.promote(id, ctx);
  if (deps.auditSink !== undefined) {
    await deps.auditSink(
      buildPromoteEvent({
        snapshotId: id,
        principal: auth.principal,
        ...(auth.tenant !== undefined ? { tenant: auth.tenant } : {}),
        timestamp: promotedAt,
        ...(priorCurrent !== null ? { priorId: priorCurrent.id } : {}),
        bypassed: !require,
        ...(auth.freshnessSeconds !== undefined ? { authFreshnessSeconds: auth.freshnessSeconds } : {}),
      }),
    );
  }
  const response: SnapResponse = { status: 200, body: { id, status: 'current', promotedAt } };
  cacheStore(deps, ckey, response, nowMs);
  return response;
}

async function handleRollback(
  deps: HandlerDeps,
  req: SnapRequest,
  id: string,
): Promise<SnapResponse> {
  const auth = resolveAuth(deps, req);
  if ('status' in auth) return auth;
  const keyOrErr = requireIdempotencyKey(req);
  if (typeof keyOrErr !== 'string') return keyOrErr;
  const clock = deps.clock ?? ((): Date => new Date());
  const nowMs = clock().getTime();
  const ckey = cacheKey('rollback', id, keyOrErr);
  const cached = cachedOrNull(deps, ckey, nowMs);
  if (cached !== null) return cached;
  const snap = await deps.store.get(id);
  if (snap === null) return notFound(id);
  const require = deps.promotionRequirePolicy ?? true;
  if (require) {
    const rawIr = snap.files[POLICY_IR_PATH];
    if (rawIr !== undefined) {
      try {
        safeParse(rawIr, { maxDepth: 100 });
      } catch (e) {
        return err(409, toSnapError('POLICY_IR_MALFORMED', e));
      }
    }
  }
  const ctx: PromoteContext = {
    principal: auth.principal,
    idempotencyKey: keyOrErr,
    ...(auth.tenant !== undefined ? { tenant: auth.tenant } : {}),
  };
  const { restoredAt } = await deps.store.rollback(id, ctx);
  if (deps.auditSink !== undefined) {
    await deps.auditSink(
      buildRollbackEvent({
        snapshotId: id,
        principal: auth.principal,
        ...(auth.tenant !== undefined ? { tenant: auth.tenant } : {}),
        timestamp: restoredAt,
        bypassed: !require,
      }),
    );
  }
  const response: SnapResponse = { status: 200, body: { id, status: 'current', restoredAt } };
  cacheStore(deps, ckey, response, nowMs);
  return response;
}

async function handlePolicyCurrent(deps: HandlerDeps): Promise<SnapResponse> {
  const snap = await deps.store.current();
  if (snap === null) {
    return err(404, toSnapError('SNAPSHOT_NOT_FOUND', new Error('no current snapshot')));
  }
  const rawIr = snap.files[POLICY_IR_PATH];
  if (rawIr === undefined) {
    return err(404, toSnapError('POLICY_NOT_GENERATED', new Error('current snapshot has no policy IR')));
  }
  return { status: 200, body: { snapshotId: snap.id, policyIr: rawIr } };
}

async function handleResolve(
  deps: HandlerDeps,
  req: SnapRequest,
  snapshotId?: string,
): Promise<SnapResponse> {
  const uri = req.query['uri'];
  if (uri === undefined || uri === '') {
    return err(400, toSnapError('SNAPSHOT_MALFORMED', new Error('query parameter "uri" is required')));
  }
  const explicitSnapshot = req.query['snapshot'];
  const target = snapshotId ?? explicitSnapshot;
  try {
    const result = await deps.store.resolveOcPath(uri, target);
    if (result === null) {
      return err(
        404,
        toSnapError('SNAPSHOT_NOT_FOUND', new Error('uri did not resolve in target snapshot')),
      );
    }
    return { status: 200, body: result };
  } catch (e) {
    return err(400, toSnapError('SNAPSHOT_MALFORMED', e));
  }
}

/**
 * Liveness probe. Returns 200 for every reachable instance — readiness of
 * the auth layer is a host concern (credentials are request-scoped; the
 * host surfaces `/readyz` if it wants a credential-bearing probe). The
 * prior implementation invoked `authContext({})` and interpreted the empty
 * principal that every compliant JWT validator returns on a missing
 * Authorization header as "unhealthy," causing load balancers to drain
 * perfectly healthy instances.
 */
export function handleHealthz(deps: HandlerDeps): SnapResponse {
  const body = {
    status: 'ok' as const,
    authContext: deps.authContext === undefined ? 'unconfigured' : 'configured',
  };
  return { status: 200, body };
}

/**
 * Dispatch a parsed request to the right handler. Returns a `SnapResponse`
 * for any recognized route; returns a 404 envelope for unknown paths.
 */
export async function dispatch(deps: HandlerDeps, req: SnapRequest): Promise<SnapResponse> {
  const { method, path } = req;

  if (method === 'GET' && path === '/v1/healthz') {
    return handleHealthz(deps);
  }
  if (method === 'POST' && path === '/v1/snapshots') {
    return handleUpload(deps, req);
  }
  if (method === 'GET' && path === '/v1/snapshots') {
    return handleList(deps, req);
  }
  if (method === 'GET' && path === '/v1/policy/current') {
    return handlePolicyCurrent(deps);
  }
  if (method === 'GET' && path === '/v1/resolve') {
    return handleResolve(deps, req);
  }

  const getMatch = /^\/v1\/snapshots\/([^/]+)$/.exec(path);
  if (method === 'GET' && getMatch !== null) {
    return handleGet(deps, decodeURIComponent(getMatch[1] as string));
  }
  const promoteMatch = /^\/v1\/snapshots\/([^/]+)\/promote$/.exec(path);
  if (method === 'POST' && promoteMatch !== null) {
    return handlePromote(deps, req, decodeURIComponent(promoteMatch[1] as string));
  }
  const rollbackMatch = /^\/v1\/snapshots\/([^/]+)\/rollback$/.exec(path);
  if (method === 'POST' && rollbackMatch !== null) {
    return handleRollback(deps, req, decodeURIComponent(rollbackMatch[1] as string));
  }
  const resolveMatch = /^\/v1\/snapshots\/([^/]+)\/resolve$/.exec(path);
  if (method === 'GET' && resolveMatch !== null) {
    return handleResolve(deps, req, decodeURIComponent(resolveMatch[1] as string));
  }

  return err(404, toSnapError('SNAPSHOT_NOT_FOUND', new Error(`no route for ${method} ${path}`)));
}
