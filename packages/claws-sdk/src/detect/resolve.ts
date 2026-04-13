/**
 * Multi-platform resolution — select a primary platform from a PlatformInventory.
 *
 * When multiple platforms are detected, the platform with the highest enforcement
 * capability wins: full > advisory > explicit-only. Equal-enforcement platforms
 * require explicit `targets` selection in claws.json — ambiguity is rejected
 * with an actionable error message.
 *
 * @module claws-sdk/detect/resolve
 */

import type { EnforcementModel } from '../types/platform.js';
import type {
  PlatformInventory,
  PlatformInfo,
  PlatformTarget,
  PlatformId,
} from './types.js';

/**
 * Enforcement precedence: full > advisory > explicit-only.
 * Higher number = higher precedence.
 */
const ENFORCEMENT_RANK: Record<EnforcementModel, number> = {
  'full': 3,
  'advisory': 2,
  'explicit-only': 1,
};

/**
 * Minimal config shape for resolution — only the `targets` field
 * from claws.json is needed.
 */
export interface ResolveConfig {
  readonly targets: readonly PlatformId[];
}

/**
 * Resolve a PlatformInventory into a single PlatformTarget.
 *
 * Selection logic:
 * 1. If `config.targets` is provided, use the first target that matches a
 *    detected platform as primary (config-override).
 * 2. If only one platform is detected, select it trivially (single-platform).
 * 3. If multiple platforms exist, select the one with the highest enforcement
 *    rank (auto-enforcement).
 * 4. If two or more platforms share the highest enforcement rank, reject with
 *    an actionable error.
 *
 * @throws {Error} When no platforms are detected.
 * @throws {Error} When multiple platforms share the highest enforcement and
 *   no explicit targets are configured.
 */
export function resolve(
  inventory: PlatformInventory,
  config?: ResolveConfig,
): PlatformTarget {
  const entries = Array.from(inventory.platforms.entries());

  if (entries.length === 0) {
    throw new Error(
      'Cannot resolve platform target: no platforms detected. ' +
      'Run `claws init` to set up workspace markers.',
    );
  }

  // Config override: explicit targets selection
  if (config?.targets && config.targets.length > 0) {
    return resolveFromConfig(entries, config.targets);
  }

  // Single platform: trivial resolution
  if (entries.length === 1) {
    const entry = entries[0]!;
    return {
      primary: entry[1],
      secondaries: [],
      method: 'single-platform',
      platformCount: 1,
    };
  }

  // Multiple platforms: enforcement-based resolution
  return resolveByEnforcement(entries);
}

function resolveFromConfig(
  entries: Array<[PlatformId, PlatformInfo]>,
  targets: readonly PlatformId[],
): PlatformTarget {
  for (const target of targets) {
    const match = entries.find(([id]) => id === target);
    if (match) {
      const [, primary] = match;
      const secondaries = entries
        .filter(([id]) => id !== target)
        .map(([, info]) => info);
      return {
        primary,
        secondaries,
        method: 'config-override',
        platformCount: entries.length,
      };
    }
  }

  const available = entries.map(([id]) => id).join(', ');
  throw new Error(
    `Config targets [${targets.join(', ')}] do not match any detected platform. ` +
    `Detected: ${available}. Update "targets" in claws.json.`,
  );
}

function resolveByEnforcement(
  entries: Array<[PlatformId, PlatformInfo]>,
): PlatformTarget {
  // Sort by enforcement rank descending
  const sorted = [...entries].sort((a, b) => {
    const rankA = ENFORCEMENT_RANK[a[1].marker.enforcement];
    const rankB = ENFORCEMENT_RANK[b[1].marker.enforcement];
    return rankB - rankA;
  });

  const top = sorted[0]!;
  const topRank = ENFORCEMENT_RANK[top[1].marker.enforcement];
  const topTier = sorted.filter(
    ([, info]) => ENFORCEMENT_RANK[info.marker.enforcement] === topRank,
  );

  // Ambiguity: two or more platforms share the highest enforcement
  if (topTier.length > 1) {
    const ambiguous = topTier.map(([id]) => id).join(', ');
    const firstAmbiguous = topTier[0]!;
    throw new Error(
      `Ambiguous platform resolution: ${ambiguous} have equal enforcement ` +
      `(${top[1].marker.enforcement}). Set "targets" in claws.json to ` +
      `select a primary platform:\n\n` +
      `  // claws.json\n` +
      `  {\n` +
      `    "targets": ["${firstAmbiguous[0]}"]\n` +
      `  }\n`,
    );
  }

  const primary = top[1];
  const secondaries = sorted.slice(1).map(([, info]) => info);

  return {
    primary,
    secondaries,
    method: 'auto-enforcement',
    platformCount: entries.length,
  };
}
