/**
 * OCWorkspaceIR -- intermediate representation for the OC workspace
 * input side of the claws compiler pipeline.
 *
 * Contains exactly 9 sub-IR fields matching the 9 readers from pulse 1:
 * SOUL.md, TOOLS.md, AGENTS.md, MEMORY.md, IDENTITY.md, USER.md,
 * HEARTBEAT.md, skills/, lobster.yaml.
 *
 * This is an owned copy -- no external compiler-sdk dependencies.
 * Stripped of multi-format generics and abstractions.
 *
 * @module claws-sdk/compiler/ir/workspace-ir
 */

import type {
  TrustLevel,
  Platform,
  FileReference,
  ParseDiagnostic,
} from './field-types.js';

// ── SoulIR ────────────────────────────────────────────────────────────

/**
 * A boundary constraint extracted from SOUL.md.
 */
export interface SoulBoundary {
  /** Raw constraint text. */
  readonly text: string;
  /** 1-based line number in source. */
  readonly line: number;
}

/**
 * SoulIR -- persona, principles, voice, and boundaries from SOUL.md.
 */
export interface SoulIR {
  /** Agent persona description. */
  readonly persona: string;
  /** Guiding principles (may be empty). */
  readonly principles: readonly string[];
  /** Voice/tone description (optional). */
  readonly voice?: string | undefined;
  /** Boundary constraints extracted from SOUL.md. */
  readonly boundaries: readonly SoulBoundary[];
  /** Source file reference. */
  readonly source: FileReference;
}

// ── ToolsIR ───────────────────────────────────────────────────────────

/**
 * A single tool declaration from TOOLS.md.
 */
export interface ToolDeclarationIR {
  /** Tool name. */
  readonly name: string;
  /** Tool description. */
  readonly description: string;
  /** Trust level annotation (T0--T4). */
  readonly trustLevel: TrustLevel;
  /** Whether this tool operates on-behalf-of another principal. */
  readonly oboFlag: boolean;
  /** 1-based line number in source. */
  readonly line: number;
}

/**
 * ToolsIR -- tool declarations and trust annotations from TOOLS.md.
 */
export interface ToolsIR {
  /** Declared tools with trust annotations. */
  readonly tools: readonly ToolDeclarationIR[];
  /** Source file reference. */
  readonly source: FileReference;
}

// ── AgentsIR ──────────────────────────────────────────────────────────

/**
 * A delegation rule from AGENTS.md.
 */
export interface DelegationRule {
  /** Source agent name. */
  readonly from: string;
  /** Target agent name. */
  readonly to: string;
  /** Tools the delegation carries. */
  readonly tools: readonly string[];
  /** 1-based line number in source. */
  readonly line: number;
}

/**
 * An agent definition from AGENTS.md.
 */
export interface AgentDefinitionIR {
  /** Agent name. */
  readonly name: string;
  /** Agent description. */
  readonly description: string;
  /** Tools this agent has access to. */
  readonly tools: readonly string[];
  /** 1-based line number in source. */
  readonly line: number;
}

/**
 * AgentsIR -- agent definitions and delegation rules from AGENTS.md.
 */
export interface AgentsIR {
  /** Agent definitions. */
  readonly agents: readonly AgentDefinitionIR[];
  /** Delegation rules. */
  readonly delegations: readonly DelegationRule[];
  /** Source file reference. */
  readonly source: FileReference;
}

// ── MemoryIR ──────────────────────────────────────────────────────────

/**
 * Data sensitivity classification for memory entries.
 */
export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

/**
 * A memory entry from MEMORY.md.
 */
export interface MemoryEntryIR {
  /** Label/title of the memory entry. */
  readonly label: string;
  /** Data sensitivity classification. */
  readonly sensitivity: DataSensitivity;
  /** Retention hint (e.g. "permanent", "30d", "session"). */
  readonly retention: string;
  /** 1-based line number in source. */
  readonly line: number;
}

/**
 * MemoryIR -- memory entries, retention rules, and index from MEMORY.md.
 */
export interface MemoryIR {
  /** Memory entries with sensitivity and retention. */
  readonly entries: readonly MemoryEntryIR[];
  /** Whether an index section was found. */
  readonly hasIndex: boolean;
  /** Source file reference. */
  readonly source: FileReference;
}

// ── IdentityIR ────────────────────────────────────────────────────────

/**
 * Authentication method from IDENTITY.md.
 */
export type AuthMethod = 'none' | 'basic' | 'token' | 'certificate' | 'sso';

/**
 * RBAC role binding from IDENTITY.md.
 */
export interface RoleBinding {
  /** Role name. */
  readonly role: string;
  /** Permissions granted by this role. */
  readonly permissions: readonly string[];
}

/**
 * IdentityIR -- configuration, SSO, and RBAC from IDENTITY.md.
 */
export interface IdentityIR {
  /** Organization name. */
  readonly organization: string;
  /** Team name. */
  readonly team: string;
  /** Authentication method. */
  readonly authMethod: AuthMethod;
  /** SSO provider identifier (optional). */
  readonly ssoProvider?: string | undefined;
  /** RBAC role bindings. */
  readonly roles: readonly RoleBinding[];
  /** Source file reference. */
  readonly source: FileReference;
}

// ── UserIR ────────────────────────────────────────────────────────────

/**
 * UserIR -- user preferences, environment, and platform from USER.md.
 */
export interface UserIR {
  /** User role. */
  readonly role: string;
  /** Authority bounds (what the user authorizes). */
  readonly bounds: readonly string[];
  /** Preferred platform. */
  readonly platform: Platform;
  /** Environment variables or settings (key-value pairs). */
  readonly environment: Readonly<Record<string, string>>;
  /** Source file reference. */
  readonly source: FileReference;
}

// ── HeartbeatIR ───────────────────────────────────────────────────────

/**
 * A health check or lifecycle schedule from HEARTBEAT.md.
 */
export interface HeartbeatScheduleIR {
  /** Schedule trigger (e.g. "on_start", "every_5m"). */
  readonly trigger: string;
  /** Actions to perform on this schedule. */
  readonly actions: readonly string[];
  /** 1-based line number in source. */
  readonly line: number;
}

/**
 * HeartbeatIR -- health checks, timestamps, and status from HEARTBEAT.md.
 */
export interface HeartbeatIR {
  /** Lifecycle schedules. */
  readonly schedules: readonly HeartbeatScheduleIR[];
  /** Last known heartbeat timestamp (ISO 8601, optional). */
  readonly lastHeartbeat?: string | undefined;
  /** Current status (optional). */
  readonly status?: string | undefined;
  /** Source file reference. */
  readonly source: FileReference;
}

// ── SkillsIR ──────────────────────────────────────────────────────────

/**
 * A skill entry from the skills/ directory.
 */
export interface SkillMetadataIR {
  /** Skill name. */
  readonly name: string;
  /** Skill description. */
  readonly description: string;
  /** Tools required by this skill. */
  readonly requiredTools: readonly string[];
  /** Relative path to the skill directory. */
  readonly path: string;
}

/**
 * SkillsIR -- skill metadata array from the skills/ directory.
 */
export interface SkillsIR {
  /** Skill metadata entries. */
  readonly skills: readonly SkillMetadataIR[];
  /** Source directory reference. */
  readonly source: FileReference;
}

// ── LobsterIR ─────────────────────────────────────────────────────────

/**
 * A workflow step from lobster.yaml.
 */
export interface LobsterStepIR {
  /** Step name. */
  readonly name: string;
  /** Step command or action. */
  readonly command: string;
}

/**
 * LobsterIR -- lobster workflow configuration from lobster.yaml.
 */
export interface LobsterIR {
  /** Workflow name. */
  readonly name: string;
  /** Workflow description. */
  readonly description: string;
  /** Ordered workflow steps. */
  readonly steps: readonly LobsterStepIR[];
  /** Step dependency map (step name -> depends-on names). */
  readonly dependencies: Readonly<Record<string, readonly string[]>>;
  /** Source file reference. */
  readonly source: FileReference;
}

// ── OCWorkspaceIR ─────────────────────────────────────────────────────

/**
 * Compiler metadata for workspace IR snapshots.
 */
export interface WorkspaceCompilerMeta {
  /** Semantic version of the claws compiler that produced this IR. */
  readonly compilerVersion: string;
  /** ISO 8601 timestamp of compilation. */
  readonly compiledAt: string;
  /** Schema version for forward/backward compatibility. */
  readonly schemaVersion: number;
}

/**
 * OCWorkspaceIR -- the top-level intermediate representation for an
 * OC agent workspace.
 *
 * Contains exactly 9 sub-IR fields mapping to the 9 OC workspace readers:
 * soul (SOUL.md), tools (TOOLS.md), agents (AGENTS.md), memory (MEMORY.md),
 * identity (IDENTITY.md), user (USER.md), heartbeat (HEARTBEAT.md),
 * skills (skills/), lobster (lobster.yaml).
 *
 * Complements GovernanceIR (output side) for the input side of the pipeline.
 */
export interface OCWorkspaceIR {
  /** Persona, principles, voice, boundaries from SOUL.md. */
  readonly soul: SoulIR;
  /** Tool declarations and trust annotations from TOOLS.md. */
  readonly tools: ToolsIR;
  /** Agent definitions and delegation rules from AGENTS.md. */
  readonly agents: AgentsIR;
  /** Memory entries, retention, index from MEMORY.md. */
  readonly memory: MemoryIR;
  /** Config, SSO, RBAC from IDENTITY.md. */
  readonly identity: IdentityIR;
  /** User preferences, environment, platform from USER.md. */
  readonly user: UserIR;
  /** Health checks, timestamps, status from HEARTBEAT.md. */
  readonly heartbeat: HeartbeatIR;
  /** Skill metadata array from skills/ directory. */
  readonly skills: SkillsIR;
  /** Lobster workflow configuration from lobster.yaml. */
  readonly lobster: LobsterIR;
  /** Compiler metadata for this snapshot. */
  readonly compiler: WorkspaceCompilerMeta;
  /** Diagnostics from workspace reading and IR construction. */
  readonly diagnostics: readonly ParseDiagnostic[];
}
