/**
 * Maker types — SkillTemplate, AnnotationSuggestion, PublishPayload,
 * ManifestEntry for the maker scaffold engine.
 *
 * @module claws-sdk/maker/types
 */

/**
 * Template category identifiers for the 5 built-in skill templates.
 */
export type TemplateCategory =
  | 'communication'
  | 'data-processing'
  | 'browser-automation'
  | 'developer-tools'
  | 'custom';

/**
 * Risk level (1-5) for a skill template.
 */
export type RiskLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Governance tier for scaffolded skills.
 */
export type GovernanceTier = 'DECLARED' | 'TYPED' | 'VERIFIED';

/**
 * A skill template definition — metadata + default governance configuration.
 */
export interface SkillTemplate {
  /** Template category identifier. */
  readonly category: TemplateCategory;
  /** Human-readable template name. */
  readonly name: string;
  /** Description of the template's intended use. */
  readonly description: string;
  /** Default risk level range [min, max]. */
  readonly riskRange: readonly [RiskLevel, RiskLevel];
  /** Whether OBO governance is enabled by default. */
  readonly oboDefault: boolean;
  /** OBO scope description (empty if oboDefault is false). */
  readonly oboScope: string;
  /** Data labels applied by default. */
  readonly dataLabels: readonly string[];
  /** Default governance tier. */
  readonly defaultTier: GovernanceTier;
}

/**
 * Governance frontmatter for SKILL.md files.
 */
export interface GovernanceFrontmatter {
  /** Skill name. */
  readonly name: string;
  /** Risk level (1-5). */
  readonly risk: RiskLevel;
  /** Whether OBO governance is enabled. */
  readonly obo: boolean;
  /** OBO scope description. */
  readonly oboScope: string;
  /** Data classification labels. */
  readonly dataLabels: readonly string[];
  /** Governance tier. */
  readonly tier: GovernanceTier;
  /** Trust tier from workspace context. */
  readonly trustTier: number;
  /** Template category used. */
  readonly template: TemplateCategory;
}

/**
 * An annotation suggestion produced during scaffold.
 */
export interface AnnotationSuggestion {
  /** Suggestion type. */
  readonly type: 'obo' | 'risk' | 'data-label' | 'tier';
  /** Human-readable suggestion message. */
  readonly message: string;
  /** Confidence score (0.0-1.0). */
  readonly confidence: number;
}

/**
 * Publish payload for a scaffolded skill.
 */
export interface PublishPayload {
  /** Skill name. */
  readonly name: string;
  /** Template category. */
  readonly template: TemplateCategory;
  /** Governance frontmatter. */
  readonly governance: GovernanceFrontmatter;
  /** Files in the scaffolded project. */
  readonly files: readonly string[];
  /** SDK version used for scaffold. */
  readonly sdkVersion: string;
}

/**
 * A manifest entry for .claws-manifest files.
 */
export interface ManifestEntry {
  /** Relative file path. */
  readonly path: string;
  /** File role in the skill project. */
  readonly role: 'skill-md' | 'handler' | 'config' | 'test' | 'manifest' | 'gitignore';
  /** SHA-256 hash of the file content. */
  readonly hash: string;
}

/**
 * Options for the maker scaffold operation.
 */
export interface MakerScaffoldOptions {
  /** Skill name (kebab-case). */
  readonly name: string;
  /** Template category to use. */
  readonly template: TemplateCategory;
  /** Workspace root directory. */
  readonly workspaceRoot: string;
  /** Override trust tier (default: from workspace config). */
  readonly trustTier?: number | undefined;
  /** Override governance tier (default: TYPED per S01-F03). */
  readonly governanceTier?: GovernanceTier | undefined;
}

/**
 * A single file produced by scaffold generation.
 */
export interface ScaffoldFile {
  /** Relative path within the skill directory. */
  readonly relativePath: string;
  /** File content. */
  readonly content: string;
}

/**
 * Result of a maker scaffold operation.
 */
export interface MakerScaffoldResult {
  /** Skill name. */
  readonly name: string;
  /** Template category used. */
  readonly template: TemplateCategory;
  /** Risk level assigned. */
  readonly risk: RiskLevel;
  /** Governance tier. */
  readonly tier: GovernanceTier;
  /** Whether OBO governance was applied. */
  readonly obo: boolean;
  /** Trust tier from workspace. */
  readonly trustTier: number;
  /** Files written (relative paths). */
  readonly files: readonly string[];
  /** Absolute path to the skill directory. */
  readonly skillDir: string;
  /** Annotation suggestions. */
  readonly suggestions: readonly AnnotationSuggestion[];
  /** Duration in milliseconds. */
  readonly durationMs: number;
}

/**
 * All valid template category values for enum validation.
 */
export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = [
  'communication',
  'data-processing',
  'browser-automation',
  'developer-tools',
  'custom',
] as const;

// ── Tier Ordering ───────────────────────────────────────────────────

/**
 * Numeric ordering for governance tiers (DECLARED < TYPED < VERIFIED).
 */
export const TIER_ORDER: Record<GovernanceTier, number> = {
  DECLARED: 0,
  TYPED: 1,
  VERIFIED: 2,
};

/**
 * Check if a tier meets or exceeds a minimum tier requirement.
 */
export function tierMeetsMinimum(tier: GovernanceTier, minimum: GovernanceTier): boolean {
  return TIER_ORDER[tier] >= TIER_ORDER[minimum];
}
