/**
 * Workspace IR -- intermediate representation for OC workspace input.
 *
 * Complements the existing GovernanceIR (src/ir/) for the input side
 * of the claws compiler pipeline.
 *
 * @module claws-sdk/compiler/ir
 */

// ── Field types ───────────────────────────────────────────────────────
export type {
  TrustLevel,
  Platform,
  DiagnosticSeverity,
  FileReference,
  ParseDiagnostic,
} from './field-types.js';

// ── Workspace IR sub-types ────────────────────────────────────────────
export type {
  SoulBoundary,
  SoulIR,
  ToolDeclarationIR,
  ToolsIR,
  DelegationRule,
  AgentDefinitionIR,
  AgentsIR,
  DataSensitivity,
  MemoryEntryIR,
  MemoryIR,
  AuthMethod,
  RoleBinding,
  IdentityIR,
  UserIR,
  HeartbeatScheduleIR,
  HeartbeatIR,
  SkillMetadataIR,
  SkillsIR,
  LobsterStepIR,
  LobsterIR,
  WorkspaceCompilerMeta,
  OCWorkspaceIR,
} from './workspace-ir.js';

// ── Serialization ─────────────────────────────────────────────────────
export {
  serializeWorkspaceIR,
  deserializeWorkspaceIR,
} from './serialization.js';
