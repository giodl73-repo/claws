/**
 * OC Workspace Readers — barrel exports.
 *
 * @module claws-sdk/compiler/readers
 */

// ── Top-level orchestrator ───────────────────────────────────────────
export { readOCWorkspace } from './workspace-reader.js';

// ── Individual readers ───────────────────────────────────────────────
export { soulReader } from './soul-reader.js';
export { toolsReader } from './tools-reader.js';
export { agentsReader } from './agents-reader.js';
export { memoryReader } from './memory-reader.js';
export { identityReader } from './identity-reader.js';
export { userReader } from './user-reader.js';
export { heartbeatReader } from './heartbeat-reader.js';
export { skillsReader } from './skills-reader.js';
export { lobsterReader } from './lobster-reader.js';

// ── Normalization ────────────────────────────────────────────────────
export {
  stripBOM,
  normalizeCRLF,
  enforceTrailingNewline,
  normalizeFileContent,
} from './normalize.js';

// ── Types ────────────────────────────────────────────────────────────
export type {
  WorkspaceDiagnosticSeverity,
  WorkspaceDiagnostic,
  WorkspaceFile,
  WorkspaceReadSuccess,
  WorkspaceReadFailure,
  WorkspaceReadResult,
  WorkspaceReader,
  MarkdownSection,
  SoulData,
  ToolDeclaration,
  ToolsData,
  AgentDefinition,
  AgentsData,
  MemoryEntry,
  MemoryData,
  IdentityData,
  UserData,
  HeartbeatSchedule,
  HeartbeatData,
  SkillMetadata,
  SkillsData,
  LobsterStep,
  LobsterData,
  OCWorkspaceModel,
} from './types.js';
