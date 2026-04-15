/**
 * Fleet workspace discovery and classification types.
 *
 * WorkspaceInfo, FleetConfig, ScanResult, and ClassificationState
 * define the core data model for fleet operations.
 *
 * @module claws-sdk/fleet/types
 */

/**
 * OC marker file names used to identify agent workspaces.
 * These are the top-level files/directories that indicate
 * an OC workspace exists at a given path.
 */
export const OC_MARKER_FILES = [
  'SOUL.md',
  'CLAUDE.md',
  '.cursorrules',
  '.cursor/rules',
  'AGENTS.md',
  'TOOLS.md',
] as const;

/**
 * Directories excluded from scanning by default.
 */
export const DEFAULT_EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  '.next',
  '.nuxt',
] as const;

/**
 * Governance classification state for a discovered workspace.
 *
 * - GOVERNED: valid .claws/ directory with claws.json and at least one policy
 * - UNGOVERNED: OC workspace markers present but no .claws/ directory
 * - MISCONFIGURED: .claws/ directory exists but claws.json is missing or invalid
 */
export type ClassificationState = 'GOVERNED' | 'UNGOVERNED' | 'MISCONFIGURED';

/**
 * Information about a discovered workspace.
 */
export interface WorkspaceInfo {
  /** Absolute path to the workspace root. */
  readonly path: string;

  /** List of OC marker files found in this workspace. */
  readonly markers: readonly string[];

  /** Governance classification. */
  readonly classification: ClassificationState;

  /** Human-readable explanation for the classification. */
  readonly rationale: string;

  /** Optional metadata — e.g. detected platforms, config errors. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Configuration for fleet scanning operations.
 */
export interface FleetConfig {
  /** Maximum concurrent operations. Default: 8. */
  readonly concurrency: number;

  /** Maximum directory depth for recursive scanning. Default: 5. */
  readonly maxDepth: number;

  /** Directory names to exclude from scanning. */
  readonly excludeDirs: readonly string[];
}

/**
 * Aggregate statistics from a scan operation.
 */
export interface ScanStats {
  /** Total workspaces discovered. */
  readonly total: number;

  /** Count per classification state. */
  readonly governed: number;
  readonly ungoverned: number;
  readonly misconfigured: number;

  /** Number of directories scanned. */
  readonly directoriesScanned: number;

  /** Duration in milliseconds. */
  readonly durationMs: number;
}

/**
 * Result of a fleet scan operation.
 */
export interface ScanResult {
  /** All discovered workspaces. */
  readonly workspaces: readonly WorkspaceInfo[];

  /** Aggregate scan statistics. */
  readonly stats: ScanStats;

  /** Errors encountered during scanning (partial failures). */
  readonly errors: readonly ScanError[];
}

/**
 * An error encountered while scanning a specific path.
 */
export interface ScanError {
  /** Path where the error occurred. */
  readonly path: string;

  /** Error message. */
  readonly message: string;
}

/**
 * Progress event fired during scanning.
 */
export type ProgressEvent =
  | { readonly type: 'started'; readonly path: string }
  | { readonly type: 'completed'; readonly path: string; readonly workspace: WorkspaceInfo }
  | { readonly type: 'failed'; readonly path: string; readonly error: string };

/**
 * Callback for progress events during fleet operations.
 */
export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Default fleet configuration values.
 */
export function defaultFleetConfig(): FleetConfig {
  return {
    concurrency: 8,
    maxDepth: 5,
    excludeDirs: [...DEFAULT_EXCLUDE_DIRS],
  };
}
