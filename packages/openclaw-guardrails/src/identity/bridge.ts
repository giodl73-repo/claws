/**
 * @bic/openclaw-guardrails/identity — OIDC/SAML token validation + IdentityBridge.
 *
 * Validates pre-decoded token payloads against expected issuer, audience,
 * and expiration. Signature verification is performed by a transport-level
 * library before calling these functions — the subpath is about claim
 * validation and bridge-shape mapping, not crypto.
 *
 * `createIdentityBridge` returns an `IdentityBridge` (default-export shape)
 * that maps decoded `TokenIdentity` to `AgentIdentity` so hosts wiring
 * `HostContext.identityBridge` have a working reference impl out of the box.
 */

import type { AgentIdentity, IdentityBridge } from '../types.js';
import type {
  IdentityProtocol,
  TokenIdentity,
  TokenPayload,
  ValidationConfig,
  ValidationResult,
} from './types.js';

const DEFAULT_CLOCK_SKEW_SECONDS = 30;

export function validateOidc(
  payload: TokenPayload,
  config: ValidationConfig,
  now?: Date,
): ValidationResult {
  return validateToken(payload, config, 'oidc', now);
}

export function validateSaml(
  payload: TokenPayload,
  config: ValidationConfig,
  now?: Date,
): ValidationResult {
  return validateToken(payload, config, 'saml', now);
}

function validateToken(
  payload: TokenPayload,
  config: ValidationConfig,
  protocol: IdentityProtocol,
  now?: Date,
): ValidationResult {
  const reference = now ?? new Date();
  const clockSkew = config.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS;

  if (payload.iss !== config.issuer) {
    return {
      valid: false,
      error: `Issuer mismatch: expected "${config.issuer}", got "${payload.iss}"`,
    };
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(config.audience)) {
    return {
      valid: false,
      error: `Audience mismatch: expected "${config.audience}", got "${audiences.join(', ')}"`,
    };
  }

  const expWithSkew = payload.exp + clockSkew;
  const nowSeconds = Math.floor(reference.getTime() / 1000);
  if (nowSeconds > expWithSkew) {
    return {
      valid: false,
      error: `Token expired: exp=${payload.exp}, now=${nowSeconds} (skew=${clockSkew}s)`,
    };
  }

  const notBefore = payload.nbf ?? payload.iat;
  const nbfWithSkew = notBefore - clockSkew;
  if (nowSeconds < nbfWithSkew) {
    return {
      valid: false,
      error: `Token not yet valid: nbf=${notBefore}, now=${nowSeconds} (skew=${clockSkew}s)`,
    };
  }

  const identity = resolveIdentity(payload, protocol);
  return { valid: true, identity };
}

export function resolveIdentity(
  payload: TokenPayload,
  protocol: IdentityProtocol,
): TokenIdentity {
  const { sub, iss, exp, iat, email, name, groups, tid, ...rest } = payload;
  return {
    subject: sub,
    issuer: iss,
    protocol,
    groups: groups ?? [],
    expiresAt: new Date(exp * 1000).toISOString(),
    issuedAt: new Date(iat * 1000).toISOString(),
    claims: { sub, iss, exp, iat, email, name, groups, tid, ...rest },
    ...(tid !== undefined && { tenantId: tid }),
    ...(email !== undefined && { email }),
    ...(name !== undefined && { name }),
  };
}

/**
 * OBO (on-behalf-of) token exchange. The default implementation delegates to
 * an injected `exchangeFn`; the reference fallback concatenates inputs and
 * is suitable only for development.
 */
export async function exchangeOboToken(
  userToken: string,
  agentId: string,
  exchangeFn?: (userToken: string, agentId: string) => Promise<string>,
): Promise<string> {
  if (exchangeFn) {
    return exchangeFn(userToken, agentId);
  }
  if (userToken.length === 0) {
    throw new Error('userToken required for OBO exchange');
  }
  if (agentId.length === 0) {
    throw new Error('agentId required for OBO exchange');
  }
  return `obo:${agentId}:${userToken}`;
}

/** In-memory CRL cache. Hosts wire to an introspection endpoint in production. */
export interface RevocationCache {
  revoked: Set<string>;
}

export function createRevocationCache(): RevocationCache {
  return { revoked: new Set() };
}

export function revokePrincipal(cache: RevocationCache, principal: string): RevocationCache {
  const revoked = new Set(cache.revoked);
  revoked.add(principal);
  return { revoked };
}

export function isRevoked(cache: RevocationCache, principal: string): boolean {
  return cache.revoked.has(principal);
}

// ---------------------------------------------------------------------------
// IdentityBridge reference implementation
// ---------------------------------------------------------------------------

export interface IdentityBridgeConfig {
  issuer: string;
  audience: string;
  protocol?: IdentityProtocol;
  clockSkewSeconds?: number;
  /** Decode a raw token string to a claims payload (caller supplies). */
  tokenDecoder: (token: string) => TokenPayload;
  /** OBO exchange function — see `exchangeOboToken`. */
  exchangeFn?: (userToken: string, agentId: string) => Promise<string>;
  /** Optional revocation cache; defaults to an empty in-memory one. */
  revocationCache?: RevocationCache;
  /** Optional agent-id resolver. Defaults to `payload.sub`. */
  resolveAgentId?: (payload: TokenPayload, identity: TokenIdentity) => string;
}

function toAgentIdentity(
  identity: TokenIdentity,
  agentId: string,
  now: Date,
  payload: TokenPayload,
): AgentIdentity {
  const tenantId = identity.tenantId ?? (typeof payload.tid === 'string' ? payload.tid : '');
  return {
    agentId,
    tenantId,
    principal: identity.subject,
    claims: identity.claims,
    obo: {
      issuedAt: now.toISOString(),
      expiresAt: identity.expiresAt,
    },
  };
}

/**
 * Build an `IdentityBridge` from an `IdentityBridgeConfig`. Maps decoded
 * `TokenIdentity` to `AgentIdentity`, wraps OBO exchange, and honors a
 * `RevocationCache`.
 */
export function createIdentityBridge(config: IdentityBridgeConfig): IdentityBridge {
  const protocol = config.protocol ?? 'oidc';
  const revocation = config.revocationCache ?? createRevocationCache();
  const resolveAgentId =
    config.resolveAgentId ?? ((payload: TokenPayload) => payload.sub);

  let cache = revocation;

  return {
    async verify(token: string): Promise<AgentIdentity> {
      const payload = config.tokenDecoder(token);
      const validator = protocol === 'oidc' ? validateOidc : validateSaml;
      const result = validator(payload, {
        issuer: config.issuer,
        audience: config.audience,
        ...(config.clockSkewSeconds !== undefined && {
          clockSkewSeconds: config.clockSkewSeconds,
        }),
      });
      if (!result.valid || result.identity === undefined) {
        throw new Error(result.error ?? 'Token validation failed');
      }
      if (isRevoked(cache, result.identity.subject)) {
        throw new Error(`Principal "${result.identity.subject}" is revoked`);
      }
      const agentId = resolveAgentId(payload, result.identity);
      return toAgentIdentity(result.identity, agentId, new Date(), payload);
    },
    async exchange(userToken: string, agentId: string): Promise<string> {
      return exchangeOboToken(userToken, agentId, config.exchangeFn);
    },
    async revoke(principal: string): Promise<void> {
      cache = revokePrincipal(cache, principal);
    },
  };
}
