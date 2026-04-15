/**
 * Badge freshness — read current SKILL.md frontmatter at publish time.
 *
 * Badges capture governance metadata (risk, OBO, tier, confidence) at
 * the point of publish. They are NOT cached — always read fresh from
 * the SKILL.md file.
 *
 * @module claws-sdk/publish/badge
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Badge data captured at publish time from SKILL.md frontmatter.
 */
export interface BadgeData {
  /** Skill name. */
  readonly name: string;
  /** Skill tier. */
  readonly tier: string;
  /** Risk classification (e.g. "R1", "R3"). */
  readonly risk: string;
  /** OBO detected flag. */
  readonly obo: boolean;
  /** Data classification. */
  readonly dataClassification: string;
  /** Heuristic confidence (0.0-1.0), or null if not annotated. */
  readonly confidence: number | null;
  /** ISO 8601 timestamp when badge was captured. */
  readonly capturedAt: string;
  /** Publish version (semantic or incremental). */
  readonly version: string;
}

/**
 * Per-version badge storage entry.
 */
export interface BadgeVersion {
  /** Version string. */
  readonly version: string;
  /** Badge data for this version. */
  readonly badge: BadgeData;
}

/**
 * Badge store — all versions for a skill.
 */
export interface BadgeStore {
  /** Skill name. */
  readonly skillName: string;
  /** Ordered list of badge versions (newest first). */
  readonly versions: readonly BadgeVersion[];
}

/**
 * Badge store file name.
 */
const BADGE_STORE_FILE = 'badges.json';

/**
 * Read fresh badge data from a SKILL.md file.
 *
 * Parses frontmatter fields to extract governance metadata.
 * Always reads from disk — never cached.
 *
 * @param skillDir - Absolute path to the skill directory
 * @param version - Publish version string
 * @returns Badge data, or null if SKILL.md not found
 */
export async function readFreshBadge(
  skillDir: string,
  version: string,
): Promise<BadgeData | null> {
  const skillMdPath = join(skillDir, 'SKILL.md');

  let content: string;
  try {
    content = await readFile(skillMdPath, 'utf-8');
  } catch {
    return null;
  }

  return parseBadgeFromFrontmatter(content, version);
}

/**
 * Parse badge data from SKILL.md frontmatter content.
 */
export function parseBadgeFromFrontmatter(
  content: string,
  version: string,
): BadgeData {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const fm = fmMatch?.[1] ?? '';

  const name = extractField(fm, 'name') ?? 'unknown';
  const tier = extractField(fm, 'tier') ?? 'declared';
  const risk = extractField(fm, 'heuristic-risk') ?? extractField(fm, 'risk') ?? 'R1';
  const oboRaw = extractField(fm, 'heuristic-obo') ?? extractField(fm, 'obo');
  const obo = oboRaw === 'true';
  const dataClassification = extractField(fm, 'heuristic-data-classification') ??
    extractField(fm, 'data-classification') ?? 'public';
  const confRaw = extractField(fm, 'heuristic-risk-confidence') ?? extractField(fm, 'risk-confidence');
  const confidence = confRaw !== null ? Number(confRaw) : null;

  return {
    name,
    tier,
    risk,
    obo,
    dataClassification,
    confidence: confidence !== null && !Number.isNaN(confidence) ? confidence : null,
    capturedAt: new Date().toISOString(),
    version,
  };
}

/**
 * Extract a single YAML field value from frontmatter text.
 */
function extractField(fm: string, field: string): string | null {
  const match = fm.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() ?? null;
}

/**
 * Read the badge store for a skill.
 */
export async function readBadgeStore(
  skillDir: string,
): Promise<BadgeStore> {
  const storePath = join(skillDir, '.claws', BADGE_STORE_FILE);

  try {
    const raw = await readFile(storePath, 'utf-8');
    return JSON.parse(raw) as BadgeStore;
  } catch {
    return { skillName: '', versions: [] };
  }
}

/**
 * Write a badge to the per-version badge store.
 *
 * Prepends the new version to the store (newest first).
 */
export async function writeBadgeVersion(
  skillDir: string,
  badge: BadgeData,
): Promise<BadgeStore> {
  const storePath = join(skillDir, '.claws', BADGE_STORE_FILE);
  await mkdir(dirname(storePath), { recursive: true });

  const existing = await readBadgeStore(skillDir);
  const newVersion: BadgeVersion = { version: badge.version, badge };

  const store: BadgeStore = {
    skillName: badge.name,
    versions: [newVersion, ...existing.versions],
  };

  await writeFile(storePath, JSON.stringify(store, null, 2) + '\n', 'utf-8');
  return store;
}
