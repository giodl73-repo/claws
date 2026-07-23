/**
 * @bic/openclaw-guardrails/identity
 *
 * OIDC/SAML token validation, OBO exchange, revocation cache, role-based
 * access control, and the `createIdentityBridge` factory that maps decoded
 * `TokenIdentity` to the default-export `AgentIdentity` for host consumption.
 */

export type {
  AccessDecision,
  IdentityProtocol,
  Permission,
  Role,
  TokenIdentity,
  TokenPayload,
  ValidationConfig,
  ValidationResult,
} from "./types.js";

export {
  createIdentityBridge,
  createRevocationCache,
  exchangeOboToken,
  isRevoked,
  resolveIdentity,
  revokePrincipal,
  validateOidc,
  validateSaml,
} from "./bridge.js";
export type { IdentityBridgeConfig, RevocationCache } from "./bridge.js";

export {
  addRole,
  authorize,
  checkAccess,
  createRoleStore,
  mapGroup,
  resolveRoles,
} from "./rbac.js";
export type { RoleStore } from "./rbac.js";
