/**
 * @bic/openclaw-guardrails/identity — Core types per guardrails.md §/identity.
 *
 * `TokenIdentity` is the subpath-internal decoded-token shape (issuer,
 * subject, OIDC/SAML protocol, groups, expiry). The default-export
 * `AgentIdentity` is the agent-centric bridge shape. `createIdentityBridge`
 * maps one to the other.
 */

export type IdentityProtocol = 'oidc' | 'saml';

export interface TokenPayload {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nbf?: number;
  /** Tenant identifier — `tid` is standard in Entra ID / AAD tokens. */
  tid?: string;
  email?: string;
  name?: string;
  groups?: string[];
  [key: string]: unknown;
}

/**
 * Decoded token identity. Local to `/identity` — producers map it into
 * `AgentIdentity` via `createIdentityBridge` for host consumption.
 */
export interface TokenIdentity {
  subject: string;
  issuer: string;
  protocol: IdentityProtocol;
  tenantId?: string;
  email?: string;
  name?: string;
  groups: string[];
  expiresAt: string;
  issuedAt: string;
  claims: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  identity?: TokenIdentity;
  error?: string;
}

export interface ValidationConfig {
  issuer: string;
  audience: string;
  clockSkewSeconds?: number;
}

export interface Permission {
  resource: string;
  action: string;
}

export interface Role {
  name: string;
  permissions: Permission[];
}

export interface AccessDecision {
  granted: boolean;
  grantedBy?: string;
  reason?: string;
}
