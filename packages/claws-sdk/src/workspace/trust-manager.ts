/**
 * Trust-tier management (P-279 / S12 / S26) — the claws CP-7 gate module.
 *
 * Owns every tier-management decision so {@link import('../../../claws-serve/src/routes/trust.js')}
 * stays a thin HTTP adapter. Concretely:
 *
 * - Tier enum (T0..T4) with a transition table (T0→T1 is self-service, all
 *   higher hops require a manager-signed approval JWT).
 * - JWT verification with five mandatory checks — signature validity, `aud`
 *   claim, `sub` claim, `exp`, and one-time use (`jti` nonce). Any failure
 *   returns a specific {@link TrustError} so the HTTP layer maps to 401/403
 *   without re-implementing the decision tree.
 * - Persisted nonce store at `.claws/cache/jwt-nonces.json` so replay
 *   protection survives restart. Entries expire when the underlying JWT's
 *   `exp` is reached (default 5 minutes) and are pruned lazily on access
 *   plus on an explicit {@link pruneExpiredNonces} call.
 * - Tier history: every transition (self-service or approved) appends a
 *   record with `from`, `to`, ISO timestamp, justification, and approver
 *   (subject of the JWT, or `self` for T0→T1).
 *
 * Only HS256 is supported — the claws enterprise threat model expects a
 * shared secret provisioned by the org admin ({@link TrustManagerOptions.signingKey}).
 * Key rotation lives outside this module: a call site rebinding the manager
 * with a fresh key invalidates every pending escalation without mutating
 * state on disk.
 *
 * @module claws-sdk/workspace/trust-manager
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { TrustTier } from '@bic/openclaw-workspace/path';
import type { AuditChainSink } from '../compliance/audit-chain.js';

/** Persisted nonce-store path relative to the workspace root. */
export const JWT_NONCE_STORE_FILE = '.claws/cache/jwt-nonces.json';

/** Default TTL for unused nonces. Matches the pulse spec (5 minutes). */
export const DEFAULT_NONCE_TTL_MS = 5 * 60 * 1000;

/**
 * Default clock-skew tolerance for JWT time-claim validation (30 seconds).
 *
 * Matches the `jose` / `jsonwebtoken` industry defaults. Covers the common
 * "manager laptop clock is a few seconds behind the serve host" case without
 * widening the replay window meaningfully — a 30s tolerance on `exp` still
 * rejects the overwhelming majority of forged / stolen tokens, and the
 * one-time `jti` nonce closes the replay path entirely.
 */
export const DEFAULT_JWT_LEEWAY_MS = 30_000;

/** Tier order — used for "is this a promotion?" and "requires approval?" checks. */
const TIER_ORDER: readonly TrustTier[] = ['T0', 'T1', 'T2', 'T3', 'T4'];

function tierIndex(tier: TrustTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * JWT required audience — requests must target the trust-escalation surface.
 *
 * The canonical audience string is the base prefix; per-workspace tokens
 * extend it with a scoped suffix, i.e. `claws/trust/escalate:<workspaceId>`
 * where `<workspaceId>` is the first 16 hex chars of `sha256(workspaceRoot)`.
 * The verifier accepts ONLY the scoped form when a workspace id is provided
 * — a bare `claws/trust/escalate` token without the suffix is replayable
 * across workspaces and rejected with {@link JWT_BAD_AUDIENCE} (CISO W4).
 */
export const TRUST_JWT_AUDIENCE = 'claws/trust/escalate';

/**
 * Derive the stable workspace-id fragment used in the scoped JWT audience.
 *
 * 16-hex-char (64-bit) SHA-256 prefix of the workspace root path; short
 * enough to keep audience strings readable, wide enough to avoid trivial
 * collisions across a realistic fleet (~100k workspaces). Deterministic
 * per-path so a JWT minted for workspace A cannot be replayed against
 * workspace B even when both share the signing key.
 */
export function deriveWorkspaceId(workspaceRoot: string): string {
  return createHash('sha256').update(workspaceRoot).digest('hex').slice(0, 16);
}

/** Build the scoped audience string for a given workspace id. */
export function scopedTrustAudience(workspaceId: string): string {
  return `${TRUST_JWT_AUDIENCE}:${workspaceId}`;
}

/** Discriminated union of every trust-operation error the manager surfaces. */
export type TrustError =
  | { readonly code: 'JWT_MISSING'; readonly message: string }
  | { readonly code: 'JWT_MALFORMED'; readonly message: string }
  | { readonly code: 'JWT_BAD_SIGNATURE'; readonly message: string }
  | { readonly code: 'JWT_BAD_AUDIENCE'; readonly message: string }
  | { readonly code: 'JWT_BAD_SUBJECT'; readonly message: string }
  | { readonly code: 'JWT_EXPIRED'; readonly message: string }
  | { readonly code: 'JWT_REPLAYED'; readonly message: string }
  | { readonly code: 'TIER_INVALID'; readonly message: string }
  | { readonly code: 'TIER_NOT_PROMOTION'; readonly message: string };

/** Outcome of a tier-escalation request. */
export type EscalateResult =
  | { readonly ok: true; readonly record: TierTransition }
  | { readonly ok: false; readonly error: TrustError };

/** One entry in the tier-history log. */
export interface TierTransition {
  readonly from: TrustTier;
  readonly to: TrustTier;
  readonly at: string;
  readonly justification: string;
  /** `self` for T0→T1 self-service; otherwise the JWT `sub` claim. */
  readonly approver: string;
}

/** Pending escalation awaiting a manager-signed JWT (currently always empty — approvals are inline). */
export interface PendingEscalation {
  readonly to: TrustTier;
  readonly requestedAt: string;
  readonly justification: string;
  readonly requestedBy: string;
}

/** Snapshot returned by {@link TrustManager.getState}. */
export interface TrustState {
  readonly currentTier: TrustTier;
  readonly history: readonly TierTransition[];
  readonly pendingEscalations: readonly PendingEscalation[];
}

/** Options for {@link TrustManager}. */
export interface TrustManagerOptions {
  readonly workspaceRoot: string;
  /** HS256 signing key. Raw bytes (caller decides file/env resolution). */
  readonly signingKey: Buffer;
  /** Clock seam for deterministic tests. Defaults to `() => new Date()`. */
  readonly now?: () => Date;
  /** Nonce TTL in ms. Defaults to {@link DEFAULT_NONCE_TTL_MS}. */
  readonly nonceTtlMs?: number;
  /** Initial tier state — only exposed for rehydration from a prior store. */
  readonly initial?: TrustState;
  /**
   * Stable per-workspace identifier used to scope the JWT `aud` claim
   * (CISO W4). When omitted, defaults to `deriveWorkspaceId(workspaceRoot)`.
   * Callers who already compute the id upstream (e.g. the serve process
   * threading the same id into audit events) can pass it through here so
   * the audience string matches exactly.
   */
  readonly workspaceId?: string;
  /**
   * Clock-skew tolerance (ms) applied to both `exp` and `iat` validation
   * (platform-eng W1). Defaults to {@link DEFAULT_JWT_LEEWAY_MS}. Tests
   * that pin the clock usually leave this at the default; production
   * deployments may widen it further when the manager issuance host is
   * known to drift.
   */
  readonly leewayMs?: number;
  /**
   * Optional audit-chain sink (CP-7 R1 ciso M2). When supplied the manager
   * emits one signed chain entry per tier-escalation outcome:
   *
   *   - `TRUST_ESCALATION_GRANTED` on a successful escalate
   *   - `TRUST_ESCALATION_DENIED` on any {@link TrustError} code
   *   - `TRUST_JWT_REPLAY_BLOCKED` when a nonce has already been consumed
   *
   * Every entry carries `actor` = caller-supplied requester (or
   * `resolveActor()` fallback), `target` = workspace root, a stable
   * `ruleId` per event type, and the caller-supplied `policyVersion`.
   * Omitting the sink (tests / purely-SDK consumers) silences audit
   * emission; the manager's control flow is otherwise identical.
   */
  readonly auditSink?: AuditChainSink;
  /**
   * Policy version recorded alongside every emitted audit entry. Production
   * deployments source this from `claws.json`; tests pin it for
   * determinism. Defaults to `'unknown'` when omitted (matches the
   * fallback used by {@link readPolicyVersion}).
   */
  readonly policyVersion?: string;
}

/** JWT payload shape expected by {@link TrustManager.verifyApprovalJwt}. */
export interface TrustApprovalClaims {
  readonly iss?: string;
  readonly sub: string;
  readonly aud: string;
  readonly exp: number;
  readonly iat?: number;
  readonly jti: string;
  readonly targetTier: TrustTier;
  readonly requester: string;
}

interface NonceRecord {
  readonly jti: string;
  readonly expMs: number;
}

interface NonceEnvelope {
  readonly version: 1;
  readonly nonces: readonly NonceRecord[];
}

/**
 * In-memory + on-disk trust-tier authority.
 *
 * Call {@link hydrate} once at startup so persisted nonces are loaded before
 * the first verify; without hydration, a server restart opens a replay
 * window until the first write flushes the file.
 */
export class TrustManager {
  private readonly options: Required<Omit<TrustManagerOptions, 'initial' | 'auditSink' | 'policyVersion'>>;
  private readonly nonceStorePath: string;
  private readonly expectedAudience: string;
  private readonly auditSink: AuditChainSink | undefined;
  private readonly policyVersion: string;
  private nonces: Map<string, number> = new Map();
  private state: TrustState;
  private hydrated = false;

  constructor(options: TrustManagerOptions) {
    const workspaceId = options.workspaceId ?? deriveWorkspaceId(options.workspaceRoot);
    this.options = {
      workspaceRoot: options.workspaceRoot,
      signingKey: options.signingKey,
      now: options.now ?? ((): Date => new Date()),
      nonceTtlMs: options.nonceTtlMs ?? DEFAULT_NONCE_TTL_MS,
      workspaceId,
      leewayMs: options.leewayMs ?? DEFAULT_JWT_LEEWAY_MS,
    };
    this.expectedAudience = scopedTrustAudience(workspaceId);
    this.nonceStorePath = join(options.workspaceRoot, JWT_NONCE_STORE_FILE);
    this.auditSink = options.auditSink;
    this.policyVersion = options.policyVersion ?? 'unknown';
    this.state = options.initial ?? {
      currentTier: 'T0',
      history: [],
      pendingEscalations: [],
    };
  }

  /**
   * Stable workspace-scoped audience string this manager accepts
   * (`claws/trust/escalate:<workspaceId>`). Exposed so issuance tooling
   * (and {@link signApprovalJwt}) can mint tokens with the matching
   * aud without reimplementing the suffix derivation.
   */
  getExpectedAudience(): string {
    return this.expectedAudience;
  }

  /** Load persisted nonces. Call once before the first verify. */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const raw = await readFile(this.nonceStorePath, 'utf-8');
      const parsed = JSON.parse(raw) as NonceEnvelope;
      if (parsed.version !== 1 || !Array.isArray(parsed.nonces)) return;
      const nowMs = this.options.now().getTime();
      for (const entry of parsed.nonces) {
        if (entry.expMs > nowMs) {
          this.nonces.set(entry.jti, entry.expMs);
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      // Corrupt store — treat as empty so the server still answers. The
      // operator can see the failure in logs without a crash.
      // eslint-disable-next-line no-console
      console.error('[trust-manager] nonce store unreadable; starting empty:', err);
    }
  }

  /** Current tier + history + pending escalations. */
  getState(): TrustState {
    return this.state;
  }

  /**
   * Drop every nonce whose JWT has expired. Called automatically inside
   * {@link verifyApprovalJwt} and {@link recordNonce}; exposed so callers
   * can run a housekeeping sweep on idle.
   */
  pruneExpiredNonces(): void {
    const nowMs = this.options.now().getTime();
    for (const [jti, expMs] of this.nonces) {
      if (expMs <= nowMs) this.nonces.delete(jti);
    }
  }

  /**
   * Perform all five JWT checks in a single pass. Returns the parsed claims
   * on success so the caller can thread `sub` into the history record.
   *
   * NOTE: success does NOT consume the nonce — the caller must subsequently
   * call {@link recordNonce} only after the escalation has actually taken
   * effect. This keeps dry-run-style previews possible, but every production
   * code path in this file pairs verify + record atomically under a single
   * call to {@link escalate}.
   */
  async verifyApprovalJwt(token: string): Promise<
    | { readonly ok: true; readonly claims: TrustApprovalClaims }
    | { readonly ok: false; readonly error: TrustError }
  > {
    await this.hydrate();
    this.pruneExpiredNonces();

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { ok: false, error: { code: 'JWT_MALFORMED', message: 'JWT must have 3 parts' } };
    }
    const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

    let header: { alg?: string; typ?: string };
    let payload: TrustApprovalClaims;
    try {
      header = JSON.parse(base64UrlDecode(headerB64).toString('utf-8')) as typeof header;
      payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf-8')) as TrustApprovalClaims;
    } catch {
      return { ok: false, error: { code: 'JWT_MALFORMED', message: 'header/payload not JSON' } };
    }
    if (header.alg !== 'HS256') {
      return { ok: false, error: { code: 'JWT_MALFORMED', message: 'only HS256 supported' } };
    }

    // (1) signature
    const expected = createHmac('sha256', this.options.signingKey)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const provided = base64UrlDecode(signatureB64);
    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      return { ok: false, error: { code: 'JWT_BAD_SIGNATURE', message: 'signature mismatch' } };
    }

    // (2) audience — scoped to this workspace so a JWT minted for
    // workspace A cannot replay against workspace B (CISO W4). The
    // expected string is `claws/trust/escalate:<workspaceId>`; the
    // bare `claws/trust/escalate` prefix is rejected here so every
    // deployed token carries the workspace binding.
    if (payload.aud !== this.expectedAudience) {
      return {
        ok: false,
        error: {
          code: 'JWT_BAD_AUDIENCE',
          message: `aud must be ${this.expectedAudience}`,
        },
      };
    }

    // (3) subject — must be non-empty (the approving manager's id).
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return { ok: false, error: { code: 'JWT_BAD_SUBJECT', message: 'sub claim missing or empty' } };
    }

    // (4) expiry / issued-at — both get a symmetric leeway window so
    // small clock drift between the manager's issuance host and the
    // serve host does not spuriously reject legitimate tokens
    // (platform-eng W1). `exp` allows tokens that expired within the
    // leeway; `iat` rejects tokens dated in the future by more than
    // the leeway (future-dated iat is the classic "issued by a
    // compromised backdated clock" signal).
    const nowMs = this.options.now().getTime();
    const leewayMs = this.options.leewayMs;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 + leewayMs <= nowMs) {
      return { ok: false, error: { code: 'JWT_EXPIRED', message: 'token expired' } };
    }
    if (typeof payload.iat === 'number' && payload.iat * 1000 > nowMs + leewayMs) {
      return {
        ok: false,
        error: {
          code: 'JWT_MALFORMED',
          message: 'iat claim is in the future beyond leeway',
        },
      };
    }

    // (5) one-time use — reject any jti already in the persisted store.
    if (typeof payload.jti !== 'string' || payload.jti.length === 0) {
      return { ok: false, error: { code: 'JWT_MALFORMED', message: 'jti claim missing' } };
    }
    if (this.nonces.has(payload.jti)) {
      return { ok: false, error: { code: 'JWT_REPLAYED', message: 'jti already consumed' } };
    }

    return { ok: true, claims: payload };
  }

  /**
   * Promote the current tier. T0→T1 is self-service; every other hop requires
   * a valid JWT whose `targetTier` matches the request and whose `jti` has
   * not been seen before. On success, the history log grows and the nonce
   * is persisted so a replay cannot land after a restart.
   */
  async escalate(input: {
    readonly targetTier: TrustTier;
    readonly justification: string;
    readonly requester: string;
    readonly jwt?: string;
  }): Promise<EscalateResult> {
    const current = this.state.currentTier;
    const currentIdx = tierIndex(current);
    const targetIdx = tierIndex(input.targetTier);
    if (targetIdx < 0) {
      const error: TrustError = { code: 'TIER_INVALID', message: `unknown tier ${input.targetTier}` };
      this.emitEscalationDenied(input, error);
      return { ok: false, error };
    }
    if (targetIdx <= currentIdx) {
      const error: TrustError = {
        code: 'TIER_NOT_PROMOTION',
        message: `cannot escalate from ${current} to ${input.targetTier}`,
      };
      this.emitEscalationDenied(input, error);
      return { ok: false, error };
    }

    // T0 → T1 self-service. Any higher hop requires an approval JWT.
    const selfService = current === 'T0' && input.targetTier === 'T1';
    let approver = 'self';
    if (!selfService) {
      if (input.jwt === undefined || input.jwt.length === 0) {
        const error: TrustError = { code: 'JWT_MISSING', message: 'T1+ promotion requires approval JWT' };
        this.emitEscalationDenied(input, error);
        return { ok: false, error };
      }
      const verified = await this.verifyApprovalJwt(input.jwt);
      if (!verified.ok) {
        // Distinguish replay rejection (CISO M2 / TRUST_JWT_REPLAY_BLOCKED)
        // from every other JWT denial so SIEM exporters can alert on
        // replay attempts without scanning free-form messages.
        if (verified.error.code === 'JWT_REPLAYED') {
          this.emitReplayBlocked(input);
        } else {
          this.emitEscalationDenied(input, verified.error);
        }
        return { ok: false, error: verified.error };
      }

      // CISO M4 — consume the nonce IMMEDIATELY after the signature/aud/
      // sub/exp/jti checks pass, BEFORE any tier-shape validation. Once
      // the JWT has proven cryptographically valid the attacker has had
      // their one chance; any subsequent path — tier mismatch, downgrade,
      // unknown tier — must still burn the token. Otherwise an attacker
      // with a valid T1→T2 JWT can probe {T3, T4, T9, T0, ...} without
      // consuming the nonce, then finally submit the matching tier.
      await this.recordNonce(verified.claims.jti, verified.claims.exp * 1000);

      if (verified.claims.targetTier !== input.targetTier) {
        const error: TrustError = {
          code: 'JWT_BAD_SUBJECT',
          message: `JWT targetTier ${verified.claims.targetTier} != requested ${input.targetTier}`,
        };
        this.emitEscalationDenied(input, error);
        return { ok: false, error };
      }
      approver = verified.claims.sub;
    }

    const record: TierTransition = {
      from: current,
      to: input.targetTier,
      at: this.options.now().toISOString(),
      justification: input.justification,
      approver,
    };
    this.state = {
      currentTier: input.targetTier,
      history: [...this.state.history, record],
      pendingEscalations: [],
    };
    this.emitEscalationGranted(input, record);
    return { ok: true, record };
  }

  /** Emit TRUST_ESCALATION_GRANTED when escalate() succeeds. */
  private emitEscalationGranted(
    input: { readonly targetTier: TrustTier; readonly justification: string; readonly requester: string },
    record: TierTransition,
  ): void {
    if (this.auditSink === undefined) return;
    this.auditSink.emit({
      eventType: 'TRUST_ESCALATION_GRANTED',
      actor: input.requester,
      target: this.options.workspaceRoot,
      action: `escalate ${record.from}->${record.to}`,
      outcome: 'granted',
      ruleId: 'TRUST_ESCALATION',
      severity: 3,
      policyVersion: this.policyVersion,
    });
  }

  /** Emit TRUST_ESCALATION_DENIED on any non-replay trust error. */
  private emitEscalationDenied(
    input: { readonly targetTier: TrustTier; readonly requester: string },
    error: TrustError,
  ): void {
    if (this.auditSink === undefined) return;
    this.auditSink.emit({
      eventType: 'TRUST_ESCALATION_DENIED',
      actor: input.requester,
      target: this.options.workspaceRoot,
      action: `escalate ${this.state.currentTier}->${input.targetTier}`,
      outcome: error.code,
      ruleId: 'TRUST_ESCALATION',
      severity: 4,
      policyVersion: this.policyVersion,
    });
  }

  /** Emit TRUST_JWT_REPLAY_BLOCKED when a jti is already consumed. */
  private emitReplayBlocked(
    input: { readonly targetTier: TrustTier; readonly requester: string },
  ): void {
    if (this.auditSink === undefined) return;
    this.auditSink.emit({
      eventType: 'TRUST_JWT_REPLAY_BLOCKED',
      actor: input.requester,
      target: this.options.workspaceRoot,
      action: `escalate ${this.state.currentTier}->${input.targetTier}`,
      outcome: 'replayed',
      ruleId: 'TRUST_JWT_REPLAY',
      severity: 5,
      policyVersion: this.policyVersion,
    });
  }

  /** Persist a consumed nonce so it cannot replay after restart. */
  async recordNonce(jti: string, expMs: number): Promise<void> {
    this.pruneExpiredNonces();
    this.nonces.set(jti, expMs);
    const envelope: NonceEnvelope = {
      version: 1,
      nonces: [...this.nonces.entries()].map(([j, e]) => ({ jti: j, expMs: e })),
    };
    await writeEnvelopeAtomic(this.nonceStorePath, envelope);
  }

  /**
   * Helper for tests / issuance tooling — sign an approval JWT with this
   * manager's key. Production approval flows sign the JWT elsewhere (the
   * manager never holds the private signing material in the serve process)
   * but the same HS256 primitive is reused here so unit tests don't have
   * to re-implement the token format.
   */
  signApprovalJwt(claims: Omit<TrustApprovalClaims, 'aud'> & { readonly aud?: string }): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    // Default aud to the workspace-scoped audience so tokens minted by
    // this manager are only accepted by verifiers bound to the same
    // workspace id (CISO W4). Callers who explicitly set `aud` — for
    // negative tests, or for the rare legitimate cross-tenant issuer
    // — override the default.
    const body: TrustApprovalClaims = { ...claims, aud: claims.aud ?? this.expectedAudience };
    const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header), 'utf-8'));
    const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(body), 'utf-8'));
    const signature = createHmac('sha256', this.options.signingKey)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    return `${headerB64}.${payloadB64}.${base64UrlEncode(signature)}`;
  }
}

/** Generate a fresh JWT-spec `jti` (128 bits of randomness, base64url). */
export function generateJti(): string {
  return base64UrlEncode(randomBytes(16));
}

function base64UrlEncode(buf: Buffer): string {
  const b64 = buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  let end = b64.length;
  while (end > 0 && b64.charCodeAt(end - 1) === 61) end -= 1;
  return b64.slice(0, end);
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

async function writeEnvelopeAtomic(target: string, envelope: NonceEnvelope): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  await writeFile(tmp, JSON.stringify(envelope, null, 2), 'utf-8');
  await rename(tmp, target);
}
