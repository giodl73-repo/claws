/**
 * Publish pipeline module — manifest state, fleet policy, atomicity,
 * key resolution, and badge freshness.
 *
 * @module claws-sdk/publish
 */

export {
  detectManifestState,
  computeContentHash,
  extractSignableContent,
  parseManifestFields,
} from './manifest-state.js';
export type {
  ManifestState,
  ManifestData,
  ManifestStateResult,
} from './manifest-state.js';

export {
  evaluateFleetPolicy,
  readFleetPublishPolicy,
  defaultFleetPublishPolicy,
} from './fleet-policy.js';
export type {
  FleetPublishPolicy,
  FleetPolicyResult,
} from './fleet-policy.js';

export {
  executeTransaction,
  stageLocally,
  rollbackStaging,
  readStagedArtifacts,
  generateTxId,
} from './atomicity.js';
export type {
  StagedArtifact,
  TransactionState,
  TransactionResult,
  RegistryClient,
} from './atomicity.js';

export {
  resolveSigningKey,
  validateCiKeyFormat,
  useSigningKey,
} from './key-resolution.js';
export type {
  KeySource,
  KeyResolutionResult,
} from './key-resolution.js';

export {
  readFreshBadge,
  parseBadgeFromFrontmatter,
  readBadgeStore,
  writeBadgeVersion,
} from './badge.js';
export type {
  BadgeData,
  BadgeVersion,
  BadgeStore,
} from './badge.js';

export {
  publishToRegistry,
  queryRegistry,
  validatePackageForPublish,
} from './registry-client.js';
export type {
  RegistryPackage,
  RegistryArtifact,
  RegistryCredentials,
  PublishResult,
  RegistryQuery,
  RegistryQueryResult,
  QueryResult,
  PackageValidationIssue,
  PackageValidationResult,
} from './registry-client.js';
