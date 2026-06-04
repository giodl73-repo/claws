import express, { type Express } from 'express';
import type { Server } from 'node:http';
import { healthRouter } from './routes/health.js';
import { statusRouter, apiStatusRouter } from './routes/status.js';
import { compileRouter } from './routes/compile.js';
import { irRouter } from './routes/ir.js';
import { diagnosticsRouter } from './routes/diagnostics.js';
import { tensionsRouter } from './routes/tensions.js';
import { classifyRouter } from './routes/classify.js';
import { bodyLimit } from './middleware/body-limit.js';
import { contentType } from './middleware/content-type.js';
import { rateLimit } from './middleware/rate-limit.js';
import { cors } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import {
  patchEnvelopeMiddleware,
  patchShapeMiddleware,
} from './middleware/validation-middleware.js';
import { dryRunMiddleware } from './middleware/dry-run.js';
import { etagResponse, requireIfMatch } from './middleware/etag.js';
import { timeTravelMiddleware } from './middleware/time-travel.js';
import { actorMiddleware } from './middleware/actor.js';
import { commitOnSuccess } from './middleware/commit-on-success.js';
import { CompilationHost, type CompileFn } from './compilation-host.js';
import { snapshotRouter, type SnapshotStore } from './routes/snapshot.js';
import { invalidateRouter } from './routes/invalidate.js';
import { registerRoutes } from './routes/index.js';
import { workspaceSchemaRouter } from './routes/workspace-schema.js';
import { chunksConnectionsRouter } from './routes/chunks-connections.js';
import { chunksMemoryRouter } from './routes/chunks-memory.js';
import { chunksGroupsRouter } from './routes/chunks-groups.js';
import { chunksEntitlementsRouter } from './routes/chunks-entitlements.js';
import { chunksGeneralRouter } from './routes/chunks-general.js';
import { chunksPreferencesRouter } from './routes/chunks-preferences.js';
import { ocGenericRouter } from './routes/oc-generic.js';
import { loopMemoryRouter } from './routes/loop-memory.js';
import { loopSoulRouter } from './routes/loop-soul.js';
import { scheduleRouter } from './routes/schedule.js';
import { governanceRouter } from './routes/governance.js';
import { patchChunksRouter } from './routes/patch-chunks.js';
import { allowAllRouter } from './routes/allow-all.js';
import { batchRouter } from './routes/batch.js';
import { diffRouter } from './routes/diff.js';
import { workqueueRouter } from './routes/workqueue.js';
import { trustRouter } from './routes/trust.js';
import { sessionsRouter } from './routes/sessions.js';
import { sessionConfigRouter } from './routes/session-config.js';
import {
  adminResetRouter,
  ADMIN_TOKEN_ENV,
} from './routes/admin-reset.js';
import { createRollbackAuditSink } from './audit/rollback-sink.js';
import { createDryRunAuditSink } from './audit/dry-run-sink.js';
import { createAdminResetAuditSink } from './audit/admin-reset-sink.js';
import type { DryRunAuditSink } from './middleware/dry-run-sanitize.js';
import type { AdminResetAuditSink } from './routes/admin-reset.js';
import {
  createFsAuditChainSink,
  type AuditChainSink,
} from '../../claws-sdk/src/compliance/index.js';
import {
  AutoSnapshotManager,
  TrustManager,
  VersionStore,
  deriveWorkspaceId,
} from '../../claws-sdk/src/workspace/index.js';
import { ViolationStateMachine } from '../../claws-sdk/src/workspace/violation-state.js';
import { violationGate } from './middleware/violation-gate.js';
import {
  StructuredEditor,
  ValidationPipeline,
  VersionManager,
  createR5Validator,
  createFleetValidator,
  createCachedFleetPolicyLoader,
  createGovernanceValidator,
  createDenyRemovalValidator,
  type CachedFleetPolicyLoader,
  type DenyProvenanceRegistry,
  type ValidationPipelineResult,
} from '../../claws-sdk/src/workspace-edit/index.js';
import type { RollbackAuditSink } from './routes/patch-chunks.js';
import { WebSocketServer } from 'ws';
import { ClientManager, attachWsHandler } from './ws/events.js';
import {
  degradedModeError as degradedModeErrorBody,
  runStartupHealthCheck,
  type DegradedReason,
  type HealthCheckOptions,
  type ServerMode,
} from './lifecycle/health-check.js';

export interface ServerOptions {
  port?: number | undefined;
  host?: string | undefined;
  rateLimitMax?: number | undefined;
  compileFn?: CompileFn | undefined;
  workspaceRoot?: string | undefined;
  noWs?: boolean | undefined;
  allowedOrigins?: string[] | undefined;
  /**
   * Absolute path of the fleet policy file. When supplied, the startup
   * health check attempts to load it and marks the server degraded if
   * the policy is missing or corrupt (P-272 fail-closed). The fleet
   * validator in the write pipeline reads from the same path.
   */
  fleetPolicyFile?: string | undefined;
  /**
   * Absolute path of the governance file (SOUL.md). Used by the
   * governance and deny-removal validators when emitting provenance
   * chains on GOVERNANCE_DENIED errors. Defaults to
   * `<workspaceRoot>/SOUL.md` when omitted.
   */
  governanceFile?: string | undefined;
  /**
   * Deny provenance registry — maps deny-rule ids (or raw text) to their
   * provenance chain. Compiler-injected rules block; user-authored rules
   * emit a warning. Absent entries default to user-authored.
   */
  denyProvenance?: DenyProvenanceRegistry | undefined;
  /**
   * When `true` (default), PATCH/POST write routes require a valid
   * `If-Match` header (ETag precondition). Tests that predate the
   * versioning wiring opt out by passing `false`.
   */
  requireETag?: boolean | undefined;
  /**
   * Admin token for the operator reset endpoint. Defaults to
   * `process.env.CLAWS_ADMIN_TOKEN`. When both are unset the endpoint
   * returns 404 and is effectively disabled.
   */
  adminToken?: string | undefined;
  /**
   * Optional custom rollback audit sink. When omitted, a default JSONL
   * file sink under `<workspaceRoot>/.claws/audit/rollback.jsonl` is
   * constructed so audit records are persisted by default.
   */
  auditSink?: RollbackAuditSink | undefined;
  /**
   * Optional custom dry-run audit sink. When omitted, a default JSONL
   * file sink under `<workspaceRoot>/.claws/audit/dry-run.jsonl` is
   * constructed so dry-run probes are persisted for SOC review.
   */
  dryRunAuditSink?: DryRunAuditSink | undefined;
  /**
   * Optional custom admin-reset audit sink. When omitted, a default
   * JSONL sink under `<workspaceRoot>/.claws/audit/admin-reset.jsonl`
   * is constructed so every authenticated reset attempt is recorded.
   */
  adminResetAuditSink?: AdminResetAuditSink | undefined;
  /**
   * Optional custom audit-chain sink (CP-7 R1 ciso M2). When omitted, a
   * default filesystem sink backed by `<workspaceRoot>/.claws/audit/chain.jsonl`
   * is constructed and threaded through the trust-manager, violation-state
   * machine, session-config editor, and auto-snapshot manager so every
   * governance-significant mutation lands a signed, HMAC-chained entry.
   * Tests inject an in-memory capturing sink to assert emitted events
   * without touching disk.
   */
  auditChainSink?: AuditChainSink | undefined;
  /**
   * Policy version recorded on every emitted audit-chain entry. Defaults
   * to `'unknown'` when omitted. Production deploys source this from
   * `claws.json` (`compilerVersion` / `version`) via `startServer`.
   */
  policyVersion?: string | undefined;
  /**
   * Debounce window (ms) passed to `ViolationStateMachine`. CP-7 R2 RR2
   * (platform-eng M4 PARTIAL): FIX-F landed the machine-side coalescer
   * with `debounceMs: 0` default for back-compat, but the serve wiring
   * never overrode the default, so the AC P2 criterion ("two violations
   * arrive within 100ms, both appear after one recompile") was
   * structurally unverifiable end-to-end. Defaults to 200ms here.
   * Tests that need synchronous transitions pass `0` to opt out.
   */
  violationDebounceMs?: number | undefined;
  /**
   * HS256 signing key the trust-escalation endpoint (Pulse 39) uses to
   * verify manager-issued approval JWTs. REQUIRED when `compileFn` is set
   * (i.e. when the trust router will be mounted) — `createApp` throws at
   * boot otherwise. CP-7 R1 C6 removed the prior deterministic per-workspace
   * fallback because a key derivable from `workspaceRoot` was forgeable by
   * anyone who could enumerate the filesystem layout. Production deploys
   * load the key via `startServer` from `claws.json` / env; tests inject
   * the `TEST_TRUST_SIGNING_KEY` constant from `tests/fixtures/trust-key`.
   */
  trustSigningKey?: Buffer | undefined;
}

export interface ServerState {
  startedAt: number;
  compileCount: number;
  /**
   * Operational mode set by the startup health check (S33). Defaults to
   * `'healthy'` when omitted; tests that skip the health check still get
   * a working server. `GET /health` always reports a mode — undefined is
   * coerced to `'healthy'` for backwards compatibility.
   */
  mode?: ServerMode;
  /** Populated when `mode === 'degraded'`. */
  degradedReason?: DegradedReason;
}

const DEFAULT_PORT = 3939;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_RATE_LIMIT = 10;

export function createApp(
  state: ServerState,
  options: ServerOptions = {},
  clientManager?: ClientManager | undefined,
): Express {
  // CP-7 R1 C6 / dragon M-2 / ciso M3 — refuse to boot the trust router
  // without an explicit HS256 signing key. The pre-fix fallback derived
  // the key from `workspaceRoot`, which is recoverable from log lines,
  // error messages, `pwd` output, and every mounted filesystem listing.
  // An attacker who recovered the path could forge arbitrary T0→T4
  // approval JWTs and defeat nonce replay protection (the nonce is only
  // meaningful when the key is secret). There is no safe default here —
  // deployments MUST configure `trust.signingKey` in claws.json or an
  // equivalent env-var path. Tests inject `trustSigningKey` directly.
  //
  // Check runs before any router mount so a misconfigured deploy fails
  // loud at `createApp` construction rather than at the first PATCH.
  // Gated on `compileFn` because the trust router is only mounted when
  // the compile surface is active; read-only health harnesses that skip
  // `compileFn` also skip trust.
  if (options.compileFn !== undefined && options.trustSigningKey === undefined) {
    throw new Error(
      '[claws-serve] trust.signingKey is required for the trust-escalation ' +
        'endpoint (CP-7 R1 C6). Set `trustSigningKey` on the ServerOptions ' +
        '(loaded from claws.json trust.signingKey or the CLAWS_TRUST_SIGNING_KEY ' +
        'env var in startServer). No deterministic fallback exists — a key ' +
        'derivable from the workspace path would let anyone who can read the ' +
        'filesystem layout forge manager approval JWTs.',
    );
  }

  const app = express();

  const rateLimitMax = options.rateLimitMax ?? DEFAULT_RATE_LIMIT;
  // ETag precondition defaults off at the `createApp` boundary to keep
  // test harnesses green without retrofitting hundreds of call sites;
  // `startServer` flips it on so production always enforces If-Match.
  const requireETag = options.requireETag ?? false;

  // CORS deny-by-default on all HTTP responses
  app.use(cors());

  // Apply middleware to all POST routes
  app.post('*', contentType());
  app.post('*', bodyLimit());
  // PATCH envelope check runs BEFORE express.json() so oversized payloads
  // surface a structured JSON error instead of Express's default HTML
  // body-parser rejection. The shape check runs downstream on the
  // chunks prefix router.
  app.patch('*', patchEnvelopeMiddleware());
  app.use(express.json({ limit: '1mb' }));
  // Actor capture on every write verb so audit sinks (patch-chunks,
  // batch, allow-all) all see the same identity resolution logic.
  app.patch('*', actorMiddleware());
  app.post('*', actorMiddleware());
  app.post('/compile', rateLimit({ maxPerMinute: rateLimitMax }));

  // Register routes
  app.get('/', (_req, res) => {
    res.json({
      service: 'claws-serve',
      name: 'claws-serve',
      status: 'ok',
      routes: {
        health: '/health',
        apiHealth: '/api/health',
        status: '/status',
      },
    });
  });
  app.use(healthRouter(state));

  // Compile + IR routes (require compileFn)
  if (options.compileFn !== undefined) {
    const workspaceRoot = options.workspaceRoot ?? process.cwd();
    // Single CompilationHost shared between startup health check and the
    // request-path routes — duplicate instances would diverge under
    // cache invalidation and surface subtly different IR to health vs.
    // reads (CP-6 R1 finding A8).
    const host = new CompilationHost(options.compileFn, workspaceRoot);

    // CP-7 R1 ciso M2 — single audit-chain sink threaded through every
    // governance-significant SDK module (trust-manager, violation-state,
    // session-config editor, auto-snapshot manager). One sink instance
    // so all emitted entries land in the same HMAC chain; the chain's
    // append-safety comes from the existing lock + seq machinery in
    // `appendAuditEvent`. Tests inject a capturing sink to assert
    // emissions without touching disk.
    const auditChainSink: AuditChainSink =
      options.auditChainSink ?? createFsAuditChainSink({ workspaceRoot });
    const policyVersion = options.policyVersion ?? 'unknown';
    app.set('auditChainSink', auditChainSink);

    // Version manager + store underpin ETag concurrency (pulse 69) and
    // the time-travel read API (pulse 70). Both are shared across every
    // write-route mount point so ETag and time-travel advertise the same
    // integer space.
    const versionManager = new VersionManager({ workspaceRoot });
    const versionStore = new VersionStore();

    // Pulse 72 / CP-7 R1 C3: auto-snapshot safety net for external writes.
    // Constructed here alongside VersionStore so the resolver (time-travel
    // + diff) and the file-watcher hook share ONE manager instance — the
    // in-memory index and the on-disk `.claws/snapshots/auto/<version>.json`
    // records drive the same `?at=auto:<ts>` resolution path.
    //
    // Rehydration runs fire-and-forget for the same reason version
    // loadVersion() does: `createApp` is sync, and the manager's append-
    // only surface means a watcher-driven save racing with the load
    // cannot regress any on-disk file. `startServer` awaits the ready
    // promise via `app.get('autoSnapshotReady')` before binding.
    //
    // CP-7 R1 ciso M2: `auditSink` is threaded so every `save()` emits an
    // `AUTO_SNAPSHOT_CAPTURED` chain entry.
    const autoSnapshotManager = new AutoSnapshotManager({
      workspaceRoot,
      auditSink: auditChainSink,
      policyVersion,
    });
    const autoSnapshotReady = autoSnapshotManager.load().catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('AutoSnapshotManager.load failed:', err);
    });
    app.set('autoSnapshotManager', autoSnapshotManager);
    app.set('autoSnapshotReady', autoSnapshotReady);

    // Hydrate the persisted counter from `.claws/cache/version.json` so
    // the counter survives restarts (CP-6 R2 cluster H, finding H1). The
    // call is fire-and-forget here because `createApp` is sync; the
    // `VersionManager` monotonicity invariant guarantees that any PATCH
    // racing with hydration cannot regress the counter. `startServer`
    // retrieves the manager via `app.get('versionManager')` and awaits
    // this promise BEFORE binding the port so production always starts
    // with the persisted value.
    const versionManagerReady = versionManager.loadVersion().catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('VersionManager.loadVersion failed:', err);
      return versionManager.getVersion();
    });
    app.set('versionManager', versionManager);
    app.set('versionManagerReady', versionManagerReady);

    // Pulse 73: governance posture tracker. The machine owns the fail-closed
    // write gate: when a compile surfaces R5 / structural / advisory /
    // fleet-drift violations, the gate middleware below rejects or warns
    // future PATCHes according to the current state. Mounted early so every
    // write route picks the SAME machine instance — probe is unused here
    // because we hold a direct reference, but we still expose it on `app`
    // so integration tests and CompilationHost probes can resolve the
    // singleton without threading the reference through every handler.
    // CP-7 R1 ciso M2: `auditSink` fires `VIOLATION_STATE_TRANSITION` on
    // every transition with severity derived from the target state.
    // CP-7 R2 RR2: `debounceMs: 200` activates the machine-side coalescer
    // (FIX-F) so two observations inside a 200ms window flush as a single
    // union transition — the AC P2 criterion. Tests that want synchronous
    // transitions pass `violationDebounceMs: 0`.
    const violationMachine = new ViolationStateMachine({
      auditSink: auditChainSink,
      auditTarget: workspaceRoot,
      policyVersion,
      debounceMs: options.violationDebounceMs ?? 200,
    });
    app.set('violationMachine', violationMachine);

    // ETag middleware stamps GET responses and guards writes. The
    // response-side middleware is always on; the request-side precondition
    // is gated by `requireETag` so test harnesses can opt out.
    app.use(etagResponse(versionManager));
    if (requireETag) {
      // `/api/chunks/*` matches greedily, including the
      // `/api/chunks/connections/allow-all` sub-path; a second mount on
      // the allow-all path would double-wrap the response and advance the
      // counter twice per successful bulk flip (CP-6 R2 finding H3).
      app.patch('/api/chunks/*', requireIfMatch(versionManager));
      app.post('/api/batch', requireIfMatch(versionManager));
      // CP-7 R1 C5 / K — session-config PATCH and trust/escalate PATCH are
      // governance-affecting writes and MUST ride the same ETag envelope
      // as the chunk/batch surface. Pre-fix, concurrent edits silently
      // clobbered (no 412) and the VersionStore missed the transition.
      app.patch('/api/sessions/:id/config', requireIfMatch(versionManager));
      app.patch('/api/trust/escalate', requireIfMatch(versionManager));
      // CP-7 R2 FIX-H RC1 — `/api/oc/*` PATCH (loop-soul, loop-memory) are
      // the highest-fidelity mutation surfaces in CP-7 (direct edits to
      // SOUL.md / MEMORY.md / HEARTBEAT.md) and MUST ride the same ETag
      // envelope as the chunk/batch + session-config surfaces. Pre-fix,
      // FIX-D extended If-Match to session-config but skipped the OC file
      // PATCH routes, leaving them as a governance-write bypass.
      app.patch('/api/oc/*', requireIfMatch(versionManager));
    }

    // Time-travel middleware — PATCH/POST with `?at=` must 400 BEFORE
    // reaching the write handler. Mounting on `/api` covers every write
    // verb under that prefix; the `respondDirectly: false` setting lets
    // GET handlers keep rendering their own bodies (the middleware just
    // stamps `req.timeTravel` and sets the header).
    app.use(
      '/api',
      timeTravelMiddleware({
        resolver: {
          store: versionStore,
          workspaceRoot,
          autoSnapshots: autoSnapshotManager,
        },
        respondDirectly: false,
      }),
    );

    // Violation-gate middleware (P73) — enforces the fail-closed PATCH
    // invariant. Mounted on every write prefix that can affect the serving
    // GovernanceIR, BEFORE `commitOnSuccess` so a gated request never
    // advances the version counter (CP-7 R1 C1, dragon M-1). The same
    // `violationMachine` singleton is shared so all mounts sample one
    // atomic state (P1, P5).
    const gate = violationGate({ machine: violationMachine });
    app.patch('/api/chunks/*', gate);
    app.post('/api/batch', gate);
    app.patch('/api/sessions/:id/config', gate);
    app.patch('/api/trust/escalate', gate);
    // CP-7 R2 FIX-H RC1 — `/api/oc/*` PATCH rides the violation-gate so a
    // DEGRADED_R5 / ERROR workspace cannot edit SOUL.md / MEMORY.md /
    // HEARTBEAT.md out from under the lock. The gate's default extractor
    // pulls `oc://<file>` from `req.path` so repair-path fall-through keeps
    // working when the workspace is being fixed.
    app.patch('/api/oc/*', gate);

    // Commit-on-success wrapper — advances the version counter and records
    // a snapshot whenever a write completes with 2xx. Mounted after the
    // If-Match guard so stale PATCHes are rejected before we advance.
    //
    // `/api/chunks/*` matches every chunks PATCH including the
    // allow-all path (`/api/chunks/connections/allow-all`). A second
    // mount on the allow-all path would double-wrap `res.json` — the
    // outer wrapper would advance to v+1 then the inner wrapper would
    // advance to v+2 for a single bulk flip (CP-6 R2 finding H3).
    const commitHandler = commitOnSuccess({
      manager: versionManager,
      store: versionStore,
      host,
      workspaceRoot,
    });
    app.patch('/api/chunks/*', commitHandler);
    app.post('/api/batch', commitHandler);
    // CP-7 R1 C5 / K — session-config + trust/escalate writes advance the
    // version counter and record a VersionStore snapshot on success, so
    // time-travel (`?at=v<N>`) and `/api/diff` can reconstruct the IR as
    // it existed immediately before each edit. `commitOnSuccess` wraps
    // `res.json` / `res.send` and only advances on a 2xx — gated 503s
    // (violation-gate) and 403s (trust-tier / R5 / fleet-lock) leave the
    // counter untouched.
    app.patch('/api/sessions/:id/config', commitHandler);
    app.patch('/api/trust/escalate', commitHandler);
    // CP-7 R2 FIX-H RC1 — `/api/oc/*` PATCH advances the counter and
    // records a VersionStore snapshot on 2xx so time-travel and diff can
    // reconstruct the pre-edit IR. Gated responses (503 governance-degraded,
    // 503 compile-undefined, 403 section-locked, 428/409 ETag) bypass the
    // counter because `commitOnSuccess` inspects `res.statusCode`.
    app.patch('/api/oc/*', commitHandler);

    // Rollback audit sink — default to the JSONL file sink under the
    // workspace; callers can inject a custom sink for tests or remote
    // forwarding.
    const auditSink: RollbackAuditSink =
      options.auditSink ?? createRollbackAuditSink({ workspaceRoot });

    // Dry-run audit sink (CP-6 R3 security M-3 residual). Persists every
    // `?dryRun=true` probe as a JSONL record so SOC tooling can spot
    // governance-oracle enumeration. Sink failures are logged but never
    // fail the probe (dry-run responses must stay cheap).
    const dryRunAuditSink: DryRunAuditSink =
      options.dryRunAuditSink ?? createDryRunAuditSink({ workspaceRoot });

    // Admin-reset audit sink (CP-6 R3 security NEW-2). Every
    // authenticated reset attempt — forbidden, reset_ok, still_degraded
    // — lands in `.claws/audit/admin-reset.jsonl` so operator privilege
    // use is traceable. The 404 "token unconfigured" branch is silent
    // by design.
    const adminResetAuditSink: AdminResetAuditSink =
      options.adminResetAuditSink ??
      createAdminResetAuditSink({ workspaceRoot });

    // Build the full validator pipeline factory once so every write route
    // uses the same one. Order matters: R5 denies compiler-injected
    // immutables, fleet enforces policy locks, governance enforces deny
    // intents, deny-removal catches SOUL.md deletions of compiler denies.
    const governanceFile = options.governanceFile ?? `${workspaceRoot}/SOUL.md`;
    const denyProvenance: DenyProvenanceRegistry =
      options.denyProvenance ?? new Map();

    // Process-scope cached fleet policy loader (CP-6 R2 M6-R2 / G1).
    // The loader caches the parsed fleet policy keyed on the file's mtime
    // and is reused across EVERY FleetValidator the factories build. If
    // we constructed this inside `pipelineFactory`, each HTTP request
    // would get a fresh cache — a 20-op batch × 47-workspace broadcast
    // would still trigger 940 full reads. Hoisting to createApp scope
    // caps the broadcast at one full read per workspace (mtime change
    // threshold), with every subsequent op served from the cache until
    // the policy file is rewritten.
    const cachedFleetLoader: CachedFleetPolicyLoader | undefined =
      options.fleetPolicyFile !== undefined
        ? createCachedFleetPolicyLoader({ policyFile: options.fleetPolicyFile })
        : undefined;
    // Expose on the app so integration tests can assert
    // `stats.reads()` / `stats.invocations()` after a batch.
    app.set('cachedFleetLoader', cachedFleetLoader);

    const pipelineFactory = (
      ir: Parameters<Parameters<typeof patchChunksRouter>[1]['pipelineFactory']>[0],
    ): ValidationPipeline => {
      const pipeline = new ValidationPipeline();
      pipeline.addValidator(createR5Validator(ir));
      if (options.fleetPolicyFile !== undefined && cachedFleetLoader !== undefined) {
        pipeline.addValidator(
          createFleetValidator({
            policyFile: options.fleetPolicyFile,
            loader: cachedFleetLoader.load,
          }),
        );
      }
      pipeline.addValidator(
        createGovernanceValidator({
          ir,
          denyProvenance,
          governanceFile,
        }),
      );
      pipeline.addValidator(
        createDenyRemovalValidator({
          denyProvenance,
          governanceFile,
        }),
      );
      return pipeline;
    };
    // Separate factory for allow-all: only R5 + fleet gate the bulk
    // enable. Governance/deny-removal don't apply to "enable missing
    // tools" — those validators reject removes and govern-denied sections.
    const allowAllPipelineFactory = (
      ir: Parameters<Parameters<typeof allowAllRouter>[1]['pipelineFactory']>[0],
    ): ValidationPipeline => {
      const pipeline = new ValidationPipeline();
      pipeline.addValidator(createR5Validator(ir));
      if (options.fleetPolicyFile !== undefined && cachedFleetLoader !== undefined) {
        pipeline.addValidator(
          createFleetValidator({
            policyFile: options.fleetPolicyFile,
            loader: cachedFleetLoader.load,
          }),
        );
      }
      return pipeline;
    };

    const degradedModeProbe = (): DegradedReason | undefined =>
      state.mode === 'degraded' ? state.degradedReason : undefined;

    app.use(statusRouter(host, violationMachine));
    // P73: compile path is wrapped in `compileWithViolationGuard` so each
    // compile pass advances / demotes the violation machine atomically. The
    // `currentVersion` supplier lets the machine record the workspace
    // version at which the last CLEAN compile landed, mirroring ETag
    // semantics in the time-travel stack.
    app.use(
      compileRouter(host, state, clientManager, {
        machine: violationMachine,
        currentVersion: () => versionManager.getVersion(),
      }),
    );
    app.use(irRouter(host));
    app.use(diagnosticsRouter(host));
    app.use(tensionsRouter(host));
    app.use(classifyRouter(host));
    const snapshotStore: SnapshotStore = new Map();
    app.use(snapshotRouter(host, snapshotStore, clientManager));
    app.use(invalidateRouter(host, clientManager));
    // CP-5 scaffold: /api/* prefix tree + /api/health
    const prefixes = registerRoutes(app, host, { startedAt: state.startedAt });

    // Admin reset — mounts on `/api` so the full path is
    // `/api/health/reset`. Invisible when the admin token is unset.
    const adminToken = options.adminToken ?? process.env[ADMIN_TOKEN_ENV];
    app.use(
      '/api',
      adminResetRouter({
        state,
        adminToken,
        healthCheckOptions: (): HealthCheckOptions => {
          const hcOptions: HealthCheckOptions =
            options.fleetPolicyFile !== undefined
              ? { host, fleetPolicyFile: options.fleetPolicyFile }
              : { host };
          return hcOptions;
        },
        auditSink: adminResetAuditSink,
      }),
    );
    // Pulse 64: /api/oc/ workspace schema introspection
    prefixes.oc.use('/', workspaceSchemaRouter(host, { workspaceRoot }));
    // Pulse 37: /api/oc/HEARTBEAT.md/schedule — calendar-renderable view
    // over the Schedule H2 section. Must mount BEFORE the generic Layer 1
    // router so its `/:file/section/:heading` pattern does not swallow
    // the `/HEARTBEAT.md/schedule` path first.
    prefixes.oc.use('/', scheduleRouter({ workspaceRoot }));
    // Pulse 36: /api/oc/MEMORY.md Loop sync formatter (GET ?loop=true,
    // PATCH with sectionId+content). Must mount BEFORE the generic
    // Layer 1 router so the PATCH handler intercepts MEMORY.md writes
    // ahead of the generic 501 OC_PATCH_NOT_IMPLEMENTED responder, and
    // GET falls through to the generic router when `?loop=true` is
    // absent so existing partners see no behavioural change.
    //
    // CP-7 R2 FIX-H RC1 — `auditSink` + `policyVersion` are threaded so
    // every successful MEMORY.md PATCH emits an `OC_FILE_EDIT` entry on
    // the same HMAC chain as the session-config + trust surfaces.
    prefixes.oc.use(
      '/',
      loopMemoryRouter({
        workspaceRoot,
        host,
        auditSink: auditChainSink,
        policyVersion,
      }),
    );
    // Pulse 35: /api/oc/SOUL.md Loop sync formatter (GET ?view=loop,
    // PATCH with sectionId+content). Mounts BEFORE the generic Layer 1
    // router so the PATCH handler intercepts SOUL.md writes ahead of the
    // generic 501 OC_PATCH_NOT_IMPLEMENTED responder; GET falls through
    // when `?view=loop` is absent so existing clients see no change.
    //
    // CP-7 R2 FIX-H RC1 — `auditSink` + `policyVersion` are threaded so
    // every successful SOUL.md PATCH emits an `OC_FILE_EDIT` entry and
    // compile-undefined fast-paths fail closed with 503.
    prefixes.oc.use(
      '/',
      loopSoulRouter(host, {
        workspaceRoot,
        auditSink: auditChainSink,
        policyVersion,
      }),
    );
    // Pulse 27: /api/oc/{file} generic Layer 1 router + /api/governance + /api/status
    prefixes.oc.use('/', ocGenericRouter(host, { workspaceRoot }));
    prefixes.governance.use('/', governanceRouter(host));
    prefixes.status.use(
      '/',
      apiStatusRouter(host, {
        startedAt: state.startedAt,
        machine: violationMachine,
      }),
    );
    // Pulse 24: /api/chunks/general/identity + /api/chunks/preferences/*
    prefixes.chunks.use('/', chunksGeneralRouter(host, { workspaceRoot }));
    prefixes.chunks.use('/', chunksPreferencesRouter(host, { workspaceRoot }));
    // Pulse 25: /api/chunks/connections[:server]
    prefixes.chunks.use('/', chunksConnectionsRouter(host, { workspaceRoot }));
    // Pulse 26: /api/chunks/memory, /groups, /entitlements
    prefixes.chunks.use('/', chunksMemoryRouter(host, { workspaceRoot }));
    prefixes.chunks.use('/', chunksGroupsRouter(host, { workspaceRoot }));
    prefixes.chunks.use('/', chunksEntitlementsRouter(host, { workspaceRoot }));
    // Pulse 31: PATCH /api/chunks/:tab — write path for CAP settings.
    const editor = new StructuredEditor({ workspaceRoot });
    // Pulse 33: PATCH /api/chunks/connections/allow-all — bulk "enable all
    // non-R5 tools". Must mount BEFORE patchShapeMiddleware because the
    // allow-all endpoint has no EditOperation body.
    // Allow-all must honour the same degraded-mode guard as the per-tool
    // PATCH and batch routes (cluster A M7). The guard is mounted as
    // route-local middleware BEFORE the allow-all handler so a bulk flip
    // in degraded mode surfaces 503 with the same envelope as PATCH.
    prefixes.chunks.patch(
      '/connections/allow-all',
      (_req, res, next): void => {
        const reason = degradedModeProbe();
        if (reason !== undefined) {
          res.status(503).json(degradedModeErrorBody(reason));
          return;
        }
        next();
      },
    );
    prefixes.chunks.use(
      '/',
      allowAllRouter(host, {
        workspaceRoot,
        editor,
        pipelineFactory: allowAllPipelineFactory,
      }),
    );
    prefixes.chunks.patch('*', patchShapeMiddleware());
    // Pulse 67: `?dryRun=true` query flag — stamps req.isDryRun so the
    // handler can short-circuit after validation and skip the write.
    prefixes.chunks.patch('*', dryRunMiddleware());
    prefixes.chunks.use(
      '/',
      patchChunksRouter(host, {
        workspaceRoot,
        editor,
        pipelineFactory,
        auditSink,
        // CP-6 R3 security M-3 residual: pass the dry-run sink so
        // `?dryRun=true` probes are recorded. Defaults to the JSONL
        // sink constructed above.
        dryRunAuditSink,
        // Degraded-mode guard (S33): closes writes when the startup
        // health check or a subsequent mode flip marks the server
        // degraded. The probe re-reads `state` on every request so mode
        // changes take effect without re-binding the router.
        degradedModeProbe,
      }),
    );

    // Pulse 38: GET /api/workqueue — merged HEARTBEAT.md + runtime task
    // list for M365 To Do / Planner integration. Thin HTTP adapter over
    // `buildWorkQueue` (claws-sdk) + the persistent workqueue store
    // (`.claws/workqueue.json`).
    app.use('/api/workqueue', workqueueRouter(host, { workspaceRoot }));

    // Pulse 39: GET /api/trust + PATCH /api/trust/escalate — tier management
    // with manager-signed JWT approval (CP-7 gate). The signing key is
    // sourced once at mount. `options.trustSigningKey` is guaranteed
    // non-undefined at this point by the boot-time check above (CP-7 R1
    // C6). Tests pass the key explicitly; production deploys load it via
    // `startServer` from `claws.json` / env.
    //
    // `workspaceId` is the first 16 hex chars of sha256(workspaceRoot)
    // (CISO W4) — it scopes the JWT `aud` claim so a token minted for
    // workspace A cannot replay against workspace B even when both
    // share the signing key (fleet deployment scenario).
    // The top-of-createApp boot check above guarantees this is defined
    // when we reach this branch (compileFn is set); the local guard is
    // redundant but keeps the type narrow without an `as` cast.
    if (options.trustSigningKey === undefined) {
      // This is unreachable given the boot check at the top of createApp.
      /* c8 ignore next */
      throw new Error('[claws-serve] trust.signingKey missing at router mount');
    }
    const trustSigningKey = options.trustSigningKey;
    const workspaceId = deriveWorkspaceId(workspaceRoot);
    // CP-7 R1 ciso M2: `auditSink` emits TRUST_ESCALATION_GRANTED /
    // TRUST_ESCALATION_DENIED / TRUST_JWT_REPLAY_BLOCKED on every
    // escalate outcome.
    const trustManager = new TrustManager({
      workspaceRoot,
      signingKey: trustSigningKey,
      workspaceId,
      auditSink: auditChainSink,
      policyVersion,
    });
    app.set('trustManager', trustManager);
    app.set('workspaceId', workspaceId);
    app.use('/api/trust', trustRouter({ manager: trustManager }));

    // Pulse 61: GET /api/sessions — session model HTTP surface.
    // Four read endpoints (list, detail, runs, tools) back the Companion
    // App dashboard. Tool permissions are derived via `resolveSessionTools`
    // in claws-sdk — the route is a thin HTTP adapter, all policy stays
    // in the SDK.
    app.use('/api/sessions', sessionsRouter(host, { workspaceRoot }));

    // Pulse 65: PATCH /api/sessions/:id/config — per-session config edits.
    // Thin HTTP adapter over `editSessionConfig` (claws-sdk). Mounts on
    // `/api/sessions` so the PATCH path is `/api/sessions/:id/config`;
    // co-existing with the sessions router is safe because sessionsRouter
    // only binds GET verbs on the same prefix.
    //
    // CP-7 R1 C5 / dragon M-3 — the trust-tier gate inside the handler
    // reads the current tier off this singleton `TrustManager` on every
    // request, so an escalation lands in the same process without a
    // rebind. The ETag / commit / violation-gate stack is mounted above
    // at `/api/sessions/:id/config`; per-delta tier minimums (T1 for
    // cron tool-add, T2 for schedule-set / agent revoke-set) are
    // enforced after the record is loaded so the 403 carries session
    // context.
    app.use(
      '/api/sessions',
      sessionConfigRouter(host, {
        workspaceRoot,
        trustManager,
        auditSink: auditChainSink,
        policyVersion,
      }),
    );

    // Pulse 71: GET /api/diff — structured governance diff between two
    // history points. Shares the VersionStore with the time-travel stack
    // (pulse 70) so `current`/`v<N>`/`snap:<name>`/`<iso-date>` resolve
    // consistently across read and diff endpoints.
    app.use(
      '/api',
      diffRouter(host, {
        resolver: {
          store: versionStore,
          workspaceRoot,
          autoSnapshots: autoSnapshotManager,
        },
      }),
    );

    // Pulse 68: POST /api/batch — atomic multi-operation batch edits.
    // Dry-run middleware runs first so the handler sees req.isDryRun.
    app.post('/api/batch', dryRunMiddleware());
    app.use(
      '/api/batch',
      batchRouter(host, {
        workspaceRoot,
        editor,
        pipelineFactory,
        // CP-6 R3 L1 — same JSONL sink the patch-chunks router uses.
        // Without this, batch rollbacks silently fall back to the no-op
        // DEFAULT_BATCH_AUDIT_SINK and the F1 parity wiring is defeated
        // in production despite passing in tests that inject their own.
        auditSink,
        degradedModeProbe,
      }),
    );
  } else {
    // No compileFn — status returns 501
    app.use(statusRouter());
  }

  // 404 for unknown routes and centralized error serializer.
  // Must come after all route registrations.
  app.use(notFoundHandler());
  app.use(errorHandler());

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
    mode: 'healthy' as ServerMode,
  };

  const noWs = options.noWs ?? false;
  const host = options.host ?? DEFAULT_HOST;

  let clientManager: ClientManager | undefined;
  if (!noWs) {
    clientManager = new ClientManager();
  }

  // Production: ETag precondition is ON by default. Operators can still
  // opt out via `requireETag: false`, matching the CLI knob for legacy
  // clients that cannot round-trip the header yet.
  const productionOptions: ServerOptions = {
    ...options,
    requireETag: options.requireETag ?? true,
  };
  const app = createApp(state, productionOptions, clientManager);
  const port = resolvePort(options);

  if (host === '0.0.0.0') {
    console.warn('WARNING: Server exposed to network without authentication. Use a reverse proxy for production.');
  }

  const server = app.listen(port, host);

  // Startup health check (S33): run a full compile and verify the fleet
  // policy is loadable. On failure the server enters degraded mode —
  // reads continue but PATCH returns 503 with the diagnostic context.
  //
  // The CompilationHost used here is the SAME instance createApp built for
  // the request-path routes; sharing it avoids the A8 duplicate-host bug
  // where startup + runtime caches diverged.
  if (options.compileFn !== undefined) {
    const sharedHost = app.get('compilationHost') as CompilationHost | undefined;
    if (sharedHost !== undefined) {
      const healthOptions: HealthCheckOptions =
        options.fleetPolicyFile !== undefined
          ? { host: sharedHost, fleetPolicyFile: options.fleetPolicyFile }
          : { host: sharedHost };
      void runStartupHealthCheck(healthOptions).then((result) => {
        state.mode = result.mode;
        if (result.reason !== undefined) {
          state.degradedReason = result.reason;
        }
      });
    }
  }

  // Attach WebSocket upgrade handling if WS is enabled
  if (clientManager !== undefined) {
    const wss = new WebSocketServer({ server, path: '/ws' });
    attachWsHandler(wss, clientManager, host, options.allowedOrigins);
  }

  registerGracefulShutdown(server, clientManager);

  return { server, state, clientManager };
}
