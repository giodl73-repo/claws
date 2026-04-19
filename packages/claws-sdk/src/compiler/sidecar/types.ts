/**
 * .claws sidecar types — ClawsSidecar configuration, resolve results,
 * and detection heuristics.
 *
 * Zero imports from `@craftworks`-scoped packages. This module is standalone.
 *
 * @module claws-sdk/compiler/sidecar/types
 */

/**
 * Supported platform target identifiers for compilation.
 */
export type SidecarPlatformTarget =
  | 'openclaw'
  | 'claude-code'
  | 'cursor'
  | 'copilot'
  | 'bedrock'
  | 'langgraph'
  | 'crewai';

/**
 * Overrides that modify compilation behavior per-platform.
 */
export interface SidecarOverrides {
  /** Skip specific governance rules by ID. */
  readonly skipRules?: readonly string[];
  /** Override trust tier (1–5). */
  readonly trustTier?: number;
  /** Override enforcement model. */
  readonly enforcement?: 'full' | 'advisory' | 'none';
}

/**
 * The parsed .claws sidecar configuration file.
 *
 * Lives at the workspace root as `.claws` (YAML or JSON).
 * Defines version, platform targets, optional overrides,
 * and compilation options.
 */
export interface ClawsSidecar {
  /** Semver version string (e.g. "1.0.0"). Required. */
  readonly version: string;
  /** Platform targets for compilation. At least one required. */
  readonly targets: readonly SidecarPlatformTarget[];
  /** Optional compilation options. */
  readonly options?: {
    /** Enable strict mode (default: false). */
    readonly strict?: boolean;
    /** Enable verbose diagnostics (default: false). */
    readonly verbose?: boolean;
    /** Custom policy directory path (relative to workspace root). */
    readonly policyDir?: string;
  };
  /** Optional per-platform overrides. */
  readonly overrides?: Partial<Record<SidecarPlatformTarget, SidecarOverrides>>;
}

/**
 * Format of the parsed sidecar file.
 */
export type SidecarFormat = 'yaml' | 'json';

/**
 * Successful sidecar resolution — file found and parsed.
 */
export interface SidecarResolveFound {
  readonly found: true;
  /** The parsed sidecar configuration. */
  readonly sidecar: ClawsSidecar;
  /** Absolute path to the resolved .claws file. */
  readonly path: string;
  /** Format of the sidecar file. */
  readonly format: SidecarFormat;
  /** Detection heuristics (absent when file was found). */
  readonly heuristics?: undefined;
}

/**
 * Sidecar not found — falls back to detection heuristics.
 */
export interface SidecarResolveNotFound {
  readonly found: false;
  /** Detection heuristics inferred from workspace markers. */
  readonly heuristics: DetectionHeuristic[];
  /** The sidecar file was absent. */
  readonly sidecar?: undefined;
  readonly path?: undefined;
  readonly format?: undefined;
}

/**
 * Discriminated union: sidecar found with parsed config,
 * or not found with detection heuristics.
 */
export type SidecarResolveResult = SidecarResolveFound | SidecarResolveNotFound;

/**
 * A detection heuristic inferred from workspace file markers.
 *
 * When no .claws sidecar exists, detection heuristics infer
 * workspace type from file presence (CLAUDE.md, .cursorrules, SOUL.md, etc.).
 */
export interface DetectionHeuristic {
  /** Detected platform identifier. */
  readonly platform: SidecarPlatformTarget;
  /** Confidence score 0–1. 1.0 = definitive file match. */
  readonly confidence: number;
  /** Signals that triggered this detection (file paths, patterns). */
  readonly signals: readonly string[];
}
