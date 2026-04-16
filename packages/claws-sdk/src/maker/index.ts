/**
 * Maker module — skill scaffolding, annotation, and import engine.
 *
 * @module claws-sdk/maker
 */

export {
  makerScaffold,
  getTemplate,
  getAllTemplates,
  validateTemplateCategory,
  validateSkillName,
} from './scaffold.js';

export type {
  TemplateCategory,
  RiskLevel,
  GovernanceTier,
  GovernanceFrontmatter,
  SkillTemplate,
  AnnotationSuggestion,
  PublishPayload,
  ManifestEntry,
  MakerScaffoldOptions,
  MakerScaffoldResult,
  ScaffoldFile,
} from './types.js';

export { TEMPLATE_CATEGORIES } from './types.js';

export { communicationTemplate } from './templates/communication.js';
export { dataProcessingTemplate } from './templates/data-processing.js';
export { browserAutomationTemplate } from './templates/browser-automation.js';
export { developerToolsTemplate } from './templates/developer-tools.js';
export { baseTemplate } from './templates/base.js';

export {
  makerAnnotate,
  detectOboCapabilities,
  inferRiskLevel,
  suggestDataLabels,
} from './annotate.js';

export type {
  OboCapabilityType,
  OboFinding,
  DataLabelSuggestion,
  DecoratorSuggestion,
  AnnotateDiagnostic,
  MakerAnnotateOptions,
  MakerAnnotateResult,
} from './annotate.js';

export {
  makerImport,
} from './import.js';

export type {
  MakerImportOptions,
  ImportManifestEntry,
  MakerImportResult,
} from './import.js';

export {
  generateManifest,
  verifyManifest,
  sha256,
  hmacSign,
  hmacVerify,
  MIN_KEY_BYTES,
} from './manifest.js';

export type {
  BuildProvenance,
  SignatureStatus,
  ClawsManifest,
  GenerateManifestOptions,
} from './manifest.js';

export {
  makerPublish,
  pinchPreflight,
  evaluateTier,
} from './publish.js';

export { tierMeetsMinimum, TIER_ORDER } from './types.js';

export type {
  SecurityWarning,
  PinchPreflightResult,
  TierEvaluationResult,
  VersionBadge,
  RegistryClient,
  RegistryPublishPayload,
  RegistryPublishResult,
  FleetPublishPolicy,
  MakerPublishOptions,
  MakerPublishResult,
} from './publish.js';

export {
  generateBadgeMetadata,
  resolveQualifier,
  buildSupplyChainBadge,
  preBadge,
} from './badge.js';

export type {
  BadgeGenerationInput,
} from './badge.js';

export {
  detectInconsistencies,
} from './badge-consistency.js';

export type {
  ConsistencyInput,
} from './badge-consistency.js';

export type {
  BadgeMetadata,
  BadgeQualifier,
  BadgeStaleness,
  BadgeInconsistency,
  BadgePolicy,
  SupplyChainBadge,
  PreBadge,
} from './badge-types.js';

export {
  computeHandlerHash,
  checkStaleness,
  BadgeStore,
  reverifyBadge,
  applyReverification,
} from './badge-staleness.js';

export type {
  StalenessCheckResult,
  StalenessCheckInput,
  VersionBadgeEntry,
  ReverifyInput,
  ReverifyResult,
} from './badge-staleness.js';

export {
  evaluateEnterprisePolicy,
  resolveDataSensitivity,
  minimumTierForSensitivity,
  suggestClosestTier,
  suggestClosestSensitivity,
  suggestClosestEnum,
  validateGovernanceTier,
  validateDataSensitivity,
  disambiguateYamlNull,
} from './badge-policy.js';

export type {
  DataSensitivity,
  RiskTierMinimum,
  EnterpriseFleetPolicy,
  PolicyViolation,
  EnterprisePolicyInput,
  EnterprisePolicyResult,
  YamlNullDisambiguation,
} from './badge-policy.js';

export {
  DATA_SENSITIVITY_VALUES,
  GOVERNANCE_TIER_VALUES,
} from './badge-policy.js';
