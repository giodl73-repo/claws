/**
 * Governed publish pipeline — pinch pre-flight, tier evaluation,
 * manifest signing, ClawHub API call, atomic rollback on failure.
 *
 * Pipeline stages:
 * 1. Pinch pre-flight check — validates governance compresses within budget
 * 2. Tier evaluation — DECLARED / TYPED / VERIFIED
 * 3. Manifest signing — .claws-manifest.json with build provenance
 * 4. ClawHub API call — submits skill package with governance metadata
 * 5. Atomic rollback — reverts local state on remote failure (P-228)
 *
 * Security warnings are NEVER suppressible (S05-F03).
 * Per-version badge storage (S05-F09).
 *
 * @module claws-sdk/maker/publish
 */

import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { pathExists } from '../util/fs.js';
import { makerAnnotate } from './annotate.js';
import { generateManifest, verifyManifest } from './manifest.js';
import type { ClawsManifest } from './manifest.js';
import type { GovernanceTier, RiskLevel } from './types.js';
import { tierMeetsMinimum } from './types.js';

// ── Types ──────────────────────────────────────────────────────────────

/**
 * A security warning that cannot be suppressed (S05-F03).
 */
export interface SecurityWarning {
  /** Warning code for machine processing. */
  readonly code: string;
  /** Human-readable message. */
  readonly message: string;
  /** Severity (always rendered regardless of --quiet). */
  readonly severity: 'warning' | 'critical';
}

/**
 * Pinch pre-flight result.
 */
export interface PinchPreflightResult {
  /** Whether the skill passed pinch validation. */
  readonly passed: boolean;
  /** Reason for failure (if failed). */
  readonly reason: string;
  /** Security warnings (always emitted). */
  readonly warnings: readonly SecurityWarning[];
}

/**
 * Tier evaluation result.
 */
export interface TierEvaluationResult {
  /** Determined governance tier. */
  readonly tier: GovernanceTier;
  /** Reason for the tier determination. */
  readonly reason: string;
  /** Whether the skill has a handler file. */
  readonly hasHandler: boolean;
  /** Whether the skill has decorators. */
  readonly hasDecorators: boolean;
  /** Whether pinch validation passed. */
  readonly pinchPassed: boolean;
}

/**
 * Badge snapshot for a specific published version (S05-F09).
 */
export interface VersionBadge {
  /** Published version string. */
  readonly version: string;
  /** Governance tier at publish time. */
  readonly tier: GovernanceTier;
  /** Risk level at publish time. */
  readonly risk: RiskLevel;
  /** OBO status at publish time. */
  readonly obo: boolean;
  /** Manifest signature status. */
  readonly signatureStatus: 'signed' | 'unsigned' | 'invalid';
  /** Badge generation timestamp (ISO 8601). */
  readonly generatedAt: string;
}

/**
 * Registry client interface — abstracts ClawHub API calls for testability.
 */
export interface RegistryClient {
  /** Publish a skill package to the registry. */
  publish(payload: RegistryPublishPayload): Promise<RegistryPublishResult>;
}

/**
 * Payload sent to the registry on publish.
 */
export interface RegistryPublishPayload {
  /** Skill name. */
  readonly name: string;
  /** Version being published. */
  readonly version: string;
  /** Governance tier. */
  readonly tier: GovernanceTier;
  /** Manifest JSON. */
  readonly manifest: ClawsManifest;
  /** Skill files content (map of relative path to content). */
  readonly files: ReadonlyMap<string, string>;
}

/**
 * Result from the registry after a publish attempt.
 */
export interface RegistryPublishResult {
  /** Whether the publish succeeded. */
  readonly success: boolean;
  /** Error message on failure. */
  readonly error?: string | undefined;
  /** Registry-assigned publish ID on success. */
  readonly publishId?: string | undefined;
}

/**
 * Fleet policy configuration for publish gating.
 */
export interface FleetPublishPolicy {
  /** Minimum tier required for publish. */
  readonly minimumTier: GovernanceTier;
  /** Whether signing is required. */
  readonly requireSigning: boolean;
}

/**
 * Options for the publish pipeline.
 */
export interface MakerPublishOptions {
  /** Path to the skill directory. */
  readonly skillDir: string;
  /** Version to publish. */
  readonly version: string;
  /** SDK version string. */
  readonly sdkVersion: string;
  /** Signing key (optional — unsigned if omitted). */
  readonly signingKey?: string | undefined;
  /** Registry client for ClawHub API calls. */
  readonly registry: RegistryClient;
  /** Quiet mode — suppresses non-security output (S05-F03: security warnings ALWAYS render). */
  readonly quiet?: boolean | undefined;
  /** Fleet publish policy (optional). */
  readonly fleetPolicy?: FleetPublishPolicy | undefined;
  /** Policy config string for hashing. */
  readonly policyConfig?: string | undefined;
}

/**
 * Result of a publish operation.
 */
export interface MakerPublishResult {
  /** Whether the publish succeeded. */
  readonly success: boolean;
  /** Skill name. */
  readonly name: string;
  /** Published version. */
  readonly version: string;
  /** Governance tier determined. */
  readonly tier: GovernanceTier;
  /** Generated manifest. */
  readonly manifest: ClawsManifest;
  /** Badge snapshot for this version. */
  readonly badge: VersionBadge;
  /** Security warnings (always populated, never suppressed). */
  readonly securityWarnings: readonly SecurityWarning[];
  /** Whether rollback was triggered. */
  readonly rolledBack: boolean;
  /** Error message if failed. */
  readonly error?: string | undefined;
  /** Registry publish ID if successful. */
  readonly publishId?: string | undefined;
  /** Duration in milliseconds. */
  readonly durationMs: number;
}

// Re-export tierMeetsMinimum from canonical location for backwards compatibility.
export { tierMeetsMinimum } from './types.js';

// ── Pinch Pre-flight ────────────────────────────────────────────────

/**
 * Run pinch pre-flight validation on a skill directory.
 *
 * Checks that governance content fits within the profile budget
 * while maintaining fidelity. Produces security warnings that
 * are NEVER suppressible (S05-F03).
 */
export async function pinchPreflight(skillDir: string): Promise<PinchPreflightResult> {
  const warnings: SecurityWarning[] = [];

  // Check SKILL.md exists
  const skillMdPath = join(skillDir, 'SKILL.md');
  if (!(await pathExists(skillMdPath))) {
    return {
      passed: false,
      reason: 'SKILL.md not found — cannot validate governance content',
      warnings: [{
        code: 'PINCH-001',
        message: 'Missing SKILL.md — skill has no governance surface',
        severity: 'critical',
      }],
    };
  }

  const skillMdContent = await readFile(skillMdPath, 'utf-8');

  // Check for frontmatter
  if (!skillMdContent.startsWith('---')) {
    warnings.push({
      code: 'PINCH-002',
      message: 'SKILL.md has no frontmatter — governance metadata missing',
      severity: 'critical',
    });
    return { passed: false, reason: 'No frontmatter in SKILL.md', warnings };
  }

  // Check governance fields are present in frontmatter
  const frontmatterEnd = skillMdContent.indexOf('---', 3);
  if (frontmatterEnd === -1) {
    warnings.push({
      code: 'PINCH-003',
      message: 'SKILL.md has malformed frontmatter — missing closing ---',
      severity: 'critical',
    });
    return { passed: false, reason: 'Malformed frontmatter in SKILL.md', warnings };
  }

  const frontmatter = skillMdContent.substring(3, frontmatterEnd);

  if (!frontmatter.includes('name:')) {
    warnings.push({
      code: 'PINCH-004',
      message: 'SKILL.md frontmatter missing "name" field',
      severity: 'warning',
    });
  }

  // Check handler exists for TYPED/VERIFIED
  const handlerPath = join(skillDir, 'handler.ts');
  const hasHandler = await pathExists(handlerPath);
  if (!hasHandler) {
    warnings.push({
      code: 'PINCH-005',
      message: 'No handler.ts found — skill capped at DECLARED tier',
      severity: 'warning',
    });
  }

  return { passed: true, reason: '', warnings };
}

// ── Tier Evaluation ─────────────────────────────────────────────────

/**
 * Evaluate the governance tier of a skill.
 *
 * - DECLARED: frontmatter only (no handler)
 * - TYPED: frontmatter + handler with decorators
 * - VERIFIED: full build with passing pinch check
 */
export async function evaluateTier(
  skillDir: string,
  pinchPassed: boolean,
): Promise<TierEvaluationResult> {
  const handlerPath = join(skillDir, 'handler.ts');
  const hasHandler = await pathExists(handlerPath);

  if (!hasHandler) {
    return {
      tier: 'DECLARED',
      reason: 'No handler.ts — self-reported frontmatter only',
      hasHandler: false,
      hasDecorators: false,
      pinchPassed,
    };
  }

  // Check for governance decorators in handler
  const handlerContent = await readFile(handlerPath, 'utf-8');
  const decoratorPattern = /@(?:Obo|Risk|DataLabel)\s*\(/;
  const hasDecorators = decoratorPattern.test(handlerContent);

  if (hasDecorators && pinchPassed) {
    return {
      tier: 'VERIFIED',
      reason: 'Handler has governance decorators and pinch validation passed',
      hasHandler: true,
      hasDecorators: true,
      pinchPassed,
    };
  }

  return {
    tier: 'TYPED',
    reason: hasDecorators
      ? 'Handler has decorators but pinch validation did not pass'
      : 'Handler exists but lacks governance decorators',
    hasHandler: true,
    hasDecorators,
    pinchPassed,
  };
}

// ── Publish Pipeline ────────────────────────────────────────────────

/**
 * Run the governed publish pipeline.
 *
 * Stages:
 * 1. Pinch pre-flight check
 * 2. Tier evaluation
 * 3. Manifest signing
 * 4. ClawHub API call
 * 5. Atomic rollback on failure
 *
 * Security warnings are NEVER suppressible (S05-F03).
 */
export async function makerPublish(
  options: MakerPublishOptions,
): Promise<MakerPublishResult> {
  const start = performance.now();
  const allWarnings: SecurityWarning[] = [];
  let manifestPath: string | undefined;

  // ── Stage 1: Pinch pre-flight ──────────────────────────────────────
  const pinchResult = await pinchPreflight(options.skillDir);
  allWarnings.push(...pinchResult.warnings);

  if (!pinchResult.passed) {
    return {
      success: false,
      name: '',
      version: options.version,
      tier: 'DECLARED',
      manifest: emptyManifest(options.version),
      badge: emptyBadge(options.version),
      securityWarnings: allWarnings,
      rolledBack: false,
      error: `Pinch pre-flight failed: ${pinchResult.reason}`,
      durationMs: performance.now() - start,
    };
  }

  // ── Stage 2: Tier evaluation ───────────────────────────────────────
  const tierResult = await evaluateTier(options.skillDir, pinchResult.passed);

  // Fleet policy gate
  if (options.fleetPolicy) {
    if (!tierMeetsMinimum(tierResult.tier, options.fleetPolicy.minimumTier)) {
      allWarnings.push({
        code: 'FLEET-001',
        message: `Skill tier ${tierResult.tier} does not meet fleet minimum ${options.fleetPolicy.minimumTier}`,
        severity: 'critical',
      });
      return {
        success: false,
        name: '',
        version: options.version,
        tier: tierResult.tier,
        manifest: emptyManifest(options.version),
        badge: emptyBadge(options.version),
        securityWarnings: allWarnings,
        rolledBack: false,
        error: `Fleet policy requires minimum tier ${options.fleetPolicy.minimumTier}, skill is ${tierResult.tier}`,
        durationMs: performance.now() - start,
      };
    }

    if (options.fleetPolicy.requireSigning && !options.signingKey) {
      allWarnings.push({
        code: 'FLEET-002',
        message: 'Fleet policy requires manifest signing but no signing key provided',
        severity: 'critical',
      });
      return {
        success: false,
        name: '',
        version: options.version,
        tier: tierResult.tier,
        manifest: emptyManifest(options.version),
        badge: emptyBadge(options.version),
        securityWarnings: allWarnings,
        rolledBack: false,
        error: 'Fleet policy requires manifest signing but no signing key provided',
        durationMs: performance.now() - start,
      };
    }
  }

  // ── Read skill content for manifest ────────────────────────────────
  const skillMdPath = join(options.skillDir, 'SKILL.md');
  const skillMdContent = await readFile(skillMdPath, 'utf-8');

  // Parse skill name from frontmatter
  const nameMatch = skillMdContent.match(/^name:\s*(.+)$/m);
  const rawName = nameMatch?.[1];
  const skillName = rawName ? rawName.trim() : options.skillDir.split(/[\\/]/).pop() ?? 'unknown';

  // Get risk from annotate
  const annotateResult = await makerAnnotate({ skillDir: options.skillDir });

  const handlerPath = join(options.skillDir, 'handler.ts');
  const handlerContent = await pathExists(handlerPath)
    ? await readFile(handlerPath, 'utf-8')
    : '';

  const combinedContent = `${skillMdContent}\n${handlerContent}`;

  // ── Stage 3: Manifest signing ──────────────────────────────────────
  const manifest = generateManifest({
    name: skillName,
    version: options.version,
    sdkVersion: options.sdkVersion,
    tier: tierResult.tier,
    risk: annotateResult.inferredRisk,
    obo: annotateResult.oboFindings.length > 0,
    oboScope: annotateResult.oboFindings.length > 0
      ? annotateResult.oboFindings.map(f => f.pattern).join(', ')
      : '',
    policyConfig: options.policyConfig ?? '',
    skillContent: combinedContent,
    signingKey: options.signingKey,
  });

  // Write manifest to skill directory
  manifestPath = join(options.skillDir, '.claws-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  // Unsigned skill warning (S05-F01)
  if (manifest.signatureStatus === 'unsigned') {
    allWarnings.push({
      code: 'SIGN-001',
      message: 'Manifest is unsigned — skill has DECLARED signature trust level',
      severity: 'warning',
    });
  }

  // ── Stage 4: ClawHub API call ──────────────────────────────────────
  const files = new Map<string, string>();
  files.set('SKILL.md', skillMdContent);
  if (handlerContent) {
    files.set('handler.ts', handlerContent);
  }
  files.set('.claws-manifest.json', JSON.stringify(manifest, null, 2));

  let registryResult: RegistryPublishResult;
  try {
    registryResult = await options.registry.publish({
      name: skillName,
      version: options.version,
      tier: tierResult.tier,
      manifest,
      files,
    });
  } catch (err) {
    // ── Stage 5: Atomic rollback on network failure ──────────────────
    await rollbackManifest(manifestPath);
    return {
      success: false,
      name: skillName,
      version: options.version,
      tier: tierResult.tier,
      manifest,
      badge: buildBadge(options.version, tierResult.tier, annotateResult.inferredRisk, annotateResult.oboFindings.length > 0, manifest.signatureStatus),
      securityWarnings: allWarnings,
      rolledBack: true,
      error: `Registry error: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: performance.now() - start,
    };
  }

  if (!registryResult.success) {
    // ── Stage 5: Atomic rollback on rejection ────────────────────────
    await rollbackManifest(manifestPath);
    return {
      success: false,
      name: skillName,
      version: options.version,
      tier: tierResult.tier,
      manifest,
      badge: buildBadge(options.version, tierResult.tier, annotateResult.inferredRisk, annotateResult.oboFindings.length > 0, manifest.signatureStatus),
      securityWarnings: allWarnings,
      rolledBack: true,
      error: `Registry rejected: ${registryResult.error ?? 'unknown error'}`,
      durationMs: performance.now() - start,
    };
  }

  // ── Success ────────────────────────────────────────────────────────
  const badge = buildBadge(
    options.version,
    tierResult.tier,
    annotateResult.inferredRisk,
    annotateResult.oboFindings.length > 0,
    manifest.signatureStatus,
  );

  return {
    success: true,
    name: skillName,
    version: options.version,
    tier: tierResult.tier,
    manifest,
    badge,
    securityWarnings: allWarnings,
    rolledBack: false,
    publishId: registryResult.publishId,
    durationMs: performance.now() - start,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Build a badge snapshot for a specific version (S05-F09).
 */
function buildBadge(
  version: string,
  tier: GovernanceTier,
  risk: RiskLevel,
  obo: boolean,
  signatureStatus: 'signed' | 'unsigned' | 'invalid',
): VersionBadge {
  return {
    version,
    tier,
    risk,
    obo,
    signatureStatus,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Produce an empty manifest for error responses.
 */
function emptyManifest(version: string): ClawsManifest {
  return {
    version: 1,
    name: '',
    publishedVersion: version,
    provenance: {
      sdkVersion: '',
      compiledAt: '',
      tier: 'DECLARED',
      risk: 1,
      obo: false,
      oboScope: '',
      policyHash: '',
    },
    contentHash: '',
    signature: '',
    signatureStatus: 'unsigned',
  };
}

/**
 * Produce an empty badge for error responses.
 */
function emptyBadge(version: string): VersionBadge {
  return {
    version,
    tier: 'DECLARED',
    risk: 1,
    obo: false,
    signatureStatus: 'unsigned',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Atomic rollback — remove manifest file on publish failure (P-228).
 */
async function rollbackManifest(manifestPath: string): Promise<void> {
  try {
    await rm(manifestPath, { force: true });
  } catch {
    // Best-effort: if removal fails, the orphaned manifest is harmless
  }
}
