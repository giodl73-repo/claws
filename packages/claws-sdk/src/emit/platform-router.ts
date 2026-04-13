/**
 * Platform router — loss-aware multi-platform emission engine.
 *
 * Enumerates emission paths per platform, scores fidelity loss via Spec 108
 * matrix, selects optimal route. --strict-loss mode blocks R5 advisory
 * downgrade: if a platform cannot enforce R5 at L2+, the emitter refuses
 * to emit for that platform rather than downgrade to advisory.
 *
 * R1 amendments:
 * - R5 defaults to --strict-loss (non-configurable per CL-02, CISO amendment)
 * - --allow-advisory-r5 explicit opt-in required to emit R5 to advisory platforms
 * - --strict-loss error output includes: blocked platforms, R5 tools, missing capabilities
 *
 * @module claws-sdk/emit/platform-router
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { Platform } from '../types/platform.js';
import {
  buildLossMatrix,
  platformLossScore,
  canEnforceAtL2,
  type LossMatrix,
  type GovernanceFeature,
} from './loss-matrix.js';
import { getAdapter, type PlatformEmitResult } from './platforms/index.js';
import { verifyNoForbiddenImports } from './emit-plugin.js';

/**
 * R5 governance features that require L2+ enforcement.
 */
const R5_FEATURES: readonly GovernanceFeature[] = [
  'tool-deny',
  'elicitation-gate',
  'exec-approvals',
];

/**
 * Options for multi-platform emission.
 */
export interface PlatformRouterOptions {
  /** Target platforms to emit for. Default: all 7. */
  readonly platforms?: readonly Platform[];

  /**
   * Allow advisory emission for R5 tools. Default: false.
   * When false (default), R5 tools require L2+ enforcement.
   * Must be explicitly set to true to emit R5 governance to advisory platforms.
   */
  readonly allowAdvisoryR5?: boolean;

  /**
   * Use atomic artifact emission — write to staging directory first,
   * then atomic rename. Default: true.
   */
  readonly atomic?: boolean;
}

/**
 * Detailed report for a blocked platform under --strict-loss.
 */
export interface StrictLossBlockedPlatform {
  /** The blocked platform. */
  readonly platform: Platform;
  /** R5 tools that cannot be enforced on this platform. */
  readonly r5Tools: readonly string[];
  /** Governance capabilities missing L2+ enforcement. */
  readonly missingCapabilities: readonly GovernanceFeature[];
}

/**
 * Result of an emission route for a single platform.
 */
export interface PlatformRouteResult {
  /** The target platform. */
  readonly platform: Platform;
  /** Total fidelity loss score for this platform. */
  readonly lossScore: number;
  /** Whether emission was blocked by --strict-loss. */
  readonly blocked: boolean;
  /** Block reason (only set when blocked). */
  readonly blockReason?: string;
  /** Emission result (only set when not blocked). */
  readonly emitResult?: PlatformEmitResult;
}

/**
 * Complete result of multi-platform emission.
 */
export interface MultiPlatformEmitResult {
  /** Per-platform results (including blocked). */
  readonly routes: readonly PlatformRouteResult[];
  /** Platforms that were blocked by --strict-loss. */
  readonly blockedPlatforms: readonly StrictLossBlockedPlatform[];
  /** Total platforms attempted. */
  readonly totalPlatforms: number;
  /** Platforms that emitted successfully. */
  readonly emittedCount: number;
  /** Platforms that were blocked. */
  readonly blockedCount: number;
  /** Warnings from all emitted platforms. */
  readonly warnings: readonly string[];
  /** Post-emit verification failures. */
  readonly verificationFailures: readonly string[];
}

/**
 * All 7 platforms.
 */
const ALL_PLATFORMS: readonly Platform[] = [
  'openclaw',
  'cursor',
  'claude-code',
  'github-copilot',
  'bedrock',
  'langgraph',
  'crewai',
];

/**
 * Extract R5 tool names from a GovernanceIR.
 */
function extractR5Tools(ir: GovernanceIR): readonly string[] {
  const r5Tools: string[] = [];

  // From deny intents at level 5
  for (const intent of ir.intents) {
    if (intent.level === 5 && intent.kind === 'deny') {
      r5Tools.push(intent.target);
    }
  }

  // From critical tools in capability manifest
  for (const tool of ir.capabilities.tools) {
    if (tool.riskLevel === 'critical' && !r5Tools.includes(tool.name)) {
      r5Tools.push(tool.name);
    }
  }

  return r5Tools;
}

/**
 * Check if a platform has adequate enforcement for R5 governance.
 * Returns missing capabilities (empty array = adequate).
 */
function checkR5Enforcement(
  matrix: LossMatrix,
  platform: Platform,
): readonly GovernanceFeature[] {
  const missing: GovernanceFeature[] = [];

  for (const feature of R5_FEATURES) {
    if (!canEnforceAtL2(matrix, platform, feature)) {
      missing.push(feature);
    }
  }

  return missing;
}

/**
 * Post-emit verification — validates all generated outputs.
 *
 * Checks:
 * - No forbidden imports (@craftworks/, @claws/) in generated code
 * - All artifacts have non-empty content
 */
function verifyEmitResult(result: PlatformEmitResult): readonly string[] {
  const failures: string[] = [];

  for (const artifact of result.artifacts) {
    // Empty content check
    if (artifact.content.length === 0) {
      failures.push(
        `CLAWS-E301: Empty artifact "${artifact.path}" for platform "${result.platform}"`,
      );
    }

    // Forbidden import check (only for code files)
    if (artifact.path.endsWith('.ts') || artifact.path.endsWith('.js')) {
      const forbidden = verifyNoForbiddenImports(artifact.content);
      for (const ref of forbidden) {
        failures.push(
          `CLAWS-E302: Forbidden import "${ref}" in "${artifact.path}" for platform "${result.platform}"`,
        );
      }
    }
  }

  return failures;
}

/**
 * Route and emit governance artifacts for multiple platforms.
 *
 * Loss-aware routing selects the emission path that minimizes governance
 * fidelity loss while maximizing platform coverage. --strict-loss (default
 * for R5) blocks advisory-only emission for R5 tools.
 *
 * @param ir - The compiled GovernanceIR
 * @param options - Routing options
 * @returns Complete multi-platform emission result
 */
export function routeAndEmit(
  ir: GovernanceIR,
  options: PlatformRouterOptions = {},
): MultiPlatformEmitResult {
  const targetPlatforms = options.platforms ?? ALL_PLATFORMS;
  const allowAdvisoryR5 = options.allowAdvisoryR5 ?? false;
  const matrix = buildLossMatrix();
  const r5Tools = extractR5Tools(ir);
  const hasR5 = r5Tools.length > 0;

  const routes: PlatformRouteResult[] = [];
  const blockedPlatforms: StrictLossBlockedPlatform[] = [];
  const allWarnings: string[] = [];
  const allVerificationFailures: string[] = [];
  let emittedCount = 0;

  // Sort platforms by loss score (ascending) for optimal route
  const scored = targetPlatforms.map((p) => ({
    platform: p,
    lossScore: platformLossScore(matrix, p),
  }));
  scored.sort((a, b) => a.lossScore - b.lossScore);

  for (const { platform, lossScore } of scored) {
    // --strict-loss check for R5 tools (default behavior per CISO amendment)
    if (hasR5 && !allowAdvisoryR5) {
      const missingCapabilities = checkR5Enforcement(matrix, platform);
      if (missingCapabilities.length > 0) {
        const blockReason =
          `CLAWS-E310: Platform "${platform}" blocked by --strict-loss: ` +
          `R5 tools [${r5Tools.join(', ')}] require L2+ enforcement, ` +
          `but platform is missing capabilities: [${missingCapabilities.join(', ')}]. ` +
          `Use --allow-advisory-r5 to override.`;

        blockedPlatforms.push({
          platform,
          r5Tools,
          missingCapabilities,
        });

        routes.push({
          platform,
          lossScore,
          blocked: true,
          blockReason,
        });
        continue;
      }
    }

    // Emit for this platform
    const adapter = getAdapter(platform);
    if (!adapter) {
      routes.push({
        platform,
        lossScore,
        blocked: true,
        blockReason: `CLAWS-E311: No adapter registered for platform "${platform}"`,
      });
      continue;
    }

    const emitResult = adapter.emit(ir);
    allWarnings.push(...emitResult.warnings);

    // Post-emit verification
    const verificationFailures = verifyEmitResult(emitResult);
    allVerificationFailures.push(...verificationFailures);

    routes.push({
      platform,
      lossScore,
      blocked: false,
      emitResult,
    });
    emittedCount++;
  }

  return {
    routes,
    blockedPlatforms,
    totalPlatforms: targetPlatforms.length,
    emittedCount,
    blockedCount: blockedPlatforms.length,
    warnings: allWarnings,
    verificationFailures: allVerificationFailures,
  };
}
