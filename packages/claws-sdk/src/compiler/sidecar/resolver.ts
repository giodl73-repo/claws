/**
 * .claws sidecar resolver — locate, parse, validate the .claws sidecar file.
 *
 * Replaces the FORMA format registry dependency. The resolver:
 * 1. Locates `.claws` in the workspace root (YAML or JSON)
 * 2. Normalizes content via normalize.ts from pulse 1
 * 3. Parses YAML or JSON
 * 4. Validates required fields (version as semver, targets non-empty)
 * 5. Falls back to detection heuristics when no sidecar exists
 *
 * Zero imports from `@craftworks`-scoped packages.
 *
 * @module claws-sdk/compiler/sidecar/resolver
 */

import { readFile } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { normalizeFileContent } from '../readers/normalize.js';
import { detectWorkspacePlatforms } from './detect.js';
import type {
  ClawsSidecar,
  SidecarFormat,
  SidecarPlatformTarget,
  SidecarResolveResult,
} from './types.js';

/**
 * The sidecar file name — lives at workspace root.
 */
const SIDECAR_FILE = '.claws';

/**
 * Semver regex — major.minor.patch, optional pre-release and build metadata.
 */
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Valid platform target values.
 */
const VALID_PLATFORMS = new Set<string>([
  'openclaw',
  'claude-code',
  'cursor',
  'copilot',
  'bedrock',
  'langgraph',
  'crewai',
]);

/**
 * Valid enforcement mode values.
 */
const VALID_ENFORCEMENT_MODES = new Set(['full', 'advisory', 'none']);

/**
 * Error thrown when a .claws sidecar file is found but invalid.
 */
export class SidecarValidationError extends Error {
  readonly path: string;

  constructor(message: string, path: string) {
    super(message);
    this.name = 'SidecarValidationError';
    this.path = path;
  }
}

/**
 * Validate that a parsed sidecar does not contain overrides that bypass
 * free-tier R5 guarantees.
 *
 * In free-tier mode, `skipRules` must be absent/empty, and `enforcement`
 * must be `'full'` (or absent, defaulting to full). `'advisory'` and `'none'`
 * are rejected.
 *
 * @throws SidecarValidationError if free-tier-prohibited overrides are present.
 */
export function validateFreeTierOverrides(sidecar: ClawsSidecar): void {
  const overrides = sidecar.overrides;
  if (overrides == null) return;

  for (const [platform, entry] of Object.entries(overrides)) {
    if (entry == null) continue;

    if (entry.skipRules != null && entry.skipRules.length > 0) {
      throw new SidecarValidationError(
        `Free-tier mode does not allow "skipRules" (platform "${platform}"): rule skipping is a paid-tier feature`,
        'free-tier-validation',
      );
    }

    if (entry.enforcement != null && entry.enforcement !== 'full') {
      throw new SidecarValidationError(
        `Free-tier mode requires enforcement "full" (platform "${platform}"): "${entry.enforcement}" is a paid-tier feature`,
        'free-tier-validation',
      );
    }
  }
}

/**
 * Detect sidecar format from content.
 *
 * JSON starts with `{` (after whitespace). Everything else is treated as YAML.
 */
function detectFormat(content: string): SidecarFormat {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{')) {
    return 'json';
  }
  return 'yaml';
}

/**
 * Coerce a YAML scalar string to a typed value.
 */
function coerceScalar(value: string): string | boolean | number {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value.replace(/^['"]|['"]$/g, '');
}

/**
 * Parse an inline array value: `[a, b, c]` → `['a', 'b', 'c']`.
 */
function parseInlineArray(value: string): string[] {
  return value
    .slice(1, -1)
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter((s) => s.length > 0);
}

/**
 * Minimal YAML parser for .claws sidecar structure.
 *
 * Handles: top-level scalars, arrays (inline `[a, b]` and block `- item`),
 * and up to two levels of nested maps (options, overrides -> platform -> fields).
 * Does NOT handle arbitrary YAML — just the .claws schema.
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');

  // Stack-based: track indent levels for nesting
  let topKey = '';
  let level1Map: Record<string, unknown> | null = null;
  let level1Key = '';
  let level2Map: Record<string, unknown> | null = null;
  let level2Key = '';
  let pendingArray: string[] | null = null;
  let pendingArrayDepth = -1;

  function flushArray(): void {
    if (pendingArray === null) return;
    if (pendingArrayDepth === 0) {
      result[topKey] = pendingArray;
    } else if (pendingArrayDepth === 1 && level1Map) {
      level1Map[level1Key] = pendingArray;
    } else if (pendingArrayDepth === 2 && level2Map) {
      level2Map[level2Key] = pendingArray;
    }
    pendingArray = null;
    pendingArrayDepth = -1;
  }

  function flushLevel2(): void {
    if (level2Map !== null && level1Map) {
      level1Map[level1Key] = level2Map;
      level2Map = null;
      level2Key = '';
    }
  }

  function flushLevel1(): void {
    flushLevel2();
    if (level1Map !== null) {
      result[topKey] = level1Map;
      level1Map = null;
      level1Key = '';
    }
  }

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    const stripped = trimmed.trim();

    if (indent === 0) {
      flushArray();
      flushLevel1();

      const colonIdx = stripped.indexOf(':');
      if (colonIdx === -1) continue;

      const key = stripped.slice(0, colonIdx).trim();
      const value = stripped.slice(colonIdx + 1).trim();
      topKey = key;

      if (value === '') continue; // map or block array follows

      if (value.startsWith('[') && value.endsWith(']')) {
        result[key] = parseInlineArray(value);
      } else {
        result[key] = coerceScalar(value);
      }
    } else if (indent >= 4 && level1Map !== null) {
      // Level 2: sub-sub-map (e.g. overrides -> cursor -> trustTier)
      if (stripped.startsWith('- ')) {
        const item = stripped.slice(2).trim().replace(/^['"]|['"]$/g, '');
        if (pendingArray === null) {
          pendingArray = [];
          pendingArrayDepth = 2;
        }
        pendingArray.push(item);
      } else {
        flushArray();
        if (level2Map === null) {
          level2Map = {};
        }
        const colonIdx = stripped.indexOf(':');
        if (colonIdx === -1) continue;

        const nestedKey = stripped.slice(0, colonIdx).trim();
        const nestedValue = stripped.slice(colonIdx + 1).trim();
        level2Key = nestedKey;

        if (nestedValue === '') continue; // deeper array follows

        if (nestedValue.startsWith('[') && nestedValue.endsWith(']')) {
          level2Map[nestedKey] = parseInlineArray(nestedValue);
        } else {
          level2Map[nestedKey] = coerceScalar(nestedValue);
        }
      }
    } else if (indent >= 2) {
      // Level 1: nested map or block array
      if (stripped.startsWith('- ')) {
        const item = stripped.slice(2).trim().replace(/^['"]|['"]$/g, '');
        if (pendingArray === null) {
          pendingArray = [];
          pendingArrayDepth = level1Map !== null ? 1 : 0;
        }
        pendingArray.push(item);
      } else {
        flushArray();
        flushLevel2();
        if (level1Map === null) {
          level1Map = {};
        }
        const colonIdx = stripped.indexOf(':');
        if (colonIdx === -1) continue;

        const nestedKey = stripped.slice(0, colonIdx).trim();
        const nestedValue = stripped.slice(colonIdx + 1).trim();
        level1Key = nestedKey;

        if (nestedValue === '') continue; // sub-map or array follows

        if (nestedValue.startsWith('[') && nestedValue.endsWith(']')) {
          level1Map[nestedKey] = parseInlineArray(nestedValue);
        } else {
          level1Map[nestedKey] = coerceScalar(nestedValue);
        }
      }
    }
  }

  // Flush trailing state
  flushArray();
  flushLevel1();

  return result;
}

/**
 * Parse sidecar content as JSON or YAML.
 */
function parseContent(content: string, format: SidecarFormat): Record<string, unknown> {
  if (format === 'json') {
    return JSON.parse(content) as Record<string, unknown>;
  }
  return parseSimpleYaml(content);
}

/**
 * Validate and coerce a parsed object into a ClawsSidecar.
 *
 * @throws SidecarValidationError on missing/invalid fields
 */
function validateSidecar(raw: Record<string, unknown>, filePath: string): ClawsSidecar {
  // Version: required, semver
  const version = raw['version'];
  if (typeof version !== 'string' || version.length === 0) {
    throw new SidecarValidationError(
      `Missing or invalid "version" field in ${filePath}: expected a semver string`,
      filePath,
    );
  }
  if (!SEMVER_RE.test(version)) {
    throw new SidecarValidationError(
      `Invalid semver version "${version}" in ${filePath}: expected format major.minor.patch`,
      filePath,
    );
  }

  // Targets: required, non-empty array of valid platform strings
  const targets = raw['targets'];
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new SidecarValidationError(
      `Missing or empty "targets" array in ${filePath}: at least one platform target required`,
      filePath,
    );
  }
  for (const t of targets) {
    if (typeof t !== 'string' || !VALID_PLATFORMS.has(t)) {
      throw new SidecarValidationError(
        `Invalid platform target "${String(t)}" in ${filePath}: valid targets are ${[...VALID_PLATFORMS].join(', ')}`,
        filePath,
      );
    }
  }

  // Options: optional map
  const options = raw['options'];
  let parsedOptions: ClawsSidecar['options'];
  if (options != null && typeof options === 'object' && !Array.isArray(options)) {
    const opts = options as Record<string, unknown>;
    // S-M2: Validate policyDir does not contain path traversal sequences
    if (typeof opts['policyDir'] === 'string') {
      const pd = opts['policyDir'];
      if (pd.includes('..') || isAbsolute(pd) || /^[a-zA-Z]:/.test(pd)) {
        throw new SidecarValidationError(
          `Invalid "policyDir" in sidecar: path traversal or absolute path not allowed`,
          filePath,
        );
      }
    }
    parsedOptions = {
      ...(typeof opts['strict'] === 'boolean' ? { strict: opts['strict'] } : {}),
      ...(typeof opts['verbose'] === 'boolean' ? { verbose: opts['verbose'] } : {}),
      ...(typeof opts['policyDir'] === 'string' ? { policyDir: opts['policyDir'] } : {}),
    };
  }

  // Overrides: optional map keyed by platform
  const overrides = raw['overrides'];
  let parsedOverrides: ClawsSidecar['overrides'];
  if (overrides != null && typeof overrides === 'object' && !Array.isArray(overrides)) {
    const ov = overrides as Record<string, unknown>;
    const mapped: Partial<Record<SidecarPlatformTarget, { skipRules?: readonly string[]; trustTier?: number; enforcement?: 'full' | 'advisory' | 'none' }>> = {};
    for (const [key, val] of Object.entries(ov)) {
      if (VALID_PLATFORMS.has(key) && val != null && typeof val === 'object') {
        const entry = val as Record<string, unknown>;

        // S-M3: Validate skipRules elements are all strings
        if (Array.isArray(entry['skipRules'])) {
          if (!entry['skipRules'].every((r: unknown) => typeof r === 'string')) {
            throw new SidecarValidationError(
              `Invalid "skipRules" for platform "${key}" in sidecar: all elements must be strings`,
              filePath,
            );
          }
        }

        // S-M4 / W5: Validate enforcement is a valid enum value
        if (typeof entry['enforcement'] === 'string') {
          if (!VALID_ENFORCEMENT_MODES.has(entry['enforcement'])) {
            throw new SidecarValidationError(
              `Invalid "enforcement" value "${entry['enforcement']}" for platform "${key}" in sidecar: must be one of full, advisory, none`,
              filePath,
            );
          }
        }

        // W4: Validate trustTier is integer 1-5
        if (typeof entry['trustTier'] === 'number') {
          const tier = entry['trustTier'];
          if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
            throw new SidecarValidationError(
              `Invalid "trustTier" value ${tier} for platform "${key}" in sidecar: must be an integer between 1 and 5`,
              filePath,
            );
          }
        }

        mapped[key as SidecarPlatformTarget] = {
          ...(Array.isArray(entry['skipRules']) ? { skipRules: entry['skipRules'] as string[] } : {}),
          ...(typeof entry['trustTier'] === 'number' ? { trustTier: entry['trustTier'] } : {}),
          ...(typeof entry['enforcement'] === 'string' ? { enforcement: entry['enforcement'] as 'full' | 'advisory' | 'none' } : {}),
        };
      }
    }
    if (Object.keys(mapped).length > 0) {
      parsedOverrides = mapped;
    }
  }

  return {
    version,
    targets: targets as SidecarPlatformTarget[],
    ...(parsedOptions !== undefined ? { options: parsedOptions } : {}),
    ...(parsedOverrides !== undefined ? { overrides: parsedOverrides } : {}),
  };
}

/**
 * Resolve the .claws sidecar file from a workspace root.
 *
 * 1. Attempts to read `.claws` from workspaceRoot
 * 2. If found: normalizes content (BOM/CRLF via normalize.ts), detects format,
 *    parses, validates, and returns the parsed sidecar
 * 3. If not found: runs detection heuristics and returns them instead
 *
 * @param workspaceRoot - Absolute path to the workspace root directory
 * @returns SidecarResolveResult — either found with parsed sidecar, or not-found with heuristics
 * @throws SidecarValidationError if the file exists but is invalid
 */
export async function resolveSidecar(workspaceRoot: string): Promise<SidecarResolveResult> {
  const sidecarPath = join(workspaceRoot, SIDECAR_FILE);

  let rawContent: string;
  try {
    rawContent = await readFile(sidecarPath, 'utf-8');
  } catch {
    // File not found — fall back to detection heuristics
    const heuristics = await detectWorkspacePlatforms(workspaceRoot);
    return { found: false, heuristics };
  }

  // Normalize content: BOM strip, CRLF→LF, trailing newline
  const normalized = normalizeFileContent(rawContent);

  // Detect format and parse
  const format = detectFormat(normalized);
  let parsed: Record<string, unknown>;
  try {
    parsed = parseContent(normalized, format);
  } catch (err) {
    throw new SidecarValidationError(
      `Failed to parse ${sidecarPath} as ${format.toUpperCase()}: ${err instanceof Error ? err.message : String(err)}`,
      sidecarPath,
    );
  }

  // Validate and return
  const sidecar = validateSidecar(parsed, sidecarPath);
  return { found: true, sidecar, path: sidecarPath, format };
}
