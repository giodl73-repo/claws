/**
 * PROTECT command group — budget tracking, secrets vault, identity, alerts, limits.
 *
 * @module claws-sdk/protect
 */

export type {
  BudgetPeriod,
  BudgetReport,
  BudgetFleetReport,
  WorkspaceBudgetEntry,
  KeyDerivation,
  VaultConfig,
  IdentityProvider,
  IdentityConfig,
  ThresholdLevel,
  ThresholdAlert,
  EnforcementMode,
  BudgetLimit,
} from './types.js';

export {
  THRESHOLD_LEVELS,
  isThresholdLevel,
  createBudgetLimit,
} from './types.js';

export {
  budget,
  checkThresholds,
  evaluateEnforcement,
  type BudgetConfigJson,
  type EnforcementResult,
  type FullBudgetResult,
} from './budget.js';

export {
  budgetFleet,
  aggregateFleetBudget,
} from './budget-fleet.js';

export {
  init as vaultInit,
  set as vaultSet,
  get as vaultGet,
  list as vaultList,
  del as vaultDelete,
  deriveKey,
  defaultVaultConfig,
  readVaultKdf,
  isArgon2Available,
  resetArgon2Cache,
  setArgon2Available,
  DEFAULT_ARGON2_PARAMS,
  type Argon2Params,
} from './secrets.js';

export type {
  OidcProviderConfig,
  SamlProviderConfig,
  RoleMapping,
  FullIdentityConfig,
  PkceParams,
  PkceMethod,
  JwtClaims,
  JwksKey,
} from './identity.js';

export {
  configureIdentity,
  getIdentity,
  mapRoleToTier,
  validateOidcConfig,
  validateSamlConfig,
  generatePkce,
  verifyPkce,
  requirePkce,
  decodeJwt,
  verifyJwtSignature,
  validateJwtClaims,
  validateSamlCertChain,
} from './identity.js';
