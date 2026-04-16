/**
 * Compliance — barrel export for all compliance modules.
 *
 * @module claws-sdk/compliance
 */

// Types
export type {
  ComplianceSeverity,
  ComplianceFinding,
  ControlStatus,
  SOC2ControlEvidence,
  SOC2Evidence,
  HIPAASafeguardEvidence,
  PHICoverageEntry,
  TransmissionGap,
  HIPAAEvidence,
  EUAIActAssessment,
  EURiskTier,
  AnnexIIICategory,
  DomainMarker,
  Article13Evaluation,
  Article14Evaluation,
  FundamentalRightsImpact,
  ObligationChecklistEntry,
  AsymmetricSignature,
} from './types.js';

// SOC2 evidence builder
export {
  buildSOC2Evidence,
  validateObservationPeriod,
  getSOC2ControlIds,
  getSOC2ControlDef,
  type SOC2BuilderOptions,
} from './soc2.js';

// HIPAA evidence builder
export {
  buildHIPAAEvidence,
  buildPHICoverage,
  detectTransmissionGaps,
  getHIPAASafeguardIds,
  getHIPAASafeguardDef,
  HIPAA_18_IDENTIFIERS,
  type HIPAABuilderOptions,
  type DeclaredPHIType,
  type ExternalTransmission,
  type BreachNotificationConfig,
} from './hipaa.js';

// EU AI Act assessment
export {
  buildEUAIActAssessment,
  buildAnnexIIIObligations,
  classifyRiskTier,
  evaluateArticle13,
  evaluateArticle14,
  getValidDomainMarkers,
  getAnnexIIICategory,
  type EUAIActConfig,
} from './eu-ai-act.js';

// Artifact signer — audit chain HMAC signing
export {
  signAuditEntry,
  verifyAuditEntry,
  type AuditChainEntry,
} from './artifact-signer.js';

// Artifact signer — compliance evidence signing (Ed25519 + HMAC-SHA256)
export {
  generateSigningKeyPair,
  storePrivateKey,
  hashEvidence,
  signEd25519,
  signHmac256,
  verifyEd25519,
  verifyHmac256,
  verifyEvidence,
  buildTimestampRequest,
  validateTsaUrl,
  validateTspResponse,
  requestTimestamp,
  type SigningMode,
  type SignedEvidence,
  type TimestampToken,
  type Ed25519KeyPair,
  type TimestampOptions,
} from './artifact-signer.js';

// Audit chain I/O
export {
  appendAuditEvent,
  readAuditChain,
  resolveActor,
  readPolicyVersion,
  type AuditEventInput,
} from './audit-chain.js';

// Manifest types
export {
  GOVERNANCE_MANIFEST_SCHEMA_VERSION,
  type GovernanceManifest,
  type GovernanceArtifact,
} from './manifest-types.js';

// Verification errors
export {
  VerificationError,
  ManifestMissingError,
  ManifestTamperedError,
  ArtifactHashMismatchError,
  VerificationTimeoutError,
  EmptyManifestError,
} from './verify-errors.js';

// Key resolvers
export {
  type KeyResolver,
  EnvKeyResolver,
  FileKeyResolver,
  NullKeyResolver,
} from './key-resolver.js';

// Blob integrity verification
export {
  verifyGovernanceArtifacts,
  type VerifyGovernanceArtifactsOptions,
  type VerifyGovernanceArtifactsResult,
} from './blob-verify.js';
