/**
 * Chunk type contracts — the authoritative response shape for the Layer 2
 * CAP integration API. Every endpoint under `/api/chunks/{tab}/{section}`
 * serializes a `Chunk<K>` where `K extends ChunkTab` and the data shape is
 * discriminated via `ChunkDataMap[K]`.
 *
 * Types align 1:1 with CL-10 §"Chunk Format". Partners depend on these
 * typed shapes; scenario examples are illustrative and may drift — the
 * TypeScript interface wins per Navigator N-02.
 *
 * This file has zero imports from `ir/`, `emit/`, or any other cross-area
 * module. Only pure types and pure-constant arrays live here.
 *
 * @module @bic/openclaw-workspace/path/chunk-types
 */

/**
 * Risk classification mirrored from CL-12 §RiskClassification.
 *
 * Declared inline to preserve zero-cross-package-imports: the pairing
 * between level and capability is a compile-time discriminated union; use
 * exhaustive `switch` narrowing at construction sites to prove the pairing
 * without `as` casts.
 */
export type RiskClassification =
  | { readonly level: 1; readonly capability: 'read' }
  | { readonly level: 2; readonly capability: 'write' }
  | { readonly level: 3; readonly capability: 'communicate' }
  | { readonly level: 4; readonly capability: 'execute' }
  | { readonly level: 5; readonly capability: 'transact' };

/** Ordered set of chunk tabs the serve layer exposes. */
export const CHUNK_TABS = [
  'general',
  'preferences',
  'connections',
  'memory',
  'groups',
  'entitlements',
  'trust',
  'schedule',
  'workqueue',
] as const;

export type ChunkTab = (typeof CHUNK_TABS)[number];

export type TrustTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
export type DataLabel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

/**
 * Lock on an individual array item (tool, knowledge source).
 *
 * `source` is the authoritative lock origin; `locked` is derivable as
 * `source !== 'none'` and therefore not carried on the wire.
 */
export interface ItemLock {
  readonly source: 'r5' | 'fleet' | 'governance' | 'violation' | 'unclassified' | 'none';
  readonly reason?: string;
}

/** A pending governance violation surfaced when the system is in a DEGRADED state. */
export interface PendingViolation {
  readonly path: string;
  readonly severity: string;
  readonly rule: string;
  readonly message: string;
  readonly fixGuidance: string;
  readonly scope: 'isolated' | 'structural';
}

/** Structured governance warning — mirrors GovernanceResult.warnings. */
export interface ChunkWarning {
  readonly rule: string;
  readonly message: string;
  readonly path?: string;
}

// -- Per-tab data shapes ------------------------------------------------

export interface GeneralData {
  readonly name: string;
  readonly description: string;
  readonly language: string;
  readonly managedBy: { readonly name: string; readonly role: string };
}

export interface PreferencesData {
  readonly instructions: string;
  readonly reviewers: ReadonlyArray<{ readonly name: string; readonly id: string }>;
  readonly schedule?: {
    readonly start: string;
    readonly end?: string;
    readonly time: string;
    readonly frequency: string;
  };
}

export interface ConnectionsToolEntry {
  readonly tool: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly risk: RiskClassification;
  readonly obo: boolean;
  readonly approvalRequired: boolean;
  readonly approvalSource: 'compiled' | 'fleet-override' | 'admin';
  readonly lock: ItemLock;
}

export interface ConnectionsSummary {
  readonly total: number;
  readonly enabled: number;
  readonly gated: number;
  readonly r5Count: number;
}

export interface ConnectionsData {
  readonly server: string;
  readonly name: string;
  readonly tools: readonly ConnectionsToolEntry[];
  readonly summary: ConnectionsSummary;
}

export interface KnowledgeSourceEntry {
  readonly type: 'email' | 'files' | 'channels' | 'sharepoint' | 'tables' | 'urls';
  readonly name: string;
  readonly enabled: boolean;
  readonly dataLabel: DataLabel;
  readonly lock: ItemLock;
}

export interface MemoryData {
  readonly memories: {
    readonly personal: { readonly count: number };
    readonly shared: { readonly count: number };
  };
  readonly knowledgeSources: readonly KnowledgeSourceEntry[];
}

export interface GroupsData {
  readonly m365: readonly string[];
  readonly security: readonly string[];
  readonly onPremise: readonly string[];
}

export interface EntitlementEntry {
  readonly role: string;
  readonly type: string;
  readonly expiresAt?: string;
}

export interface EntitlementsData {
  readonly core: readonly EntitlementEntry[];
  readonly governance: readonly EntitlementEntry[];
}

export interface TrustData {
  readonly currentTier: TrustTier;
  readonly escalationHistory: ReadonlyArray<{
    readonly from: TrustTier;
    readonly to: TrustTier;
    readonly date: string;
    readonly reason: string;
  }>;
  readonly nextEscalation?: {
    readonly to: TrustTier;
    readonly requirements: readonly string[];
    readonly progress: Readonly<Record<string, unknown>>;
  };
}

export interface ScheduleData {
  readonly events: ReadonlyArray<{
    readonly title: string;
    readonly recurrence: string;
    readonly nextRun: string;
    readonly calendarEventId?: string;
  }>;
}

export interface WorkqueueData {
  readonly tasks: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly dueAt?: string;
    readonly plannerTaskId?: string;
  }>;
}

/**
 * Discriminator mapping ChunkTab → data shape.
 */
export interface ChunkDataMap {
  readonly general: GeneralData;
  readonly preferences: PreferencesData;
  readonly connections: ConnectionsData;
  readonly memory: MemoryData;
  readonly groups: GroupsData;
  readonly entitlements: EntitlementsData;
  readonly trust: TrustData;
  readonly schedule: ScheduleData;
  readonly workqueue: WorkqueueData;
}

/** Per-field editability with optional lock and type-specific hints. */
export interface FieldEditability {
  readonly type: 'string' | 'boolean' | 'number' | 'enum' | 'date' | 'text' | 'object';
  readonly options?: readonly string[];
  readonly required?: boolean;
  readonly lock?: ItemLock;
}

/** Governance context attached to every chunk. */
export interface ChunkGovernance {
  readonly risk?: RiskClassification;
  readonly trustTier?: TrustTier;
  readonly warnings?: readonly ChunkWarning[];
  readonly fleetOverride?: boolean;
  readonly violations?: readonly PendingViolation[];
  readonly snapshotStale?: boolean;
}

/** Write-back descriptor. Omitted on read-only chunks (entitlements). */
export interface ChunkWriteBack {
  readonly method: 'PATCH';
  readonly url: string;
}

/**
 * A typed chunk — the JSON blob a CAP partner renders 1:1 as a UI component.
 */
export interface Chunk<K extends ChunkTab = ChunkTab> {
  readonly tab: K;
  readonly section: string;
  readonly data: ChunkDataMap[K];
  readonly editable: Readonly<Record<string, FieldEditability>>;
  readonly governance?: ChunkGovernance;
  readonly writeBack?: ChunkWriteBack;
}

/**
 * Aggregate result of a single `assembleChunks` call.
 */
export interface ChunkAssemblyResult {
  readonly general: Chunk<'general'>;
  readonly preferences: Chunk<'preferences'>;
  readonly connections: readonly Chunk<'connections'>[];
  readonly memory: Chunk<'memory'>;
  readonly groups: Chunk<'groups'>;
  readonly entitlements: Chunk<'entitlements'>;
  readonly trust: Chunk<'trust'>;
  readonly schedule: Chunk<'schedule'>;
  readonly workqueue: Chunk<'workqueue'>;
  readonly snapshotStale: boolean;
}
