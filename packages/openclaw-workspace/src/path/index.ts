/**
 * @bic/openclaw-workspace/path — oc:// URI scheme + workspace file registry
 *   + chunk type contracts + workspace state types.
 *
 * Self-contained: zero runtime dependencies on `@craftworks/*` or other
 * claws-sdk modules. Type-level dependency on `../ast` for
 * `WorkspaceFileKind` — one-directional: ast is a pure library with no
 * imports from /path, /path re-exports the kind enum as a convenience for
 * path-layer consumers that need to associate a file with its grammar.
 *
 * @module @bic/openclaw-workspace/path
 */

// Type-only re-export: WorkspaceFileKind lives in /ast (grammar registry).
// Consumers of /path that need to name a file's grammar kind import it
// through here without pulling ast's runtime surface.
import type { WorkspaceFileKind } from '../ast/grammars.generated.js';
export type { WorkspaceFileKind };

export {
  parseOcPath,
  formatOcPath,
  isValidOcPath,
  OcPathError,
  type OcPath,
} from './oc-path.js';

export {
  formatOcConfigUri,
  parseOcConfigUri,
  resolveConfigUri,
  OcConfigUriError,
  type ParsedOcConfigUri,
  type ResolveResult,
} from './oc-config-uri.js';

export {
  parseOcUri,
  formatOcUri,
  type ParsedOcUri,
} from './oc-uri.js';

export {
  OC_WORKSPACE_FILES,
  type OcWorkspaceFile,
} from './oc-files.js';

export {
  OC_PARSED_FILES,
  WorkspaceError,
  type OcParsedFile,
  type WorkspaceFileName,
  type WorkspaceState,
  type SectionBase,
  type ParsedSection,
  type SoulSection,
  type MemorySection,
  type IdentitySection,
  type ToolsSection,
  type AgentsSection,
  type UserSection,
  type HeartbeatSection,
} from './types.js';

export {
  CHUNK_TABS,
  type Chunk,
  type ChunkAssemblyResult,
  type ChunkDataMap,
  type ChunkGovernance,
  type ChunkTab,
  type ChunkWarning,
  type ChunkWriteBack,
  type ConnectionsData,
  type ConnectionsSummary,
  type ConnectionsToolEntry,
  type DataLabel,
  type EntitlementEntry,
  type EntitlementsData,
  type FieldEditability,
  type GeneralData,
  type GroupsData,
  type ItemLock,
  type KnowledgeSourceEntry,
  type MemoryData,
  type PendingViolation,
  type PreferencesData,
  type RiskClassification,
  type ScheduleData,
  type TrustData,
  type TrustTier,
  type WorkqueueData,
} from './chunk-types.js';
